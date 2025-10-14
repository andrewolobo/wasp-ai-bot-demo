const express = require('express');
const router = express.Router();
const { sendWhatsAppMessage } = require('../utils/messagingUtils');

/**
 * POST /message/send
 * Send WhatsApp message endpoint
 */
router.post('/send', async (req, res) => {
    try {
        const { to, text, apiToken } = req.body;

        // Validate required fields
        if (!to || !text) {
            return res.status(400).json({
                status: 'error',
                message: 'Phone number (to) and message text are required',
                example: {
                    to: "+1234567890",
                    text: "Hello from API!"
                }
            });
        }

        // Send the message
        const result = await sendWhatsAppMessage(to, text, apiToken);

        if (result.success) {
            res.json({
                status: 'success',
                message: 'WhatsApp message sent successfully',
                data: result
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Failed to send WhatsApp message',
                error: result.error,
                details: result
            });
        }

    } catch (error) {
        console.error('❌ Error in send message endpoint:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while sending message',
            error: error.message
        });
    }
});

/**
 * POST /message/send-bulk
 * Bulk send messages endpoint
 */
router.post('/send-bulk', async (req, res) => {
    try {
        const { messages, apiToken } = req.body;

        // Validate required fields
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Messages array is required',
                example: {
                    messages: [
                        { to: "+1234567890", text: "Hello!" },
                        { to: "+0987654321", text: "Hi there!" }
                    ]
                }
            });
        }

        // Validate each message
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (!msg.to || !msg.text) {
                return res.status(400).json({
                    status: 'error',
                    message: `Message at index ${i} is missing 'to' or 'text' field`
                });
            }
        }

        // Send all messages
        const sendPromises = messages.map(async (msg, index) => {
            try {
                const result = await sendWhatsAppMessage(msg.to, msg.text, apiToken);
                return { index, ...result };
            } catch (error) {
                return {
                    index,
                    success: false,
                    error: error.message,
                    sentTo: msg.to,
                    messageText: msg.text,
                    timestamp: new Date().toISOString()
                };
            }
        });

        const allResults = await Promise.all(sendPromises);

        const successful = allResults.filter(r => r.success).length;
        const failed = allResults.filter(r => !r.success).length;

        res.json({
            status: 'completed',
            message: `Bulk send completed: ${successful} successful, ${failed} failed`,
            summary: {
                total: messages.length,
                successful,
                failed
            },
            results: allResults
        });

    } catch (error) {
        console.error('❌ Error in bulk send endpoint:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while sending bulk messages',
            error: error.message
        });
    }
});

module.exports = router;
