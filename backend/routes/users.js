const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const router = express.Router();

// Removes sensitive information from user object before returning it to the client. 
const getPublicUser = (user) => {
    delete user.password 
    delete user.tokens 
    return user
}

// Generates a JWT and adds the token to the tokens array in the users table. Authenticates user without having them enter their password again.
const addToken = async (userid) => {
    const token = await jwt.sign({ id: userid }, process.env.SECRET_KEY);

    const updateUserTokenStatements = `
        UPDATE users
        SET tokens = tokens || $1
        WHERE id = $2
        RETURNING *`
        
        const { rows: [user] } = await query(updateUserTokenStatements, [[token], [userid]])
        return { user, token }
}

// Get ALL users
router.get('/', async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM users');
        res.send(rows.map((user) => getPublicUser(user)));
    } catch (e) {
        res.status(500).send({ errors: e.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows: [user] } = await query('SELECT * FROM user WHERE id = $1', [id]);

        if (!user) {
            return res.status(404).send({ error: 'Could not find user with that id' });
        }

        res.send(getPublicUser(user));
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

//Creates new user with the provided username and password. It first checks if password and username are present and if so, hashes the password using bcrypt with a cost factor of 10, then inserts it into the 'users' table. 
router.post('/', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username) {
            throw new Error('Username is required');
        }
        if (!password) {
            throw new Error('Password is required');
        }

        const hashedPassword = await bcrypt.hash(passowrd, 10);

        const insertIntoUserStatement = `
        INSERT INTO users(username, password)
        VALUES ($1, $2)
        RETURNING *
        `

        let rows;
        try {
            ({ rows }) = await query(insertIntoUserStatement, [username, hashedPassword]);
        } catch (e) {
            res.status(409).send({ error: 'Username is already taken. '});
        }

        const { user, token } = await addToken(rows[0].id);

        res.status(201).send({
            user: getPublicUser(user),
            token
        })
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
});

// User login 
router.get('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new Error('Username and password are required.');
        }

        const selectUserStatement = `
        SELECT *
        FROM users
        WHERE username = $1
        `
        const { rows } = await query(selectUserStatement, [username]);
        const failedLoginError = { error: 'Username or password was incorrect.'};

        // If no auth match, throw error
        if (!rows[0]) {
            return res.status(401).send(failedLoginError);
        }

        // Compares input password with logged hashed password
        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (!isMatch) {
            return res.status(401).send(failedLoginError);
        }

        const { user, token } = await addToken(rows[0].id);

        res.send({
            user: getPublicUser(user),
            token
        });
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
});

// Logout user
router.post('/logout', auth, async (req, res) => {
    const tokens = req.user.tokens.filter((token) => token != req.token);
    const setUserTokensStatement = `
    UPDATE users
    SET tokens = $1
    WHERE id = $2
    `
    const { rows: [user] } = await query(setUserTokensStatement, [tokens, req.user.id]);
    delete req.user;
    delete req.token;
    res.send(user);
});

router.post('/logoutAll', auth, async (req, res) => {
    const clearUserTokensStatement = `
    UPDATE users
    SET tokens = '{}'
    WHERE id = $1
    `
    const { rows: [user] } = await query(clearUserTokensStatement, [req.user.id]);
    delete req.user
    delete req.token
    res.send(user);
});

// Update user
router.put('/', auth, async (req, res) => {
    try {
        const allowedUpdates = ['username', 'password'];
        if (req.body.username !== undefined) {
            const { rows } = await query(`
                SELECT *
                FROM users
                WHERE username = $1
                `,
                [req.body.username]
            );
            if (rows.length > 0) {
                return res.status(409).send({ error: 'Username is already taken.' })
            }
        }

        if (req.body.password !== undefined) {
            req.body.password = await bcrypt.hash(req.body.password, 10);
        }

        const user = await updateUserTableRows('users', req.user.id, allowedUpdates, req.body);

        res.send(getPublicUser(users));
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
})

// Delete a user
router.delete('/', auth, async (req, res) => {
    try {
        const deleteUserStatement = `
        DELETE FROM users
        WHERE id = $1
        RETURNING *
        `
        const { rows: [users] } = await query(deleteUserStatement, [req.user.id]);

        if (!user) {
            return res.status(404).send({ error: 'Could not find user with that id' });
        }
        res.send(getPublicUser(user));

    } catch (e) {
        res.status(400).send({ error: e.message });
    }
})