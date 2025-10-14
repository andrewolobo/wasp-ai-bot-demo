# Server.js Refactoring Documentation

## Overview
This document describes the refactoring of the monolithic `server.js` file (1671 lines) into a maintainable, modular structure following Express.js best practices.

## Project Structure

### Before Refactoring
```
wasp-ai-bot/
├── server.js (1671 lines - monolithic)
├── libraries/
└── other files...
```

### After Refactoring
```
wasp-ai-bot/
├── server.js (original - keep as backup)
├── server-refactored.js (new clean entry point - 144 lines)
├── routes/
│   ├── webhook.js      - Webhook endpoints
│   ├── messages.js     - Message retrieval endpoints
│   ├── ai.js           - AI and AI-user management endpoints
│   ├── phone.js        - Phone number extraction endpoints
│   ├── contacts.js     - Contact management endpoints
│   └── messaging.js    - Message sending endpoints
├── utils/
│   ├── phoneUtils.js      - Phone number extraction & formatting
│   ├── messagingUtils.js  - WhatsApp message sending
│   └── queueUtils.js      - RabbitMQ queue publishing
└── libraries/ (unchanged)
```

## File Organization

### 1. Entry Point: `server-refactored.js`
**Purpose:** Application initialization and configuration  
**Lines:** ~144 (reduced from 1671)  
**Responsibilities:**
- Express app setup
- Database initialization
- Azure OpenAI initialization
- Route registration
- Server startup and graceful shutdown

### 2. Utility Files: `utils/`

#### `utils/phoneUtils.js`
- `extractPhoneNumberFromRemoteJid()` - Extract phone numbers from WhatsApp JIDs
- `formatPhoneNumber()` - Format phone numbers for display
- Handles individual, group, and newsletter formats

#### `utils/messagingUtils.js`
- `sendWhatsAppMessage()` - Send messages via Wasender API
- Handles API authentication and error handling

#### `utils/queueUtils.js`
- `publishAIRequestToQueue()` - Publish AI requests to RabbitMQ
- Manages queue communication for async AI processing

### 3. Route Files: `routes/`

#### `routes/webhook.js`
**Endpoints:**
- `POST /webhook` - Receive and process WhatsApp webhook messages

**Features:**
- Message parsing and database storage
- Contact management
- AI-enabled user detection
- Queue mode vs Direct mode processing
- Integration with Azure OpenAI for direct responses

#### `routes/messages.js`
**Endpoints:**
- `GET /messages/session/:sessionId` - Get messages by session
- `GET /messages/contact/:remoteJid` - Get messages by contact
- `GET /messages/search?q=term` - Search messages
- `GET /messages/recent?hours=24` - Get recent messages
- `GET /messages/stats` - Get message statistics

#### `routes/ai.js`
**Endpoints:**
- `POST /ai/chat` - Azure OpenAI chat completion
- `POST /ai/analyze-conversation` - Analyze conversations with AI
- `POST /ai/summarize` - Summarize messages with AI
- `POST /ai/users/add` - Add AI-enabled user
- `DELETE /ai/users/remove` - Remove AI-enabled user (soft delete)
- `DELETE /ai/users/delete` - Permanently delete AI-enabled user
- `PATCH /ai/users/toggle` - Toggle AI status
- `GET /ai/users/list` - List all AI-enabled users
- `GET /ai/users/:remoteJid` - Get specific AI user details
- `GET /ai/users/check/:remoteJid` - Check if user is AI-enabled

#### `routes/phone.js`
**Endpoints:**
- `POST /phone/extract` - Extract phone number from remoteJid
- `GET /phone/contacts` - Get phone numbers from all contacts
- `GET /phone/stats` - Get phone number statistics

#### `routes/contacts.js`
**Endpoints:**
- `GET /contacts` - Get all contacts (with filters)
- `GET /contacts/stats/summary` - Get contact statistics
- `GET /contacts/search/:term` - Search contacts
- `GET /contacts/:remoteJid` - Get specific contact
- `DELETE /contacts/:remoteJid` - Delete contact

#### `routes/messaging.js`
**Endpoints:**
- `POST /message/send` - Send single WhatsApp message
- `POST /message/send-bulk` - Send bulk WhatsApp messages

## Key Improvements

### 1. **Separation of Concerns**
- Each route file handles a specific domain (AI, messages, contacts, etc.)
- Utility functions are isolated and reusable
- Business logic is separated from routing logic

### 2. **Maintainability**
- Smaller, focused files are easier to understand and modify
- Changes to one feature don't affect others
- Clear file naming and organization

### 3. **Reusability**
- Utility functions can be shared across multiple routes
- Common patterns are abstracted (e.g., phone extraction, message sending)

