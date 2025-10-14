/**
 * Command-Line Webhook Message Sender
 * Interactive tool to send messages to the WhatsApp webhook API
 * 
 * Usage:
 *   node tests/send-webhook-message.js
 * 
 * Prerequisites:
 *   - Server must be running: node server.js
 */

const readline = require('readline');

// Dynamic imports
let fetch;
let dotenv;

// Configuration
let API_URL;
let WEBHOOK_ENDPOINT;

/**
 * Initialize modules using dynamic imports
 */
async function initialize() {
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;

    dotenv = await import('dotenv');
    dotenv.config();

    API_URL = process.env.API_URL || 'http://localhost:80';
    WEBHOOK_ENDPOINT = `${API_URL}/webhook`;
}

/**
 * Create readline interface for user input
 */
function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

/**
 * Ask a question and get user input
 */
function question(rl, query) {
    return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Create a WhatsApp webhook payload
 */
function createWebhookPayload(phoneNumber, messageText, isGroup = false) {
    const timestamp = Date.now();
    const remoteJid = isGroup
        ? `${phoneNumber}-${Math.floor(timestamp / 1000)}@g.us`
        : `${phoneNumber}@s.whatsapp.net`;

    return {
        event: 'messages.received',
        sessionId: `cli-session-${timestamp}`,
        timestamp: timestamp,
        data: {
            messages: {
                messageTimestamp: Math.floor(timestamp / 1000),
                pushName: 'CLI User',
                remoteJid: remoteJid,
                id: `CLI-MSG-${timestamp}`,
                broadcast: false,
                message: {
                    conversation: messageText
                }
            }
        }
    };
}

/**
 * Send webhook to API
 */
async function sendWebhook(payload) {
    try {
        const response = await fetch(WEBHOOK_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseData.message || 'Request failed'}`);
        }

        return {
            success: true,
            status: response.status,
            data: responseData
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Display response in a formatted way
 */
function displayResponse(result) {
    console.log('\n' + '='.repeat(60));

    if (result.success) {
        console.log('[SUCCESS] Message sent successfully!');
        console.log('='.repeat(60));

        const data = result.data.data;

        if (data.databaseId) {
            console.log(`Database ID: ${data.databaseId}`);
        }

        if (data.messageId) {
            console.log(`Message ID: ${data.messageId}`);
        }

        if (data.contact) {
            console.log(`Contact:`);
            console.log(`   Remote JID: ${data.contact.remoteJid}`);
            if (data.contact.phoneNumber) {
                console.log(`   Phone: ${data.contact.phoneNumber}`);
            }
            if (data.contact.name) {
                console.log(`   Name: ${data.contact.name}`);
            }
        }

        if (data.aiResponse) {
            console.log(`AI Response:`);
            console.log(`   Mode: ${data.aiResponse.mode || 'none'}`);

            if (data.aiResponse.mode === 'queue') {
                console.log(`   Queue: ${data.aiResponse.queue}`);
                console.log(`   Status: ${data.aiResponse.note}`);
            } else if (data.aiResponse.mode === 'direct') {
                console.log(`   Sent: ${data.aiResponse.sent}`);
                if (data.aiResponse.response) {
                    const preview = data.aiResponse.response.substring(0, 100);
                    console.log(`   Response: ${preview}${data.aiResponse.response.length > 100 ? '...' : ''}`);
                }
            }
        } else {
            console.log('[INFO] No AI response (user not AI-enabled)');
        }

    } else {
        console.log('[FAILED] Failed to send message');
        console.log('='.repeat(60));
        console.log(`Error: ${result.error}`);
    }

    console.log('='.repeat(60) + '\n');
}

/**
 * Interactive mode - ask user for input
 */
async function interactiveMode() {
    const rl = createInterface();

    console.log('\nInteractive Webhook Message Sender');
    console.log('='.repeat(60));
    console.log(`Server: ${API_URL}`);
    console.log(`Endpoint: ${WEBHOOK_ENDPOINT}`);
    console.log('='.repeat(60));

    // Check if server is running
    try {
        console.log('\nChecking server status...');
        const healthCheck = await fetch(`${API_URL}/health`);
        if (!healthCheck.ok) {
            throw new Error('Server not responding');
        }
        console.log('[OK] Server is running\n');
    } catch (error) {
        console.error('[ERROR] Server is not running or not accessible');
        console.error('   Please start the server with: node server.js');
        rl.close();
        process.exit(1);
    }

    // Get phone number once at the start
    let phoneNumber;
    let isGroup;

    try {
        const phoneInput = await question(rl, 'Enter phone number: ');

        if (!phoneInput.trim()) {
            console.log('[WARNING] Phone number cannot be empty');
            rl.close();
            process.exit(1);
        }

        phoneNumber = phoneInput.replace(/[^0-9]/g, ''); // Remove non-digits

        if (phoneNumber.length < 10) {
            console.log('[WARNING] Phone number seems too short');
            rl.close();
            process.exit(1);
        }

        // Check if group message
        const isGroupInput = await question(rl, 'Is this a group message? (y/N): ');
        isGroup = isGroupInput.toLowerCase() === 'y' || isGroupInput.toLowerCase() === 'yes';

        console.log(`\n[OK] Sending messages to: ${phoneNumber}${isGroup ? ' (group)' : ''}`);
        console.log('Type "exit" to quit\n');

    } catch (error) {
        console.error('[ERROR] Error:', error.message);
        rl.close();
        process.exit(1);
    }

    // Loop for messages
    let continueLoop = true;

    while (continueLoop) {
        try {
            // Get message
            const message = await question(rl, 'Enter your message (or "exit" to quit): ');

            // Check for exit command
            if (message.toLowerCase() === 'exit') {
                continueLoop = false;
                break;
            }

            if (!message.trim()) {
                console.log('[WARNING] Message cannot be empty');
                continue;
            }

            // Confirm send
            console.log('\nSending message...');
            console.log(`   To: ${phoneNumber}${isGroup ? ' (group)' : ''}`);
            console.log(`   Message: ${message}`);

            // Create and send payload
            const payload = createWebhookPayload(phoneNumber, message, isGroup);
            const result = await sendWebhook(payload);

            // Display result
            displayResponse(result);

        } catch (error) {
            console.error('[ERROR] Error:', error.message);
            continueLoop = false;
        }
    }

    rl.close();
    console.log('\nGoodbye!\n');
}

/**
 * Main entry point
 */
(async () => {
    try {
        // Initialize modules
        await initialize();

        // Run interactive mode
        await interactiveMode();

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
})();
