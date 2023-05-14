const jwt = require('jsonwebtoken');

module.exports = (optional = false) => async (req, res, next) => {
    try {
        const token = req.get('Authorization').replace('Bearer ', '');
        const { id } = await jwt.verify(token, process.env.SECRET_KEY);
        const { rows: [user] } = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (!user.tokens.includes(token)) {
            throw new Error()
        }
        req.user = user;
        req.token = token;
    } catch (e) {
        if (!optional) {
            return res.status(401).send({ error: 'Please authenticate' });
        }
    }
    next();
}