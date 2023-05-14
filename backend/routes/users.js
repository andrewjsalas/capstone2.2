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