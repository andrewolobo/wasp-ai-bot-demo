/**
 * Test script for Queue Consumer
 * This script sends a test message to wb_queue to verify the consumer is working
 * 
 * Usage: node test-queue-consumer.js
 */

const amqp = require('amqplib');
require('dotenv').config();

async function sendTestMessage() {
    let connection = null;
    let channel = null;

    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        console.log(`🔌 Connecting to RabbitMQ at ${rabbitUrl}...`);

        // Connect to RabbitMQ
        connection = await amqp.connect(rabbitUrl);
        console.log('✅ Connected to RabbitMQ');

        // Create channel
        channel = await connection.createChannel();
        console.log('✅ Channel created');

        // Assert queue exists
        await channel.assertQueue('wb_queue', {
            durable: true,
            arguments: {
                'x-message-ttl': 60000,
                'x-dead-letter-exchange': 'dlx_webhook'
            }
        });
        console.log('✅ Queue asserted');

        // Create test message
        const testMessage = {
            messageId: `test-${Date.now()}`,
            originalMessageId: `orig-${Date.now()}`,
            timestamp: Date.now(),
            status: "success",
            contact: {
                remoteJid: "256784726116@s.whatsapp.net",
                phoneNumber: "+256784726116", // Change this to your test number
                name: "Test User"
            },
            response: {
                text: "🧪 This is a test message from the queue consumer test script. If you receive this, the consumer is working correctly!",
                type: "text",
                attachments: []
            },
            agentMetadata: {
                toolsUsed: ["test_tool"],
                reasoningSteps: ["Generated test response"],
                processingTime: 0.5,
                tokensUsed: 25
            }
        };

        console.log('\n📤 Sending test message to wb_queue...');
        console.log('Message details:', {
            messageId: testMessage.messageId,
            contact: testMessage.contact.phoneNumber,
            status: testMessage.status,
            responsePreview: testMessage.response.text.substring(0, 50) + '...'
        });

        // Send message to queue
        channel.sendToQueue(
            'wb_queue',
            Buffer.from(JSON.stringify(testMessage)),
            {
                persistent: true,
                contentType: 'application/json'
            }
        );

        console.log('✅ Test message sent to wb_queue');
        console.log('\n📋 Next steps:');
        console.log('1. Check the server console logs for consumer activity');
        console.log('2. Verify the WhatsApp message was received at:', testMessage.contact.phoneNumber);
        console.log('3. Look for these log messages:');
        console.log('   - 📥 Received message from wb_queue');
        console.log('   - 📤 Sending AI response to WhatsApp');
        console.log('   - ✅ WhatsApp message sent successfully');
        console.log('   - ✅ Message acknowledged');

        // Wait a bit for message to be sent
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Close connections
        await channel.close();
        await connection.close();
        console.log('\n✅ Test completed');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure RabbitMQ is running: rabbitmqctl status');
        console.error('2. Ensure server is running with USE_QUEUE=true');
        console.error('3. Check RABBITMQ_URL in .env file');
        console.error('4. Verify WASENDER_API_TOKEN is set in .env');
        process.exit(1);
    }
}

// Run the test
console.log('🧪 Queue Consumer Test Script');
console.log('='.repeat(50));
sendTestMessage().catch(console.error);
