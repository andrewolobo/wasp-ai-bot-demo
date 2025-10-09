const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'whatsapp_messages.db');

/**
 * Database helper class for WhatsApp messages
 */
class WhatsAppDB {
    constructor() {
        this.db = null;
    }

    /**
     * Connect to the database
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    reject(new Error(`Failed to connect to database: ${err.message}`));
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Close database connection
     */
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(new Error(`Failed to close database: ${err.message}`));
                        return;
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Insert a new WhatsApp message from webhook data
     * @param {Object} webhookData - The webhook data object (already restructured by API endpoint)
     */
    insertMessage(webhookData) {
        return new Promise((resolve, reject) => {
            const { event, sessionId, data, timestamp } = webhookData;
            const { messages } = data;
            const { messageTimestamp, pushName, remoteJid, id, message, broadcast } = messages;

            // Message text is already extracted and passed from the API endpoint
            const messageText = message || '';

            const insertSql = `
                INSERT INTO whatsapp_messages (
                    event, sessionId, pushName, remoteJid, timestamp, 
                    messageTimestamp, messageId, message, broadcast
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(insertSql, [
                event,
                sessionId,
                pushName,
                remoteJid,
                timestamp,
                messageTimestamp,
                id,
                messageText,
                broadcast || false
            ], function (err) {
                if (err) {
                    reject(new Error(`Failed to insert message: ${err.message}`));
                    return;
                }
                resolve({ id: this.lastID, messageId: id });
            });
        });
    }

    /**
     * Get messages by session ID
     * @param {string} sessionId - The session ID
     * @param {number} limit - Maximum number of messages to return
     */
    getMessagesBySession(sessionId, limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM messages_view 
                WHERE sessionId = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [sessionId, limit], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to get messages: ${err.message}`));
                    return;
                }
                resolve(rows);
            });
        });
    }

    /**
     * Get messages by contact (remoteJid)
     * @param {string} remoteJid - The contact's WhatsApp ID
     * @param {number} limit - Maximum number of messages to return
     */
    getMessagesByContact(remoteJid, limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM messages_view 
                WHERE remoteJid = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [remoteJid, limit], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to get messages: ${err.message}`));
                    return;
                }
                resolve(rows);
            });
        });
    }

    /**
     * Search messages by content
     * @param {string} searchTerm - The term to search for
     * @param {number} limit - Maximum number of messages to return
     */
    searchMessages(searchTerm, limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM messages_view 
                WHERE LOWER(message) LIKE LOWER(?) 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [`%${searchTerm}%`, limit], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to search messages: ${err.message}`));
                    return;
                }
                resolve(rows);
            });
        });
    }

    /**
     * Get recent messages
     * @param {number} hours - Number of hours to look back
     * @param {number} limit - Maximum number of messages to return
     */
    getRecentMessages(hours = 24, limit = 100) {
        return new Promise((resolve, reject) => {
            const hoursInMs = hours * 60 * 60 * 1000;
            const cutoffTime = Date.now() - hoursInMs;

            const sql = `
                SELECT * FROM messages_view 
                WHERE timestamp > ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [cutoffTime, limit], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to get recent messages: ${err.message}`));
                    return;
                }
                resolve(rows);
            });
        });
    }

    /**
     * Get message statistics
     */
    getMessageStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_messages,
                    COUNT(DISTINCT remoteJid) as unique_contacts,
                    COUNT(DISTINCT sessionId) as unique_sessions,
                    MIN(timestamp) as first_message_time,
                    MAX(timestamp) as last_message_time
                FROM whatsapp_messages
            `;

            this.db.get(sql, (err, row) => {
                if (err) {
                    reject(new Error(`Failed to get stats: ${err.message}`));
                    return;
                }
                resolve(row);
            });
        });
    }

    // ==========================================
    // AI-ENABLED USERS METHODS
    // ==========================================

    /**
     * Check if a user is AI-enabled
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<boolean>} True if user is AI-enabled
     */
    isAIEnabled(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT enabled FROM ai_enabled_users WHERE remoteJid = ? AND enabled = TRUE`;

            this.db.get(sql, [remoteJid], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to check AI status: ${err.message}`));
                    return;
                }
                resolve(row ? true : false);
            });
        });
    }

    /**
     * Add a user to AI-enabled list
     * @param {string} remoteJid - WhatsApp remote JID
     * @param {string} phoneNumber - Phone number (optional)
     * @param {string} name - User name (optional)
     * @param {string} notes - Additional notes (optional)
     * @returns {Promise<object>} Result with user ID
     */
    addAIUser(remoteJid, phoneNumber = null, name = null, notes = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO ai_enabled_users (remoteJid, phoneNumber, name, notes, enabled)
                VALUES (?, ?, ?, ?, TRUE)
                ON CONFLICT(remoteJid) DO UPDATE SET
                    phoneNumber = COALESCE(excluded.phoneNumber, phoneNumber),
                    name = COALESCE(excluded.name, name),
                    notes = COALESCE(excluded.notes, notes),
                    enabled = TRUE,
                    updated_at = CURRENT_TIMESTAMP
            `;

            this.db.run(sql, [remoteJid, phoneNumber, name, notes], function (err) {
                if (err) {
                    reject(new Error(`Failed to add AI user: ${err.message}`));
                    return;
                }
                resolve({
                    id: this.lastID,
                    remoteJid: remoteJid,
                    phoneNumber: phoneNumber,
                    name: name,
                    enabled: true
                });
            });
        });
    }

    /**
     * Remove a user from AI-enabled list (soft delete - sets enabled to false)
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<boolean>} True if user was removed
     */
    removeAIUser(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE ai_enabled_users SET enabled = FALSE, updated_at = CURRENT_TIMESTAMP WHERE remoteJid = ?`;

            this.db.run(sql, [remoteJid], function (err) {
                if (err) {
                    reject(new Error(`Failed to remove AI user: ${err.message}`));
                    return;
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Permanently delete a user from AI-enabled list
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<boolean>} True if user was deleted
     */
    deleteAIUser(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM ai_enabled_users WHERE remoteJid = ?`;

            this.db.run(sql, [remoteJid], function (err) {
                if (err) {
                    reject(new Error(`Failed to delete AI user: ${err.message}`));
                    return;
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Toggle AI-enabled status for a user
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<object>} Result with new status
     */
    toggleAIUser(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE ai_enabled_users 
                SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP 
                WHERE remoteJid = ?
                RETURNING enabled
            `;

            this.db.get(sql, [remoteJid], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to toggle AI user: ${err.message}`));
                    return;
                }
                if (!row) {
                    reject(new Error(`User not found: ${remoteJid}`));
                    return;
                }
                resolve({
                    remoteJid: remoteJid,
                    enabled: row.enabled === 1
                });
            });
        });
    }

    /**
     * Get all AI-enabled users
     * @param {boolean} includeDisabled - Include disabled users
     * @returns {Promise<Array>} List of AI-enabled users
     */
    getAIUsers(includeDisabled = false) {
        return new Promise((resolve, reject) => {
            const sql = includeDisabled
                ? `SELECT * FROM ai_enabled_users ORDER BY added_at DESC`
                : `SELECT * FROM ai_enabled_users WHERE enabled = TRUE ORDER BY added_at DESC`;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to get AI users: ${err.message}`));
                    return;
                }
                resolve(rows);
            });
        });
    }

    /**
     * Update last interaction time for AI user
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<boolean>} True if updated
     */
    updateAIUserInteraction(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE ai_enabled_users SET last_interaction = CURRENT_TIMESTAMP WHERE remoteJid = ?`;

            this.db.run(sql, [remoteJid], function (err) {
                if (err) {
                    reject(new Error(`Failed to update interaction: ${err.message}`));
                    return;
                }
                resolve(this.changes > 0);
            });
        });
    }

    /**
     * Get AI user details
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<object|null>} User details or null
     */
    getAIUser(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM ai_enabled_users WHERE remoteJid = ?`;

            this.db.get(sql, [remoteJid], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to get AI user: ${err.message}`));
                    return;
                }
                resolve(row || null);
            });
        });
    }

    // ==========================================
    // CONTACTS MANAGEMENT METHODS
    // ==========================================

    /**
     * Save or update a contact in the contacts table
     * Checks if contact exists before inserting (upsert behavior)
     * @param {Object} contactData - Contact information
     * @param {string} contactData.remoteJid - WhatsApp remote JID (required)
     * @param {string} contactData.phoneNumber - Full phone number with country code
     * @param {string} contactData.countryCode - Country code extracted from phone
     * @param {string} contactData.localNumber - Local phone number without country code
     * @param {string} contactData.pushName - Display name from WhatsApp
     * @param {string} contactData.contactType - Type: 'individual', 'group', 'newsletter', 'unknown'
     * @param {string} contactData.groupId - Group ID if type is 'group'
     * @param {string} contactData.channelId - Channel ID if type is 'newsletter'
     * @returns {Promise<Object>} Saved contact information
     */
    saveContact(contactData) {
        return new Promise((resolve, reject) => {
            const {
                remoteJid,
                phoneNumber = null,
                countryCode = null,
                localNumber = null,
                pushName = null,
                contactType = 'individual',
                groupId = null,
                channelId = null
            } = contactData;

            if (!remoteJid) {
                reject(new Error('remoteJid is required'));
                return;
            }

            // First, check if contact already exists
            const checkSql = `SELECT id, messageCount FROM contacts WHERE remoteJid = ?`;

            this.db.get(checkSql, [remoteJid], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to check contact: ${err.message}`));
                    return;
                }

                if (row) {
                    // Contact exists - update it
                    const updateSql = `
                        UPDATE contacts 
                        SET phoneNumber = COALESCE(?, phoneNumber),
                            countryCode = COALESCE(?, countryCode),
                            localNumber = COALESCE(?, localNumber),
                            pushName = COALESCE(?, pushName),
                            contactType = ?,
                            groupId = COALESCE(?, groupId),
                            channelId = COALESCE(?, channelId),
                            messageCount = messageCount + 1,
                            lastSeen = CURRENT_TIMESTAMP
                        WHERE remoteJid = ?
                    `;

                    this.db.run(updateSql, [
                        phoneNumber,
                        countryCode,
                        localNumber,
                        pushName,
                        contactType,
                        groupId,
                        channelId,
                        remoteJid
                    ], function (err) {
                        if (err) {
                            reject(new Error(`Failed to update contact: ${err.message}`));
                            return;
                        }
                        resolve({
                            id: row.id,
                            remoteJid,
                            action: 'updated',
                            messageCount: row.messageCount + 1
                        });
                    });
                } else {
                    // Contact doesn't exist - insert new
                    const insertSql = `
                        INSERT INTO contacts (
                            remoteJid, phoneNumber, countryCode, localNumber, 
                            pushName, contactType, groupId, channelId, messageCount
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `;

                    this.db.run(insertSql, [
                        remoteJid,
                        phoneNumber,
                        countryCode,
                        localNumber,
                        pushName,
                        contactType,
                        groupId,
                        channelId
                    ], function (err) {
                        if (err) {
                            reject(new Error(`Failed to insert contact: ${err.message}`));
                            return;
                        }
                        resolve({
                            id: this.lastID,
                            remoteJid,
                            action: 'created',
                            messageCount: 1
                        });
                    });
                }
            });
        });
    }

    /**
     * Get a contact by remoteJid
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<Object|null>} Contact information or null if not found
     */
    getContact(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM contacts_view WHERE remoteJid = ?`;

            this.db.get(sql, [remoteJid], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to get contact: ${err.message}`));
                    return;
                }
                resolve(row || null);
            });
        });
    }

    /**
     * Get all contacts with optional filtering
     * @param {Object} options - Query options
     * @param {string} options.contactType - Filter by type ('individual', 'group', 'newsletter')
     * @param {number} options.limit - Maximum number of contacts to return
     * @param {string} options.orderBy - Order by field (default: 'lastSeen')
     * @returns {Promise<Array>} Array of contacts
     */
    getContacts(options = {}) {
        return new Promise((resolve, reject) => {
            const {
                contactType = null,
                limit = 100,
                orderBy = 'lastSeen'
            } = options;

            let sql = `SELECT * FROM contacts_view`;
            const params = [];

            if (contactType) {
                sql += ` WHERE contactType = ?`;
                params.push(contactType);
            }

            // Validate orderBy to prevent SQL injection
            const validOrderFields = ['lastSeen', 'firstSeen', 'messageCount', 'pushName', 'phoneNumber'];
            const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : 'lastSeen';

            sql += ` ORDER BY ${safeOrderBy} DESC LIMIT ?`;
            params.push(limit);

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to get contacts: ${err.message}`));
                    return;
                }
                resolve(rows || []);
            });
        });
    }

    /**
     * Search contacts by name or phone number
     * @param {string} searchTerm - Search term
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of matching contacts
     */
    searchContacts(searchTerm, limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM contacts_view 
                WHERE pushName LIKE ? OR phoneNumber LIKE ? OR remoteJid LIKE ?
                ORDER BY lastSeen DESC
                LIMIT ?
            `;
            const searchPattern = `%${searchTerm}%`;

            this.db.all(sql, [searchPattern, searchPattern, searchPattern, limit], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to search contacts: ${err.message}`));
                    return;
                }
                resolve(rows || []);
            });
        });
    }

    /**
     * Get contact statistics
     * @returns {Promise<Object>} Contact statistics
     */
    getContactStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as totalContacts,
                    SUM(CASE WHEN contactType = 'individual' THEN 1 ELSE 0 END) as individuals,
                    SUM(CASE WHEN contactType = 'group' THEN 1 ELSE 0 END) as groups,
                    SUM(CASE WHEN contactType = 'newsletter' THEN 1 ELSE 0 END) as newsletters,
                    SUM(CASE WHEN contactType = 'unknown' THEN 1 ELSE 0 END) as unknown,
                    SUM(messageCount) as totalMessages,
                    MAX(lastSeen) as mostRecentContact
                FROM contacts
            `;

            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to get contact stats: ${err.message}`));
                    return;
                }
                resolve(row || {});
            });
        });
    }

    /**
     * Delete a contact
     * @param {string} remoteJid - WhatsApp remote JID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    deleteContact(remoteJid) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM contacts WHERE remoteJid = ?`;

            this.db.run(sql, [remoteJid], function (err) {
                if (err) {
                    reject(new Error(`Failed to delete contact: ${err.message}`));
                    return;
                }
                resolve(this.changes > 0);
            });
        });
    }
}

module.exports = WhatsAppDB;