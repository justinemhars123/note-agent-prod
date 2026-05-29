const express = require('express');
const { getUserNotes } = require('../helpers/supabase');
const logger = require('../helpers/logger');

const router = express.Router();

router.get('/', async (req, res) => {
    // Only query history from Supabase if the user is authenticated.
    // Anonymous users keep history in localStorage only.
    if (!req.user) {
        return res.json({ notes: [] });
    }

    const userId = req.user.id;

    try {
        const token = req.headers.authorization;
        const notes = await getUserNotes(userId, token);
        res.json({ notes });
    } catch (err) {
        logger.error('History route error:', err);
        res.status(500).json({ error: 'Could not fetch history.' });
    }
});

module.exports = router;
