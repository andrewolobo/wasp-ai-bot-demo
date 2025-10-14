const express = require('express');
const router = express.Router();

/**
 * GET /contacts
 * Get all contacts
 */
router.get('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        const contactType = req.query.type; // 'individual', 'group', 'newsletter'
        const limit = parseInt(req.query.limit) || 100;
        const orderBy = req.query.orderBy || 'lastSeen';

        const contacts = await db.getContacts({ contactType, limit, orderBy });

        res.json({
            status: 'success',
            count: contacts.length,
            filter: contactType || 'all',
            contacts: contacts
        });

    } catch (error) {
        console.error('❌ Error getting contacts:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get contacts',
            error: error.message
        });
    }
});

/**
 * GET /contacts/stats/summary
 * Get contact statistics
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const db = req.app.get('db');
        const stats = await db.getContactStats();

        res.json({
            status: 'success',
            stats: stats
        });

    } catch (error) {
        console.error('❌ Error getting contact stats:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get contact statistics',
            error: error.message
        });
    }
});

/**
 * GET /contacts/search/:term
 * Search contacts
 */
router.get('/search/:term', async (req, res) => {
    try {
        const db = req.app.get('db');
        const searchTerm = decodeURIComponent(req.params.term);
        const limit = parseInt(req.query.limit) || 50;

        const contacts = await db.searchContacts(searchTerm, limit);

        res.json({
            status: 'success',
            count: contacts.length,
            searchTerm: searchTerm,
            contacts: contacts
        });

    } catch (error) {
        console.error('❌ Error searching contacts:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search contacts',
            error: error.message
        });
    }
});

/**
 * GET /contacts/:remoteJid
 * Get a specific contact
 */
router.get('/:remoteJid', async (req, res) => {
    try {
        const db = req.app.get('db');
        const remoteJid = decodeURIComponent(req.params.remoteJid);
        const contact = await db.getContact(remoteJid);

        if (contact) {
            res.json({
                status: 'success',
                data: contact
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'Contact not found'
            });
        }

    } catch (error) {
        console.error('❌ Error getting contact:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get contact',
            error: error.message
        });
    }
});

/**
 * DELETE /contacts/:remoteJid
 * Delete a contact
 */
router.delete('/:remoteJid', async (req, res) => {
    try {
        const db = req.app.get('db');
        const remoteJid = decodeURIComponent(req.params.remoteJid);
        const deleted = await db.deleteContact(remoteJid);

        if (deleted) {
            res.json({
                status: 'success',
                message: 'Contact deleted successfully',
                remoteJid: remoteJid
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'Contact not found'
            });
        }

    } catch (error) {
        console.error('❌ Error deleting contact:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete contact',
            error: error.message
        });
    }
});

module.exports = router;
