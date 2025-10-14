const express = require('express');
const router = express.Router();
const { extractPhoneNumberFromRemoteJid, formatPhoneNumber } = require('../utils/phoneUtils');

/**
 * POST /phone/extract
 * Extract phone number from a single remoteJid
 */
router.post('/extract', (req, res) => {
    try {
        const { remoteJid } = req.body;

        if (!remoteJid) {
            return res.status(400).json({
                status: 'error',
                message: 'remoteJid is required'
            });
        }

        const extractedInfo = extractPhoneNumberFromRemoteJid(remoteJid);
        const formattedNumber = formatPhoneNumber(extractedInfo);

        res.json({
            status: 'success',
            input: remoteJid,
            extracted: extractedInfo,
            formatted: formattedNumber
        });

    } catch (error) {
        console.error('❌ Phone extraction error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to extract phone number',
            error: error.message
        });
    }
});

/**
 * GET /phone/contacts
 * Get phone numbers from all contacts in database
 */
router.get('/contacts', async (req, res) => {
    try {
        const db = req.app.get('db');
        const limit = parseInt(req.query.limit) || 100;
        const type = req.query.type; // 'individual', 'group', 'newsletter', or undefined for all

        // Get distinct remoteJids from database
        const query = `
            SELECT DISTINCT remoteJid, pushName, COUNT(*) as messageCount, 
                   MAX(timestamp) as lastMessageTime
            FROM whatsapp_messages 
            GROUP BY remoteJid 
            ORDER BY lastMessageTime DESC 
            LIMIT ?
        `;

        // Use database connection to get contacts
        await new Promise((resolve, reject) => {
            db.db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const contacts = rows.map(row => {
                    const extractedInfo = extractPhoneNumberFromRemoteJid(row.remoteJid);
                    const formattedNumber = formatPhoneNumber(extractedInfo);

                    return {
                        remoteJid: row.remoteJid,
                        pushName: row.pushName,
                        messageCount: row.messageCount,
                        lastMessageTime: row.lastMessageTime,
                        phoneInfo: extractedInfo,
                        formattedNumber: formattedNumber
                    };
                });

                // Filter by type if specified
                const filteredContacts = type
                    ? contacts.filter(contact => contact.phoneInfo.type === type)
                    : contacts;

                res.json({
                    status: 'success',
                    totalContacts: filteredContacts.length,
                    filter: type || 'all',
                    contacts: filteredContacts
                });

                resolve();
            });
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
 * GET /phone/stats
 * Get phone number statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const db = req.app.get('db');
        // Get all distinct remoteJids
        const query = 'SELECT DISTINCT remoteJid FROM whatsapp_messages';

        await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const stats = {
                    total: rows.length,
                    individual: 0,
                    groups: 0,
                    newsletters: 0,
                    unknown: 0,
                    countryCodes: {},
                    examples: {
                        individual: [],
                        group: [],
                        newsletter: [],
                        unknown: []
                    }
                };

                rows.forEach(row => {
                    const extractedInfo = extractPhoneNumberFromRemoteJid(row.remoteJid);

                    // Count by type
                    switch (extractedInfo.type) {
                        case 'individual':
                            stats.individual++;
                            if (stats.examples.individual.length < 3) {
                                stats.examples.individual.push(formatPhoneNumber(extractedInfo));
                            }
                            break;
                        case 'group':
                            stats.groups++;
                            if (stats.examples.group.length < 3) {
                                stats.examples.group.push(formatPhoneNumber(extractedInfo));
                            }
                            break;
                        case 'newsletter':
                            stats.newsletters++;
                            if (stats.examples.newsletter.length < 3) {
                                stats.examples.newsletter.push(formatPhoneNumber(extractedInfo));
                            }
                            break;
                        default:
                            stats.unknown++;
                            if (stats.examples.unknown.length < 3) {
                                stats.examples.unknown.push(row.remoteJid);
                            }
                    }

                    // Count country codes
                    if (extractedInfo.countryCode) {
                        stats.countryCodes[extractedInfo.countryCode] =
                            (stats.countryCodes[extractedInfo.countryCode] || 0) + 1;
                    }
                });

                res.json({
                    status: 'success',
                    stats: stats
                });

                resolve();
            });
        });

    } catch (error) {
        console.error('❌ Error getting phone stats:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get phone statistics',
            error: error.message
        });
    }
});

module.exports = router;
