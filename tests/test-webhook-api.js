/**
 * API Webhook Test Script
 * Simulates a WhatsApp webhook by sending a POST request to the /webhook endpoint
 * This tests the complete flow: Webhook → Database → Queue Publisher → ag_queue
 * 
 * Usage: node tests/test-webhook-api.js
 * 
 * Prerequisites:
 * 1. Server must be running: node server.js
 * 2. USE_QUEUE=true in .env (for queue mode testing)
 * 3. RabbitMQ must be running
 */

// Dynamic imports
let fetch;
let dotenv;

// Configuration (will be set after imports)
let API_URL;
let WEBHOOK_ENDPOINT;

/**
 * Create a realistic WhatsApp webhook payload
 */
function createWebhookPayload(phoneNumber = '256784726116', messageText = 'Hi there!') {
    return {
        event: 'messages.received',
        sessionId: 'test-session-' + Date.now(),
        timestamp: Date.now(),
        data: {
            messages: {
                messageTimestamp: Math.floor(Date.now() / 1000),
                pushName: 'Test User',
                remoteJid: `${phoneNumber}@s.whatsapp.net`,
                id: `TEST-MSG-${Date.now()}`,
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
        console.log('📤 Sending webhook to:', WEBHOOK_ENDPOINT);
        console.log('📋 Payload:', JSON.stringify(payload, null, 2));

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
 * Test 1: Send a regular message (non-AI user)
 */
async function testRegularMessage() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Regular Message (Non-AI User)');
    console.log('='.repeat(60));

    const payload = createWebhookPayload('256784726116', 'Hello! How are you?');
    const result = await sendWebhook(payload);

    if (result.success) {
        console.log('✅ Test PASSED');
        console.log('Response:', JSON.stringify(result.data, null, 2));

        // Check response structure
        if (result.data.status === 'success' && result.data.data.messageId) {
            console.log('✅ Message saved to database');
            console.log('   Database ID:', result.data.data.databaseId);
            console.log('   Message ID:', result.data.data.messageId);
        }

        // Check if AI response was triggered
        if (result.data.data.aiResponse) {
            console.log('ℹ️  AI Response:', result.data.data.aiResponse.mode || 'none');
        } else {
            console.log('ℹ️  No AI response (user not AI-enabled)');
        }
    } else {
        console.log('❌ Test FAILED');
        console.log('Error:', result.error);
    }

    return result.success;
}

/**
 * Test 2: Send message from AI-enabled user (requires user in database)
 */
async function testAIEnabledMessage() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: AI-Enabled User Message');
    console.log('='.repeat(60));
    console.log('ℹ️  Note: This requires the user to be added as AI-enabled first');
    console.log('   Use: POST /ai/users/add with remoteJid');

    // Use a specific AI-enabled user JID (should be configured in your system)
    const payload = createWebhookPayload('256703722777', 'What is the weather today?');
    const result = await sendWebhook(payload);

    if (result.success) {
        console.log('✅ Test PASSED');
        console.log('Response:', JSON.stringify(result.data, null, 2));

        // Check if AI processing was triggered
        if (result.data.data.aiResponse) {
            const aiResponse = result.data.data.aiResponse;
            console.log('✅ AI Processing triggered');
            console.log('   Mode:', aiResponse.mode); // 'queue' or 'direct'

            if (aiResponse.mode === 'queue') {
                console.log('   Message ID:', aiResponse.messageId);
                console.log('   Queue:', aiResponse.queue);
                console.log('   Status:', aiResponse.note);
            } else if (aiResponse.mode === 'direct') {
                console.log('   Sent:', aiResponse.sent);
                console.log('   Phone:', aiResponse.phoneNumber);
                if (aiResponse.response) {
                    console.log('   Response:', aiResponse.response.substring(0, 100) + '...');
                }
            }
        } else {
            console.log('⚠️  No AI response triggered (user may not be AI-enabled)');
        }
    } else {
        console.log('❌ Test FAILED');
        console.log('Error:', result.error);
    }

    return result.success;
}

/**
 * Test 3: Send multiple messages rapidly
 */
async function testMultipleMessages() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Multiple Messages (Rapid Fire)');
    console.log('='.repeat(60));

    const messages = [
        'First message',
        'Second message',
        'Third message',
        'Fourth message',
        'Fifth message'
    ];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < messages.length; i++) {
        const payload = createWebhookPayload('256703722777', messages[i]);
        console.log(`\nSending message ${i + 1}/${messages.length}: "${messages[i]}"`);

        const result = await sendWebhook(payload);

        if (result.success) {
            console.log(`✅ Message ${i + 1} sent successfully`);
            successCount++;
        } else {
            console.log(`❌ Message ${i + 1} failed:`, result.error);
            failCount++;
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Results:');
    console.log(`   Successful: ${successCount}/${messages.length}`);
    console.log(`   Failed: ${failCount}/${messages.length}`);

    return failCount === 0;
}

/**
 * Test 4: Test with different message types
 */
async function testDifferentMessageTypes() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Different Message Types');
    console.log('='.repeat(60));

    const testCases = [
        {
            name: 'Simple text',
            payload: createWebhookPayload('256703722777', 'Hello')
        },
        {
            name: 'Long message',
            payload: createWebhookPayload('256703722777', 'This is a very long message that contains a lot of text to test how the system handles longer messages with multiple sentences and possibly complex content.')
        },
        {
            name: 'Message with emojis',
            payload: createWebhookPayload('256703722777', 'Hello! 👋 How are you? 😊🎉')
        },
        {
            name: 'Message with special characters',
            payload: createWebhookPayload('256703722777', 'Test @#$%^&*() special chars!')
        },
        {
            name: 'Group message',
            payload: (() => {
                const p = createWebhookPayload('256704966899', 'Group message test');
                p.data.messages.remoteJid = '256704966899-1625215002@g.us';
                return p;
            })()
        }
    ];

    let successCount = 0;

    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.name}`);
        const result = await sendWebhook(testCase.payload);

        if (result.success) {
            console.log(`✅ ${testCase.name} - PASSED`);
            successCount++;
        } else {
            console.log(`❌ ${testCase.name} - FAILED:`, result.error);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Results: ${successCount}/${testCases.length} passed`);
    return successCount === testCases.length;
}

