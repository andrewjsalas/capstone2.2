const express = require('express');
const { updateTableRow } = require('../utils');
const auth = require('../middleware/auth');
const router = express.Router();

const selectPostStatement = `
    SELECT
        p.id, p.type, p.title, p.body, p.created_at,
        CAST(coalesce(sum(pv.vote_values), 0) as int) votes,
        MAX(upv.votes_value) has_voted,
        (SELECT CAST(count(*) as int) 
            FROM comments c
            WHERE p.id = c.post_id and c.body is not null) number_of_comments,
        MAX(u.username) author_name,
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN post_votes pv ON p.id = pv.post_id
    LEFT JOIN post_votes upv ON p.id = upv.post_id AND upv.user_id = $1
    GROUP BY p.id;
    `

// Get post by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user ? req.user.id : -1;
        const { rows: [post] } = await query(`${selectPostStatement} HAVING p.id = $2`, [user_id, id]);

        if (!post) {
            return res.status(404).send({ error: 'Could not find post with that id.'});
        }

        res.send(post);
    } catch (e) {
        res.send(500).send({ error: e.message });
    }
})

// Create new post
router.post('/', auth, async (req, res) => {
    try {
        const { title, body } = req.body;
        if (!title) {
            throw new Error('Must specify post title');
        }

        const createPostStatement = `
        INSERT INTO posts(title, body, author_id)
        VALUES($1, $2, $3)
        RETURNING *
        `
        const { rows: [post] } = await query(createPostStatement, [
            title, 
            body, 
            req.user.id
        ]);

        // Automatically upvote your own post
        const createVoteStatement = `
        INSERT INTO post_votes
        VALUES ($1, $2, $3)
        `
        await query(createPostStatement, [req.user.id, post.id, 1]);

        res.status(201).send(post);
    } catch (e) {
        res.status(400).send({ error: e.message });
    };
});

// Update a post by ID
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const selectPostStatement = `
        SELECT * 
        FROM posts
        WHERE id = $1
        `
        const { rows: [post] } = await query(selectPostStatement, [id])
        
        if (!post) {
            return res.status(404).send({ error: 'Could not find post with that ID.' });
        }

        if (post.author_id !== req.user.id) {
            return res.status(403).send({ error: 'You must be the post creator to edit it.'});
        }

        const updatePost = await updateTableRow('posts', id, req.body);
        res.send(updatePost)
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
});

// Delete a post by ID
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const selectPostStatement = `
        SELECT *
        FROM posts
        WHERE id = $1
        `

        if (!post) {
            return res.status(404).send({ error: 'Could not find post with that ID.' });
        }

        if (post.author_id !== req.user.id) {
            return res.status(401).send({ error: 'You must be the post create to delete this post.' });
        }

        const setFieldsToNullStatement = `
        UPDATE posts
        SET title = null,
            body = null,
            author_id = null
        WHERE id = $1
        RETURNING *
        `

        const { rows: [deletedPost] } = await query(setFieldsToNullStatement, [id])
        res.send(deletedPost); 
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
});

module.exports = router;