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
}

module.exports = WhatsAppDB;