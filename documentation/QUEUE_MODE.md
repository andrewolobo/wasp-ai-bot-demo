# Queue Mode Implementation

## Overview

The application now supports **two modes** for processing AI requests from WhatsApp messages:

1. **Direct Mode (Synchronous)** - Default behavior

   - AI requests are processed immediately using Azure OpenAI
   - Response is sent back to the user within the webhook request
   - Suitable for simple conversational responses

2. **Queue Mode (Asynchronous)** - New feature
   - AI requests are published to RabbitMQ for async processing
   - Webhook responds immediately (200 OK)
   - Python AI Agent service processes requests from the queue
   - Enables complex agentic workflows with Google ADK

## Configuration

### Environment Variable

Add to your `.env` file:

```env
# Queue Mode Configuration
USE_QUEUE=false   # Set to 'true' to enable queue mode

# RabbitMQ Configuration (required if USE_QUEUE=true)
RABBITMQ_URL=amqp://admin:wasp_rabbit_2024@localhost:5672
```

### Mode Selection

- `USE_QUEUE=false` (or not set) → **Direct Mode** - Processes AI requests synchronously
- `USE_QUEUE=true` → **Queue Mode** - Publishes AI requests to RabbitMQ

## Architecture

### Direct Mode Flow

```
WhatsApp → Webhook → Azure OpenAI → Response → WhatsApp
                       (Synchronous)
```

### Queue Mode Flow

```
WhatsApp → Webhook → RabbitMQ (ag_queue) → Python Agent (Google ADK)
              ↓                                       ↓
         200 OK                          RabbitMQ (wb_queue)
                                                     ↓
                                            Node.js Consumer
                                                     ↓
                                                WhatsApp
```

## Implementation Details

### Files Created/Modified

1. **`libraries/queue/publisher.js`** - New file

   - RabbitMQ publisher singleton
   - Handles connection, reconnection, and publishing
   - Formats messages according to queue spec

2. **`server.js`** - Modified

   - Added `USE_QUEUE` flag configuration
   - Added `publishAIRequestToQueue()` function
   - Modified webhook handler to support both modes
   - Added queue initialization in `startServer()`
   - Added queue cleanup in graceful shutdown

3. **`.env.example`** - New file
   - Documents all required environment variables
   - Includes `USE_QUEUE` and `RABBITMQ_URL`

### Queue Message Format

Messages published to `ag_queue` follow this structure:

```json
{
  "messageId": "uuid-v4",
  "timestamp": 1234567890,
  "taskType": "conversation",
  "contact": {
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777",
    "name": "John Doe",
    "countryCode": "256"
  },
  "message": {
    "text": "User's message text",
    "messageId": "whatsapp-message-id",
    "timestamp": 1234567890
  },
  "context": {
    "conversationHistory": [
      { "role": "user", "content": "Previous message", "timestamp": 123456789 }
    ],
    "userNotes": "VIP customer - priority support",
    "sessionData": {
      "aiEnabled": true,
      "userName": "John Doe",
      "userPhone": "+256703722777"
    }
  },
  "metadata": {
    "priority": "normal",
    "retryCount": 0,
    "maxRetries": 3
  }
}
```

### Webhook Behavior Changes

#### When `USE_QUEUE=false` (Direct Mode)

```javascript
// Webhook receives message
// ↓
// Stores message in database
// ↓
// Checks if AI-enabled
// ↓
// Processes with Azure OpenAI (synchronous)
// ↓
// Sends response to WhatsApp
// ↓
// Returns 200 OK with response details
```

**Response includes:**

```json
{
  "status": "success",
  "message": "Message received and saved",
  "data": {
    "messageId": "...",
    "aiResponse": {
      "mode": "direct",
      "sent": true,
      "response": "AI generated response"
    }
  }
}
```

#### When `USE_QUEUE=true` (Queue Mode)

```javascript
// Webhook receives message
// ↓
// Stores message in database
// ↓
// Checks if AI-enabled
// ↓
// Publishes to RabbitMQ ag_queue (async)
// ↓
// Returns 200 OK immediately
```

**Response includes:**

```json
{
  "status": "success",
  "message": "Message received and saved",
  "data": {
    "messageId": "...",
    "aiResponse": {
      "mode": "queue",
      "queued": true,
      "messageId": "uuid-v4",
      "queue": "ag_queue",
      "note": "AI request queued for async processing..."
    }
  }
}
```

