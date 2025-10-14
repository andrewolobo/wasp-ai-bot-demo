const amqp = require('amqplib');
const { sendWhatsAppMessage } = require('../../utils/messagingUtils');

/**
 * RabbitMQ Queue Consumer
 * Listens to wb_queue for processed AI responses from Python agent
 * and sends them back to WhatsApp users via Wasender API
 */
class QueueConsumer {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.queueName = 'wb_queue';
        this.isConnected = false;
        this.reconnectDelay = 5000; // 5 seconds
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
        this.isShuttingDown = false;
    }

    /**
     * Initialize connection to RabbitMQ and start consuming
     * @returns {Promise<boolean>} Success status
     */
    async connect() {
        try {
            const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            console.log(`🔌 Connecting to RabbitMQ at ${rabbitUrl}...`);

            // Create connection
            this.connection = await amqp.connect(rabbitUrl);
            console.log('✅ RabbitMQ connection established');

            // Create channel
            this.channel = await this.connection.createChannel();
            console.log('✅ RabbitMQ channel created');

            // Assert queue exists
            await this.channel.assertQueue(this.queueName, {
                durable: true,
                arguments: {
                    'x-message-ttl': 60000, // 1 minute TTL
                    'x-dead-letter-exchange': 'dlx_webhook'
                }
            });
            console.log(`✅ Queue '${this.queueName}' ready`);

            // Set prefetch to process multiple messages in parallel
            await this.channel.prefetch(10);

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ RabbitMQ connection error:', err.message);
                if (!this.isShuttingDown) {
                    this.handleDisconnect();
                }
            });

            this.connection.on('close', () => {
                console.log('🔌 RabbitMQ connection closed');
                if (!this.isShuttingDown) {
                    this.handleDisconnect();
                }
            });

            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Start consuming messages
            await this.startConsuming();

            return true;

        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error.message);
            this.isConnected = false;

            // Attempt to reconnect
            if (!this.isShuttingDown) {
                this.handleDisconnect();
            }

            return false;
        }
    }

    /**
     * Handle disconnection and attempt reconnection
     */
    async handleDisconnect() {
        this.isConnected = false;
        this.connection = null;
        this.channel = null;

        if (this.isShuttingDown) {
            return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay / 1000}s...`);

            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('❌ Max reconnection attempts reached. Please restart the service.');
        }
    }

    /**
     * Start consuming messages from wb_queue
     * @returns {Promise<void>}
     */
    async startConsuming() {
        try {
            console.log(`👂 Started listening to '${this.queueName}' for agent responses...`);

            await this.channel.consume(this.queueName, async (msg) => {
                if (msg === null) {
                    return;
                }

                try {
                    await this.processMessage(msg);

                    // Acknowledge message after successful processing
                    this.channel.ack(msg);
                    console.log('✅ Message acknowledged');

                } catch (error) {
                    console.error('❌ Error processing message:', error.message);

                    // Check if message should be retried
                    const retryCount = this.getRetryCount(msg);
                    const maxRetries = 3;

                    if (retryCount < maxRetries) {
                        console.log(`🔄 Requeuing message (retry ${retryCount + 1}/${maxRetries})`);
                        // Reject and requeue for retry
                        this.channel.nack(msg, false, true);
                    } else {
                        console.error('❌ Max retries reached, sending to dead letter queue');
                        // Reject without requeue (goes to DLQ if configured)
                        this.channel.nack(msg, false, false);
                    }
                }
            }, {
                noAck: false // Manual acknowledgment
            });

        } catch (error) {
            console.error('❌ Failed to start consuming:', error.message);
            throw error;
        }
    }

    /**
     * Process a single message from the queue
     * @param {Object} msg - RabbitMQ message
     * @returns {Promise<void>}
     */
    async processMessage(msg) {
        const startTime = Date.now();

        try {
            // Parse message content
            const content = msg.content.toString();
            const data = JSON.parse(content);

            console.log('📥 Received message from wb_queue:', {
                messageId: data.messageId,
                originalMessageId: data.originalMessageId,
                status: data.status,
                contact: data.contact?.phoneNumber,
                timestamp: new Date(data.timestamp).toISOString()
            });

            // Validate message format
            this.validateMessage(data);

            // Handle based on status
            if (data.status === 'success' || data.status === 'partial') {
                await this.handleSuccessResponse(data);
            } else if (data.status === 'error') {
                await this.handleErrorResponse(data);
            } else {
                throw new Error(`Unknown status: ${data.status}`);
            }

            const processingTime = Date.now() - startTime;
            console.log(`⏱️  Message processed in ${processingTime}ms`);

        } catch (error) {
            console.error('❌ Message processing failed:', error.message);
            throw error; // Re-throw to trigger retry logic
        }
    }

    /**
     * Validate message format
     * @param {Object} data - Message data
     * @throws {Error} If validation fails
     */
    validateMessage(data) {
        if (!data.messageId) {
            throw new Error('Missing messageId');
        }

        if (!data.contact || !data.contact.phoneNumber) {
            throw new Error('Missing contact information');
        }

        if (!data.status) {
            throw new Error('Missing status field');
        }

        if (data.status === 'success' || data.status === 'partial') {
            if (!data.response || !data.response.text) {
                throw new Error('Missing response text for success status');
            }
        }
    }

    /**
     * Handle successful AI response
     * @param {Object} data - Message data
     * @returns {Promise<void>}
     */
    async handleSuccessResponse(data) {
        try {
            const { contact, response, agentMetadata } = data;

            console.log('📤 Sending AI response to WhatsApp...');
            console.log(`   Contact: ${contact.phoneNumber} (${contact.name || 'Unknown'})`);
            console.log(`   Response: ${response.text.substring(0, 100)}${response.text.length > 100 ? '...' : ''}`);

            if (agentMetadata) {
                console.log('   Agent metadata:', {
                    toolsUsed: agentMetadata.toolsUsed,
                    processingTime: agentMetadata.processingTime,
                    tokensUsed: agentMetadata.tokensUsed
                });
            }

            // Send message via Wasender API
            const result = await sendWhatsAppMessage(
                contact.phoneNumber,
                response.text
            );

            if (result.success) {
                console.log('✅ WhatsApp message sent successfully');
                console.log(`   Sent to: ${result.sentTo}`);
                console.log(`   Timestamp: ${result.timestamp}`);
            } else {
                throw new Error(`Failed to send WhatsApp message: ${result.error}`);
            }

        } catch (error) {
            console.error('❌ Error handling success response:', error.message);
            throw error;
        }
    }

    /**
     * Handle error response from agent
     * @param {Object} data - Message data
     * @returns {Promise<void>}
     */
    async handleErrorResponse(data) {
        try {
            const { contact, error, response } = data;

            console.error('⚠️  Agent processing error:', {
                code: error?.code,
                message: error?.message,
                contact: contact.phoneNumber
            });

            // Send fallback message to user if response text is provided
            if (response && response.text) {
                console.log('📤 Sending fallback message to user...');

                const result = await sendWhatsAppMessage(
                    contact.phoneNumber,
                    response.text
                );

                if (result.success) {
                    console.log('✅ Fallback message sent successfully');
                } else {
                    console.error('❌ Failed to send fallback message:', result.error);
                }
            } else {
                console.log('ℹ️  No fallback message provided, skipping WhatsApp send');
            }

        } catch (error) {
            console.error('❌ Error handling error response:', error.message);
            throw error;
        }
    }

    /**
     * Get retry count from message headers
     * @param {Object} msg - RabbitMQ message
     * @returns {number} Retry count
     */
    getRetryCount(msg) {
        const headers = msg.properties.headers || {};
        return headers['x-retry-count'] || 0;
    }

    /**
     * Close RabbitMQ connection gracefully
     * @returns {Promise<void>}
     */
    async close() {
        this.isShuttingDown = true;

        try {
            if (this.channel) {
                await this.channel.close();
                console.log('✅ RabbitMQ channel closed');
            }

            if (this.connection) {
                await this.connection.close();
                console.log('✅ RabbitMQ connection closed');
            }

            this.isConnected = false;
            this.channel = null;
            this.connection = null;

        } catch (error) {
            console.error('⚠️  Error closing RabbitMQ connection:', error.message);
        }
    }

    /**
     * Get consumer status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            queueName: this.queueName,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Create and export singleton instance
const queueConsumer = new QueueConsumer();

module.exports = queueConsumer;
