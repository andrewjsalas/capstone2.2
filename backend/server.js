const express = require('express');
const app = express();
const cors = require('cors');
const { PORT } = require('./config')

// middleware
app.use(cors());
app.use(express.json());

// Routes
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const votesRoutes = require('./routes/votes');

app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/comments', commentsRoutes);
app.use('/votes', votesRoutes);

app.listen(PORT, function () {
    console.log(`Server started on port ${PORT}`);
})