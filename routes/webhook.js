const express = require('express');
const router = express.Router();
const { extractPhoneNumberFromRemoteJid } = require('../utils/phoneUtils');
const { sendWhatsAppMessage } = require('../utils/messagingUtils');
const { publishAIRequestToQueue } = require('../utils/queueUtils');

// Queue mode flag
const USE_QUEUE = process.env.USE_QUEUE === 'true';

/**
 * POST /webhook
 * Receive and process WhatsApp webhook messages
 */
router.post('/', async (req, res) => {
    try {
        const webhookData = req.body;
        console.log('📨 Webhook received:', JSON.stringify(webhookData, null, 2));

        // Get dependencies from req.app
        const db = req.app.get('db');
        const azureOpenAI = req.app.get('azureOpenAI');

        // Validate webhook data structure
        if (!webhookData.event || !(webhookData.sessionId || webhookData.session_id) || !webhookData.data) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid webhook data structure'
            });
        }

        // Check if this is a messages event
        if (webhookData.event === 'messages.received' && webhookData.data.messages) {
            try {
                // Restructure the data to match the expected database format
                const originalData = webhookData.data.messages;

                // Extract message text from the message object
                let messageText = '';
                if (originalData.message) {
                    if (originalData.message.conversation) {
                        messageText = originalData.message.conversation;
                    } else if (originalData.message.extendedTextMessage) {
                        messageText = originalData.message.extendedTextMessage.text;
                    } else if (originalData.message.imageMessage && originalData.message.imageMessage.caption) {
                        messageText = originalData.message.imageMessage.caption;
                    } else if (originalData.message.videoMessage && originalData.message.videoMessage.caption) {
                        messageText = originalData.message.videoMessage.caption;
                    } else {
                        // If no text content, store the message type
                        messageText = Object.keys(originalData.message)[0] || 'Unknown message type';
                    }
                }

                // Restructure the webhook data to match database expectations
                const restructuredData = {
                    event: webhookData.event,
                    sessionId: webhookData.sessionId,
                    timestamp: webhookData.timestamp,
                    data: {
                        messages: {
                            messageTimestamp: originalData.messageTimestamp,
                            pushName: originalData.pushName || 'Unknown', // Handle missing pushName
                            remoteJid: originalData.remoteJid,
                            id: originalData.id,
                            message: messageText,
                            broadcast: originalData.broadcast || false
                        }
                    }
                };

                console.log('📝 Restructured data for database:', JSON.stringify(restructuredData.data.messages, null, 2));

                // Insert message into database
                const result = await db.insertMessage(restructuredData);
                console.log('✅ Message saved to database:', result);

                // Save/update contact information
                try {
                    // For group messages, check if there's a participant field (actual sender)
                    // participant field contains the JID of the person who sent the message in the group
                    let contactJid = originalData.remoteJid;
                    let isGroupMessage = false;

                    // Check if this is a group message by looking at remoteJid
                    if (originalData.remoteJid && originalData.remoteJid.includes('@g.us')) {
                        isGroupMessage = true;

                        // Look for participant in various possible locations in the webhook data
                        if (originalData.participant) {
                            contactJid = originalData.participant;
                        } else if (originalData.key && originalData.key.participant) {
                            contactJid = originalData.key.participant;
                        } else if (webhookData.data.messages.participant) {
                            contactJid = webhookData.data.messages.participant;
                        }

                        console.log('👥 Group message detected. Group:', originalData.remoteJid, 'Participant:', contactJid);
                    }

                    // Extract phone info from the contact JID (participant for groups, remoteJid for individuals)
                    const phoneInfo = extractPhoneNumberFromRemoteJid(contactJid);
                    const contactData = {
                        remoteJid: contactJid,
                        phoneNumber: phoneInfo.phoneNumber ? `+${phoneInfo.phoneNumber}` : null,
                        countryCode: phoneInfo.countryCode,
                        localNumber: phoneInfo.localNumber,
                        pushName: originalData.pushName || 'Unknown',
                        contactType: phoneInfo.type || 'unknown',
                        groupId: isGroupMessage ? originalData.remoteJid : (phoneInfo.groupId || null),
                        channelId: phoneInfo.channelId || null
                    };

                    const contactResult = await db.saveContact(contactData);
                    console.log('👤 Contact saved:', contactResult.action, '-', contactResult.remoteJid);
                } catch (contactError) {
                    console.error('⚠️  Failed to save contact:', contactError.message);
                    // Don't fail the whole request if contact saving fails
                }

                // Check if user is AI-enabled in database
                let aiResponse = null;
                const isAIEnabled = await db.isAIEnabled(originalData.remoteJid);

                if (isAIEnabled) {
                    try {
                        console.log(`🤖 AI-enabled user detected, processing in ${USE_QUEUE ? 'QUEUE' : 'DIRECT'} mode...`);

                        // Update last interaction time
                        await db.updateAIUserInteraction(originalData.remoteJid);

                        // Get AI user details (including notes)
                        const aiUserDetails = await db.getAIUser(originalData.remoteJid);
                        console.log('👤 AI user details retrieved:', aiUserDetails?.name || 'Unknown');

                        // Get message history for this sender
                        const senderHistory = await db.getMessagesByContact(originalData.remoteJid, 20);
                        console.log(`📚 Retrieved ${senderHistory.length} messages from history`);

                        // Check if USE_QUEUE flag is enabled
                        if (USE_QUEUE) {
                            // ===== QUEUE MODE: Publish to RabbitMQ =====
                            console.log('📮 Queue mode enabled - publishing to RabbitMQ...');

                            const queueResult = await publishAIRequestToQueue(
                                originalData,
                                messageText,
                                aiUserDetails,
                                senderHistory
                            );

                            if (queueResult.success) {
                                aiResponse = {
                                    mode: 'queue',
                                    queued: true,
                                    messageId: queueResult.messageId,
                                    queue: queueResult.queue,
                                    note: 'AI request queued for async processing. Response will be sent when agent completes processing.'
                                };
                            } else {
                                throw new Error(`Queue publishing failed: ${queueResult.error}`);
                            }

                        } else {
                            // ===== DIRECT MODE: Process immediately with Azure OpenAI =====
                            console.log('⚡ Direct mode enabled - processing with Azure OpenAI...');

                            // Format history for LLM context
                            const conversationHistory = senderHistory.map(msg => {
                                const timestamp = new Date(msg.messageTimestamp * 1000).toLocaleString();
                                return `[${timestamp}] ${msg.pushName || 'User'}: ${msg.message}`;
                            }).join('\n');

                            // Build user context section with notes if available
                            let userContext = '';
                            if (aiUserDetails) {
                                userContext = '\nUSER CONTEXT:\n';
                                if (aiUserDetails.name) {
                                    //userContext += `- Name: ${aiUserDetails.name}\n`;
                                }
                                if (aiUserDetails.phoneNumber) {
                                    //userContext += `- Phone: ${aiUserDetails.phoneNumber}\n`;
                                }
                                if (aiUserDetails.notes) {
                                    userContext += `- Notes: ${aiUserDetails.notes}\n`;
                                }
                                userContext += '\n';
                            }

                            // Create context-aware prompt for the LLM
                            const aiPrompt = `You are Joshua(Andrew's AI Assistant). As a helpful AI assistant, you are purposed with responding to WhatsApp messages. Here is the some context on contact and recent conversation history them:
CONTEXT:
                        ${userContext}
CONVERSATION HISTORY:
${conversationHistory}

The user just sent: "${messageText}"

Please respond as Joshua in a helpful, friendly, and contextually appropriate way. Keep your response concise and conversational, suitable for WhatsApp messaging. NOTE: DO NOT YOUR NAME OR TIMESTAMP TO THE TEXT. DO NOT USE EMOJIS. END RESPONSES NATURALLY. DO NOT FOLLOW UP WITH A QUESTION`;

                            // Get AI response
                            const aiResult = await azureOpenAI.getChatCompletion(aiPrompt, {
                                max_tokens: 200,
                                temperature: 0.7
                            });

                            if (!aiResult.success) {
                                throw new Error('AI response generation failed');
                            }

                            const llmResponse = aiResult.message;
                            console.log('🧠 LLM response generated:', llmResponse.substring(0, 100) + '...');

                            // Extract phone number from remoteJid for sending response
                            const phoneInfo = extractPhoneNumberFromRemoteJid(originalData.remoteJid);
                            let phoneNumber = null;

                            if (phoneInfo.isValid && phoneInfo.countryCode && phoneInfo.localNumber) {
                                phoneNumber = `+${phoneInfo.countryCode}${phoneInfo.localNumber}`;
                            } else if (phoneInfo.phoneNumber) {
                                phoneNumber = `+${phoneInfo.phoneNumber}`;
                            }

                            if (phoneNumber) {
                                // Send AI response back to the user
                                const sendResult = await sendWhatsAppMessage(phoneNumber, llmResponse);

                                if (sendResult.success) {
                                    console.log('✅ AI response sent successfully to:', phoneNumber);
                                    aiResponse = {
                                        mode: 'direct',
                                        sent: true,
                                        phoneNumber: phoneNumber,
                                        response: llmResponse,
                                        sendResult: sendResult
                                    };
                                } else {
                                    console.error('❌ Failed to send AI response:', sendResult.error);
                                    aiResponse = {
                                        mode: 'direct',
                                        sent: false,
                                        error: sendResult.error,
                                        phoneNumber: phoneNumber,
                                        response: llmResponse
                                    };
                                }
                            } else {
                                console.error('❌ Could not extract valid phone number from:', originalData.remoteJid);
                                aiResponse = {
                                    mode: 'direct',
                                    sent: false,
                                    error: 'Could not extract valid phone number',
                                    response: llmResponse
                                };
                            }
                        }

                    } catch (aiError) {
                        console.error('❌ AI processing error:', aiError.message);
                        aiResponse = {
                            mode: USE_QUEUE ? 'queue' : 'direct',
                            sent: false,
                            error: `AI processing failed: ${aiError.message}`
                        };
                    }
                }

                res.json({
                    status: 'success',
                    message: 'Message received and saved',
                    data: {
                        messageId: result.messageId,
                        databaseId: result.id,
                        messageText: messageText,
                        contact: originalData.remoteJid,
                        aiResponse: aiResponse
                    }
                });
            } catch (dbError) {
                console.error('❌ Database error:', dbError.message);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to save message to database',
                    error: dbError.message
                });
            }
        } else {
            // Handle other webhook events (non-message events)
            console.log('ℹ️  Non-message webhook event received:', webhookData.event);
            res.json({
                status: 'success',
                message: 'Webhook received (non-message event)',
                event: webhookData.event
            });
        }
    } catch (error) {
        console.error('❌ Webhook processing error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;
