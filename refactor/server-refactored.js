const express = require('express');
const WhatsAppDB = require('./libraries/database/db-helper');
const AzureOpenAIHelper = require('./libraries/ai/azure-openai-helper');
const queuePublisher = require('./libraries/queue/publisher');
require('dotenv').config();

// Import routes
const webhookRoutes = require('./routes/webhook');
const messagesRoutes = require('./routes/messages');
const aiRoutes = require('./routes/ai');
const phoneRoutes = require('./routes/phone');
const contactsRoutes = require('./routes/contacts');
const messagingRoutes = require('./routes/messaging');

const app = express();
const PORT = 80;

// Queue mode flag - set USE_QUEUE=true in .env to enable queue-based processing
const USE_QUEUE = process.env.USE_QUEUE === 'true';

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

// Make db and azureOpenAI available to routes
app.set('db', db);
app.set('azureOpenAI', azureOpenAI);

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

// Register routes
app.use('/webhook', webhookRoutes);
app.use('/messages', messagesRoutes);
app.use('/ai', aiRoutes);
app.use('/phone', phoneRoutes);
app.use('/contacts', contactsRoutes);
app.use('/message', messagingRoutes);

// Start the server
async function startServer() {
    try {
        await initializeDatabase();

        // Initialize RabbitMQ connection if queue mode is enabled
        if (USE_QUEUE) {
            console.log('🔌 Queue mode enabled - connecting to RabbitMQ...');
            const queueConnected = await queuePublisher.connect();
            if (queueConnected) {
                console.log('✅ RabbitMQ publisher initialized successfully');
            } else {
                console.warn('⚠️  RabbitMQ connection failed. Will retry automatically.');
            }
        } else {
            console.log('⚡ Direct mode enabled - AI requests will be processed synchronously');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`🎯 AI Processing Mode: ${USE_QUEUE ? 'QUEUE (Async)' : 'DIRECT (Sync)'}`);
            console.log('📋 Available endpoints:');
            console.log('  POST /webhook - Receive WhatsApp webhooks');
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
        // Close database connection
        await db.close();
        console.log('✅ Database connection closed');

        // Close RabbitMQ connection if queue mode was enabled
        if (USE_QUEUE && queuePublisher.isConnected) {
            await queuePublisher.close();
            console.log('✅ RabbitMQ connection closed');
        }
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
    }
    process.exit(0);
});

startServer();
