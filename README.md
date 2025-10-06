# WhatsApp AI Bot API

A comprehensive Node.js Express API that processes WhatsApp webhooks, stores messages in SQLite database, and provides AI-powered analysis using Azure OpenAI GPT-4o.

## Features

- 🔗 **WhatsApp Webhook Processing** - Receive and process WhatsApp messages
- 💾 **SQLite Database Storage** - Store messages with full metadata
- 🤖 **Azure OpenAI Integration** - GPT-4o powered conversation analysis
- 📊 **Message Analytics** - Search, filter, and analyze conversations
- 🔍 **AI-Powered Insights** - Sentiment analysis and conversation summaries

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Create/update the `.env` file with your Azure OpenAI credentials:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_subscription_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your-gpt4o-deployment-name

# Optional: Model configuration
AZURE_OPENAI_MODEL=gpt-4o
MAX_TOKENS=1500
TEMPERATURE=0.7
```

### 3. Database Setup

Bootstrap the SQLite database:

```bash
# Create database without sample data
npm run bootstrap

# Or create database with sample data
npm run bootstrap:sample
```

### 4. Start the Server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

### Core Endpoints

- `POST /webhook` - Receive WhatsApp webhooks
- `GET /health` - Health check endpoint
- `GET /` - API status

### Message Queries

- `GET /messages/session/:sessionId` - Get messages by session
- `GET /messages/contact/:remoteJid` - Get messages by contact
- `GET /messages/search?q=term` - Search messages by content
- `GET /messages/recent?hours=24` - Get recent messages
- `GET /messages/stats` - Get message statistics

### AI-Powered Endpoints

- `POST /ai/chat` - Azure OpenAI chat completion
- `POST /ai/analyze-conversation` - AI conversation analysis
- `POST /ai/summarize` - AI message summarization

## Database Schema

### Table: `whatsapp_messages`

| Column           | Type         | Description                            |
| ---------------- | ------------ | -------------------------------------- |
| id               | INTEGER (PK) | Auto-incrementing primary key          |
| event            | TEXT         | Event type (e.g., 'messages.received') |
| sessionId        | TEXT         | WhatsApp session identifier            |
| pushName         | TEXT         | Contact display name                   |
| remoteJid        | TEXT         | WhatsApp contact ID                    |
| timestamp        | INTEGER      | Webhook timestamp (milliseconds)       |
| messageTimestamp | INTEGER      | Message timestamp (seconds)            |
| messageId        | TEXT         | Unique message identifier              |
| message          | TEXT         | Message content                        |
| broadcast        | BOOLEAN      | Whether message is broadcast           |
| created_at       | DATETIME     | Record creation timestamp              |
| updated_at       | DATETIME     | Record update timestamp                |

### Features:

- **Indexes** on frequently queried columns
- **View** (`messages_view`) with human-readable timestamps
- **Trigger** to automatically update timestamps

## Azure OpenAI Integration

### 1. Basic Chat Completion

**POST** `/ai/chat`

Send messages to GPT-4o and get responses.

**Request Body:**

```json
{
  "message": "Hello, how are you?",
  "options": {
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Hello! I'm doing well, thank you for asking. How can I assist you today?",
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 25,
    "total_tokens": 37
  },
  "model": "gpt-4o",
  "finishReason": "stop"
}
```

### 2. WhatsApp Conversation Analysis

**POST** `/ai/analyze-conversation`

Analyze WhatsApp conversations with AI using stored message history.

**Request Body:**

```json
{
  "sessionId": "7880f22816319b6c2483f36f377abaea7879fb2418102735f1bb7dbacd1b154c",
  "prompt": "Analyze the sentiment of this conversation and provide insights",
  "limit": 10
}
```

### 3. Message Summarization

**POST** `/ai/summarize`

Generate AI summaries of WhatsApp conversations.

**Request Body:**

```json
{
  "sessionId": "7880f22816319b6c2483f36f377abaea7879fb2418102735f1bb7dbacd1b154c",
  "limit": 50
}
```

## Usage Examples

### Basic Chat

```bash
curl -X POST http://localhost/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain what WhatsApp webhooks are",
    "options": {"temperature": 0.3}
  }'
