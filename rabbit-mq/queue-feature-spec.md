# RabbitMQ Queue Architecture Specification

## Overview

This document specifies the message queue architecture for async communication between the Node.js WhatsApp webhook service and the Python AI Agent service.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WhatsApp API                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP POST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Node.js Express Server (server.js)                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  1. Webhook Endpoint (/webhook)                                │ │
│  │     - Validates incoming WhatsApp message                      │ │
│  │     - Stores message in database                               │ │
│  │     - Checks if AI processing needed                           │ │
│  │     - Returns 200 OK immediately                               │ │
│  └──────────────────────┬─────────────────────────────────────────┘ │
│                         │                                             │
│                         │ Publish                                     │
│                         ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  2. Queue Publisher                                            │ │
│  │     - Publishes AI request to ag_queue                         │ │
│  │     - Includes contact info + message + context                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  3. Queue Consumer (Listener)                                  │ │
│  │     - Listens to wb_queue for agent responses                  │ │
│  │     - Receives processed results from Python agent             │ │
│  │     - Sends WhatsApp message via Wasender API                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└────────────┬──────────────────────────────────────┲────────────────┘
             │                                       ▲
             │ ag_queue                             │ wb_queue
             │ (Agent Input)                        │ (Webhook Input)
             ▼                                       │
┌─────────────────────────────────────────────────────────────────────┐
│                        RabbitMQ Message Broker                       │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐ │
│  │   ag_queue               │  │   wb_queue                       │ │
│  │   - AI processing tasks  │  │   - Agent responses              │ │
│  │   - Durable: true        │  │   - Durable: true                │ │
│  │   - Prefetch: 1          │  │   - Prefetch: 10                 │ │
│  └──────────────────────────┘  └──────────────────────────────────┘ │
└────────────┬──────────────────────────────────────────────────────┘
             │ Subscribe                             │ Publish
             ▼                                       ▲
┌─────────────────────────────────────────────────────────────────────┐
│                   Python AI Agent Service                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  1. Queue Consumer                                             │ │
│  │     - Listens to ag_queue for processing requests              │ │
│  │     - Validates message payload                                │ │
│  └──────────────────────┬─────────────────────────────────────────┘ │
│                         │                                             │
│                         ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  2. AI Agent Processor (Google ADK)                            │ │
│  │     - Executes agent workflow                                  │ │
│  │     - Uses tools (DB queries, web search, etc.)                │ │
│  │     - Generates response                                       │ │
│  └──────────────────────┬─────────────────────────────────────────┘ │
│                         │                                             │
│                         ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  3. Queue Publisher                                            │ │
│  │     - Publishes result to wb_queue                             │ │
│  │     - Includes contact info + response + metadata              │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Queue Definitions

### **1. ag_queue (Agent Queue)**

**Purpose:** Carries AI processing requests from Node.js to Python Agent

**Configuration:**

- **Queue Name:** `ag_queue`
- **Durable:** `true` (survives broker restart)
- **Auto-delete:** `false`
- **Prefetch Count:** `1` (process one task at a time)
- **TTL (Time-to-Live):** `300000` ms (5 minutes)
- **Dead Letter Exchange:** `dlx_agent` (for failed messages)

**Message Format:**

```json
{
  "messageId": "uuid-v4",
  "timestamp": 1234567890,
  "taskType": "conversation|appointment|order|search",
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
      { "role": "user", "content": "Previous message 1" },
      { "role": "assistant", "content": "Previous response 1" }
    ],
    "userNotes": "VIP customer - priority support",
    "sessionData": {}
  },
  "metadata": {
    "priority": "normal|high|urgent",
    "retryCount": 0,
    "maxRetries": 3
  }
}
```

---

### **2. wb_queue (Webhook Queue)**

**Purpose:** Carries processed AI responses from Python Agent back to Node.js

**Configuration:**

- **Queue Name:** `wb_queue`
- **Durable:** `true`
- **Auto-delete:** `false`
- **Prefetch Count:** `10` (can process multiple responses in parallel)
- **TTL:** `60000` ms (1 minute)
- **Dead Letter Exchange:** `dlx_webhook`

