/**
 * Migrate existing messages to populate contacts table
 * This script reads all existing messages and creates contact entries
 * Run this once after adding the contacts table
 */

const WhatsAppDB = require('../libraries/database/db-helper');

/**
 * Extract phone number from WhatsApp remoteJid
 * (Copy of function from server.js for standalone use)
 */
function extractPhoneNumberFromRemoteJid(remoteJid) {
    if (!remoteJid || typeof remoteJid !== 'string') {
        return {
            phoneNumber: null,
            countryCode: null,
            localNumber: null,
            type: 'unknown',
            isValid: false,
            originalJid: remoteJid,
            error: 'Invalid or missing remoteJid'
        };
    }

    const result = {
        phoneNumber: null,
        countryCode: null,
        localNumber: null,
        type: 'unknown',
        isValid: false,
        originalJid: remoteJid,
        groupId: null,
        timestamp: null,
        channelId: null
    };

    try {
        // Individual WhatsApp user: phoneNumber@s.whatsapp.net
        if (remoteJid.includes('@s.whatsapp.net')) {
            const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');

            if (/^\d{7,15}$/.test(phoneNumber)) {
                result.phoneNumber = phoneNumber;
                result.type = 'individual';
                result.isValid = true;

                // Extract country code (common patterns)
                if (phoneNumber.length >= 10) {
                    const commonThreeDigit = ['256', '263', '234', '254', '255', '233', '372'];
                    const commonTwoDigit = ['44', '49', '33', '39', '34', '91', '86', '81', '55', '27'];
                    const commonOneDigit = ['1', '7'];

                    const threeDigit = phoneNumber.substring(0, 3);
                    if (commonThreeDigit.includes(threeDigit) && phoneNumber.length >= 12) {
                        result.countryCode = threeDigit;
                        result.localNumber = phoneNumber.substring(3);
                    } else {
                        const twoDigit = phoneNumber.substring(0, 2);
                        if (commonTwoDigit.includes(twoDigit) && phoneNumber.length >= 10) {
                            result.countryCode = twoDigit;
                            result.localNumber = phoneNumber.substring(2);
                        } else {
                            const oneDigit = phoneNumber.substring(0, 1);
                            if (commonOneDigit.includes(oneDigit) && phoneNumber.length >= 10) {
                                result.countryCode = oneDigit;
                                result.localNumber = phoneNumber.substring(1);
                            } else if (phoneNumber.startsWith('2') && phoneNumber.length >= 12) {
                                result.countryCode = phoneNumber.substring(0, 3);
                                result.localNumber = phoneNumber.substring(3);
                            } else if (phoneNumber.length >= 10) {
                                result.countryCode = phoneNumber.substring(0, 2);
                                result.localNumber = phoneNumber.substring(2);
                            }
                        }
                    }
                }

                if (!result.countryCode) {
                    result.localNumber = phoneNumber;
                }
            }
        }
        // WhatsApp Group: phoneNumber-timestamp@g.us
        else if (remoteJid.includes('@g.us')) {
            const groupPart = remoteJid.replace('@g.us', '');
            const parts = groupPart.split('-');

            if (parts.length === 2) {
                const phoneNumber = parts[0];
                const timestamp = parts[1];

                if (/^\d{7,15}$/.test(phoneNumber) && /^\d{10}$/.test(timestamp)) {
                    result.phoneNumber = phoneNumber;
                    result.groupId = groupPart;
                    result.timestamp = timestamp;
                    result.type = 'group';
                    result.isValid = true;

                    if (phoneNumber.length >= 10) {
                        const commonThreeDigit = ['256', '263', '234', '254', '255', '233', '372'];
                        const threeDigit = phoneNumber.substring(0, 3);
                        if (commonThreeDigit.includes(threeDigit) && phoneNumber.length >= 12) {
                            result.countryCode = threeDigit;
                            result.localNumber = phoneNumber.substring(3);
                        }
                    }

                    if (!result.countryCode && phoneNumber.length >= 10) {
                        result.countryCode = phoneNumber.substring(0, 2);
                        result.localNumber = phoneNumber.substring(2);
                    }
                }
            }
        }
        // Newsletter/Channel: channelId@newsletter
        else if (remoteJid.includes('@newsletter')) {
            const channelId = remoteJid.replace('@newsletter', '');

            if (/^\d{10,20}$/.test(channelId)) {
                result.channelId = channelId;
                result.type = 'newsletter';
                result.isValid = true;
            }
        } else {
            result.type = 'unknown';
            result.error = 'Unrecognized remoteJid format';
        }

    } catch (error) {
        result.error = `Parsing error: ${error.message}`;
    }

    return result;
}

