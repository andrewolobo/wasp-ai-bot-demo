const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, 'whatsapp_messages.db');

// Read SQL setup file
const setupSqlPath = path.join(__dirname, 'setup.sql');

/**
 * Bootstrap the WhatsApp messages database
 * Creates the database, tables, indexes, views, and triggers
 */
async function bootstrapDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting database bootstrap...');

        // Check if setup.sql exists
        if (!fs.existsSync(setupSqlPath)) {
            reject(new Error('setup.sql file not found'));
            return;
        }

        // Read the setup SQL file
        let setupSql;
        try {
            setupSql = fs.readFileSync(setupSqlPath, 'utf8');
            console.log('📖 Read setup.sql file');
        } catch (error) {
            reject(new Error(`Failed to read setup.sql: ${error.message}`));
            return;
        }

        // Create database connection
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(new Error(`Failed to create database: ${err.message}`));
                return;
            }
            console.log('✅ Connected to SQLite database');
        });

        // Execute setup SQL
        db.exec(setupSql, function (err) {
            if (err) {
                db.close();
                reject(new Error(`Failed to execute setup SQL: ${err.message}`));
                return;
            }

            console.log('✅ Database schema created successfully');

            // Verify tables were created
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                if (err) {
                    db.close();
                    reject(new Error(`Failed to verify tables: ${err.message}`));
                    return;
                }

                console.log('📊 Tables created:');
                tables.forEach(table => {
                    console.log(`   - ${table.name}`);
                });

                // Verify views were created
                db.all("SELECT name FROM sqlite_master WHERE type='view'", (err, views) => {
                    if (err) {
                        db.close();
                        reject(new Error(`Failed to verify views: ${err.message}`));
                        return;
                    }

                    console.log('👁️  Views created:');
                    views.forEach(view => {
                        console.log(`   - ${view.name}`);
                    });

                    // Close database connection
                    db.close((err) => {
                        if (err) {
                            reject(new Error(`Failed to close database: ${err.message}`));
                            return;
                        }
                        console.log('🎉 Database bootstrap completed successfully!');
                        console.log(`📍 Database location: ${dbPath}`);
                        resolve();
                    });
                });
            });
        });
    });
}

/**
 * Insert sample data for testing
 */
async function insertSampleData() {
    return new Promise((resolve, reject) => {
        console.log('📝 Inserting sample data...');

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(new Error(`Failed to connect to database: ${err.message}`));
                return;
            }
        });

        const sampleData = {
            event: 'messages.received',
            sessionId: '7880f22816319b6c2483f36f377abaea7879fb2418102735f1bb7dbacd1b154c',
            pushName: 'Charlie',
            remoteJid: '256783029075@s.whatsapp.net',
            timestamp: 1759130764681,
            messageTimestamp: 1759130764,
            messageId: '3F28D26D4A56A6EB2762',
            message: 'Hello! This is a test message from WhatsApp webhook.',
            broadcast: false
        };

        const insertSql = `
            INSERT INTO whatsapp_messages (
                event, sessionId, pushName, remoteJid, timestamp, 
                messageTimestamp, messageId, message, broadcast
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertSql, [
            sampleData.event,
            sampleData.sessionId,
            sampleData.pushName,
            sampleData.remoteJid,
            sampleData.timestamp,
            sampleData.messageTimestamp,
            sampleData.messageId,
            sampleData.message,
            sampleData.broadcast
        ], function (err) {
            if (err) {
                db.close();
                reject(new Error(`Failed to insert sample data: ${err.message}`));
                return;
            }

            console.log(`✅ Sample data inserted with ID: ${this.lastID}`);

            db.close((err) => {
                if (err) {
                    reject(new Error(`Failed to close database: ${err.message}`));
                    return;
                }
                resolve();
            });
        });
    });
}

/**
 * Verify database is working by running a test query
 */
async function verifyDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Verifying database...');

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(new Error(`Failed to connect to database: ${err.message}`));
                return;
            }
        });

        db.get("SELECT COUNT(*) as count FROM whatsapp_messages", (err, row) => {
            if (err) {
                db.close();
                reject(new Error(`Failed to verify database: ${err.message}`));
                return;
            }

            console.log(`✅ Database verification complete. Records count: ${row.count}`);

            db.close((err) => {
                if (err) {
                    reject(new Error(`Failed to close database: ${err.message}`));
                    return;
                }
                resolve(row.count);
            });
        });
    });
}

/**
 * Main bootstrap function
 */
async function main() {
    try {
        console.log('🎯 WhatsApp Messages Database Bootstrap');
        console.log('=====================================\n');

        await bootstrapDatabase();

        // Ask if user wants to insert sample data
        const args = process.argv.slice(2);
        if (args.includes('--with-sample-data')) {
            await insertSampleData();
        }

        await verifyDatabase();

        console.log('\n🎉 Bootstrap process completed successfully!');
        console.log('💡 You can now use the database in your Express API');
        console.log('💡 Run with --with-sample-data flag to include test data');

    } catch (error) {
        console.error('❌ Bootstrap failed:', error.message);
        process.exit(1);
    }
}

// Export functions for use in other modules
module.exports = {
    bootstrapDatabase,
    insertSampleData,
    verifyDatabase
};

// Run if this file is executed directly
if (require.main === module) {
    main();
}