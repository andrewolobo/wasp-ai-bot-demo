# Farm Agent - Payment Collections Agent

Google ADK-based AI agent for processing payment collection requests from WhatsApp messages via RabbitMQ queues.

## Features

- ✅ **Asynchronous Processing** - Handles multiple conversations concurrently
- ✅ **Session Management** - Each conversation maintains its own context using Google ADK's InMemorySessionService
- ✅ **Queue Integration** - Consumes from `ag_queue`, publishes to `wb_queue`
- ✅ **Azure OpenAI** - Uses Azure OpenAI via LiteLLM
- ✅ **Graceful Shutdown** - Handles SIGINT/SIGTERM signals properly

## Architecture

```
RabbitMQ (ag_queue)
        ↓
  Queue Consumer
        ↓
  Session Manager ← Creates unique session per conversation
        ↓
  Google ADK Runner (with InMemorySessionService)
        ↓
  Azure OpenAI (via LiteLLM)
        ↓
  Response → RabbitMQ (wb_queue)
```

## Setup

### 1. Install Dependencies

```bash
cd agents/farm-agent
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

Edit `.env` and set your Azure OpenAI credentials:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
```

### 3. Start RabbitMQ

Ensure RabbitMQ is running:

```bash
cd ../../rabbit-mq
run-rabbit.bat
```

### 4. Start the Agent

```bash
# Using batch file
start.bat

# Or directly with Python
python main.py
```

## Configuration

### Environment Variables

| Variable                       | Description               | Default                                         |
| ------------------------------ | ------------------------- | ----------------------------------------------- |
| `AZURE_OPENAI_ENDPOINT`        | Azure OpenAI endpoint URL | Required                                        |
| `AZURE_OPENAI_API_KEY`         | Azure OpenAI API key      | Required                                        |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment name           | `gpt-4o-mini`                                   |
| `AZURE_OPENAI_API_VERSION`     | API version               | `2024-02-15-preview`                            |
| `RABBITMQ_URL`                 | RabbitMQ connection URL   | `amqp://admin:wasp_rabbit_2024@localhost:5672/` |
| `AG_QUEUE`                     | Input queue name          | `ag_queue`                                      |
| `WB_QUEUE`                     | Output queue name         | `wb_queue`                                      |
| `MAX_CONCURRENT_SESSIONS`      | Max concurrent processing | `5`                                             |

### Session Management

- **Session Per Conversation**: Each `remoteJid` (WhatsApp contact) gets a unique session
- **Context Retention**: Previous messages in the conversation are maintained in the session
- **Concurrent Limit**: Configurable via `MAX_CONCURRENT_SESSIONS` (default: 5)
- **Automatic Cleanup**: Sessions are cleaned up after processing

## Message Flow

### Input (from `ag_queue`)

```json
{
  "messageId": "uuid-v4",
  "contact": {
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777",
    "name": "John Doe"
  },
  "message": {
    "text": "I need help with payment",
    "timestamp": 1234567890
  },
  "context": {
    "conversationHistory": [{ "role": "user", "content": "Previous message" }],
    "userNotes": "VIP customer"
  }
}
```

### Output (to `wb_queue`)

```json
{
  "messageId": "resp-uuid-v4",
  "originalMessageId": "uuid-v4",
  "status": "success",
  "contact": {
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777"
  },
  "response": {
    "text": "Agent's response about payment",
    "type": "text"
  },
  "agentMetadata": {
    "sessionId": "session-256703722777@s.whatsapp.net-abc123",
    "processingTime": 2.5,
    "model": "azure-openai"
  }
}
```

## File Structure

```
farm-agent/
├── agent.py              # Agent configuration and creation
├── main.py               # Main application entry point
├── queue_consumer.py     # RabbitMQ consumer with async processing
├── session_manager.py    # Session management with Google ADK Runner
├── prompt.py             # Agent prompts and instructions
├── requirements.txt      # Python dependencies
├── .env.example         # Environment template
├── start.bat            # Windows startup script
└── README.md            # This file
```

## Key Classes

### `SessionManager`

Manages individual conversation sessions using Google ADK's `InMemorySessionService` and `Runner`.

**Methods:**

- `get_session_id(remote_jid)` - Get or create session for a conversation
- `process_message(request)` - Process message with session context
- `cleanup_session(remote_jid)` - Clean up after completion
- `get_session_stats()` - Get active session statistics

### `QueueConsumer`

Asynchronous RabbitMQ consumer that processes messages concurrently.

**Methods:**

- `connect()` - Connect to RabbitMQ
- `start_consuming()` - Start consuming from ag_queue
- `process_message(message)` - Process individual message
- `publish_response(response)` - Publish to wb_queue
- `stop()` - Graceful shutdown

### `FarmAgentService`

Main service orchestrator.

**Methods:**

- `start()` - Initialize and start the service
- `shutdown()` - Graceful shutdown with cleanup

## Testing

### Unit Test

```bash
python -c "from agent import create_agent, create_runner; agent = create_agent(); print('✅ Agent created:', agent.name)"
```

### Queue Test

1. Ensure RabbitMQ is running
2. Start the agent: `python main.py`
3. Send test message to `ag_queue` via Node.js service
4. Check logs for processing

## Monitoring

### Console Output

```
🚀 Starting Farm Agent Service
✅ Farm Agent Service is running!
🎧 Listening for payment collection requests...
📨 Received message uuid-123 from +256703722777
📝 Created new session: session-256703722777@s.whatsapp.net-abc123
🤖 Running agent for session: session-256703722777@s.whatsapp.net-abc123
✅ Message processed in 2.50s: uuid-123
📤 Published response: resp-uuid-123
```

### Logs

- Console output (stdout)
- `farm_agent.log` file

### RabbitMQ Management UI

http://localhost:15672

- Username: `admin`
- Password: `wasp_rabbit_2024`

Monitor:

- `ag_queue` depth (incoming messages)
- `wb_queue` depth (outgoing responses)
- Consumer count and rate

## Troubleshooting

### Agent won't start

**Problem:** Missing environment variables

**Solution:** Ensure `.env` file exists and contains all required variables

---

**Problem:** `Import "aio_pika" could not be resolved`

**Solution:** Install dependencies

```bash
pip install -r requirements.txt
```

---

**Problem:** `Failed to connect to RabbitMQ`

**Solution:** Start RabbitMQ

```bash
cd ../../rabbit-mq
run-rabbit.bat
```

### No messages being processed

**Problem:** Agent running but no activity

**Solution:**

1. Check Node.js service has `USE_QUEUE=true`
2. Verify RabbitMQ queue has messages (check management UI)
3. Check logs for connection issues

### Session errors

**Problem:** Google ADK session errors

**Solution:** Check Azure OpenAI credentials and deployment name in `.env`

## Performance

- **Processing Time**: 1-3 seconds per message (depends on Azure OpenAI response time)
- **Throughput**: Configurable via `MAX_CONCURRENT_SESSIONS`
- **Scalability**: Can run multiple agent instances for higher throughput

## Next Steps

1. ✅ Basic agent with queue processing complete
2. ⏳ Add custom tools for payment operations
3. ⏳ Implement database queries for payment history
4. ⏳ Add payment gateway integrations
5. ⏳ Enhanced error handling and retry logic
6. ⏳ Metrics and monitoring dashboard

## References

- [Google ADK Documentation](https://github.com/google/adk)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Azure OpenAI Service](https://azure.microsoft.com/en-us/products/ai-services/openai-service)

---

**Created:** 2025-01-10  
**Status:** ✅ Ready for use