/**
 * Main migration function
 */
async function migrateContacts() {
    const db = new WhatsAppDB();

    try {
        console.log('🔄 Starting contacts migration...\n');

        // Connect to database
        await db.connect();
        console.log('✅ Database connected\n');

        // Get all distinct contacts from messages
        const query = `
            SELECT 
                remoteJid, 
                pushName,
                COUNT(*) as messageCount,
                MIN(messageTimestamp) as firstMessageTime,
                MAX(messageTimestamp) as lastMessageTime
            FROM whatsapp_messages 
            GROUP BY remoteJid
            ORDER BY messageCount DESC
        `;

        const contacts = await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📊 Found ${contacts.length} unique contacts in messages\n`);

        let created = 0;
        let updated = 0;
        let errors = 0;

        // Process each contact
        for (const contact of contacts) {
            try {
                const phoneInfo = extractPhoneNumberFromRemoteJid(contact.remoteJid);

                const contactData = {
                    remoteJid: contact.remoteJid,
                    phoneNumber: phoneInfo.phoneNumber ? `+${phoneInfo.phoneNumber}` : null,
                    countryCode: phoneInfo.countryCode,
                    localNumber: phoneInfo.localNumber,
                    pushName: contact.pushName || 'Unknown',
                    contactType: phoneInfo.type || 'unknown',
                    groupId: phoneInfo.groupId || null,
                    channelId: phoneInfo.channelId || null
                };

                // Save contact (this will handle upsert logic)
                const result = await db.saveContact(contactData);

                if (result.action === 'created') {
                    created++;
                } else {
                    updated++;
                }

                // Update message count and timestamps manually since saveContact doesn't set these from migration
                const updateSql = `
                    UPDATE contacts 
                    SET messageCount = ?,
                        firstSeen = datetime(?, 'unixepoch'),
                        lastSeen = datetime(?, 'unixepoch')
                    WHERE remoteJid = ?
                `;

                await new Promise((resolve, reject) => {
                    db.db.run(updateSql, [
                        contact.messageCount,
                        contact.firstMessageTime,
                        contact.lastMessageTime,
                        contact.remoteJid
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Progress indicator
                if ((created + updated) % 10 === 0) {
                    process.stdout.write(`\r📝 Processed: ${created + updated}/${contacts.length}`);
                }

            } catch (error) {
                errors++;
                console.error(`\n❌ Error processing ${contact.remoteJid}:`, error.message);
            }
        }

        console.log(`\n\n✅ Migration completed!`);
        console.log(`   Created: ${created} contacts`);
        console.log(`   Updated: ${updated} contacts`);
        console.log(`   Errors: ${errors}\n`);

        // Show statistics
        const stats = await db.getContactStats();
        console.log('📊 Contact Statistics:');
        console.log(`   Total Contacts: ${stats.totalContacts}`);
        console.log(`   Individuals: ${stats.individuals}`);
        console.log(`   Groups: ${stats.groups}`);
        console.log(`   Newsletters: ${stats.newsletters}`);
        console.log(`   Unknown: ${stats.unknown}`);
        console.log(`   Total Messages: ${stats.totalMessages}\n`);

        // Close database
        await db.close();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run migration
console.log('==========================================');
console.log('  CONTACTS MIGRATION SCRIPT');
console.log('==========================================\n');

migrateContacts()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    });