/**
 * Test 5: Test error handling
 */
async function testErrorHandling() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Error Handling');
    console.log('='.repeat(60));

    const testCases = [
        {
            name: 'Invalid payload (missing event)',
            payload: { data: {} },
            expectFail: true
        },
        {
            name: 'Invalid payload (missing data)',
            payload: { event: 'messages.received', sessionId: 'test' },
            expectFail: true
        },
        {
            name: 'Empty payload',
            payload: {},
            expectFail: true
        }
    ];

    let successCount = 0;

    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.name}`);
        const result = await sendWebhook(testCase.payload);

        if (testCase.expectFail) {
            if (!result.success) {
                console.log(`✅ ${testCase.name} - PASSED (correctly rejected)`);
                successCount++;
            } else {
                console.log(`❌ ${testCase.name} - FAILED (should have been rejected)`);
            }
        } else {
            if (result.success) {
                console.log(`✅ ${testCase.name} - PASSED`);
                successCount++;
            } else {
                console.log(`❌ ${testCase.name} - FAILED:`, result.error);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Results: ${successCount}/${testCases.length} passed`);
    return successCount === testCases.length;
}

/**
 * Initialize modules using dynamic imports
 */
async function initialize() {
    // Import modules dynamically
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;

    dotenv = await import('dotenv');
    dotenv.config();

    // Set configuration after dotenv is loaded
    API_URL = process.env.API_URL || 'http://localhost:80';
    WEBHOOK_ENDPOINT = `${API_URL}/webhook`;
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('\n🧪 API Webhook Test Suite');
    console.log('='.repeat(60));
    console.log('Server URL:', API_URL);
    console.log('Webhook Endpoint:', WEBHOOK_ENDPOINT);
    console.log('Queue Mode:', process.env.USE_QUEUE === 'true' ? 'Enabled' : 'Disabled');
    console.log('='.repeat(60));

    // Check if server is running
    try {
        const healthCheck = await fetch(`${API_URL}/health`);
        if (!healthCheck.ok) {
            throw new Error('Server not responding');
        }
        console.log('✅ Server is running');
    } catch (error) {
        console.error('❌ Server is not running or not accessible');
        console.error('   Please start the server with: node server.js');
        process.exit(1);
    }

    const results = {
        total: 0,
        passed: 0,
        failed: 0
    };

    // Run all tests
    const tests = [
        { name: 'Regular Message', fn: testRegularMessage },
        // { name: 'AI-Enabled Message', fn: testAIEnabledMessage },
        // { name: 'Multiple Messages', fn: testMultipleMessages },
        // { name: 'Different Message Types', fn: testDifferentMessageTypes },
        // { name: 'Error Handling', fn: testErrorHandling }
    ];

    for (const test of tests) {
        results.total++;
        const passed = await test.fn();
        if (passed) {
            results.passed++;
        } else {
            results.failed++;
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed} ✅`);
    console.log(`Failed: ${results.failed} ${results.failed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (results.failed === 0) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Please review the output above.');
        process.exit(1);
    }
}

// Initialize and run tests
(async () => {
    try {
        await initialize();
        await runAllTests();
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
})();