**Message Format:**

```json
{
  "messageId": "uuid-v4",
  "originalMessageId": "uuid-v4-from-ag_queue",
  "timestamp": 1234567890,
  "status": "success|error|partial",
  "contact": {
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777",
    "name": "John Doe"
  },
  "response": {
    "text": "Agent's response message",
    "type": "text|image|document",
    "attachments": []
  },
  "agentMetadata": {
    "toolsUsed": ["database_query", "web_search"],
    "reasoningSteps": ["Step 1", "Step 2"],
    "processingTime": 2.5,
    "tokensUsed": 150
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "stack": "Stack trace (if available)"
  }
}
```

---

## Implementation Requirements

### **Node.js Service (server.js)**

#### **A. Queue Publisher (to ag_queue)**

**Location:** `libraries/queue/publisher.js`

**Responsibilities:**

1. Connect to RabbitMQ on startup
2. Publish AI processing requests to `ag_queue`
3. Handle connection failures with retry logic
4. Log all published messages

**Functions:**

```javascript
/**
 * Publish AI processing request to agent queue
 * @param {Object} contact - Contact information
 * @param {string} message - User's message text
 * @param {Object} context - Conversation context
 * @returns {Promise<string>} messageId
 */
async function publishToAgentQueue(contact, message, context)

/**
 * Initialize RabbitMQ connection and channels
 * @returns {Promise<void>}
 */
async function initializePublisher()

/**
 * Close RabbitMQ connection gracefully
 * @returns {Promise<void>}
 */
async function closePublisher()
```

#### **B. Queue Consumer (from wb_queue)**

**Location:** `libraries/queue/consumer.js`

**Responsibilities:**

1. Listen to `wb_queue` for agent responses
2. Validate response message format
3. Send WhatsApp message via Wasender API
4. Acknowledge message processing
5. Handle errors and retries

**Functions:**

```javascript
/**
 * Start consuming messages from webhook queue
 * @returns {Promise<void>}
 */
async function startConsumer()

/**
 * Process single message from wb_queue
 * @param {Object} message - Queue message
 * @returns {Promise<void>}
 */
async function processWebhookMessage(message)

/**
 * Send response to WhatsApp contact
 * @param {Object} contact - Contact info
 * @param {string} response - Message to send
 * @returns {Promise<Object>} Send result
 */
async function sendResponseToContact(contact, response)
```

#### **C. Webhook Integration**

**Location:** `server.js` (existing webhook endpoint)

**Changes Required:**

1. After storing message in database, check if AI processing needed
2. If needed, publish to `ag_queue` instead of calling Azure OpenAI directly
3. Return immediate response to WhatsApp API
4. Let consumer handle sending the actual response

**Pseudo-code:**

```javascript
app.post("/webhook", async (req, res) => {
  // 1. Validate and store message
  const message = validateWebhook(req.body);
  await db.insertMessage(message);

  // 2. Check if AI processing needed
  const isAIEnabled = await db.isAIEnabled(message.remoteJid);

  if (isAIEnabled) {
    // 3. Publish to agent queue (non-blocking)
    const contact = extractContactInfo(message);
    const context = await buildContext(message);

    await publishToAgentQueue(contact, message.text, context);

    console.log("🚀 AI request queued for:", contact.phoneNumber);
  }

  // 4. Return immediately (don't wait for agent)
  res.json({ status: "received", processed: true });
});
```

#### **D. Service Initialization**

**Location:** `server.js` (startup)

**Changes Required:**

```javascript
// Initialize queue connections on startup
const publisher = require("./libraries/queue/publisher");
const consumer = require("./libraries/queue/consumer");

async function startServer() {
  // 1. Initialize database
  await db.connect();

  // 2. Initialize RabbitMQ publisher
  await publisher.initializePublisher();
  console.log("✅ RabbitMQ publisher initialized");

  // 3. Start RabbitMQ consumer
  await consumer.startConsumer();
  console.log("✅ RabbitMQ consumer started");

  // 4. Start Express server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down gracefully...");
  await consumer.stopConsumer();
  await publisher.closePublisher();
  await db.close();
  process.exit(0);
});
```

