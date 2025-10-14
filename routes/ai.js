const express = require('express');
const router = express.Router();

/**
 * POST /ai/chat
 * Azure OpenAI Chat Completion Endpoint
 */
router.post('/chat', async (req, res) => {
    try {
        const azureOpenAI = req.app.get('azureOpenAI');
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

/**
 * POST /ai/analyze-conversation
 * WhatsApp Conversation Analysis with AI
 */
router.post('/analyze-conversation', async (req, res) => {
    try {
        const db = req.app.get('db');
        const azureOpenAI = req.app.get('azureOpenAI');
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

/**
 * POST /ai/summarize
 * Summarize Messages with AI
 */
router.post('/summarize', async (req, res) => {
    try {
        const db = req.app.get('db');
        const azureOpenAI = req.app.get('azureOpenAI');
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

/**
 * POST /ai/users/add
 * Add a user to AI-enabled list
 */
router.post('/users/add', async (req, res) => {
    try {
        const db = req.app.get('db');
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

/**
 * DELETE /ai/users/remove
 * Remove a user from AI-enabled list (soft delete)
 */
router.delete('/users/remove', async (req, res) => {
    try {
        const db = req.app.get('db');
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

/**
 * DELETE /ai/users/delete
 * Permanently delete a user from AI-enabled list
 */
router.delete('/users/delete', async (req, res) => {
    try {
        const db = req.app.get('db');
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

/**
 * PATCH /ai/users/toggle
 * Toggle AI-enabled status for a user
 */
router.patch('/users/toggle', async (req, res) => {
    try {
        const db = req.app.get('db');
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

/**
 * GET /ai/users/list
 * Get all AI-enabled users
 */
router.get('/users/list', async (req, res) => {
    try {
        const db = req.app.get('db');
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

/**
 * GET /ai/users/:remoteJid
 * Get details of a specific AI-enabled user
 */
router.get('/users/:remoteJid', async (req, res) => {
    try {
        const db = req.app.get('db');
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

/**
 * GET /ai/users/check/:remoteJid
 * Check if a user is AI-enabled
 */
router.get('/users/check/:remoteJid', async (req, res) => {
    try {
        const db = req.app.get('db');
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

module.exports = router;
