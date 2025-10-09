/**
 * Bootstrap contacts table
 * Run this to create the contacts table in the database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'libraries', 'database', 'whatsapp_messages.db');

console.log('==========================================');
console.log('  BOOTSTRAP CONTACTS TABLE');
console.log('==========================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Failed to connect to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database\n');
});

// SQL to create contacts table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remoteJid TEXT NOT NULL UNIQUE,
    phoneNumber TEXT,
    countryCode TEXT,
    localNumber TEXT,
    pushName TEXT,
    contactType TEXT DEFAULT 'individual',
    groupId TEXT,
    channelId TEXT,
    messageCount INTEGER DEFAULT 0,
    firstSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Indexes
const createIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_contacts_remoteJid ON contacts(remoteJid);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_phoneNumber ON contacts(phoneNumber);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_contactType ON contacts(contactType);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_lastSeen ON contacts(lastSeen);`
];

// Trigger
const createTrigger = `
CREATE TRIGGER IF NOT EXISTS update_contacts_timestamp 
    AFTER UPDATE ON contacts
    FOR EACH ROW
BEGIN
    UPDATE contacts 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
`;

// View
const createView = `
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
`;

// Execute all SQL
console.log('📝 Creating contacts table...');

db.run(createTableSQL, (err) => {
    if (err) {
        console.error('❌ Failed to create table:', err.message);
        process.exit(1);
    }
    console.log('✅ Contacts table created\n');

    console.log('📝 Creating indexes...');

    let completed = 0;
    createIndexes.forEach((indexSQL, i) => {
        db.run(indexSQL, (err) => {
            if (err) {
                console.error(`❌ Failed to create index ${i + 1}:`, err.message);
            } else {
                completed++;
                if (completed === createIndexes.length) {
                    console.log(`✅ All ${createIndexes.length} indexes created\n`);

                    console.log('📝 Creating trigger...');
                    db.run(createTrigger, (err) => {
                        if (err) {
                            console.error('❌ Failed to create trigger:', err.message);
                        } else {
                            console.log('✅ Trigger created\n');

                            console.log('📝 Creating view...');
                            db.run(createView, (err) => {
                                if (err) {
                                    console.error('❌ Failed to create view:', err.message);
                                } else {
                                    console.log('✅ View created\n');

                                    // Verify table exists
                                    db.get("SELECT COUNT(*) as count FROM contacts", (err, row) => {
                                        if (err) {
                                            console.error('❌ Failed to verify table:', err.message);
                                        } else {
                                            console.log(`✅ Contacts table verified (${row.count} records)\n`);

                                            db.close((err) => {
                                                if (err) {
                                                    console.error('❌ Error closing database:', err.message);
                                                } else {
                                                    console.log('✅ Database connection closed\n');
                                                    console.log('==========================================');
                                                    console.log('✅ BOOTSTRAP COMPLETED SUCCESSFULLY!');
                                                    console.log('==========================================\n');
                                                    console.log('Next steps:');
                                                    console.log('1. Restart your server: npm start');
                                                    console.log('2. Send a webhook message to test');
                                                    console.log('3. Run migration: node migrate-contacts.js');
                                                    console.log('4. Check contacts: GET /contacts\n');
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });
    });
});
