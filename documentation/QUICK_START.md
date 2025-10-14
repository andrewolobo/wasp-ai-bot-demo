# Quick Start Guide - Refactored Server

## Overview
Your server.js has been refactored into a maintainable, modular structure. Here's how to use it.

## Project Structure at a Glance

```
wasp-ai-bot/
├── server-refactored.js    ← New clean entry point (use this!)
├── server.js               ← Original file (backup)
├── routes/                 ← All API endpoints organized by domain
│   ├── webhook.js         ← POST /webhook
│   ├── messages.js        ← GET /messages/*
│   ├── ai.js              ← /ai/* (chat, users, etc.)
│   ├── phone.js           ← /phone/* (extraction, stats)
│   ├── contacts.js        ← /contacts/* (CRUD operations)
│   └── messaging.js       ← POST /message/send*
└── utils/                  ← Reusable helper functions
    ├── phoneUtils.js      ← Phone number extraction
    ├── messagingUtils.js  ← WhatsApp message sending
    └── queueUtils.js      ← RabbitMQ queue operations
```

## Getting Started

### Step 1: Switch to Refactored Server

**Option A: Immediate switch (Recommended)**
```bash
# Backup original
mv server.js server-old.js

# Use refactored version
mv server-refactored.js server.js

# Start server
node server.js
```

**Option B: Test first**
```bash
# Keep both, test on different port
# Edit server-refactored.js: change PORT to 8080
node server-refactored.js

# Test endpoints on http://localhost:8080
# When satisfied, switch to Option A
```

### Step 2: Verify Everything Works

Test the health endpoint:
```bash
curl http://localhost:80/health
```

Should return:
```json
{
  "status": "OK",
  "message": "API is healthy"
}
```

## Adding New Features

### Adding a New Route File

1. **Create the route file** in `routes/` folder:

```javascript
// routes/myNewFeature.js
const express = require('express');
const router = express.Router();

router.get('/example', async (req, res) => {
    const db = req.app.get('db');  // Access database
    const azureOpenAI = req.app.get('azureOpenAI');  // Access AI
    
    // Your logic here
    res.json({ message: 'Success!' });
});

module.exports = router;
```

2. **Register the route** in `server.js`:

```javascript
// Add to imports
const myNewFeatureRoutes = require('./routes/myNewFeature');

// Add to route registration section
app.use('/my-feature', myNewFeatureRoutes);
```

### Adding a New Utility Function

1. **Create or edit utility file** in `utils/` folder:

```javascript
// utils/myUtils.js
function myHelperFunction(param) {
    // Your logic
    return result;
}

module.exports = {
    myHelperFunction
};
```

2. **Use in any route**:

```javascript
const { myHelperFunction } = require('../utils/myUtils');

router.get('/something', (req, res) => {
    const result = myHelperFunction(req.query.data);
    res.json({ result });
});
```

## Accessing Shared Resources in Routes

Routes have access to shared resources via `req.app`:

```javascript
// In any route handler
router.get('/example', async (req, res) => {
    // Get database instance
    const db = req.app.get('db');
    const messages = await db.getRecentMessages(24, 100);
    
    // Get Azure OpenAI instance
    const azureOpenAI = req.app.get('azureOpenAI');
    const result = await azureOpenAI.getChatCompletion('Hello');
    
    res.json({ messages, aiResult: result });
});
```

## Common Tasks

### Modifying an Endpoint

1. Find the route file (e.g., `routes/ai.js` for AI endpoints)
2. Locate the specific route handler
3. Make your changes
4. Save and restart server

### Adding Middleware to Specific Routes

```javascript
// In route file
const myMiddleware = (req, res, next) => {
    // Middleware logic
    next();
};

router.post('/protected', myMiddleware, async (req, res) => {
    // Handler logic
});
```

### Adding Global Middleware

Add to `server.js` before route registration:

```javascript
// In server.js, after app.use(express.json())
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Then register routes
app.use('/webhook', webhookRoutes);
```

## File Responsibility Guide

| File | Responsible For |
|------|----------------|
| `server.js` | App initialization, middleware, route registration |
| `routes/webhook.js` | Receiving and processing WhatsApp webhooks |
| `routes/messages.js` | Retrieving message history and stats |
| `routes/ai.js` | AI chat, analysis, and AI-user management |
| `routes/phone.js` | Phone number extraction and validation |
| `routes/contacts.js` | Contact CRUD operations |
| `routes/messaging.js` | Sending WhatsApp messages |
| `utils/phoneUtils.js` | Phone number parsing logic |
| `utils/messagingUtils.js` | Wasender API integration |
| `utils/queueUtils.js` | RabbitMQ queue operations |

## Troubleshooting

### Server Won't Start

Check:
1. All files are in correct locations
2. File paths in `require()` statements are correct
3. Environment variables are set (`.env` file)
4. Port 80 is not in use

### Route Not Found (404)

Check:
1. Route is registered in `server.js`
2. Route path matches what you're calling
3. HTTP method (GET/POST/DELETE) is correct

### "Cannot read property 'db' of undefined"

Make sure routes access database via:
```javascript
const db = req.app.get('db');  // ✅ Correct
// NOT: const db = require('...')  // ❌ Wrong
```

### Changes Not Taking Effect

Remember to restart the server after changes:
```bash
# Stop server: Ctrl+C
# Start again: node server.js
```

## Best Practices

### ✅ DO:
- Keep route handlers focused and simple
- Use utility functions for reusable logic
- Handle errors appropriately
- Return consistent response formats
- Use async/await for database operations

### ❌ DON'T:
- Put business logic in server.js
- Create circular dependencies
- Forget to export from modules
- Hardcode values (use environment variables)
- Skip error handling

## Need Help?

1. Check `REFACTORING.md` for detailed documentation
2. Review the original `server.js` for comparison
3. Check console logs for error messages
4. Test individual endpoints with curl or Postman
5. Verify environment variables are set correctly

## Quick Command Reference

```bash
# Start server
node server.js

# Start with nodemon (auto-reload)
nodemon server.js

# Check if port is in use (Windows)
netstat -ano | findstr :80

# View environment variables
type .env

# Test endpoint
curl http://localhost:80/health
```

## Summary

The refactored structure:
- ✅ Is easier to maintain and understand
- ✅ Follows Express.js best practices
- ✅ Makes adding features simpler
- ✅ Improves code organization
- ✅ Preserves all original functionality

Happy coding! 🚀
