const express = require('express');
const app = express();
const cors = require('cors');
const { PORT } = require('./config')

// middleware
app.use(cors());
app.use(express.json());

// Routes

app.listen(PORT, function () {
    console.log(`Server started on port ${PORT}`);
})