-- WhatsApp Webhook Messages Database Setup
-- SQLite Database Schema for storing WhatsApp webhook data

-- Create the database file: whatsapp_messages.db
-- Run this script with: sqlite3 whatsapp_messages.db < setup.sql

-- Create messages table to store WhatsApp webhook data
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    pushName TEXT,
    remoteJid TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    messageTimestamp INTEGER NOT NULL,
    messageId TEXT,
    message TEXT,
    broadcast BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessionId ON whatsapp_messages(sessionId);
CREATE INDEX IF NOT EXISTS idx_remoteJid ON whatsapp_messages(remoteJid);
CREATE INDEX IF NOT EXISTS idx_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messageTimestamp ON whatsapp_messages(messageTimestamp);
CREATE INDEX IF NOT EXISTS idx_event ON whatsapp_messages(event);

-- Create a view for easier querying with formatted timestamps
CREATE VIEW IF NOT EXISTS messages_view AS
SELECT 
    id,
    event,
    sessionId,
    pushName,
    remoteJid,
    timestamp,
    messageTimestamp,
    messageId,
    message,
    broadcast,
    datetime(timestamp/1000, 'unixepoch') as readable_timestamp,
    datetime(messageTimestamp, 'unixepoch') as readable_message_timestamp,
    created_at,
    updated_at
FROM whatsapp_messages
ORDER BY timestamp DESC;

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_timestamp 
    AFTER UPDATE ON whatsapp_messages
    FOR EACH ROW
BEGIN
    UPDATE whatsapp_messages 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Sample insert statement (commented out)
/*
INSERT INTO whatsapp_messages (
    event, 
    sessionId, 
    pushName, 
    remoteJid, 
    timestamp, 
    messageTimestamp,
    messageId,
    broadcast
) VALUES (
    'messages.received',
    '7880f22816319b6c2483f36f377abaea7879fb2418102735f1bb7dbacd1b154c',
    'Charlie',
    '256783029075@s.whatsapp.net',
    1759130764681,
    1759130764,
    '3F28D26D4A56A6EB2762',
    FALSE
);
*/