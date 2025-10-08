const express = require('express');
const WhatsAppDB = require('./libraries/database/db-helper');
const AzureOpenAIHelper = require('./libraries/ai/azure-openai-helper');
require('dotenv').config();

const app = express();
const PORT = 80;

/**
 * Extract phone number from WhatsApp remoteJid
 * Handles different WhatsApp ID formats:
 * - Individual users: 256703722777@s.whatsapp.net
 * - Group chats: 256704966899-1625215002@g.us
 * - Newsletter channels: 120363169319669622@newsletter
 * 
 * @param {string} remoteJid - The WhatsApp remote JID
 * @returns {object} Extracted information including phone number, type, and original ID
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

            // Validate phone number (should be numeric and reasonable length)
            if (/^\d{7,15}$/.test(phoneNumber)) {
                result.phoneNumber = phoneNumber;
                result.type = 'individual';
                result.isValid = true;

                // Extract country code (common patterns)
                // Priority order: 3-digit codes, then 2-digit, then 1-digit
                if (phoneNumber.length >= 10) {
                    // Common 3-digit country codes
                    const commonThreeDigit = ['256', '263', '234', '254', '255', '233', '372'];
                    // Common 2-digit country codes  
                    const commonTwoDigit = ['44', '49', '33', '39', '34', '91', '86', '81', '55', '27'];
                    // Common 1-digit country codes
                    const commonOneDigit = ['1', '7'];

                    // Try 3-digit codes first
                    const threeDigit = phoneNumber.substring(0, 3);
                    if (commonThreeDigit.includes(threeDigit) && phoneNumber.length >= 12) {
                        result.countryCode = threeDigit;
                        result.localNumber = phoneNumber.substring(3);
                    }
                    // Try 2-digit codes
                    else {
                        const twoDigit = phoneNumber.substring(0, 2);
                        if (commonTwoDigit.includes(twoDigit) && phoneNumber.length >= 10) {
                            result.countryCode = twoDigit;
                            result.localNumber = phoneNumber.substring(2);
                        }
                        // Try 1-digit codes
                        else {
                            const oneDigit = phoneNumber.substring(0, 1);
                            if (commonOneDigit.includes(oneDigit) && phoneNumber.length >= 10) {
                                result.countryCode = oneDigit;
                                result.localNumber = phoneNumber.substring(1);
                            }
                            // Fallback: assume 3-digit country code for African numbers starting with 2
                            else if (phoneNumber.startsWith('2') && phoneNumber.length >= 12) {
                                result.countryCode = phoneNumber.substring(0, 3);
                                result.localNumber = phoneNumber.substring(3);
                            }
                            // Default fallback
                            else if (phoneNumber.length >= 10) {
                                result.countryCode = phoneNumber.substring(0, 2);
                                result.localNumber = phoneNumber.substring(2);
                            }
                        }
                    }
                }                // If no country code detected, treat as local number
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

                    // Extract country code for group admin (same logic as individual)
                    if (phoneNumber.length >= 10) {
                        // Common 3-digit country codes
                        const commonThreeDigit = ['256', '263', '234', '254', '255', '233', '372'];
                        // Common 2-digit country codes  
                        const commonTwoDigit = ['44', '49', '33', '39', '34', '91', '86', '81', '55', '27'];
                        // Common 1-digit country codes
                        const commonOneDigit = ['1', '7'];

                        // Try 3-digit codes first
                        const threeDigit = phoneNumber.substring(0, 3);
                        if (commonThreeDigit.includes(threeDigit) && phoneNumber.length >= 12) {
                            result.countryCode = threeDigit;
                            result.localNumber = phoneNumber.substring(3);
                        }
                        // Try 2-digit codes
                        else {
                            const twoDigit = phoneNumber.substring(0, 2);
                            if (commonTwoDigit.includes(twoDigit) && phoneNumber.length >= 10) {
                                result.countryCode = twoDigit;
                                result.localNumber = phoneNumber.substring(2);
                            }
                            // Try 1-digit codes
                            else {
                                const oneDigit = phoneNumber.substring(0, 1);
                                if (commonOneDigit.includes(oneDigit) && phoneNumber.length >= 10) {
                                    result.countryCode = oneDigit;
                                    result.localNumber = phoneNumber.substring(1);
                                }
                                // Fallback: assume 3-digit country code for African numbers starting with 2
                                else if (phoneNumber.startsWith('2') && phoneNumber.length >= 12) {
                                    result.countryCode = phoneNumber.substring(0, 3);
                                    result.localNumber = phoneNumber.substring(3);
                                }
                                // Default fallback
                                else if (phoneNumber.length >= 10) {
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
        }

        // Newsletter/Channel: channelId@newsletter
        else if (remoteJid.includes('@newsletter')) {
            const channelId = remoteJid.replace('@newsletter', '');

            if (/^\d{10,20}$/.test(channelId)) {
                result.channelId = channelId;
                result.type = 'newsletter';
                result.isValid = true;
                // Note: Newsletter channels don't have extractable phone numbers
                // but we mark them as valid for identification purposes
            }
        }

        // Unknown format
        else {
            result.type = 'unknown';
            result.error = 'Unrecognized remoteJid format';
        }

    } catch (error) {
        result.error = `Parsing error: ${error.message}`;
    }

    return result;
}

/**
 * Format phone number for display
 * @param {object} extractedInfo - Result from extractPhoneNumberFromRemoteJid
 * @returns {string} Formatted phone number or identifier
 */
