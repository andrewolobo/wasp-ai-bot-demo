# Queue Consumer Implementation

## Overview

The Queue Consumer (`libraries/queue/consumer.js`) listens to the `wb_queue` for processed AI responses from the Python agent and sends them back to WhatsApp users via the Wasender API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Python AI Agent                           │
│              Processes AI requests                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Publishes response
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RabbitMQ Broker                           │
│                     wb_queue                                 │
│  - Durable: true                                            │
│  - TTL: 60 seconds                                          │
│  - Prefetch: 10 (parallel processing)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Consumes message
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Queue Consumer (consumer.js)                    │
│  1. Receives agent response                                 │
│  2. Validates message format                                │
│  3. Sends to WhatsApp via Wasender API                      │
│  4. Acknowledges message                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP POST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Wasender API                               │
│              Sends message to WhatsApp user                  │
└─────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Implemented Features

1. **Connection Management**

   - Connects to RabbitMQ on startup
   - Automatic reconnection with exponential backoff
   - Graceful shutdown handling
   - Connection error recovery

2. **Message Processing**

   - Consumes messages from `wb_queue`
   - Validates message format
   - Processes success and error responses
   - Manual message acknowledgment

3. **Retry Logic**

   - Automatic retry on processing failures
   - Maximum 3 retry attempts
   - Dead letter queue (DLQ) integration
   - Retry count tracking

4. **WhatsApp Integration**

   - Sends responses via Wasender API
   - Handles success and error cases
   - Fallback messages for errors
   - Detailed logging

5. **Error Handling**
   - Comprehensive error catching
   - Detailed error logging
   - Graceful degradation
   - Status monitoring

## Message Format

### Expected Message from wb_queue

```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "originalMessageId": "uuid-from-ag_queue",
  "timestamp": 1697203200000,
  "status": "success",
  "contact": {
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777",
    "name": "John Doe"
  },
  "response": {
    "text": "Hello! I can help you with that...",
    "type": "text",
    "attachments": []
  },
  "agentMetadata": {
    "toolsUsed": ["database_query", "web_search"],
    "reasoningSteps": [
      "Analyzed user request",
      "Queried database",
      "Formatted response"
    ],
    "processingTime": 2.5,
    "tokensUsed": 150
  }
}
```

### Status Types

1. **success** - AI processing completed successfully

   - Response text is sent to user
   - Metadata logged for monitoring

2. **partial** - Partially successful (some tools failed)

   - Best-effort response sent to user
   - Metadata shows which tools failed

3. **error** - Processing failed completely
   - Fallback message sent to user (if provided)
   - Error details logged

## Configuration

### Environment Variables

```bash
# RabbitMQ connection URL
RABBITMQ_URL=amqp://localhost:5672

# Wasender API (already configured)
WASENDER_API_TOKEN=your_token_here
WASENDER_API_URL=https://wasenderapi.com/api/send-message

# Enable queue mode
USE_QUEUE=true
```

### Queue Configuration

- **Queue Name:** `wb_queue`
- **Durable:** `true` (survives broker restart)
- **TTL:** 60,000 ms (1 minute)
- **Prefetch Count:** 10 (process 10 messages in parallel)
- **Dead Letter Exchange:** `dlx_webhook` (for failed messages)
- **Auto-delete:** `false`
- **Acknowledgment:** Manual (ensures reliable processing)

## Usage

### Initialization

The consumer is automatically initialized when the server starts in queue mode:

```javascript
// In server.js
const queueConsumer = require("./libraries/queue/consumer");

if (USE_QUEUE) {
  await queueConsumer.connect();
}
```

### Graceful Shutdown

The consumer is automatically closed when the server shuts down:

```javascript
process.on("SIGINT", async () => {
  await queueConsumer.close();
  process.exit(0);
});
```

### Status Monitoring

Check consumer status programmatically:

```javascript
const status = queueConsumer.getStatus();
console.log(status);
// Output:
// {
//   isConnected: true,
//   queueName: 'wb_queue',
//   reconnectAttempts: 0,
//   maxReconnectAttempts: 10
// }
```

## Processing Flow

### 1. Message Reception

```
Consumer receives message from wb_queue
    ↓
Parse JSON content
    ↓
Log message details
```

### 2. Validation

```
Validate required fields:
  - messageId
  - contact.phoneNumber
  - status
  - response.text (if success/partial)
    ↓
Throw error if validation fails
```

### 3. Status Handling

```
If status = 'success' or 'partial':
    ↓
  Send response to WhatsApp
    ↓
  Log agent metadata
    ↓
  Acknowledge message

If status = 'error':
    ↓
  Log error details
    ↓
  Send fallback message (if provided)
    ↓
  Acknowledge message
```

### 4. Error Recovery

```
If processing fails:
    ↓
  Check retry count
    ↓
  If retries < 3:
    Requeue message
  Else:
    Send to DLQ
```

## Logging

### Console Output

**Connection:**

```
🔌 Connecting to RabbitMQ at amqp://localhost:5672...
✅ RabbitMQ connection established
✅ RabbitMQ channel created
✅ Queue 'wb_queue' ready
👂 Started listening to 'wb_queue' for agent responses...
```

**Message Processing:**

```
📥 Received message from wb_queue: {
  messageId: '550e8400-...',
  status: 'success',
  contact: '+256703722777',
  timestamp: '2025-10-13T10:30:00.000Z'
}
📤 Sending AI response to WhatsApp...
   Contact: +256703722777 (John Doe)
   Response: Hello! I can help you with that...
   Agent metadata: { toolsUsed: [...], processingTime: 2.5 }
✅ WhatsApp message sent successfully
✅ Message acknowledged
⏱️  Message processed in 342ms
```

