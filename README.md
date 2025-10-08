# WhatsApp AI Bot API

A comprehensive Node.js Express API that processes WhatsApp webhooks, stores messages in SQLite database, and provides AI-powered analysis using Azure OpenAI GPT-4o with intelligent auto-response capabilities.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Core Features](#core-features)
  - [WhatsApp Webhook Processing](#whatsapp-webhook-processing)
  - [AI Auto-Response System](#ai-auto-response-system)
  - [Azure OpenAI Integration](#azure-openai-integration)
  - [Phone Number Extraction](#phone-number-extraction)
  - [Message Sending](#message-sending)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Features

- 🔗 **WhatsApp Webhook Processing** - Receive and process WhatsApp messages with metadata
- 💾 **SQLite Database Storage** - Persistent storage with automatic indexing and views
- 🤖 **AI Auto-Response System** - Database-driven AI responses for authorized users
- 🧠 **Azure OpenAI Integration** - GPT-4o powered conversation analysis and chat
- 📞 **Phone Number Extraction** - International phone number parsing from WhatsApp IDs
- 📤 **Message Sending** - Send individual and bulk WhatsApp messages via Wasender API
- 👥 **AI User Management** - Dynamic whitelist system for AI-enabled users
- 📊 **Message Analytics** - Search, filter, and analyze conversations
- 🔍 **AI-Powered Insights** - Sentiment analysis and conversation summaries

## Architecture

```
                          ┌─────────────────────┐
                          │   WhatsApp Cloud    │
                          └──────────┬──────────┘
                                     │ Webhook
                                     ▼
┌────────────────────────────────────────────────────────────┐
│                      Express API Server                     │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │   Webhook    │  │  AI User      │  │   Message       │ │
│  │   Handler    │─▶│  Whitelist    │─▶│   Sender        │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            SQLite Database (2 Tables)                │  │
│  │  • whatsapp_messages   • ai_enabled_users           │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Azure OpenAI GPT-4o                     │  │
│  │  • Chat Completion  • Analysis  • Summarization     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQLite3
- Azure OpenAI account with GPT-4o deployment
- Wasender API account (for message sending)

## Installation & Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd wasp-ai-bot
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Azure OpenAI Configuration (Required)
AZURE_OPENAI_API_KEY=your_subscription_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your-gpt4o-deployment-name

# Optional: Model Configuration
AZURE_OPENAI_MODEL=gpt-4o
MAX_TOKENS=1500
TEMPERATURE=0.7

# Wasender API Configuration (Required for message sending)
WASENDER_API_TOKEN=your_wasender_api_token_here
```

### 3. Database Setup

Bootstrap the SQLite database (creates tables, indexes, views, and triggers):

```bash
# Create database without sample data
npm run bootstrap

# Or create database with sample data
npm run bootstrap:sample
```

### 4. Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

The server will start on port 80. You should see:

```
✅ All required environment variables are set
Express API listening on port 80
```

## Configuration

### Required Environment Variables

| Variable                       | Description                       | Example                                 |
| ------------------------------ | --------------------------------- | --------------------------------------- |
| `AZURE_OPENAI_API_KEY`         | Azure OpenAI subscription key     | `abc123...`                             |
| `AZURE_OPENAI_ENDPOINT`        | Azure OpenAI endpoint URL         | `https://my-resource.openai.azure.com/` |
| `AZURE_OPENAI_API_VERSION`     | API version                       | `2024-12-01-preview`                    |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | GPT-4o deployment name            | `gpt-4o-deployment`                     |
| `WASENDER_API_TOKEN`           | Wasender API authentication token | `xyz789...`                             |

### Optional Configuration

| Variable             | Description               | Default  |
| -------------------- | ------------------------- | -------- |
| `AZURE_OPENAI_MODEL` | Model name                | `gpt-4o` |
| `MAX_TOKENS`         | Maximum response tokens   | `1500`   |
| `TEMPERATURE`        | AI creativity level (0-1) | `0.7`    |

## Core Features

### WhatsApp Webhook Processing

The API receives WhatsApp webhooks, extracts message data, and stores it in the database with automatic AI response for authorized users.

**Webhook Flow:**

1. WhatsApp sends webhook to `POST /webhook`
2. System checks if sender is in AI-enabled users list
3. If authorized, generates AI response using conversation history
4. Automatically sends response via Wasender API
5. Stores all messages in database with metadata

**Example Webhook Payload:**

```json
{
  "event": "messages.received",
  "sessionId": "7880f22816319b6c2483f36f377abaea",
  "data": {
    "key": {
      "remoteJid": "256700000000@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0123456789"
    },
    "pushName": "John Doe",
    "message": {
      "conversation": "Hello, I need help"
    },
    "messageTimestamp": "1734530087"
  }
}
```

### AI Auto-Response System

**Database-Driven Whitelist**

Instead of hardcoded keywords, the system uses a database table (`ai_enabled_users`) to control which users receive AI responses.

**Benefits:**

- ✅ Add/remove users without code deployment
- ✅ Enable/disable AI responses per user
- ✅ Track user interactions and last contact
- ✅ Store user metadata (name, notes)
- ✅ Audit trail for AI usage

**How It Works:**

```javascript
// When webhook receives a message:
1. Extract phone number from remoteJid (e.g., "256700000000@s.whatsapp.net")
2. Check if user exists in ai_enabled_users table
3. Verify user's enabled status is true
4. If authorized:
   - Retrieve conversation history
   - Generate AI response using GPT-4o
   - Send response via Wasender API
   - Update user's last_interaction timestamp
```

**Example: Adding an AI-Enabled User**

```bash
curl -X POST http://localhost/ai-users/add \
  -H "Content-Type: application/json" \
  -d '{
    "remoteJid": "256700000000@s.whatsapp.net",
    "name": "John Doe",
    "notes": "VIP customer - priority support"
  }'
```

### Azure OpenAI Integration

**1. Basic Chat Completion**

Send messages to GPT-4o and receive responses.

**Endpoint:** `POST /ai/chat`

**Request:**

```json
{
  "message": "What are the benefits of AI in customer service?",
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
  "message": "AI in customer service offers several key benefits: 1) 24/7 availability...",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 120,
    "total_tokens": 135
  },
  "model": "gpt-4o",
  "finishReason": "stop"
}
```

**2. Conversation Analysis**

Analyze WhatsApp conversations with AI using stored message history.

**Endpoint:** `POST /ai/analyze-conversation`

**Request:**

```json
{
  "sessionId": "7880f22816319b6c2483f36f377abaea",
  "prompt": "Analyze the sentiment and identify key concerns",
  "limit": 10
}
```

**3. Message Summarization**

Generate concise summaries of WhatsApp conversations.

**Endpoint:** `POST /ai/summarize`

**Request:**

```json
{
  "sessionId": "7880f22816319b6c2483f36f377abaea",
  "limit": 50
}
```

### Phone Number Extraction

Extract phone numbers from WhatsApp remote JIDs with international support.

**Function:** `extractPhoneNumberFromRemoteJid(remoteJid)`

**Supported Formats:**

- Standard: `256700000000@s.whatsapp.net` → `256700000000`
- Group: `120363123456789@g.us` → `null` (groups return null)
- Business: `256700000000@c.us` → `256700000000`

**Supported Country Codes:**
`1, 7, 20, 27, 30, 31, 32, 33, 34, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 81, 82, 84, 86, 90, 91, 92, 93, 94, 95, 98, 212, 213, 216, 218, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 290, 291, 297, 298, 299, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 370, 371, 372, 373, 374, 375, 376, 377, 378, 380, 381, 382, 383, 385, 386, 387, 389, 420, 421, 423, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 670, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 850, 852, 853, 855, 856, 880, 886, 960, 961, 962, 963, 964, 965, 966, 967, 968, 970, 971, 972, 973, 974, 975, 976, 977, 992, 993, 994, 995, 996, 998`

**Usage Example:**

```javascript
const phone = extractPhoneNumberFromRemoteJid("256700000000@s.whatsapp.net");
console.log(phone); // "256700000000"
```

### Message Sending

Send WhatsApp messages using the Wasender API.

**Function:** `sendWhatsAppMessage(sessionId, remoteJid, message)`

**Single Message Example:**

```javascript
await sendWhatsAppMessage(
  "7880f22816319b6c2483f36f377abaea",
  "256700000000@s.whatsapp.net",
  "Hello! This is an automated response."
);
```

**Bulk Message Example:**

```javascript
const recipients = [
  { remoteJid: "256700000000@s.whatsapp.net", message: "Hello User 1" },
  { remoteJid: "256700000001@s.whatsapp.net", message: "Hello User 2" },
];

for (const { remoteJid, message } of recipients) {
  await sendWhatsAppMessage(sessionId, remoteJid, message);
}
```

**Wasender API Integration:**

```bash
curl -X POST https://api.wasender.co.ug/api/v1/send/chat/text/7880f22816319b6c2483f36f377abaea \
  -H "Content-Type: application/json" \
  -H "token: YOUR_TOKEN" \
  -d '{
    "to": "256700000000@s.whatsapp.net",
    "msg": "Your message here"
  }'
```

## API Endpoints

### Core Endpoints

| Method | Endpoint   | Description                    |
| ------ | ---------- | ------------------------------ |
| GET    | `/`        | API status and welcome message |
| GET    | `/health`  | Health check endpoint          |
| POST   | `/webhook` | Receive WhatsApp webhooks      |

### Message Query Endpoints

| Method | Endpoint                       | Description                            |
| ------ | ------------------------------ | -------------------------------------- |
| GET    | `/messages`                    | Get all messages (with optional limit) |
| GET    | `/messages/session/:sessionId` | Get messages by session ID             |
| GET    | `/messages/contact/:remoteJid` | Get messages by contact                |
| GET    | `/messages/search?q=term`      | Search messages by content             |
| GET    | `/messages/recent?hours=24`    | Get recent messages                    |
| GET    | `/messages/stats`              | Get message statistics                 |
| GET    | `/messages/date-range`         | Get messages within date range         |

### AI-Powered Endpoints

| Method | Endpoint                   | Description                  |
| ------ | -------------------------- | ---------------------------- |
| POST   | `/ai/chat`                 | Azure OpenAI chat completion |
| POST   | `/ai/analyze-conversation` | AI conversation analysis     |
| POST   | `/ai/summarize`            | AI message summarization     |

### AI User Management Endpoints

| Method | Endpoint                      | Description                 |
| ------ | ----------------------------- | --------------------------- |
| POST   | `/ai-users/add`               | Add user to AI whitelist    |
| GET    | `/ai-users`                   | List all AI-enabled users   |
| GET    | `/ai-users/check/:remoteJid`  | Check if user is AI-enabled |
| GET    | `/ai-users/:remoteJid`        | Get specific user details   |
| PUT    | `/ai-users/:remoteJid/toggle` | Enable/disable AI for user  |
| DELETE | `/ai-users/:remoteJid/remove` | Disable user (soft delete)  |
| DELETE | `/ai-users/:remoteJid/delete` | Permanently delete user     |

### Message Sending Endpoints

| Method | Endpoint              | Description                 |
| ------ | --------------------- | --------------------------- |
| POST   | `/send-message`       | Send WhatsApp message       |
| POST   | `/send-bulk-messages` | Send bulk WhatsApp messages |

## Testing

The project includes comprehensive testing files for all features using VS Code's REST Client extension.

### Test Files (in `/rest` directory)

1. **ai-chat.http** - AI chat completion tests (12 tests)
2. **ai-analyze.http** - Conversation analysis tests (15 tests)
3. **ai-summarize.http** - Summarization tests (10 tests)
4. **messages.http** - Message query tests (20 tests)
5. **webhook.http** - Webhook processing tests (8 tests)
6. **stats.http** - Statistics tests (6 tests)
7. **date-range.http** - Date range query tests (8 tests)
8. **send-messages.http** - Message sending tests (12 tests)
9. **ai-users.http** - AI user management tests (36 tests)

**Total: 127 test cases**

### Running Tests

**Using REST Client (VS Code Extension):**

1. Install the "REST Client" extension in VS Code
2. Open any `.http` file in the `/rest` directory
3. Click "Send Request" above any test case

**Example Test Cases:**

```http
### Add AI-Enabled User
POST http://localhost/ai-users/add
Content-Type: application/json

{
  "remoteJid": "256700000000@s.whatsapp.net",
  "name": "John Doe",
  "notes": "VIP customer"
}

### Check if User is AI-Enabled
GET http://localhost/ai-users/check/256700000000@s.whatsapp.net

### Toggle AI Status
PUT http://localhost/ai-users/256700000000@s.whatsapp.net/toggle

### Send Message
POST http://localhost/send-message
Content-Type: application/json

{
  "sessionId": "7880f22816319b6c2483f36f377abaea",
  "remoteJid": "256700000000@s.whatsapp.net",
  "message": "Hello from the API!"
}
```

### Automated Database Tests

Run the automated test suite:

```bash
node test-ai-users.js
```

**Test Coverage:**

- ✅ Add AI user
- ✅ Check if user is AI-enabled
- ✅ Get user details
- ✅ List all users
- ✅ Update user interaction timestamp
- ✅ Toggle user status
- ✅ Remove user (soft delete)
- ✅ Check removed user
- ✅ Delete user permanently
- ✅ Verify deletion

## Database Schema

### Table: `whatsapp_messages`

Stores all received WhatsApp messages with full metadata.

| Column             | Type         | Description                            |
| ------------------ | ------------ | -------------------------------------- |
| `id`               | INTEGER (PK) | Auto-incrementing primary key          |
| `event`            | TEXT         | Event type (e.g., 'messages.received') |
| `sessionId`        | TEXT         | WhatsApp session identifier            |
| `pushName`         | TEXT         | Contact display name                   |
| `remoteJid`        | TEXT         | WhatsApp contact ID                    |
| `timestamp`        | INTEGER      | Webhook timestamp (milliseconds)       |
| `messageTimestamp` | INTEGER      | Message timestamp (seconds)            |
| `messageId`        | TEXT         | Unique message identifier              |
| `message`          | TEXT         | Message content                        |
| `broadcast`        | BOOLEAN      | Whether message is broadcast           |
| `created_at`       | DATETIME     | Record creation timestamp              |
| `updated_at`       | DATETIME     | Record update timestamp                |

**Indexes:**

- `idx_sessionId` - Fast session-based queries
- `idx_remoteJid` - Fast contact-based queries
- `idx_messageTimestamp` - Fast time-based queries
- `idx_message` - Fast message content searches

**Views:**

- `messages_view` - Human-readable timestamps and formatted data

**Triggers:**

- `update_whatsapp_messages_timestamp` - Auto-update `updated_at` on modifications

### Table: `ai_enabled_users`

Controls which WhatsApp users receive AI auto-responses.

| Column             | Type          | Description                             |
| ------------------ | ------------- | --------------------------------------- |
| `id`               | INTEGER (PK)  | Auto-incrementing primary key           |
| `remoteJid`        | TEXT (UNIQUE) | WhatsApp contact ID                     |
| `phoneNumber`      | TEXT          | Extracted phone number                  |
| `name`             | TEXT          | User's display name                     |
| `enabled`          | BOOLEAN       | AI response enabled status (default: 1) |
| `notes`            | TEXT          | Optional notes about the user           |
| `last_interaction` | DATETIME      | Last AI interaction timestamp           |
| `created_at`       | DATETIME      | Record creation timestamp               |
| `updated_at`       | DATETIME      | Record update timestamp                 |

**Indexes:**

- `idx_ai_users_remoteJid` - Fast user lookup
- `idx_ai_users_phoneNumber` - Phone number searches
- `idx_ai_users_enabled` - Filter enabled users

**Views:**

- `ai_enabled_users_view` - Formatted view with human-readable timestamps

**Triggers:**

- `update_ai_enabled_users_timestamp` - Auto-update `updated_at` on modifications

### Sample Queries

**Get AI-enabled users:**

```sql
SELECT * FROM ai_enabled_users WHERE enabled = 1;
```

**Get conversation history for AI context:**

```sql
SELECT pushName, message, messageTimestamp
FROM whatsapp_messages
WHERE remoteJid = '256700000000@s.whatsapp.net'
ORDER BY messageTimestamp DESC
LIMIT 10;
```

**Get message statistics:**

```sql
SELECT
  COUNT(*) as total_messages,
  COUNT(DISTINCT remoteJid) as unique_contacts,
  COUNT(DISTINCT sessionId) as sessions,
  MAX(created_at) as latest_message
FROM whatsapp_messages;
```

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Setup database
npm run bootstrap

# Start server
npm run dev
```

### Production Deployment

**1. Environment Configuration**

Ensure all environment variables are set in production:

```bash
# .env file
AZURE_OPENAI_API_KEY=your_production_key
AZURE_OPENAI_ENDPOINT=your_production_endpoint
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
WASENDER_API_TOKEN=your_production_token
```

**2. Database Setup**

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
npm run bootstrap
```

**3. Start Server**

```bash
# Using npm
npm start

# Using PM2 (recommended for production)
pm2 start server.js --name whatsapp-ai-bot

# Using systemd service
sudo systemctl start whatsapp-ai-bot
```

**4. Port Configuration**

The server runs on port 80 by default. For production:

- Use a reverse proxy (nginx, Apache) for HTTPS
- Or modify `server.js` to use a different port
- Ensure firewall rules allow the configured port

### Cloud Deployment

**Azure App Service:**

```bash
az webapp up --name whatsapp-ai-bot --runtime "NODE|16-lts"
```

**AWS Elastic Beanstalk:**

```bash
eb init -p node.js whatsapp-ai-bot
eb create whatsapp-ai-bot-env
eb deploy
```

**Heroku:**

```bash
heroku create whatsapp-ai-bot
git push heroku main
```

**Docker:**

```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 80
CMD ["node", "server.js"]
```

```bash
docker build -t whatsapp-ai-bot .
docker run -p 80:80 --env-file .env whatsapp-ai-bot
```

## Security

### Environment Variables

- ✅ Never commit `.env` file to version control
- ✅ Add `.env` to `.gitignore`
- ✅ Use secure environment variable storage in production
- ✅ Rotate API keys regularly

### API Token Security

The application validates environment variables at startup:

```javascript
if (!process.env.WASENDER_API_TOKEN) {
  console.error(
    "❌ Error: WASENDER_API_TOKEN is not set in environment variables"
  );
  process.exit(1);
}
```

### Production Best Practices

1. **HTTPS:** Always use HTTPS in production
2. **Rate Limiting:** Implement rate limiting for API endpoints
3. **Authentication:** Add API authentication for sensitive endpoints
4. **Webhook Validation:** Verify webhook signatures from WhatsApp
5. **Database Backups:** Regular automated backups of SQLite database
6. **Monitoring:** Monitor token usage and API costs
7. **Logging:** Implement structured logging for audit trails
8. **Error Handling:** Never expose sensitive information in error messages

### Webhook Security

Validate incoming webhooks to prevent unauthorized access:

```javascript
// Add webhook signature validation
const crypto = require("crypto");

function validateWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return hash === signature;
}
```

## Troubleshooting

### Common Issues

**1. Port 80 Access Denied**

```bash
# Run with sudo (Linux/Mac)
sudo npm start

# Or use a different port
# Modify server.js: const PORT = process.env.PORT || 3000;
```

**2. Database Connection Errors**

```bash
# Verify database exists
ls -l libraries/database/whatsapp_messages.db

# Recreate database
npm run bootstrap
```

**3. Azure OpenAI Authentication Errors**

```bash
# Verify environment variables
node -e "console.log(process.env.AZURE_OPENAI_API_KEY)"

# Check endpoint format (must end with /)
# Correct: https://resource.openai.azure.com/
# Wrong: https://resource.openai.azure.com
```

**4. Wasender API Token Error**

```bash
# Verify token is set
echo %WASENDER_API_TOKEN%

# Test token with curl
curl -H "token: YOUR_TOKEN" https://api.wasender.co.ug/api/v1/sessions
```

**5. AI Auto-Response Not Working**

```bash
# Check if user is in whitelist
curl http://localhost/ai-users/check/256700000000@s.whatsapp.net

# Add user to whitelist
curl -X POST http://localhost/ai-users/add \
  -H "Content-Type: application/json" \
  -d '{"remoteJid": "256700000000@s.whatsapp.net", "name": "Test User"}'
```

### Debug Mode

Enable detailed logging:

```bash
# Set environment variables
set NODE_ENV=development
set DEBUG=*

# Start server
npm run dev
```

### Testing Connectivity

```bash
# Test health endpoint
curl http://localhost/health

# Test AI chat
curl -X POST http://localhost/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Test database
curl http://localhost/messages/stats
```

## Project Structure

```
wasp-ai-bot/
├── server.js                          # Main Express server (25+ endpoints)
├── package.json                       # Dependencies and scripts
├── .env                              # Environment variables (gitignored)
├── .gitignore                        # Git ignore rules
├── test-ai-users.js                  # Automated database tests
│
├── libraries/                        # Core libraries and utilities
│   ├── ai/
│   │   └── azure-openai-helper.js    # Azure OpenAI integration
│   │
│   └── database/
│       ├── setup.sql                 # Database schema (2 tables, views, triggers)
│       ├── queries.sql               # Sample SQL queries
│       ├── bootstrap.js              # Database initialization script
│       ├── db-helper.js              # Database utility class (15+ methods)
│       └── whatsapp_messages.db      # SQLite database file
│
└── rest/                             # REST Client test files (127 tests)
    ├── ai-chat.http                  # AI chat completion tests (12)
    ├── ai-analyze.http               # Conversation analysis tests (15)
    ├── ai-summarize.http             # Summarization tests (10)
    ├── messages.http                 # Message query tests (20)
    ├── webhook.http                  # Webhook tests (8)
    ├── stats.http                    # Statistics tests (6)
    ├── date-range.http               # Date range query tests (8)
    ├── send-messages.http            # Message sending tests (12)
    └── ai-users.http                 # AI user management tests (36)
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Write/update tests
5. Test thoroughly using REST Client test files
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Use 2-space indentation
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable names

### Testing Requirements

- All new features must have corresponding tests
- Ensure all existing tests pass
- Add test cases to appropriate `.http` files
- Run automated tests: `node test-ai-users.js`

### Documentation

- Update README.md for new features
- Add inline code comments
- Update API endpoint documentation
- Include usage examples

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/wasp-ai-bot/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/wasp-ai-bot/discussions)
- **Email:** support@example.com

## Roadmap

### Version 2.0 (Planned)

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Custom AI training per user
- [ ] Voice message transcription
- [ ] Image analysis with GPT-4 Vision
- [ ] Scheduled message sending
- [ ] Webhook retry mechanism
- [ ] Real-time notifications via WebSocket
- [ ] User permission levels
- [ ] API rate limiting

### Future Enhancements

- PostgreSQL support for larger deployments
- Redis caching layer
- GraphQL API
- Admin dashboard UI
- Conversation templates
- A/B testing for AI responses
- Integration with other messaging platforms

## License

This project is open source and available under the [MIT License](LICENSE).

---

**Made with ❤️ for WhatsApp automation and AI integration**
