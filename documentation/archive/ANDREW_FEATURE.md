# Andrew AI Assistant Feature

## Overview

The Andrew AI Assistant is an intelligent auto-response feature integrated into the WhatsApp webhook endpoint. When users send messages that start with "Andrew" (case-insensitive), the system automatically:

1. **Detects the trigger** - Messages starting with "Andrew"
2. **Retrieves conversation history** - Gets the last 20 messages from that contact
3. **Generates AI response** - Uses Azure OpenAI GPT-4o with conversation context
4. **Sends automatic reply** - Responds back to the user via Wasender API

## How It Works

### 1. Message Detection

```javascript
if (messageText.toLowerCase().startsWith("andrew")) {
  // Trigger AI processing
}
```

### 2. History Retrieval

- Fetches last 20 messages from the sender using `db.getMessagesByContact()`
- Formats messages with timestamps and sender names for context

### 3. AI Processing

- Creates a context-aware prompt including conversation history
- Uses Azure OpenAI GPT-4o with configurable temperature (0.7) and max tokens (200)
- Generates a conversational, WhatsApp-appropriate response

### 4. Response Delivery

- Extracts phone number from WhatsApp remoteJid
- Sends AI response back to user via Wasender API
- Logs success/failure for monitoring

## Configuration

### Required Environment Variables

```bash
# Azure OpenAI (for AI responses)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_DEPLOYMENT_NAME=your_gpt4o_deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_MODEL=gpt-4o

# Wasender API (for sending responses)
WASENDER_API_TOKEN=your_wasender_token_here
WASENDER_API_URL=https://wasenderapi.com/api/send-message
```

## Example Usage

### User sends:

```
"Andrew, what's the best programming language for beginners?"
```

### System processes:

1. Detects "Andrew" trigger
2. Retrieves conversation history
3. Generates contextual AI response
4. Sends response back to user

### User receives:

```
"Hi! For beginners, I'd recommend starting with Python. It has clean syntax, great learning resources, and is widely used in web development, data science, and automation. What type of projects are you interested in building?"
```

## Supported Message Formats

- **Regular text**: `"Andrew, help me with..."`
- **Extended text**: Long messages with extended text format
- **Case insensitive**: `"andrew"`, `"Andrew"`, `"ANDREW"`
- **With punctuation**: `"Andrew, could you please..."`
- **Group messages**: Works in group chats too

## Testing

### REST Client Tests

- `rest/andrew.http` - Comprehensive Andrew-specific tests
- `rest/webhook.http` - General webhook tests including Andrew examples
- `test-andrew-simple.http` - Quick Andrew functionality test

### Manual Testing

1. Send webhook with Andrew message
2. Check database for message storage
3. Verify AI response generation
4. Confirm message delivery via Wasender

## Response Characteristics

- **Conversational tone** - Friendly and approachable
- **Context-aware** - References previous conversation when relevant
- **Concise** - Optimized for WhatsApp (200 token limit)
- **Helpful** - Provides actionable information and guidance

## Error Handling

The system gracefully handles various error scenarios:

- **Azure OpenAI failures** - Logs error, continues normal webhook processing
- **Phone extraction errors** - Attempts multiple parsing strategies
- **Wasender API errors** - Logs failure but doesn't break webhook
- **Database errors** - Isolated from AI processing failures

## Monitoring

Check webhook response for AI processing status:

```json
{
  "status": "success",
  "data": {
    "aiResponse": {
      "sent": true,
      "phoneNumber": "+256703722777",
      "response": "AI generated response text",
      "sendResult": { ... }
    }
  }
}
```

## Performance Considerations

- **Parallel processing** - AI and messaging operations run asynchronously
- **History limit** - Only retrieves last 20 messages for context
- **Token optimization** - 200 token limit for quick responses
- **Rate limiting** - Wasender API has built-in rate limiting

## Future Enhancements

- **Multiple triggers** - Support for other AI assistant names
- **Smart routing** - Different AI personalities for different triggers
- **Rich responses** - Support for images, links, and formatted text
- **Learning** - Improved responses based on user feedback
