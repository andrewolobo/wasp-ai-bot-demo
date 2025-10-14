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

module.exports = {
    sendWhatsAppMessage
};