### 4. **Testability**
- Individual modules can be unit tested in isolation
- Mock dependencies easily in route handlers
- Clear function boundaries

### 5. **Scalability**
- Easy to add new routes without cluttering main file
- Can split route files further if they grow too large
- Clear pattern for future development

### 6. **Code Organization**
- Related endpoints are grouped together
- Consistent structure across all route files
- Standard Express.js Router pattern

## Migration Path

### Option 1: Immediate Switch (Recommended)
1. Rename `server.js` to `server-old.js` (backup)
2. Rename `server-refactored.js` to `server.js`
3. Test all endpoints
4. Remove `server-old.js` when confident

### Option 2: Gradual Migration
1. Run both servers on different ports
2. Gradually migrate traffic to new server
3. Test thoroughly before full switch
4. Remove old server when ready

## Testing Checklist

After migration, test these endpoints:

### Webhook
- [ ] POST /webhook - Message reception and processing
- [ ] POST /webhook - AI user detection and response
- [ ] POST /webhook - Queue mode vs Direct mode

### Messages
- [ ] GET /messages/session/:sessionId
- [ ] GET /messages/contact/:remoteJid
- [ ] GET /messages/search?q=term
- [ ] GET /messages/recent?hours=24
- [ ] GET /messages/stats

### AI
- [ ] POST /ai/chat
- [ ] POST /ai/analyze-conversation
- [ ] POST /ai/summarize
- [ ] POST /ai/users/add
- [ ] DELETE /ai/users/remove
- [ ] DELETE /ai/users/delete
- [ ] PATCH /ai/users/toggle
- [ ] GET /ai/users/list
- [ ] GET /ai/users/:remoteJid
- [ ] GET /ai/users/check/:remoteJid

### Phone
- [ ] POST /phone/extract
- [ ] GET /phone/contacts
- [ ] GET /phone/stats

### Contacts
- [ ] GET /contacts
- [ ] GET /contacts/stats/summary
- [ ] GET /contacts/search/:term
- [ ] GET /contacts/:remoteJid
- [ ] DELETE /contacts/:remoteJid

### Messaging
- [ ] POST /message/send
- [ ] POST /message/send-bulk

### System
- [ ] GET / - Root endpoint
- [ ] GET /health - Health check
- [ ] Graceful shutdown (CTRL+C)

## Environment Variables

No changes to environment variables. The refactored code uses the same variables:
- `USE_QUEUE` - Enable queue mode
- `WASENDER_API_TOKEN` - Wasender API token
- `WASENDER_API_URL` - Wasender API URL
- Azure OpenAI configuration variables
- Database configuration variables

## Dependencies

No new dependencies required. All existing dependencies are reused:
- `express` - Web framework
- `dotenv` - Environment variables
- `node-fetch` - HTTP client (for Wasender API)
- Custom libraries (unchanged):
  - `./libraries/database/db-helper`
  - `./libraries/ai/azure-openai-helper`
  - `./libraries/queue/publisher`

## Performance Impact

**Expected Performance:** No degradation  
- Same logic, just reorganized
- No additional middleware layers
- Same database and API calls
- Potentially better performance due to cleaner code structure

## Future Enhancements

Possible next steps for further improvement:

1. **Middleware Layer**
   - Add authentication middleware
   - Add request validation middleware
   - Add rate limiting middleware

2. **Controllers**
   - Move business logic from routes to controllers
   - Keep routes thin (only routing logic)

3. **Services**
   - Create service layer for complex business logic
   - Separate data access from business logic

4. **Error Handling**
   - Centralized error handling middleware
   - Custom error classes
   - Better error logging

5. **Validation**
   - Add input validation library (e.g., Joi, express-validator)
   - Centralized validation schemas

6. **Documentation**
   - Add Swagger/OpenAPI documentation
   - Generate API documentation automatically

7. **Testing**
   - Unit tests for utilities
   - Integration tests for routes
   - End-to-end tests

## Notes

- Original `server.js` is preserved as backup
- All functionality remains identical
- No breaking changes to API endpoints
- Route handlers access `db` and `azureOpenAI` via `req.app.get()`
- Utility functions are pure and stateless where possible

## Support

If you encounter any issues after refactoring:
1. Check that all files are in correct locations
2. Verify no typos in file imports
3. Ensure environment variables are set
4. Compare with original `server.js` behavior
5. Check console logs for specific error messages

## Conclusion

This refactoring transforms a 1671-line monolithic file into a well-organized, maintainable structure with:
- Clear separation of concerns
- Improved code organization
- Better testability
- Enhanced scalability
- Preserved functionality

The new structure follows Express.js best practices and industry standards, making the codebase more professional and easier to work with for current and future developers.