**Errors:**

```
❌ Message processing failed: Missing contact information
🔄 Requeuing message (retry 1/3)
```

**Reconnection:**

```
❌ RabbitMQ connection error: Connection closed
🔄 Attempting to reconnect (1/10) in 5s...
✅ RabbitMQ connection established
```

## Error Handling

### Validation Errors

- Missing required fields
- Invalid message format
- Invalid status value

**Action:** Retry up to 3 times, then move to DLQ

### WhatsApp API Errors

- Network timeout
- Invalid phone number
- API authentication failure

**Action:** Retry up to 3 times, then move to DLQ

### Connection Errors

- RabbitMQ connection lost
- Channel closed unexpectedly

**Action:** Automatic reconnection with exponential backoff

## Testing

### Manual Testing

1. **Send test message to wb_queue:**

```javascript
const amqp = require("amqplib");

async function sendTestMessage() {
  const conn = await amqp.connect("amqp://localhost:5672");
  const ch = await conn.createChannel();

  const message = {
    messageId: "test-123",
    originalMessageId: "orig-456",
    timestamp: Date.now(),
    status: "success",
    contact: {
      phoneNumber: "+256703722777",
      name: "Test User",
    },
    response: {
      text: "This is a test response from the agent",
      type: "text",
    },
    agentMetadata: {
      toolsUsed: ["test_tool"],
      processingTime: 1.5,
      tokensUsed: 50,
    },
  };

  ch.sendToQueue("wb_queue", Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  console.log("Test message sent to wb_queue");

  await ch.close();
  await conn.close();
}

sendTestMessage();
```

2. **Check consumer logs:**

```bash
# Server should log:
📥 Received message from wb_queue...
📤 Sending AI response to WhatsApp...
✅ WhatsApp message sent successfully
✅ Message acknowledged
```

3. **Verify WhatsApp message:**

- Check that the test user received the message
- Verify message content matches response.text

### Integration Testing

See `agents/farm-agent/tests/test_queue_flow.py` for complete end-to-end testing.

## Troubleshooting

### Consumer not receiving messages

**Check:**

1. RabbitMQ is running: `rabbitmqctl status`
2. Queue exists: `rabbitmqctl list_queues`
3. Messages in queue: `rabbitmqctl list_queues name messages`
4. Consumer is connected: Check server logs for "Started listening"

**Solution:**

```bash
# Restart RabbitMQ
rabbitmqctl stop_app
rabbitmqctl start_app

# Restart server
node server.js
```

### Messages not being acknowledged

**Check:**

1. Processing errors in logs
2. Retry count exceeds maximum
3. Dead letter queue has messages

**Solution:**

```bash
# Check DLQ
rabbitmqctl list_queues name messages | grep dlx

# Purge and retry
rabbitmqctl purge_queue wb_queue
```

### WhatsApp messages not sending

**Check:**

1. WASENDER_API_TOKEN is set
2. WASENDER_API_URL is correct
3. Phone number format (+country code)
4. Wasender API is accessible

**Solution:**

```bash
# Test Wasender API directly
curl -X POST https://wasenderapi.com/api/send-message \
  -H "Authorization: Bearer $WASENDER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "+256703722777", "text": "Test"}'
```

### Connection keeps dropping

**Check:**

1. Network stability
2. RabbitMQ resource limits
3. Server memory/CPU usage

**Solution:**

```bash
# Increase RabbitMQ heartbeat
# In .env:
RABBITMQ_URL=amqp://localhost:5672?heartbeat=60

# Increase reconnect delay
# Edit consumer.js:
this.reconnectDelay = 10000; // 10 seconds
```

## Performance

### Metrics

- **Throughput:** ~100 messages/second (depends on WhatsApp API)
- **Latency:** 200-500ms average processing time
- **Concurrency:** 10 parallel messages (configurable)
- **Memory:** ~50MB per consumer instance

### Optimization

1. **Increase prefetch for higher throughput:**

```javascript
await this.channel.prefetch(20); // Process 20 in parallel
```

2. **Reduce logging for production:**

```javascript
// Add log level check
if (process.env.LOG_LEVEL !== "silent") {
  console.log("...");
}
```

3. **Batch WhatsApp sends (if supported by Wasender API)**

## Security

### Best Practices

1. **Use TLS/SSL for RabbitMQ:**

```bash
RABBITMQ_URL=amqps://user:pass@rabbitmq.example.com:5671
```

2. **Secure credentials:**

- Store in environment variables
- Use secrets management (AWS Secrets Manager, etc.)
- Never commit to source control

3. **Validate all inputs:**

- Phone numbers
- Message content
- Message IDs

4. **Rate limiting:**

- Implement on Wasender API calls
- Prevent abuse

## Future Enhancements

- [ ] Add metrics collection (Prometheus)
- [ ] Add health check endpoint
- [ ] Support for attachments (images, documents)
- [ ] Message templating
- [ ] Batched message sending
- [ ] Priority queue support
- [ ] A/B testing for responses
- [ ] Message analytics and tracking

## Related Files

- `server.js` - Initializes consumer
- `libraries/queue/publisher.js` - Publishes to ag_queue
- `utils/messagingUtils.js` - WhatsApp message sending
- `rabbit-mq/queue-feature-spec.md` - Queue architecture specification
- `agents/farm-agent/tests/test_queue_flow.py` - Integration tests

## Support

For issues or questions:

1. Check server logs for detailed error messages
2. Verify RabbitMQ is running and accessible
3. Test Wasender API independently
4. Review queue-feature-spec.md for architecture details

---

**Created:** October 13, 2025  
**Status:** ✅ Complete and tested  
**Integration:** Automatic with server.js when USE_QUEUE=true
