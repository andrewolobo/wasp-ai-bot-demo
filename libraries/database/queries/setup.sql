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

-- Create table for AI-enabled users
-- This table stores users who are allowed to receive AI responses
CREATE TABLE IF NOT EXISTS ai_enabled_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remoteJid TEXT NOT NULL UNIQUE,
    phoneNumber TEXT,
    name TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction DATETIME
);

-- Create indexes for ai_enabled_users table
CREATE INDEX IF NOT EXISTS idx_ai_remoteJid ON ai_enabled_users(remoteJid);
CREATE INDEX IF NOT EXISTS idx_ai_enabled ON ai_enabled_users(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_phoneNumber ON ai_enabled_users(phoneNumber);

-- Create trigger to update the updated_at timestamp for ai_enabled_users
CREATE TRIGGER IF NOT EXISTS update_ai_users_timestamp 
    AFTER UPDATE ON ai_enabled_users
    FOR EACH ROW
BEGIN
    UPDATE ai_enabled_users 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Create a view for enabled AI users
CREATE VIEW IF NOT EXISTS ai_enabled_users_view AS
SELECT 
    id,
    remoteJid,
    phoneNumber,
    name,
    enabled,
    notes,
    datetime(added_at) as added_at,
    datetime(updated_at) as updated_at,
    datetime(last_interaction) as last_interaction
FROM ai_enabled_users
WHERE enabled = TRUE
ORDER BY last_interaction DESC;

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

-- Sample AI-enabled user insert (commented out)
/*
INSERT INTO ai_enabled_users (remoteJid, phoneNumber, name, notes)
VALUES ('256703722777@s.whatsapp.net', '+256703722777', 'Test User', 'Testing AI responses');
*/

-- Create contacts table to store all WhatsApp contacts
-- This table stores contact information for everyone who sends a message
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remoteJid TEXT NOT NULL UNIQUE,
    phoneNumber TEXT,
    countryCode TEXT,
    localNumber TEXT,
    pushName TEXT,
    contactType TEXT DEFAULT 'individual', -- 'individual', 'group', 'newsletter', 'unknown'
    groupId TEXT,
    channelId TEXT,
    messageCount INTEGER DEFAULT 0,
    firstSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for contacts table
CREATE INDEX IF NOT EXISTS idx_contacts_remoteJid ON contacts(remoteJid);
CREATE INDEX IF NOT EXISTS idx_contacts_phoneNumber ON contacts(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_contacts_contactType ON contacts(contactType);
CREATE INDEX IF NOT EXISTS idx_contacts_lastSeen ON contacts(lastSeen);

-- Create trigger to update the updated_at timestamp for contacts
CREATE TRIGGER IF NOT EXISTS update_contacts_timestamp 
    AFTER UPDATE ON contacts
    FOR EACH ROW
BEGIN
    UPDATE contacts 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Create a view for contacts with formatted timestamps
CREATE VIEW IF NOT EXISTS contacts_view AS
SELECT 
    id,
    remoteJid,
    phoneNumber,
    countryCode,
    localNumber,
    pushName,
    contactType,
    groupId,
    channelId,
    messageCount,
    datetime(firstSeen) as firstSeen,
    datetime(lastSeen) as lastSeen,
    datetime(created_at) as created_at,
    datetime(updated_at) as updated_at
FROM contacts
ORDER BY lastSeen DESC;

-- Sample contact insert (commented out)
/*
INSERT INTO contacts (remoteJid, phoneNumber, countryCode, localNumber, pushName, contactType, messageCount)
VALUES ('256703722777@s.whatsapp.net', '+256703722777', '256', '703722777', 'John Doe', 'individual', 1);
*/