function formatPhoneNumber(extractedInfo) {
    if (!extractedInfo.isValid) {
        return extractedInfo.originalJid || 'Invalid';
    }

    switch (extractedInfo.type) {
        case 'individual':
            if (extractedInfo.countryCode && extractedInfo.localNumber) {
                return `+${extractedInfo.countryCode} ${extractedInfo.localNumber}`;
            }
            return extractedInfo.phoneNumber || extractedInfo.originalJid;

        case 'group':
            const adminPhone = extractedInfo.countryCode && extractedInfo.localNumber
                ? `+${extractedInfo.countryCode} ${extractedInfo.localNumber}`
                : extractedInfo.phoneNumber;
            return `Group (Admin: ${adminPhone})`;

        case 'newsletter':
            return `Newsletter (${extractedInfo.channelId})`;

        default:
            return extractedInfo.originalJid;
    }
}

/**
 * Send WhatsApp message using Wasender API
 * @param {string} to - Destination phone number (with country code, e.g., "+1234567890")
 * @param {string} text - Message text to send
 * @param {string} apiToken - Wasender API bearer token (optional, uses env var if not provided)
 * @returns {Promise<object>} API response with success status and details
 */
async function sendWhatsAppMessage(to, text, apiToken = null) {
    const token = apiToken || process.env.WASENDER_API_TOKEN;
    const apiUrl = process.env.WASENDER_API_URL || 'https://wasenderapi.com/api/send-message';

    if (!token) {
        throw new Error('Wasender API token is required. Please set WASENDER_API_TOKEN in your environment variables.');
    }

    if (!to || !text) {
        throw new Error('Phone number and message text are required');
    }

    // Ensure phone number starts with + for international format
    const formattedTo = to.startsWith('+') ? to : `+${to}`;

    const payload = {
        to: formattedTo,
        text: text
    };

    try {
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`Wasender API error: ${response.status} - ${responseData.message || 'Unknown error'}`);
        }

        return {
            success: true,
            statusCode: response.status,
            data: responseData,
            sentTo: formattedTo,
            messageText: text,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error sending WhatsApp message:', error.message);
        return {
            success: false,
            error: error.message,
            sentTo: formattedTo,
            messageText: text,
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize database connection
const db = new WhatsAppDB();

// Initialize Azure OpenAI helper
const azureOpenAI = new AzureOpenAIHelper();

// Initialize database connection on startup
async function initializeDatabase() {
    try {
        await db.connect();
        console.log('✅ Database connected successfully');

        // Validate Azure OpenAI configuration
        azureOpenAI.validateConfiguration();
        console.log('✅ Azure OpenAI configuration validated');

        // Validate Wasender API configuration
        if (!process.env.WASENDER_API_TOKEN) {
            throw new Error('WASENDER_API_TOKEN environment variable is required');
        }
        if (!process.env.WASENDER_API_URL) {
            console.warn('⚠️  WASENDER_API_URL not set, using default: https://wasenderapi.com/api/send-message');
        }
        console.log('✅ Wasender API configuration validated');

    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        process.exit(1);
    }
}

// Middleware to parse JSON requests
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'Wasender API is running.',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API is healthy'
    });
});

