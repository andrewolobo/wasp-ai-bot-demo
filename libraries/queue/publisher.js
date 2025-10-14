const amqp = require('amqplib');

class QueuePublisher {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000; // 5 seconds
        this.uuidv4 = null; // Will be loaded dynamically

        // Queue configuration from spec
        this.AGENT_QUEUE = 'ag_queue';
        this.QUEUE_CONFIG = {
            durable: true,
            arguments: {
                'x-message-ttl': 300000, // 5 minutes
                'x-dead-letter-exchange': 'dlx_agent'
            }
        };
    }

    /**
     * Load uuid module dynamically (ESM module)
     * @returns {Promise<Function>} UUID v4 generator function
     */
    async loadUUID() {
        if (!this.uuidv4) {
            const { v4 } = await import('uuid');
            this.uuidv4 = v4;
        }
        return this.uuidv4;
    }

    /**
     * Connect to RabbitMQ and setup channel
     * @returns {Promise<boolean>} Success status
     */
    async connect() {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:wasp_rabbit_2024@localhost:5672';

            console.log('🔌 Connecting to RabbitMQ...');
            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Assert agent queue exists with proper configuration
            await this.channel.assertQueue(this.AGENT_QUEUE, this.QUEUE_CONFIG);

            this.isConnected = true;
            this.reconnectAttempts = 0;

            console.log('✅ RabbitMQ Publisher connected successfully');

            // Handle connection errors
            this.connection.on('error', (err) => {
                console.error('❌ RabbitMQ connection error:', err.message);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.warn('⚠️  RabbitMQ connection closed');
                this.isConnected = false;
                this.reconnect();
            });

            return true;
        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error.message);
            this.isConnected = false;
            this.reconnect();
            return false;
        }
    }

    /**
     * Reconnect to RabbitMQ with exponential backoff
     */
    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached. Giving up.');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`🔄 Reconnecting to RabbitMQ in ${delay / 1000} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Publish AI processing request to agent queue
     * @param {Object} contact - Contact information
     * @param {Object} message - Message data
     * @param {Object} context - Conversation context
     * @param {string} taskType - Type of task (conversation|appointment|order|search)
     * @returns {Promise<Object>} Result with success status and messageId
     */
    async publishToAgentQueue(contact, message, context, taskType = 'conversation') {
        if (!this.isConnected) {
            return {
                success: false,
                error: 'Not connected to RabbitMQ'
            };
        }

        try {
            // Load UUID dynamically if not already loaded
            const uuidv4 = await this.loadUUID();
            const messageId = uuidv4();
            const timestamp = Math.floor(Date.now() / 1000);

            // Build message payload according to spec
            const payload = {
                messageId: messageId,
                timestamp: timestamp,
                taskType: taskType,
                contact: {
                    remoteJid: contact.remoteJid,
                    phoneNumber: contact.phoneNumber,
                    name: contact.name || contact.pushName || 'Unknown',
                    countryCode: contact.countryCode || null
                },
                message: {
                    text: message.text,
                    messageId: message.id || message.messageId,
                    timestamp: message.timestamp || timestamp
                },
                context: {
                    conversationHistory: context.conversationHistory || [],
                    userNotes: context.userNotes || '',
                    sessionData: context.sessionData || {}
                },
                metadata: {
                    priority: context.priority || 'normal',
                    retryCount: 0,
                    maxRetries: 3
                }
            };

            // Convert to buffer
            const messageBuffer = Buffer.from(JSON.stringify(payload));

            // Publish to queue
            const published = this.channel.sendToQueue(
                this.AGENT_QUEUE,
                messageBuffer,
                {
                    persistent: true,
                    contentType: 'application/json',
                    timestamp: Date.now(),
                    messageId: messageId
                }
            );

            if (published) {
                console.log('📤 Published to agent queue:', {
                    messageId: messageId,
                    contact: contact.phoneNumber,
                    taskType: taskType
                });

                return {
                    success: true,
                    messageId: messageId,
                    queue: this.AGENT_QUEUE,
                    timestamp: timestamp
                };
            } else {
                throw new Error('Failed to publish message to queue');
            }

        } catch (error) {
            console.error('❌ Error publishing to agent queue:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Close connection gracefully
     */
    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            console.log('✅ RabbitMQ Publisher connection closed');
        } catch (error) {
            console.error('❌ Error closing RabbitMQ connection:', error.message);
        }
    }
}

// Export singleton instance
const publisher = new QueuePublisher();

module.exports = publisher;
