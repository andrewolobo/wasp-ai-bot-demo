const express = require('express');
const router = express.Router();

/**
 * GET /messages/session/:sessionId
 * Get messages by session ID
 */
router.get('/session/:sessionId', async (req, res) => {
    try {
        const db = req.app.get('db');
        const { sessionId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await db.getMessagesBySession(sessionId, limit);
        res.json({
            status: 'success',
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('❌ Error getting messages by session:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get messages',
            error: error.message
        });
    }
});

/**
 * GET /messages/contact/:remoteJid
 * Get messages by contact
 */
router.get('/contact/:remoteJid', async (req, res) => {
    try {
        const db = req.app.get('db');
        const { remoteJid } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await db.getMessagesByContact(remoteJid, limit);
        res.json({
            status: 'success',
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('❌ Error getting messages by contact:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get messages',
            error: error.message
        });
    }
});

/**
 * GET /messages/search
 * Search messages
 */
router.get('/search', async (req, res) => {
    try {
        const db = req.app.get('db');
        const { q: searchTerm } = req.query;
        const limit = parseInt(req.query.limit) || 50;

        if (!searchTerm) {
            return res.status(400).json({
                status: 'error',
                message: 'Search term (q) is required'
            });
        }

        const messages = await db.searchMessages(searchTerm, limit);
        res.json({
            status: 'success',
            count: messages.length,
            searchTerm,
            messages
        });
    } catch (error) {
        console.error('❌ Error searching messages:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search messages',
            error: error.message
        });
    }
});

/**
 * GET /messages/recent
 * Get recent messages
 */
router.get('/recent', async (req, res) => {
    try {
        const db = req.app.get('db');
        const hours = parseInt(req.query.hours) || 24;
        const limit = parseInt(req.query.limit) || 100;

        const messages = await db.getRecentMessages(hours, limit);
        res.json({
            status: 'success',
            count: messages.length,
            timeframe: `${hours} hours`,
            messages
        });
    } catch (error) {
        console.error('❌ Error getting recent messages:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get recent messages',
            error: error.message
        });
    }
});

/**
 * GET /messages/stats
 * Get message statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const db = req.app.get('db');
        const stats = await db.getMessageStats();
        res.json({
            status: 'success',
            stats
        });
    } catch (error) {
        console.error('❌ Error getting message stats:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get message statistics',
            error: error.message
        });
    }
});

module.exports = router;
