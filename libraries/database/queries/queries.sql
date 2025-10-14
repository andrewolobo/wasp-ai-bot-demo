-- Sample queries for the WhatsApp messages database

-- 1. Get all messages for a specific session
SELECT sessionId, pushName, remoteJid, message, readable_timestamp 
FROM messages_view 
WHERE sessionId = '7880f22816319b6c2483f36f377abaea7879fb2418102735f1bb7dbacd1b154c'
ORDER BY timestamp DESC;

-- 2. Get messages from a specific contact with message content
SELECT pushName, remoteJid, message, readable_timestamp 
FROM messages_view 
WHERE remoteJid = '256783029075@s.whatsapp.net'
ORDER BY timestamp DESC;

-- 3. Get messages within a date range with content
SELECT pushName, remoteJid, message, readable_timestamp 
FROM messages_view 
WHERE timestamp BETWEEN 1759130000000 AND 1759140000000
ORDER BY timestamp DESC;

-- 4. Count messages by contact
SELECT remoteJid, pushName, COUNT(*) as message_count
FROM whatsapp_messages
GROUP BY remoteJid, pushName
ORDER BY message_count DESC;

-- 5. Get recent messages with content (last 24 hours)
SELECT pushName, remoteJid, message, readable_timestamp 
FROM messages_view 
WHERE timestamp > (strftime('%s', 'now') - 86400) * 1000
ORDER BY timestamp DESC;

-- 6. Search messages by content (case-insensitive)
SELECT pushName, remoteJid, message, readable_timestamp
FROM messages_view 
WHERE LOWER(message) LIKE LOWER('%keyword%')
ORDER BY timestamp DESC;

-- 7. Get messages by event type
SELECT event, COUNT(*) as count
FROM whatsapp_messages
GROUP BY event
ORDER BY count DESC;

-- 8. Get conversation thread between contacts
SELECT pushName, remoteJid, message, readable_timestamp
FROM messages_view 
WHERE remoteJid IN ('256783029075@s.whatsapp.net', 'another@s.whatsapp.net')
ORDER BY timestamp ASC;

-- 9. Get messages with specific keywords in content
SELECT pushName, remoteJid, message, readable_timestamp
FROM messages_view 
WHERE message REGEXP '(hello|hi|hey)'
ORDER BY timestamp DESC;

-- 10. Get message statistics by content length
SELECT 
    CASE 
        WHEN LENGTH(message) < 50 THEN 'Short (< 50 chars)'
        WHEN LENGTH(message) < 200 THEN 'Medium (50-200 chars)'
        ELSE 'Long (> 200 chars)'
    END as message_length_category,
    COUNT(*) as count
FROM whatsapp_messages
WHERE message IS NOT NULL
GROUP BY message_length_category;

-- 11. Delete old messages (older than 30 days)
-- DELETE FROM whatsapp_messages 
-- WHERE timestamp < (strftime('%s', 'now') - 2592000) * 1000;