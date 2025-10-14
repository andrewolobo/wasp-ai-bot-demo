# Architecture Diagram - Refactored Server

## Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Request                          │
│                  (HTTP: POST, GET, DELETE)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    server.js (Entry Point)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Express App Initialization                         │   │
│  │ • Database Connection (WhatsAppDB)                   │   │
│  │ • Azure OpenAI Initialization                        │   │
│  │ • Middleware Setup (express.json)                    │   │
│  │ • Route Registration                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Route Dispatcher                          │
│                                                              │
│  /webhook      ──────►  routes/webhook.js                   │
│  /messages/*   ──────►  routes/messages.js                  │
│  /ai/*         ──────►  routes/ai.js                        │
│  /phone/*      ──────►  routes/phone.js                     │
│  /contacts/*   ──────►  routes/contacts.js                  │
│  /message/*    ──────►  routes/messaging.js                 │
│                                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Route Handlers                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Receive Request                                    │   │
│  │ • Validate Input                                     │   │
│  │ • Access Shared Resources (db, azureOpenAI)         │   │
│  │ • Call Utility Functions                            │   │
│  │ • Process Business Logic                            │   │
│  │ • Return Response                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Database   │  │   Utilities  │  │   External   │
│   (SQLite)   │  │              │  │   Services   │
│              │  │ • phoneUtils │  │              │
│ • Messages   │  │ • messaging  │  │ • Wasender   │
│ • Contacts   │  │ • queueUtils │  │ • RabbitMQ   │
│ • AI Users   │  │              │  │ • Azure AI   │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Module Dependencies

```
server.js
    │
    ├─► libraries/database/db-helper.js (WhatsAppDB)
    ├─► libraries/ai/azure-openai-helper.js (AzureOpenAIHelper)
    ├─► libraries/queue/publisher.js (queuePublisher)
    │
    └─► routes/
            ├─► webhook.js
            │       ├─► utils/phoneUtils.js
            │       ├─► utils/messagingUtils.js
            │       └─► utils/queueUtils.js
            │
            ├─► messages.js
            │       └─► (no utils dependencies)
            │
            ├─► ai.js
            │       └─► (no utils dependencies)
            │
            ├─► phone.js
            │       └─► utils/phoneUtils.js
            │
            ├─► contacts.js
            │       └─► (no utils dependencies)
            │
            └─► messaging.js
                    └─► utils/messagingUtils.js
```

## Data Flow Example: Webhook Processing

```
1. WhatsApp sends webhook
         │
         ▼
2. POST /webhook arrives at server.js
         │
         ▼
3. Routed to routes/webhook.js
         │
         ▼
4. Extract message data
         │
         ├─► Use phoneUtils.extractPhoneNumberFromRemoteJid()
         │
         ▼
5. Save to database
         │
         ├─► db.insertMessage()
         ├─► db.saveContact()
         │
         ▼
6. Check if AI-enabled
         │
         ├─► db.isAIEnabled()
         │
         ▼
7a. [Queue Mode]                    7b. [Direct Mode]
    publishAIRequestToQueue()           Process with Azure OpenAI
         │                                   │
         ├─► queueUtils.js                   ├─► Get chat completion
         └─► RabbitMQ                        ├─► Extract phone number
                                             └─► Send via messagingUtils
                                                     │
                                                     └─► Wasender API
         ▼
8. Return response to WhatsApp
```

## Endpoint Organization

```
┌─────────────────────────────────────────────────────────────┐
│                      API Endpoints                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Health & Info                                              │
│  ├─► GET  /            - Root info                         │
│  └─► GET  /health      - Health check                      │
│                                                              │
│  Webhooks (routes/webhook.js)                              │
│  └─► POST /webhook     - Receive WhatsApp webhooks         │
│                                                              │
│  Messages (routes/messages.js)                             │
│  ├─► GET  /messages/session/:id    - By session           │
│  ├─► GET  /messages/contact/:jid   - By contact           │
│  ├─► GET  /messages/search         - Search messages       │
│  ├─► GET  /messages/recent         - Recent messages       │
│  └─► GET  /messages/stats          - Statistics           │
│                                                              │
│  AI Features (routes/ai.js)                                │
│  ├─► POST   /ai/chat                 - Chat completion     │
│  ├─► POST   /ai/analyze-conversation - Analyze chat       │
│  ├─► POST   /ai/summarize           - Summarize messages  │
│  ├─► POST   /ai/users/add           - Add AI user         │
│  ├─► DELETE /ai/users/remove        - Remove AI user      │
│  ├─► DELETE /ai/users/delete        - Delete AI user      │
│  ├─► PATCH  /ai/users/toggle        - Toggle AI status    │
│  ├─► GET    /ai/users/list          - List AI users       │
│  ├─► GET    /ai/users/:jid          - Get AI user         │
│  └─► GET    /ai/users/check/:jid    - Check AI status     │
│                                                              │
│  Phone Utils (routes/phone.js)                             │
│  ├─► POST /phone/extract   - Extract phone from JID       │
│  ├─► GET  /phone/contacts  - Get all phone numbers        │
│  └─► GET  /phone/stats     - Phone number statistics      │
│                                                              │
│  Contacts (routes/contacts.js)                             │
│  ├─► GET    /contacts              - List contacts         │
│  ├─► GET    /contacts/stats/summary - Statistics          │
│  ├─► GET    /contacts/search/:term  - Search contacts     │
│  ├─► GET    /contacts/:jid          - Get contact         │
│  └─► DELETE /contacts/:jid          - Delete contact      │
│                                                              │
│  Messaging (routes/messaging.js)                           │
│  ├─► POST /message/send       - Send single message       │
│  └─► POST /message/send-bulk  - Send bulk messages        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

```
┌────────────────────────────────────────────────────────┐
│                   server.js                            │
├────────────────────────────────────────────────────────┤
│ • Initialize Express app                               │
│ • Setup middleware                                     │
│ • Connect to database                                  │
│ • Initialize Azure OpenAI                              │
│ • Initialize RabbitMQ (if queue mode)                  │
│ • Register all routes                                  │
│ • Start HTTP server                                    │
│ • Handle graceful shutdown                             │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│              Route Files (routes/*)                    │
├────────────────────────────────────────────────────────┤
│ • Define endpoint paths                                │
│ • Handle HTTP methods (GET, POST, DELETE, PATCH)       │
│ • Validate request input                               │
│ • Call business logic / database operations            │
│ • Use utility functions                                │
│ • Format and return responses                          │
│ • Handle route-specific errors                         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│             Utility Files (utils/*)                    │
├────────────────────────────────────────────────────────┤
│ • Provide reusable helper functions                    │
│ • Encapsulate complex logic                            │
│ • No route-specific code                               │
│ • Pure functions where possible                        │
│ • Single responsibility                                │
│ • Easy to test in isolation                            │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│             Libraries (libraries/*)                    │
├────────────────────────────────────────────────────────┤
│ • Database operations (db-helper.js)                   │
│ • Azure OpenAI integration (azure-openai-helper.js)    │
│ • RabbitMQ queue operations (queue/publisher.js)       │
│ • Unchanged from original                              │
└────────────────────────────────────────────────────────┘
```

## Comparison: Before vs After

### Before (Monolithic)
```
server.js (1671 lines)
├─► Everything in one file:
    ├─► Route handlers
    ├─► Utility functions
    ├─► Business logic
    ├─► Initialization
    └─► All mixed together
```

### After (Modular)
```
server.js (144 lines)
├─► Only initialization & setup

routes/ (6 files, ~150-300 lines each)
├─► Clear separation by domain
└─► Easy to find and modify

utils/ (3 files, ~50-250 lines each)
├─► Reusable helper functions
└─► Testable in isolation
```

## Key Benefits Visualized

```
┌─────────────────────────────────────────────────────────────┐
│                      MAINTAINABILITY                         │
│                                                              │
│  Before: Search 1671 lines to find one endpoint             │
│  After:  Open the relevant route file (~200 lines)          │
│                                                              │
│  Before: Change affects unclear areas                       │
│  After:  Change isolated to specific module                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       SCALABILITY                            │
│                                                              │
│  Before: Adding features clutters main file                 │
│  After:  Create new route file or extend existing           │
│                                                              │
│  Before: File grows unbounded                               │
│  After:  Each file stays manageable size                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       TESTABILITY                            │
│                                                              │
│  Before: Hard to test individual functions                  │
│  After:  Each module can be tested independently            │
│                                                              │
│  Before: Mock entire system for tests                       │
│  After:  Mock only what's needed                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     COLLABORATION                            │
│                                                              │
│  Before: Merge conflicts on single file                     │
│  After:  Multiple devs work on different files              │
│                                                              │
│  Before: Hard to review large changes                       │
│  After:  Clear, focused changes per file                    │
└─────────────────────────────────────────────────────────────┘
```

---

**Legend:**
- `───►` : Depends on / Imports
- `│` : Hierarchical relationship
- `├─►` : Branch in flow
- `▼` : Sequential flow
