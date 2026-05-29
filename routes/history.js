const express = require('express');
const { getUserNotes } = require('../helpers/supabase');

const router = express.Router();

router.get('/', async (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required to fetch history.' });
    }

    try {
        const notes = await getUserNotes(userId, 20); // fetch top 20
        res.json({ notes });
    } catch (err) {
        console.error('History route error:', err);
        res.status(500).json({ error: 'Could not fetch history.' });
    }
});

module.exports = router;
