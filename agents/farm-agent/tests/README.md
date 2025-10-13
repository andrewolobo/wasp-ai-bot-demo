# Queue Flow Test

## Overview

This test script validates the complete message flow through the farm-agent system:

1. **Publishes** a test message to `ag_queue`
2. **Waits** for the farm-agent to process it
3. **Consumes** the response from `wb_queue`
4. **Validates** the response matches the original message

---

## Prerequisites

1. **RabbitMQ Running:**

   ```bash
   docker start rabbitmq
   ```

2. **Farm Agent Running:**

   ```bash
   cd agents/farm-agent
   python main.py
   ```

3. **Dependencies Installed:**
   ```bash
   pip install aio-pika python-dotenv
   ```

---

## Usage

### Run the Test

```bash
cd agents/farm-agent
python tests/test_queue_flow.py
```

### Expected Output

```
======================================================================
Starting Queue Flow Test
======================================================================
Connecting to RabbitMQ: amqp://admin:wasp_rabbit_2024@localhost:5672/
Connected to RabbitMQ

Step 1: Publishing test message to ag_queue...
Published test message to ag_queue
Message ID: test-a1b2c3d4
Message content: Hello, this is a test message for payment collection.

Step 2: Waiting for response on wb_queue...
Received response for message: test-a1b2c3d4

======================================================================
TEST SUCCESSFUL!
======================================================================

Response Details:
  Message ID: resp-test-a1b2c3d4
  Status: success
  Response Text: [Agent's response here]
  Processing Time: 2.34s
  Session ID: session-1234567890@s.whatsapp.net-abc123

Full Response:
{
  "messageId": "resp-test-a1b2c3d4",
  "originalMessageId": "test-a1b2c3d4",
  "timestamp": 1697203200,
  "status": "success",
  "contact": {
    "remoteJid": "1234567890@s.whatsapp.net",
    "phoneNumber": "+1234567890",
    "name": "Test User"
  },
  "response": {
    "text": "[Agent's response]",
    "type": "text",
    "attachments": []
  },
  "agentMetadata": {
    "sessionId": "session-1234567890@s.whatsapp.net-abc123",
    "toolsUsed": [],
    "reasoningSteps": ["Processed with Google ADK Agent"],
    "processingTime": 2.34,
    "tokensUsed": 42,
    "model": "azure-openai"
  },
  "error": null
}
======================================================================
```

---

## Test Message Structure

The test sends a realistic message matching the expected format:

```python
{
    "messageId": "test-{unique-id}",
    "timestamp": 1697203200,
    "contact": {
        "remoteJid": "1234567890@s.whatsapp.net",
        "phoneNumber": "+1234567890",
        "name": "Test User"
    },
    "message": {
        "text": "Hello, this is a test message for payment collection.",
        "timestamp": 1697203200,
        "type": "text"
    },
    "context": {
        "userNotes": "Test customer - always pays on time",
        "conversationHistory": [
            {
                "role": "user",
                "content": "Previous conversation context"
            }
        ],
        "metadata": {
            "source": "test_script",
            "test": true
        }
    }
}
```

---

## Configuration

### Custom RabbitMQ URL

Set in `.env` file or environment variable:

```bash
RABBITMQ_URL=amqp://user:pass@hostname:5672/
```

### Custom Timeout

Modify the timeout parameter (default: 30 seconds):

```python
tester.run_test(timeout=60)  # Wait up to 60 seconds
```

---

## Troubleshooting

### Test Times Out

**Symptoms:**

```
TEST FAILED - No response received

Possible reasons:
  1. Farm agent service is not running
  2. Agent encountered an error processing the message
  3. Response timeout too short
```

**Solutions:**

1. **Check if farm-agent is running:**

   ```bash
   # Check the process
   ps aux | grep main.py

   # Or check logs
   tail -f agents/farm-agent/farm_agent.log
   ```

2. **Verify RabbitMQ queues:**

   - Open http://localhost:15672
   - Check if messages are stuck in `ag_queue`
   - Check for error messages in farm-agent logs

3. **Increase timeout:**
   ```python
   tester.run_test(timeout=60)
   ```

### Connection Refused

**Error:**

```
Failed to connect: [Errno 111] Connection refused
```

**Solution:**
Start RabbitMQ:

```bash
docker start rabbitmq
```

### No Azure OpenAI Credentials

**Error in farm-agent logs:**

```
Missing required environment variables: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY
```

**Solution:**
Configure `.env` file in `agents/farm-agent/`:

```env
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
```

---

## Integration Testing

### Test Different Message Types

Modify the test message in `test_queue_flow.py`:

```python
# Test with different content
"message": {
    "text": "I need help with a payment issue",
    "timestamp": int(datetime.now().timestamp()),
    "type": "text"
}

# Test with conversation history
"conversationHistory": [
    {"role": "user", "content": "Previous message 1"},
    {"role": "assistant", "content": "Previous response 1"},
    {"role": "user", "content": "Previous message 2"}
]
```

### Test Multiple Messages

```python
async def run_multiple_tests():
    tester = QueueTester()
    await tester.connect()

    for i in range(5):
        await tester.publish_test_message()
        await asyncio.sleep(2)  # Space out messages

    await tester.close()
```

---

## Performance Testing

### Measure End-to-End Latency

The test automatically measures:

- Message publish time
- Agent processing time (from response metadata)
- Total round-trip time

Check the logs and response for timing information.

---

## Exit Codes

- `0` - Test passed successfully
- `1` - Test failed (no response, error, or timeout)

Useful for CI/CD pipelines:

```bash
python tests/test_queue_flow.py
if [ $? -eq 0 ]; then
    echo "Tests passed!"
else
    echo "Tests failed!"
    exit 1
fi
```

---

## Next Steps

1. **Add more test cases** for different message types
2. **Test error handling** with malformed messages
3. **Load testing** with multiple concurrent messages
4. **Integration with pytest** for automated testing
