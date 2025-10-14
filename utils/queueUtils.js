const queuePublisher = require('../libraries/queue/publisher');
const { extractPhoneNumberFromRemoteJid } = require('./phoneUtils');

/**
 * Publish AI request to RabbitMQ queue for async processing
 * @param {Object} originalData - Original webhook message data
 * @param {string} messageText - The message text
 * @param {Object} aiUserDetails - AI user details including notes
 * @param {Array} senderHistory - Message history
 * @returns {Promise<Object>} Result with success status
 */
async function publishAIRequestToQueue(originalData, messageText, aiUserDetails, senderHistory) {
    try {
        console.log('📤 Publishing AI request to queue...');

        // Extract phone info
        const phoneInfo = extractPhoneNumberFromRemoteJid(originalData.remoteJid);

        // Build contact object
        const contact = {
            remoteJid: originalData.remoteJid,
            phoneNumber: phoneInfo.phoneNumber ? `+${phoneInfo.phoneNumber}` : null,
            name: aiUserDetails?.name || originalData.pushName || 'Unknown',
            pushName: originalData.pushName,
            countryCode: phoneInfo.countryCode
        };

        // Build message object
        const message = {
            text: messageText,
            messageId: originalData.id,
            timestamp: originalData.messageTimestamp
        };

        // Format conversation history
        const conversationHistory = senderHistory.map(msg => {
            return {
                role: 'user', // In the future, we can detect assistant vs user messages
                content: msg.message,
                timestamp: msg.messageTimestamp
            };
        });

        // Build context object
        const context = {
            conversationHistory: conversationHistory,
            userNotes: aiUserDetails?.notes || '',
            sessionData: {
                aiEnabled: true,
                userName: aiUserDetails?.name,
                userPhone: aiUserDetails?.phoneNumber
            },
            priority: 'normal' // Can be adjusted based on user type or message urgency
        };

        // Publish to queue
        const result = await queuePublisher.publishToAgentQueue(
            contact,
            message,
            context,
            'conversation' // taskType - can be extended for other types
        );

        if (result.success) {
            console.log('✅ AI request published to queue:', result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                queue: result.queue,
                mode: 'queue'
            };
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Failed to publish to queue:', error.message);
        return {
            success: false,
            error: error.message,
            mode: 'queue'
        };
    }
}

module.exports = {
    publishAIRequestToQueue
};
