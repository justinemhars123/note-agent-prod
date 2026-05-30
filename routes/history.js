const express = require('express');
const { getUserNotes, deleteNote } = require('../helpers/supabase');
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

router.delete('/:id', async (req, res) => {
    // Delete a single note by ID. User must be authenticated.
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const noteId = req.params.id;

    try {
        const token = req.headers.authorization;
        const result = await deleteNote(userId, noteId, token);
        if (result) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Could not delete note.' });
        }
    } catch (err) {
        logger.error('Delete note error:', err);
        res.status(500).json({ error: 'Could not delete note.' });
    }
});

module.exports = router;