---

### **Python AI Agent Service**

#### **A. Queue Consumer (from ag_queue)**

**Location:** `python-agents/queue/consumer.py`

**Responsibilities:**

1. Connect to RabbitMQ on startup
2. Listen to `ag_queue` for processing requests
3. Validate message format
4. Route to appropriate agent workflow
5. Handle processing errors

**Functions:**

```python
async def start_consumer():
    """Start consuming from ag_queue"""

async def process_agent_request(message: dict):
    """Process AI request from queue"""

async def route_to_agent(task_type: str, payload: dict):
    """Route request to appropriate agent"""
```

#### **B. Queue Publisher (to wb_queue)**

**Location:** `python-agents/queue/publisher.py`

**Responsibilities:**

1. Publish agent responses to `wb_queue`
2. Format response message correctly
3. Handle publishing errors
4. Track message delivery

**Functions:**

```python
async def publish_response(
    original_message_id: str,
    contact: dict,
    response: dict,
    metadata: dict
):
    """Publish agent response to webhook queue"""

async def publish_error(
    original_message_id: str,
    contact: dict,
    error: Exception
):
    """Publish error message to webhook queue"""
```

#### **C. Agent Workflow Integration**

**Location:** `python-agents/agent_engine.py`

**Changes Required:**

```python
class AgentProcessor:
    async def process_from_queue(self, message: dict):
        """Process message received from ag_queue"""
        try:
            # 1. Extract payload
            contact = message['contact']
            user_message = message['message']['text']
            context = message['context']

            # 2. Execute agent
            result = await self.agent.execute(
                message=user_message,
                context=context
            )

            # 3. Publish response to wb_queue
            await publish_response(
                original_message_id=message['messageId'],
                contact=contact,
                response=result,
                metadata={
                    'toolsUsed': result.tools_used,
                    'processingTime': result.processing_time
                }
            )

        except Exception as e:
            # Publish error to wb_queue
            await publish_error(
                original_message_id=message['messageId'],
                contact=contact,
                error=e
            )
```

---

## Error Handling & Retry Strategy

### **Failed Messages (Dead Letter Queues)**

#### **1. Agent Queue Failures (dlx_agent)**

**Scenarios:**

- Agent service is down
- Processing timeout (>5 minutes)
- Invalid message format
- Python exceptions

**Action:**

- Message moved to `dlx_agent` queue
- Node.js monitors DLQ
- Sends fallback response: "I'm having trouble processing your request. Please try again."

#### **2. Webhook Queue Failures (dlx_webhook)**

**Scenarios:**

- Wasender API is down
- Invalid phone number
- Rate limiting

**Action:**

- Message moved to `dlx_webhook` queue
- Retry after 30 seconds
- Max 3 retries
- After max retries, log error and alert admin

### **Retry Logic**

```javascript
// Node.js retry configuration
const retryConfig = {
  maxRetries: 3,
  retryDelay: 30000, // 30 seconds
  backoffMultiplier: 2, // Exponential backoff
};
```

```python
# Python retry configuration
RETRY_CONFIG = {
    'max_retries': 3,
    'retry_delay': 30,  # seconds
    'backoff_multiplier': 2
}
```

---

## Monitoring & Observability

### **Metrics to Track**

#### **Node.js Service:**

- Messages published to `ag_queue` (count, rate)
- Messages consumed from `wb_queue` (count, rate)
- Queue publish failures
- Response send failures (Wasender API)
- Average queue latency

#### **Python Service:**

- Messages consumed from `ag_queue` (count, rate)
- Messages published to `wb_queue` (count, rate)
- Agent processing time (avg, p95, p99)
- Agent failures (by type)
- Tools used distribution

#### **RabbitMQ:**

- Queue depth (ag_queue, wb_queue)
- Message rate (in/out)
- Consumer count
- Unacknowledged messages
- Dead letter queue depth

### **Logging Format**