## Usage

### Starting in Direct Mode (Default)

1. Ensure `.env` has `USE_QUEUE=false` or omit it
2. Start server:
   ```bash
   npm start
   ```
3. Console output will show:
   ```
   ⚡ Direct mode enabled - AI requests will be processed synchronously
   🎯 AI Processing Mode: DIRECT (Sync)
   ```

### Starting in Queue Mode

1. Ensure RabbitMQ is running:

   ```bash
   cd rabbit-mq
   run-rabbit.bat
   ```

2. Set `.env`:

   ```env
   USE_QUEUE=true
   RABBITMQ_URL=amqp://admin:wasp_rabbit_2024@localhost:5672
   ```

3. Start server:

   ```bash
   npm start
   ```

4. Console output will show:
   ```
   🔌 Queue mode enabled - connecting to RabbitMQ...
   ✅ RabbitMQ publisher initialized successfully
   🎯 AI Processing Mode: QUEUE (Async)
   ```

### Monitoring Queue Activity

When a message is published in queue mode:

```
🤖 AI-enabled user detected, processing in QUEUE mode...
👤 AI user details retrieved: John Doe
📚 Retrieved 15 messages from history
📮 Queue mode enabled - publishing to RabbitMQ...
📤 Published to agent queue: {
  messageId: '123e4567-e89b-12d3-a456-426614174000',
  contact: '+256703722777',
  taskType: 'conversation'
}
```

## Error Handling

### Queue Connection Failures

If RabbitMQ is not available when `USE_QUEUE=true`:

```
❌ Failed to connect to RabbitMQ: connect ECONNREFUSED
🔄 Reconnecting to RabbitMQ in 5 seconds (attempt 1/10)...
```

The publisher will retry with exponential backoff (up to 10 attempts).

### Fallback Behavior

If publishing fails, the webhook will return an error in the aiResponse:

```json
{
  "aiResponse": {
    "mode": "queue",
    "sent": false,
    "error": "Not connected to RabbitMQ"
  }
}
```

## Testing

### Test Direct Mode

```http
POST http://localhost/webhook
Content-Type: application/json

{
  "event": "messages.received",
  "sessionId": "test-session",
  "timestamp": 1234567890,
  "data": {
    "messages": {
      "remoteJid": "256703722777@s.whatsapp.net",
      "pushName": "Test User",
      "message": { "conversation": "Hello" },
      "messageTimestamp": 1234567890,
      "id": "test-message-id"
    }
  }
}
```

### Test Queue Mode

1. Set `USE_QUEUE=true` in `.env`
2. Send same request as above
3. Check RabbitMQ management UI: http://localhost:15672
4. Verify message appears in `ag_queue`

## Next Steps

To complete the queue architecture:

1. **Implement Queue Consumer** (Node.js)

   - Listen to `wb_queue` for agent responses
   - Send WhatsApp messages via Wasender API

2. **Implement Python Agent Service**
   - Consume from `ag_queue`
   - Process with Google ADK
   - Publish results to `wb_queue`

See `rabbit-mq/queue-feature-spec.md` for complete implementation details.

## Benefits of Queue Mode

1. **Scalability** - Multiple agent instances can process requests in parallel
2. **Reliability** - Messages persist in queue if processing fails
3. **Flexibility** - Enable complex agentic workflows with tools (database, web search, etc.)
4. **Performance** - Webhook responds immediately, doesn't wait for AI processing
5. **Monitoring** - Track queue depths, processing times, and failures
6. **Extensibility** - Easy to add new agent types or processing logic

## Troubleshooting

### Server won't start with queue mode

**Problem:** `Cannot find module 'amqplib'`

**Solution:** Install dependencies

```bash
npm install
```

### Queue not receiving messages

**Problem:** Messages published but not appearing in RabbitMQ

**Solution:** Check RabbitMQ is running and accessible

```bash
docker ps | findstr rabbit
```

### Messages stuck in queue

**Problem:** Messages in `ag_queue` but not being processed

**Solution:** Python agent service not running. Start the agent consumer (to be implemented).

---

**Created:** 2025-01-10  
**Author:** GitHub Copilot  
**Related Files:**

- `libraries/queue/publisher.js`
- `server.js`
- `.env.example`
- `rabbit-mq/queue-feature-spec.md`
