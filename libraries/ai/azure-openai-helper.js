const { AzureOpenAI } = require('openai');
require('dotenv').config();

/**
 * Azure OpenAI helper class for GPT-4o integration
 */
class AzureOpenAIHelper {
    constructor() {
        // Initialize Azure OpenAI client
        this.client = new AzureOpenAI({
            apiKey: process.env.AZURE_OPENAI_API_KEY,
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        });

        this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        this.model = process.env.AZURE_OPENAI_MODEL || 'gpt-4o';
        this.maxTokens = parseInt(process.env.MAX_TOKENS) || 1500;
        this.temperature = parseFloat(process.env.TEMPERATURE) || 0.7;
    }

    /**
     * Validate that all required environment variables are set
     */
    validateConfiguration() {
        const required = [
            'AZURE_OPENAI_API_KEY',
            'AZURE_OPENAI_ENDPOINT',
            'AZURE_OPENAI_API_VERSION',
            'AZURE_OPENAI_DEPLOYMENT_NAME'
        ];

        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Send a chat completion request to Azure OpenAI GPT-4o
     * @param {string|Array} messages - User message or array of messages
     * @param {Object} options - Additional options for the request
     */
    async getChatCompletion(messages, options = {}) {
        try {
            // Ensure messages is in the correct format
            let formattedMessages;
            if (typeof messages === 'string') {
                formattedMessages = [
                    { role: 'user', content: messages }
                ];
            } else if (Array.isArray(messages)) {
                formattedMessages = messages;
            } else {
                throw new Error('Messages must be a string or array of message objects');
            }

            const requestParams = {
                model: this.deploymentName,
                messages: formattedMessages,
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature !== undefined ? options.temperature : this.temperature,
                ...options
            };

            console.log('🤖 Sending request to Azure OpenAI:', {
                deployment: this.deploymentName,
                messages: formattedMessages.length,
                maxTokens: requestParams.max_tokens,
                temperature: requestParams.temperature
            });

            const response = await this.client.chat.completions.create(requestParams);

            console.log('✅ Received response from Azure OpenAI:', {
                promptTokens: response.usage?.prompt_tokens,
                completionTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens
            });

            return {
                success: true,
                message: response.choices[0]?.message?.content,
                usage: response.usage,
                model: response.model,
                finishReason: response.choices[0]?.finish_reason
            };

        } catch (error) {
            console.error('❌ Azure OpenAI error:', error.message);

            // Handle specific error types
            if (error.status === 401) {
                throw new Error('Authentication failed. Please check your API key.');
            } else if (error.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (error.status === 404) {
                throw new Error('Deployment not found. Please check your deployment name.');
            }

            throw new Error(`Azure OpenAI API error: ${error.message}`);
        }
    }

    /**
     * Create a conversation with context from WhatsApp messages
     * @param {Array} whatsappMessages - Array of WhatsApp message objects
     * @param {string} userPrompt - Current user prompt
     */
    async processWhatsAppConversation(whatsappMessages, userPrompt) {
        try {
            // Format WhatsApp messages for context
            const conversationContext = whatsappMessages.map(msg => ({
                role: 'user',
                content: `[${msg.pushName || 'Unknown'}]: ${msg.message}`
            }));

            // Add system prompt for WhatsApp context
            const systemPrompt = {
                role: 'system',
                content: 'You are an AI assistant helping to analyze and respond to WhatsApp conversations. Provide helpful, contextual responses based on the conversation history.'
            };

            // Combine system prompt, conversation context, and current prompt
            const messages = [
                systemPrompt,
                ...conversationContext.slice(-10), // Keep last 10 messages for context
                { role: 'user', content: userPrompt }
            ];

            return await this.getChatCompletion(messages);

        } catch (error) {
            throw new Error(`Failed to process WhatsApp conversation: ${error.message}`);
        }
    }

    /**
     * Generate a summary of recent messages
     * @param {Array} messages - Array of message objects
     */
    async summarizeMessages(messages) {
        try {
            const messagesText = messages.map(msg =>
                `${msg.pushName || 'Unknown'} (${msg.readable_timestamp}): ${msg.message}`
            ).join('\n');

            const prompt = `Please provide a concise summary of the following WhatsApp conversation:\n\n${messagesText}`;

            return await this.getChatCompletion(prompt, { maxTokens: 500 });

        } catch (error) {
            throw new Error(`Failed to summarize messages: ${error.message}`);
        }
    }
}

module.exports = AzureOpenAIHelper;