```javascript
// Node.js logging
console.log("📤 Published to ag_queue:", {
  messageId: "uuid",
  contact: phoneNumber,
  taskType: "conversation",
  timestamp: Date.now(),
});

console.log("📥 Consumed from wb_queue:", {
  messageId: "uuid",
  contact: phoneNumber,
  processingTime: "2.5s",
  status: "success",
});
```

```python
# Python logging
logger.info("📥 Consumed from ag_queue", extra={
    "message_id": "uuid",
    "contact": phone_number,
    "task_type": "conversation"
})

logger.info("📤 Published to wb_queue", extra={
    "message_id": "uuid",
    "processing_time": 2.5,
    "tools_used": ["db", "search"]
})
```

---

## Testing Strategy

### **Unit Tests**

#### **Node.js:**

- `publisher.test.js` - Test publishing to ag_queue
- `consumer.test.js` - Test consuming from wb_queue
- Mock RabbitMQ connection

#### **Python:**

- `test_consumer.py` - Test consuming from ag_queue
- `test_publisher.py` - Test publishing to wb_queue
- Mock RabbitMQ connection

### **Integration Tests**

#### **End-to-End Flow:**

1. Send test webhook
2. Verify message in ag_queue
3. Wait for agent processing
4. Verify message in wb_queue
5. Verify WhatsApp message sent

#### **Test Script:**

```javascript
// test-queue-flow.js
async function testEndToEndFlow() {
  // 1. Publish test message
  await publishToAgentQueue(testContact, testMessage, {});

  // 2. Wait for response
  await sleep(5000);

  // 3. Check if response received
  const response = await checkWebhookQueue();
  assert(response.status === "success");
}
```

---

## Configuration

### **Environment Variables**

#### **Node.js (.env):**

```env
# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=wasp_rabbit_2024
RABBITMQ_VHOST=/

# Queue Names
AGENT_QUEUE_NAME=ag_queue
WEBHOOK_QUEUE_NAME=wb_queue

# Queue Settings
AGENT_QUEUE_PREFETCH=1
WEBHOOK_QUEUE_PREFETCH=10
MESSAGE_TTL=300000

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY=30000
```

#### **Python (.env):**

```env
# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=wasp_rabbit_2024

# Queue Names
AGENT_QUEUE=ag_queue
WEBHOOK_QUEUE=wb_queue

# Processing
MAX_PROCESSING_TIME=300
CONCURRENT_TASKS=5
```

---

## Deployment Checklist

### **Pre-deployment:**

- [ ] RabbitMQ server running
- [ ] Both queues created (`ag_queue`, `wb_queue`)
- [ ] Dead letter exchanges configured
- [ ] Environment variables set
- [ ] Connection credentials secured

### **Node.js Service:**

- [ ] Queue publisher initialized on startup
- [ ] Queue consumer started
- [ ] Webhook endpoint integrated
- [ ] Error handling implemented
- [ ] Logging configured

### **Python Service:**

- [ ] Queue consumer started
- [ ] Agent processor implemented
- [ ] Queue publisher configured
- [ ] Error handling implemented
- [ ] Monitoring enabled

### **Testing:**

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] End-to-end flow verified
- [ ] Error scenarios tested
- [ ] Load testing completed

### **Monitoring:**

- [ ] Queue metrics dashboard
- [ ] Alert rules configured
- [ ] Log aggregation setup
- [ ] Performance baseline established

---

## Future Enhancements

1. **Priority Queues:** Separate high/low priority queues
2. **Message Routing:** Topic exchanges for routing by task type
3. **Batch Processing:** Process multiple messages in batches
4. **Circuit Breaker:** Prevent cascade failures
5. **Message Replay:** Replay failed messages from DLQ
6. **A/B Testing:** Route % of traffic to experimental agents
7. **Multi-tenancy:** Separate queues per customer/tenant

---

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [amqplib (Node.js)](https://www.npmjs.com/package/amqplib)
- [aio-pika (Python)](https://aio-pika.readthedocs.io/)
- [Google ADK Documentation](https://cloud.google.com/adk)

---

## Changelog

| Version | Date       | Changes               |
| ------- | ---------- | --------------------- |
| 1.0     | 2024-10-10 | Initial specification |
