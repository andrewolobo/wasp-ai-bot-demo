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
}

module.exports = WhatsAppDB;