app.post('/webhook', async (req, res) => {
    try {
        const webhookData = req.body;
        //console.log('📨 Webhook received:', JSON.stringify(webhookData, null, 2));

        // Validate webhook data structure
        if (!webhookData.event || !webhookData.sessionId || !webhookData.data) {
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

                // Check if user is AI-enabled in database
                let aiResponse = null;
                const isAIEnabled = await db.isAIEnabled(originalData.remoteJid);

                if (isAIEnabled) {
                    try {
                        console.log('🤖 AI-enabled user detected, processing AI response...');

                        // Update last interaction time
                        await db.updateAIUserInteraction(originalData.remoteJid);

                        // Get AI user details (including notes)
                        const aiUserDetails = await db.getAIUser(originalData.remoteJid);
                        console.log('👤 AI user details retrieved:', aiUserDetails?.name || 'Unknown');

                        // Get message history for this sender
                        const senderHistory = await db.getMessagesByContact(originalData.remoteJid, 20);
                        console.log(`📚 Retrieved ${senderHistory.length} messages from history`);

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

Please respond as Joshua in a helpful, friendly, and contextually appropriate way. Keep your response concise and conversational, suitable for WhatsApp messaging.`;

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
                                    sent: true,
                                    phoneNumber: phoneNumber,
                                    response: llmResponse,
                                    sendResult: sendResult
                                };
                            } else {
                                console.error('❌ Failed to send AI response:', sendResult.error);
                                aiResponse = {
                                    sent: false,
                                    error: sendResult.error,
                                    phoneNumber: phoneNumber,
                                    response: llmResponse
                                };
                            }
                        } else {
                            console.error('❌ Could not extract valid phone number from:', originalData.remoteJid);
                            aiResponse = {
                                sent: false,
                                error: 'Could not extract valid phone number',
                                response: llmResponse
                            };
                        }

                    } catch (aiError) {
                        console.error('❌ AI processing error:', aiError.message);
                        aiResponse = {
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

// Get messages by session
app.get('/messages/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await db.getMessagesBySession(sessionId, limit);
        res.json({
            status: 'success',
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('❌ Error getting messages by session:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get messages',
            error: error.message
        });
    }
});

// Get messages by contact
app.get('/messages/contact/:remoteJid', async (req, res) => {
    try {
        const { remoteJid } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await db.getMessagesByContact(remoteJid, limit);
        res.json({
            status: 'success',
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('❌ Error getting messages by contact:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get messages',
            error: error.message
        });
    }
});

// Search messages
app.get('/messages/search', async (req, res) => {
    try {
        const { q: searchTerm } = req.query;
        const limit = parseInt(req.query.limit) || 50;

        if (!searchTerm) {
            return res.status(400).json({
                status: 'error',
                message: 'Search term (q) is required'
            });
        }

        const messages = await db.searchMessages(searchTerm, limit);
        res.json({
            status: 'success',
            count: messages.length,
            searchTerm,
            messages
        });
    } catch (error) {
        console.error('❌ Error searching messages:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search messages',
            error: error.message
        });
    }
});

// Get recent messages
app.get('/messages/recent', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const limit = parseInt(req.query.limit) || 100;

        const messages = await db.getRecentMessages(hours, limit);
        res.json({
            status: 'success',
            count: messages.length,
            timeframe: `${hours} hours`,
            messages
        });
    } catch (error) {
        console.error('❌ Error getting recent messages:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get recent messages',
            error: error.message
        });
    }
});

// Get message statistics
app.get('/messages/stats', async (req, res) => {
    try {
        const stats = await db.getMessageStats();
        res.json({
            status: 'success',
            stats
        });
    } catch (error) {
        console.error('❌ Error getting message stats:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get message statistics',
            error: error.message
        });
    }
});

// Azure OpenAI Chat Completion Endpoint
app.post('/ai/chat', async (req, res) => {
    try {
        const { message, messages, options = {} } = req.body;

        // Validate input
        if (!message && !messages) {
            return res.status(400).json({
                status: 'error',
                message: 'Either "message" (string) or "messages" (array) is required'
            });
        }

        const input = message || messages;
        const result = await azureOpenAI.getChatCompletion(input, options);

        res.json({
            status: 'success',
            ...result
        });

    } catch (error) {
        console.error('❌ AI chat error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get AI response',
            error: error.message
        });
    }
});

// WhatsApp Conversation Analysis with AI
app.post('/ai/analyze-conversation', async (req, res) => {
    try {
        const { sessionId, remoteJid, prompt, limit = 10 } = req.body;

        if (!prompt) {
            return res.status(400).json({
                status: 'error',
                message: 'Prompt is required'
            });
        }

        let messages = [];

        // Get conversation context
        if (sessionId) {
            messages = await db.getMessagesBySession(sessionId, limit);
        } else if (remoteJid) {
            messages = await db.getMessagesByContact(remoteJid, limit);
        } else {
            return res.status(400).json({
                status: 'error',
                message: 'Either sessionId or remoteJid is required'
            });
        }

        // Process conversation with AI
        const result = await azureOpenAI.processWhatsAppConversation(messages, prompt);

        res.json({
            status: 'success',
            conversationContext: messages.length,
            prompt,
            ...result
        });

    } catch (error) {
        console.error('❌ AI conversation analysis error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to analyze conversation',
            error: error.message
        });
    }
});

// Summarize Messages with AI
app.post('/ai/summarize', async (req, res) => {
    try {
        const { sessionId, remoteJid, hours = 24, limit = 50 } = req.body;

        let messages = [];

        // Get messages to summarize
        if (sessionId) {
            messages = await db.getMessagesBySession(sessionId, limit);
        } else if (remoteJid) {
            messages = await db.getMessagesByContact(remoteJid, limit);
        } else {
            // Get recent messages if no specific target
            messages = await db.getRecentMessages(hours, limit);
        }

        if (messages.length === 0) {
            return res.json({
                status: 'success',
                message: 'No messages found to summarize',
                summary: null
            });
        }

        // Generate summary with AI
        const result = await azureOpenAI.summarizeMessages(messages);

        res.json({
            status: 'success',
            messagesAnalyzed: messages.length,
            timeframe: sessionId ? 'session' : remoteJid ? 'contact' : `${hours} hours`,
            summary: result.message,
            usage: result.usage
        });

    } catch (error) {
        console.error('❌ AI summarization error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to summarize messages',
            error: error.message
        });
    }
});

// ==========================================
// AI-ENABLED USERS MANAGEMENT ENDPOINTS
// ==========================================

// Add a user to AI-enabled list
app.post('/ai/users/add', async (req, res) => {
    try {
        const { remoteJid, phoneNumber, name, notes } = req.body;

        if (!remoteJid) {
            return res.status(400).json({
                status: 'error',
                message: 'remoteJid is required',
                example: {
                    remoteJid: "256703722777@s.whatsapp.net",
                    phoneNumber: "+256703722777",
                    name: "John Doe",
                    notes: "VIP customer"
                }
            });
        }

        const result = await db.addAIUser(remoteJid, phoneNumber, name, notes);

        res.json({
            status: 'success',
            message: 'User added to AI-enabled list',
            data: result
        });

    } catch (error) {
        console.error('❌ Error adding AI user:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add AI user',
            error: error.message
        });
    }
});

// Remove a user from AI-enabled list (soft delete)
app.delete('/ai/users/remove', async (req, res) => {
    try {
        const { remoteJid } = req.body;

        if (!remoteJid) {
            return res.status(400).json({
                status: 'error',
                message: 'remoteJid is required'
            });
        }

        const removed = await db.removeAIUser(remoteJid);

        if (removed) {
            res.json({
                status: 'success',
                message: 'User removed from AI-enabled list',
                remoteJid: remoteJid
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

    } catch (error) {
        console.error('❌ Error removing AI user:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to remove AI user',
            error: error.message
        });
    }
});

// Permanently delete a user from AI-enabled list
app.delete('/ai/users/delete', async (req, res) => {
    try {
        const { remoteJid } = req.body;

        if (!remoteJid) {
            return res.status(400).json({
                status: 'error',
                message: 'remoteJid is required'
            });
        }

        const deleted = await db.deleteAIUser(remoteJid);

        if (deleted) {
            res.json({
                status: 'success',
                message: 'User permanently deleted from AI-enabled list',
                remoteJid: remoteJid
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

    } catch (error) {
        console.error('❌ Error deleting AI user:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete AI user',
            error: error.message
        });
    }
});

// Toggle AI-enabled status for a user
app.patch('/ai/users/toggle', async (req, res) => {
    try {
        const { remoteJid } = req.body;

        if (!remoteJid) {
            return res.status(400).json({
                status: 'error',
                message: 'remoteJid is required'
            });
        }

        const result = await db.toggleAIUser(remoteJid);

        res.json({
            status: 'success',
            message: `User AI status toggled to ${result.enabled ? 'enabled' : 'disabled'}`,
            data: result
        });

    } catch (error) {
        console.error('❌ Error toggling AI user:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to toggle AI user status',
            error: error.message
        });
    }
});

// Get all AI-enabled users
app.get('/ai/users/list', async (req, res) => {
    try {
        const includeDisabled = req.query.includeDisabled === 'true';
        const users = await db.getAIUsers(includeDisabled);

        res.json({
            status: 'success',
            count: users.length,
            includeDisabled: includeDisabled,
            users: users
        });

    } catch (error) {
        console.error('❌ Error listing AI users:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to list AI users',
            error: error.message
        });
    }
});

// Get details of a specific AI-enabled user
app.get('/ai/users/:remoteJid', async (req, res) => {
    try {
        const remoteJid = decodeURIComponent(req.params.remoteJid);
        const user = await db.getAIUser(remoteJid);

        if (user) {
            res.json({
                status: 'success',
                data: user
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'User not found in AI-enabled list'
            });
        }

    } catch (error) {
        console.error('❌ Error getting AI user:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get AI user',
            error: error.message
        });
    }
});

// Check if a user is AI-enabled
app.get('/ai/users/check/:remoteJid', async (req, res) => {
    try {
        const remoteJid = decodeURIComponent(req.params.remoteJid);
        const isEnabled = await db.isAIEnabled(remoteJid);

        res.json({
            status: 'success',
            remoteJid: remoteJid,
            isAIEnabled: isEnabled
        });

    } catch (error) {
        console.error('❌ Error checking AI status:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check AI status',
            error: error.message
        });
    }
});

// Phone Number Extraction Endpoints

// Extract phone number from a single remoteJid
app.post('/phone/extract', (req, res) => {
    try {
        const { remoteJid } = req.body;

        if (!remoteJid) {
            return res.status(400).json({
                status: 'error',
                message: 'remoteJid is required'
            });
        }

        const extractedInfo = extractPhoneNumberFromRemoteJid(remoteJid);
        const formattedNumber = formatPhoneNumber(extractedInfo);

        res.json({
            status: 'success',
            input: remoteJid,
            extracted: extractedInfo,
            formatted: formattedNumber
        });

    } catch (error) {
        console.error('❌ Phone extraction error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to extract phone number',
            error: error.message
        });
    }
});

// Get phone numbers from all contacts in database
app.get('/phone/contacts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const type = req.query.type; // 'individual', 'group', 'newsletter', or undefined for all

        // Get distinct remoteJids from database
        const query = `
            SELECT DISTINCT remoteJid, pushName, COUNT(*) as messageCount, 
                   MAX(timestamp) as lastMessageTime
            FROM whatsapp_messages 
            GROUP BY remoteJid 
            ORDER BY lastMessageTime DESC 
            LIMIT ?
        `;

        // Use database connection to get contacts
        await new Promise((resolve, reject) => {
            db.db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const contacts = rows.map(row => {
                    const extractedInfo = extractPhoneNumberFromRemoteJid(row.remoteJid);
                    const formattedNumber = formatPhoneNumber(extractedInfo);

                    return {
                        remoteJid: row.remoteJid,
                        pushName: row.pushName,
                        messageCount: row.messageCount,
                        lastMessageTime: row.lastMessageTime,
                        phoneInfo: extractedInfo,
                        formattedNumber: formattedNumber
                    };
                });

                // Filter by type if specified
                const filteredContacts = type
                    ? contacts.filter(contact => contact.phoneInfo.type === type)
                    : contacts;

                res.json({
                    status: 'success',
                    totalContacts: filteredContacts.length,
                    filter: type || 'all',
                    contacts: filteredContacts
                });

                resolve();
            });
        });

    } catch (error) {
        console.error('❌ Error getting contacts:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get contacts',
            error: error.message
        });
    }
});

// Get phone number statistics
app.get('/phone/stats', async (req, res) => {
    try {
        // Get all distinct remoteJids
        const query = 'SELECT DISTINCT remoteJid FROM whatsapp_messages';

        await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const stats = {
                    total: rows.length,
                    individual: 0,
                    groups: 0,
                    newsletters: 0,
                    unknown: 0,
                    countryCodes: {},
                    examples: {
                        individual: [],
                        group: [],
                        newsletter: [],
                        unknown: []
                    }
                };

                rows.forEach(row => {
                    const extractedInfo = extractPhoneNumberFromRemoteJid(row.remoteJid);

                    // Count by type
                    switch (extractedInfo.type) {
                        case 'individual':
                            stats.individual++;
                            if (stats.examples.individual.length < 3) {
                                stats.examples.individual.push(formatPhoneNumber(extractedInfo));
                            }
                            break;
                        case 'group':
                            stats.groups++;
                            if (stats.examples.group.length < 3) {
                                stats.examples.group.push(formatPhoneNumber(extractedInfo));
                            }
                            break;
                        case 'newsletter':
                            stats.newsletters++;
                            if (stats.examples.newsletter.length < 3) {
                                stats.examples.newsletter.push(formatPhoneNumber(extractedInfo));
                            }
                            break;
                        default:
                            stats.unknown++;
                            if (stats.examples.unknown.length < 3) {
                                stats.examples.unknown.push(row.remoteJid);
                            }
                    }

                    // Count country codes
                    if (extractedInfo.countryCode) {
                        stats.countryCodes[extractedInfo.countryCode] =
                            (stats.countryCodes[extractedInfo.countryCode] || 0) + 1;
                    }
                });

                res.json({
                    status: 'success',
                    stats: stats
                });

                resolve();
            });
        });

    } catch (error) {
        console.error('❌ Error getting phone stats:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get phone statistics',
            error: error.message
        });
    }
});

// Send WhatsApp message endpoint
app.post('/message/send', async (req, res) => {
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

// Bulk send messages endpoint
app.post('/message/send-bulk', async (req, res) => {
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
        const results = [];
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

// Start the server
async function startServer() {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log('📋 Available endpoints:');
            console.log('  POST /webhook - Receive WhatsApp webhooks');
            console.log('  GET /messages/session/:sessionId - Get messages by session');
            console.log('  GET /messages/contact/:remoteJid - Get messages by contact');
            console.log('  GET /messages/search?q=term - Search messages');
            console.log('  GET /messages/recent?hours=24 - Get recent messages');
            console.log('  GET /messages/stats - Get message statistics');
            console.log('  POST /ai/chat - Azure OpenAI chat completion');
            console.log('  POST /ai/analyze-conversation - AI conversation analysis');
            console.log('  POST /ai/summarize - AI message summarization');
            console.log('  POST /phone/extract - Extract phone from remoteJid');
            console.log('  GET /phone/contacts - Get all contacts with phone info');
            console.log('  GET /phone/stats - Get phone number statistics');
            console.log('  GET /health - Health check');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('⏹️  Shutting down gracefully...');
    try {
        await db.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database:', error.message);
    }
    process.exit(0);
});

startServer();