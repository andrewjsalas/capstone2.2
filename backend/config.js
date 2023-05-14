require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

const PORT = +process.env.PORT || 3001;

function getDatabaseUri() {
    return "venue_db";
};

module.exports = {
    SECRET_KEY,
    PORT,
    getDatabaseUri,
};