```

### Analyze Conversation

```bash
curl -X POST http://localhost/ai/analyze-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "prompt": "What is the main concern of the user in this conversation?"
  }'
```

### Search Messages

```bash
curl -X GET "http://localhost/messages/search?q=hello&limit=20" \
  -H "Content-Type: application/json"
```

## Database Management

### Bootstrap Scripts

```bash
npm run bootstrap         # Create database
npm run bootstrap:sample  # Create database with sample data
```

### Manual Database Setup

```bash
# Navigate to database folder
cd libraries/database

# Create database
sqlite3 whatsapp_messages.db < setup.sql

# Verify creation
sqlite3 whatsapp_messages.db ".tables"
```

### Query Examples

See `libraries/database/queries.sql` for sample queries:

- Get messages by session or contact
- Search message content
- Filter by date ranges
- Generate statistics
- And more...

## Configuration

### Required Environment Variables

- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI subscription key
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_API_VERSION`: API version (2024-12-01-preview)
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Name of your GPT-4o deployment

### Optional Configuration

- `AZURE_OPENAI_MODEL`: Model name (default: gpt-4o)
- `MAX_TOKENS`: Maximum response tokens (default: 1500)
- `TEMPERATURE`: AI creativity level (default: 0.7)

## Architecture

### Data Flow

```
WhatsApp → Webhook → API Endpoint → Data Restructuring → Database Storage
                                ↓
              Azure OpenAI ← Message Analysis ← Query Interface
```

### Key Components

- **Express Server**: Core API framework
- **WhatsApp Webhook Handler**: Processes incoming messages
- **SQLite Database**: Message storage with indexing
- **Azure OpenAI Helper**: AI integration and processing
- **Database Helper**: Query and data management utilities

## AI Features

### 🤖 **AI Integration**

- **GPT-4o Support**: Direct integration with Azure OpenAI GPT-4o
- **Conversation Context**: Uses WhatsApp message history for context
- **Flexible Input**: Supports both single messages and conversation arrays
- **Token Management**: Tracks and reports token usage

### 📊 **WhatsApp Analysis**

- **Conversation Analysis**: Analyze sentiment, topics, and patterns
- **Message Summarization**: Generate concise summaries of conversations
- **Context-Aware**: Uses stored WhatsApp messages for better responses
- **Multiple Filters**: Analyze by session, contact, or time period

### ⚙️ **Configuration Options**

- **Temperature Control**: Adjust AI creativity/randomness
- **Token Limits**: Control response length
- **Model Selection**: Specify which model deployment to use
- **Error Handling**: Comprehensive error messages and status codes

## Andrew AI Assistant Feature

### Overview

The Andrew AI Assistant is an intelligent auto-response feature integrated into the WhatsApp webhook endpoint. When users send messages that start with "Andrew" (case-insensitive), the system automatically:

1. **Detects the trigger** - Messages starting with "Andrew"
2. **Retrieves conversation history** - Gets the last 20 messages from that contact
3. **Generates AI response** - Uses Azure OpenAI GPT-4o with conversation context
4. **Sends automatic reply** - Responds back to the user via Wasender API

### How It Works

#### 1. Message Detection

```javascript
if (messageText.toLowerCase().startsWith("andrew")) {
  // Trigger AI processing
}
```

#### 2. History Retrieval

- Fetches last 20 messages from the sender using `db.getMessagesByContact()`
- Formats messages with timestamps and sender names for context

#### 3. AI Processing

- Creates a context-aware prompt including conversation history
- Uses Azure OpenAI GPT-4o with configurable temperature (0.7) and max tokens (200)
- Generates a conversational, WhatsApp-appropriate response

#### 4. Response Delivery

