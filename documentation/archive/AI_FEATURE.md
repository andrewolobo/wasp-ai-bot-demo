# AI Auto-Response Feature (Dynamic User Management)

## Overview

The AI Auto-Response feature is an intelligent system integrated into the WhatsApp webhook endpoint that automatically responds to messages from specific users. This feature uses a **database-driven whitelist** where you can dynamically add or remove users who should receive AI responses.

### Key Capabilities:

1. **Database-Driven Control** - Manage AI-enabled users through API endpoints
2. **Dynamic User Management** - Add/remove users without code changes
3. **Conversation History** - Retrieves the last 20 messages for context
4. **AI Response Generation** - Uses Azure OpenAI GPT-4o with conversation context
5. **Automatic Reply** - Sends responses back via Wasender API
6. **Fine-grained Control** - Enable/disable AI for specific users in real-time

## How It Works

### 1. User Management (Database-Driven)

```javascript
// Check if user is in AI-enabled list
const isAIEnabled = await db.isAIEnabled(remoteJid);

if (isAIEnabled) {
  // Trigger AI processing for this user
  await db.updateAIUserInteraction(remoteJid);
}
```

The system checks a database table (`ai_enabled_users`) to determine if a user should receive AI responses.

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
- Updates last interaction timestamp in database

## Database Schema

### AI-Enabled Users Table

```sql
CREATE TABLE ai_enabled_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remoteJid TEXT NOT NULL UNIQUE,
    phoneNumber TEXT,
    name TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction DATETIME
);
```

### Fields:

- **remoteJid**: WhatsApp remote JID (unique identifier)
- **phoneNumber**: Formatted phone number (optional)
- **name**: User's display name (optional)
- **enabled**: Whether AI responses are active for this user
- **notes**: Additional information about the user
- **added_at**: When user was added to the list
- **updated_at**: Last time user record was modified
- **last_interaction**: Last time AI responded to this user

## API Endpoints

### 1. Add User to AI-Enabled List

```http
POST /ai/users/add
Content-Type: application/json

{
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777",
    "name": "John Doe",
    "notes": "VIP customer"
}
```

### 2. List All AI-Enabled Users

```http
GET /ai/users/list
GET /ai/users/list?includeDisabled=true
```

### 3. Check If User Is AI-Enabled

```http
GET /ai/users/check/256703722777@s.whatsapp.net
```

### 4. Get User Details

```http
GET /ai/users/256703722777@s.whatsapp.net
```

### 5. Toggle User AI Status

```http
PATCH /ai/users/toggle
Content-Type: application/json

{
    "remoteJid": "256703722777@s.whatsapp.net"
}
```

### 6. Remove User (Soft Delete)

```http
DELETE /ai/users/remove
Content-Type: application/json

{
    "remoteJid": "256703722777@s.whatsapp.net"
}
```

### 7. Permanently Delete User

```http
DELETE /ai/users/delete
Content-Type: application/json

{
    "remoteJid": "256703722777@s.whatsapp.net"
}
```

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

## Usage Examples

### Example 1: Add a New User

```bash
# Add a user to receive AI responses
curl -X POST http://localhost/ai/users/add \
  -H "Content-Type: application/json" \
  -d '{
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777",
    "name": "Alice Smith",
    "notes": "Premium support customer"
  }'
```

### Example 2: User Sends Message

When Alice sends a message to your WhatsApp bot:

1. Webhook receives: `"Hello, I need help with my account"`
2. System checks: `db.isAIEnabled("256703722777@s.whatsapp.net")` → `true`
3. System retrieves conversation history
4. AI generates contextual response
5. Response is sent back to Alice automatically

### Example 3: Disable AI for User

```bash
# Temporarily disable AI responses for a user
curl -X PATCH http://localhost/ai/users/toggle \
  -H "Content-Type: application/json" \
  -d '{"remoteJid": "256703722777@s.whatsapp.net"}'
```

## Supported Message Formats

- **Regular text messages**: Any message from AI-enabled user
- **Extended text**: Long messages with extended text format
- **Group messages**: Works in group chats if group is AI-enabled
- **All message types**: No keyword required - all messages trigger AI

## Testing

### REST Client Tests

- `rest/ai-users.http` - Comprehensive AI user management tests (36 test cases)
- `rest/andrew.http` - AI response integration tests
- `rest/webhook.http` - Webhook integration tests

### Manual Testing Flow

1. **Add user**: `POST /ai/users/add`
2. **Verify addition**: `GET /ai/users/list`
3. **Send webhook**: `POST /webhook` with message from that user
4. **Check response**: Verify AI response was sent
5. **Check interaction**: `GET /ai/users/:remoteJid` to see last_interaction updated

## Response Characteristics

- **Conversational tone** - Friendly and approachable
- **Context-aware** - References previous conversation when relevant
- **Concise** - Optimized for WhatsApp (200 token limit)
- **Helpful** - Provides actionable information and guidance
- **No trigger word needed** - Responds to all messages from enabled users

## Error Handling

The system gracefully handles various error scenarios:

- **Azure OpenAI failures** - Logs error, continues normal webhook processing
- **Phone extraction errors** - Attempts multiple parsing strategies
- **Wasender API errors** - Logs failure but doesn't break webhook
- **Database errors** - Isolated from AI processing failures
- **User not found** - Simply skips AI processing for non-enabled users

## Monitoring

### Check webhook response for AI processing status:

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

### Track user interactions:

```sql
SELECT remoteJid, name, last_interaction
FROM ai_enabled_users
WHERE enabled = TRUE
ORDER BY last_interaction DESC;
```

## Performance Considerations

- **Parallel processing** - AI and messaging operations run asynchronously
- **History limit** - Only retrieves last 20 messages for context
- **Token optimization** - 200 token limit for quick responses
- **Rate limiting** - Wasender API has built-in rate limiting
- **Database indexing** - Optimized queries for fast user lookup

## Migration from "Andrew" Keyword

### Old Behavior (Deprecated):

```javascript
if (messageText.toLowerCase().startsWith("andrew")) {
  // Process AI response
}
```

### New Behavior (Current):

```javascript
const isAIEnabled = await db.isAIEnabled(remoteJid);
if (isAIEnabled) {
  // Process AI response
}
```

### Migration Steps:

1. **Create table**: Run `setup.sql` to create `ai_enabled_users` table
2. **Add users**: Use `/ai/users/add` endpoint to add users who should receive AI
3. **No code changes needed**: System automatically uses new database check
4. **Remove trigger word**: Users no longer need to say "Andrew"

## Advantages of Database-Driven Approach

1. **No Code Deployment** - Add/remove users via API without redeploying
2. **Fine-Grained Control** - Enable AI for specific users, not all users
3. **Audit Trail** - Track when users were added and their last interaction
4. **Scalability** - Easily manage hundreds or thousands of AI-enabled users
5. **Flexibility** - Toggle users on/off without losing their data
6. **Analytics** - Query database to see AI usage patterns

## Future Enhancements

- **User groups** - Assign users to different AI personalities
- **Rate limiting per user** - Limit AI responses per user per day
- **Custom prompts** - Different AI instructions per user
- **Conversation summaries** - Store AI conversation summaries
- **User preferences** - Allow users to customize AI behavior
- **Analytics dashboard** - Visual interface for user management

## Security Considerations

- **Access control** - Protect `/ai/users/*` endpoints with authentication
- **Rate limiting** - Prevent abuse of user management endpoints
- **Input validation** - Sanitize all user inputs
- **Database backups** - Regular backups of `ai_enabled_users` table
- **Audit logging** - Log all user additions/removals for security audits
