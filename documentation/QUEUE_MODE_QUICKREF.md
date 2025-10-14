# Queue Mode - Quick Reference

## Environment Setup

```env
# .env file
USE_QUEUE=false              # false=Direct, true=Queue
RABBITMQ_URL=amqp://admin:wasp_rabbit_2024@localhost:5672
```

## Starting the Server

### Direct Mode (Default)

```bash
npm start
# Console: ⚡ Direct mode enabled
```

### Queue Mode

```bash
# 1. Start RabbitMQ
cd rabbit-mq && run-rabbit.bat

# 2. Set USE_QUEUE=true in .env

# 3. Start server
npm start
# Console: 🎯 AI Processing Mode: QUEUE (Async)
```

## Mode Comparison

| Feature           | Direct Mode         | Queue Mode                 |
| ----------------- | ------------------- | -------------------------- |
| Processing        | Synchronous         | Asynchronous               |
| Response Time     | Immediate           | Deferred                   |
| Webhook Response  | After AI processing | Immediate (200 OK)         |
| AI Engine         | Azure OpenAI        | Python Agent (Google ADK)  |
| Complex Workflows | ❌ No               | ✅ Yes                     |
| Scalability       | Limited             | High                       |
| Tool Support      | None                | Database, Web Search, etc. |

## Console Output Examples

### Direct Mode Message

```
🤖 AI-enabled user detected, processing in DIRECT mode...
⚡ Direct mode enabled - processing with Azure OpenAI...
🧠 LLM response generated: Hello! How can I help...
✅ AI response sent successfully to: +256703722777
```

### Queue Mode Message

```
🤖 AI-enabled user detected, processing in QUEUE mode...
📮 Queue mode enabled - publishing to RabbitMQ...
📤 Published to agent queue: {
  messageId: 'abc-123-def-456',
  contact: '+256703722777',
  taskType: 'conversation'
}
```

## API Response Examples

### Direct Mode Response

```json
{
  "status": "success",
  "data": {
    "aiResponse": {
      "mode": "direct",
      "sent": true,
      "response": "Hello! How can I help you today?"
    }
  }
}
```

### Queue Mode Response

```json
{
  "status": "success",
  "data": {
    "aiResponse": {
      "mode": "queue",
      "queued": true,
      "messageId": "abc-123-def-456",
      "queue": "ag_queue",
      "note": "AI request queued for async processing..."
    }
  }
}
```

## Key Functions

### `publishAIRequestToQueue(originalData, messageText, aiUserDetails, senderHistory)`

- **Location:** `server.js` line ~305
- **Purpose:** Formats and publishes AI request to RabbitMQ
- **Returns:** `{ success: boolean, messageId: string, queue: string }`

### `queuePublisher.publishToAgentQueue(contact, message, context, taskType)`

- **Location:** `libraries/queue/publisher.js`
- **Purpose:** Low-level RabbitMQ publishing
- **Returns:** `{ success: boolean, messageId: string }`

### `queuePublisher.connect()`

- **Purpose:** Connect to RabbitMQ
- **Auto-retry:** Yes (10 attempts with exponential backoff)
- **Returns:** `Promise<boolean>`

## Queue Configuration

### ag_queue (Agent Queue)

```javascript
{
  name: 'ag_queue',
  durable: true,
  ttl: 300000,        // 5 minutes
  prefetch: 1,
  dlx: 'dlx_agent'
}
```

## Troubleshooting

| Problem                        | Solution                                     |
| ------------------------------ | -------------------------------------------- |
| `Cannot find module 'amqplib'` | Run `npm install`                            |
| Queue not receiving messages   | Check RabbitMQ is running: `docker ps`       |
| Connection refused             | Verify RABBITMQ_URL in .env                  |
| Messages stuck in queue        | Python agent not running (to be implemented) |

## RabbitMQ Management

- **URL:** http://localhost:15672
- **Username:** admin
- **Password:** wasp_rabbit_2024
- **Queue:** ag_queue (check for messages)

## Files to Know

- `server.js` - Main server with dual-mode logic
- `libraries/queue/publisher.js` - RabbitMQ publisher
- `.env` - Configuration (USE_QUEUE flag)
- `rabbit-mq/queue-feature-spec.md` - Complete spec
- `documentation/QUEUE_MODE.md` - Full documentation

## When to Use Each Mode

### Use Direct Mode When:

- ✅ Simple conversational responses
- ✅ Low message volume
- ✅ No need for tools/agents
- ✅ Fast response required

### Use Queue Mode When:

- ✅ Complex agentic workflows
- ✅ Need database queries, web search
- ✅ High message volume
- ✅ Scalability required
- ✅ Using Google ADK agents

---

**Quick Tip:** You can switch modes anytime by changing `USE_QUEUE` in `.env` and restarting the server. No code changes needed!