- Extracts phone number from WhatsApp remoteJid
- Sends AI response back to user via Wasender API
- Logs success/failure for monitoring

### Configuration

#### Required Environment Variables

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

### Example Usage

#### User sends:

```
"Andrew, what's the best programming language for beginners?"
```

#### System processes:

1. Detects "Andrew" trigger
2. Retrieves conversation history
3. Generates contextual AI response
4. Sends response back to user

#### User receives:

```
"Hi! For beginners, I'd recommend starting with Python. It has clean syntax, great learning resources, and is widely used in web development, data science, and automation. What type of projects are you interested in building?"
```

### Supported Message Formats

- **Regular text**: `"Andrew, help me with..."`
- **Extended text**: Long messages with extended text format
- **Case insensitive**: `"andrew"`, `"Andrew"`, `"ANDREW"`
- **With punctuation**: `"Andrew, could you please..."`
- **Group messages**: Works in group chats too

### Testing

#### REST Client Tests

- `rest/andrew.http` - Comprehensive Andrew-specific tests
- `rest/webhook.http` - General webhook tests including Andrew examples
- `test-andrew-simple.http` - Quick Andrew functionality test

#### Manual Testing

1. Send webhook with Andrew message
2. Check database for message storage
3. Verify AI response generation
4. Confirm message delivery via Wasender

### Response Characteristics

- **Conversational tone** - Friendly and approachable
- **Context-aware** - References previous conversation when relevant
- **Concise** - Optimized for WhatsApp (200 token limit)
- **Helpful** - Provides actionable information and guidance

### Error Handling

The system gracefully handles various error scenarios:

- **Azure OpenAI failures** - Logs error, continues normal webhook processing
- **Phone extraction errors** - Attempts multiple parsing strategies
- **Wasender API errors** - Logs failure but doesn't break webhook
- **Database errors** - Isolated from AI processing failures

### Monitoring

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

### Performance Considerations

- **Parallel processing** - AI and messaging operations run asynchronously
- **History limit** - Only retrieves last 20 messages for context
- **Token optimization** - 200 token limit for quick responses
- **Rate limiting** - Wasender API has built-in rate limiting

### Future Enhancements

- **Multiple triggers** - Support for other AI assistant names
- **Smart routing** - Different AI personalities for different triggers
- **Rich responses** - Support for images, links, and formatted text
- **Learning** - Improved responses based on user feedback

## Error Handling

### Authentication Errors

- **401**: Check your `AZURE_OPENAI_API_KEY`
- **404**: Verify `AZURE_OPENAI_DEPLOYMENT_NAME`
- **429**: Rate limit exceeded - implement retry logic

### Database Errors

- Connection failures and recovery
- Data validation and sanitization
- Transaction rollback on failures

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Use environment variables in production
- Consider implementing rate limiting for production deployments
- Monitor token usage to manage Azure OpenAI costs
- Validate webhook authenticity in production

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart
- `npm run bootstrap` - Initialize database
- `npm run bootstrap:sample` - Initialize database with sample data

### File Structure

```
├── server.js                  # Main Express server
├── libraries/                 # Core libraries and utilities
│   ├── ai/
│   │   └── azure-openai-helper.js  # Azure OpenAI integration
│   └── database/
│       ├── setup.sql              # Database schema
│       ├── queries.sql            # Sample queries
│       ├── bootstrap.js           # Database initialization
│       ├── db-helper.js           # Database utility class
│       └── whatsapp_messages.db   # SQLite database file
├── .env                       # Environment configuration
└── package.json               # Dependencies and scripts
```

## Troubleshooting

### Common Issues

1. **Port 80 Access**: May require administrator privileges on some systems
2. **Database Connection**: Ensure SQLite3 is installed
3. **Azure OpenAI Errors**: Validate all environment variables
4. **Memory Usage**: Monitor for large message volumes

### Debug Mode

Enable detailed logging by setting environment variables:

```bash
NODE_ENV=development
DEBUG=*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License].
