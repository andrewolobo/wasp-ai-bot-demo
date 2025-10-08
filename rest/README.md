# REST Client Test Suite

Comprehensive REST Client tests for the WhatsApp AI Bot API. These tests are organized in a numbered sequence for logical execution order.

## 📁 Consolidated File Structure

This test suite has been reorganized using **domain-based structure** with numbered prefixes for clarity:

| File                    | Focus Area               | Test Count | Description                                           |
| ----------------------- | ------------------------ | ---------- | ----------------------------------------------------- |
| **00-health.http**      | Health & Smoke Tests     | ~5 tests   | Quick verification, health checks, API status         |
| **01-webhook.http**     | WhatsApp Webhooks        | ~25 tests  | Message ingestion, AI auto-response, context handling |
| **02-messages.http**    | Message Queries          | ~20 tests  | Database retrieval, search, filtering, statistics     |
| **03-ai-chat.http**     | AI Features              | ~15 tests  | Chat completion, analysis, summarization              |
| **04-ai-users.http**    | AI User Management       | ~35 tests  | Whitelist management, CRUD operations, integration    |
| **05-messaging.http**   | Message Sending          | ~12 tests  | Outbound messages via Wasender API, bulk sending      |
| **06-workflows.http**   | End-to-End Tests         | ~30 tests  | Complete scenarios, multi-feature integration         |
| **99-performance.http** | Performance & Edge Cases | ~40+ tests | Load testing, edge cases, validation, stress tests    |

**Total: 180+ comprehensive test cases**

## 🚀 Prerequisites

1. **VS Code with REST Client Extension**

   - Install the "REST Client" extension by Huachao Mao
   - Available in VS Code marketplace

2. **API Server Running**

   ```bash
   npm start
   ```

3. **Database Initialized**

   ```bash
   npm run bootstrap
   ```

4. **Environment Variables Configured**
   - Create `.env` file in project root
   - Set required variables (see main README.md):
     - `AZURE_OPENAI_API_KEY`
     - `AZURE_OPENAI_ENDPOINT`
     - `AZURE_OPENAI_API_VERSION`
     - `AZURE_OPENAI_DEPLOYMENT_NAME`
     - `WASENDER_API_TOKEN`

## ⚡ Quick Start

### 1. **Verify System Health (30 seconds)**

Open `00-health.http` and run all tests:

- ✅ Health check
- ✅ API status
- ✅ Error handling

### 2. **Test Core Functionality (5 minutes)**

Follow the numbered sequence:

1. `00-health.http` - Verify system is operational
2. `01-webhook.http` - Test message reception
3. `02-messages.http` - Verify database queries
4. `03-ai-chat.http` - Test AI features
5. `04-ai-users.http` - Test user management
6. `05-messaging.http` - Test message sending

### 3. **Run Integration Tests (10 minutes)**

Execute `06-workflows.http` for end-to-end scenarios.

### 4. **Performance & Edge Cases (15 minutes)**

Run `99-performance.http` for comprehensive testing.

## 🔄 Testing Workflow

### Recommended Testing Order:

**For New Features/Deployments:**

```
00-health → 01-webhook → 02-messages → 03-ai-chat →
04-ai-users → 05-messaging → 06-workflows → 99-performance
```

**For Quick Verification:**

```
00-health → 01-webhook (first 3 tests) → 02-messages (first 3 tests)
```

**For AI Feature Testing:**

```
00-health → 03-ai-chat → 04-ai-users → 01-webhook (AI tests)
```

**For Performance Testing:**

```
00-health → 99-performance (specific sections)
```

## 📋 Test File Details

### 00-health.http - Health & Smoke Tests

**Purpose:** Quick system verification before running other tests

**Key Tests:**

- Health check endpoint
- API status and welcome message
- Invalid endpoint handling
- HTTP method validation

**When to Use:**

- First test to run every session
- After server restarts
- To verify basic connectivity

---

### 01-webhook.http - WhatsApp Webhook Processing

**Purpose:** Test message reception and AI auto-response

**Key Features Tested:**

- Basic message ingestion (text, emoji, extended text)
- Newsletter/broadcast messages
- Group message handling
- AI auto-response for whitelisted users
- Conversation context and history
- Edge cases (empty messages, special characters, long messages)

**Prerequisites:**

- At least one user in ai_enabled_users table for AI tests
- Add users via `04-ai-users.http` first

---

### 02-messages.http - Message Queries & Database

**Purpose:** Test database retrieval and search functionality

**Key Features Tested:**

- Query by session ID
- Query by contact (remoteJid)
- Content search
- Recent messages (time-based)
- Date range queries
- Message statistics

**Data Requirements:**

- Run `01-webhook.http` first to populate database
- Or use `npm run bootstrap:sample`

---

### 03-ai-chat.http - AI Chat & Analysis

**Purpose:** Test Azure OpenAI GPT-4o integration

**Key Features Tested:**

- Basic chat completion
- Chat with conversation history
- Parameter customization (temperature, maxTokens)
- Conversation analysis
- Message summarization
- Error handling

**Prerequisites:**

- Azure OpenAI credentials configured in .env
- Sufficient API quota

---

### 04-ai-users.http - AI User Management

**Purpose:** Test AI whitelist management system

**Key Features Tested:**

- Add users to AI whitelist
- List all AI-enabled users
- Check user AI status
- Get user details
- Toggle AI enabled/disabled
- Remove users (soft delete)
- Delete users permanently
- Bulk operations
- Edge cases

**Key Concept:**

- Controls which users receive automatic AI responses
- Database-driven (no code deployment needed)
- Tracks last_interaction timestamps

---

### 05-messaging.http - Message Sending

**Purpose:** Test outbound message sending via Wasender API

**Key Features Tested:**

- Send individual messages
- Send bulk messages
- Message formatting (text, emoji)
- Error handling
- API token validation

**Prerequisites:**

- Wasender API token configured
- Valid recipient phone numbers

---

### 06-workflows.http - End-to-End Integration

**Purpose:** Test complete workflows integrating multiple features

**Workflows Covered:**

1. Complete message lifecycle (receive → query → analyze → summarize)
2. Multi-user conversation analysis
3. Newsletter broadcast & content analysis
4. AI user whitelist integration
5. Error handling & recovery
6. High-volume message processing

**Best For:**

- Pre-deployment validation
- Regression testing
- Demonstrating complete functionality

---

### 99-performance.http - Performance & Edge Cases

**Purpose:** Comprehensive performance, edge case, and stress testing

**Test Categories:**

1. **Performance Tests:** Rapid processing, large queries, concurrent requests
2. **Edge Cases:** Empty values, special characters, long strings, null fields
3. **Phone Extraction:** International numbers, groups, newsletters
4. **Environment Validation:** Missing env vars, invalid tokens
5. **Database Stress:** Large result sets, complex queries
6. **AI Service Limits:** Token limits, rate limiting
7. **Security:** SQL injection, XSS prevention

**Warning:** May consume significant resources. Run during non-peak hours.

## 🎯 How to Use REST Client

### Running Tests - Basic Usage

1. **Open a test file** in VS Code (e.g., `00-health.http`)
2. **Click "Send Request"** above any HTTP request block
3. **View response** in the split panel that appears
4. **Check status code** and response body

### Request Separators

Tests are separated by `###`:

```http
### Test 1: Health Check
GET http://localhost:80/health

###

### Test 2: API Status
GET http://localhost:80/
```

### Variables

All test files use consistent variables:

```http
@baseUrl = http://localhost
@port = 80
```

**To test against different environments:**

- **Local:** No changes needed (default: `http://localhost:80`)
- **Staging:** Change to `@baseUrl = https://staging.yourdomain.com` and `@port =`
- **Production:** Change to `@baseUrl = https://api.yourdomain.com` and `@port =`

### Running Multiple Tests

**Sequential Execution:**

- Click "Send Request" on each test individually
- Wait for response before proceeding

**Parallel Testing:** (Not recommended for sequential workflows)

- Open multiple test files
- Run tests from different files simultaneously

## 🛠️ Customization Guide

### Adding Custom Tests

Follow the established pattern:

```http
### Test X.Y: Descriptive Test Name
# Brief explanation of what this test does
# Expected behavior: Should return 200 with message
POST {{baseUrl}}:{{port}}/your-endpoint
Content-Type: application/json

{
  "your": "payload"
}

###
```

### Environment-Specific Testing

**Option 1: Modify variables in each file**

```http
@baseUrl = https://staging.api.com
@port = 443
```

**Option 2: Create environment-specific copies**

- `00-health.staging.http`
- `00-health.production.http`

### Custom Test Suites

Create custom combinations:

```http
# my-custom-suite.http

### Quick Smoke Test
@baseUrl = http://localhost
@port = 80

### 1. Health
GET {{baseUrl}}:{{port}}/health

### 2. Simple Webhook
POST {{baseUrl}}:{{port}}/webhook
Content-Type: application/json
{...}

### 3. Query Messages
GET {{baseUrl}}:{{port}}/messages/recent?limit=5
```

## 🔧 Troubleshooting

### Common Issues & Solutions

| Issue                            | Possible Cause                       | Solution                                                        |
| -------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| **Connection Refused**           | Server not running                   | Run `npm start` in project root                                 |
| **Port 80 Access Denied**        | Requires admin privileges            | Use `sudo npm start` (Mac/Linux) or run as admin (Windows)      |
| **404 Not Found**                | Wrong endpoint or server not started | Verify URL and check server is running                          |
| **AI Endpoint Errors (401)**     | Invalid Azure OpenAI key             | Check `AZURE_OPENAI_API_KEY` in .env                            |
| **AI Endpoint Errors (404)**     | Wrong deployment name                | Verify `AZURE_OPENAI_DEPLOYMENT_NAME`                           |
| **Empty Query Results**          | Database not populated               | Run `01-webhook.http` tests first or `npm run bootstrap:sample` |
| **Database Errors**              | Database not initialized             | Run `npm run bootstrap`                                         |
| **Wasender API Errors**          | Invalid/missing token                | Check `WASENDER_API_TOKEN` in .env                              |
| **AI Auto-Response Not Working** | User not whitelisted                 | Add user via `POST /ai-users/add` (see `04-ai-users.http`)      |

### Debug Checklist

When tests fail, check in this order:

1. ✅ **Server Status**

   ```bash
   # Check if server is running
   curl http://localhost:80/health
   ```

2. ✅ **Environment Variables**

   ```bash
   # Verify .env file exists and has required vars
   cat .env | grep AZURE_OPENAI
   cat .env | grep WASENDER
   ```

3. ✅ **Database Status**

   ```bash
   # Check if database exists
   ls -l libraries/database/whatsapp_messages.db
   ```

4. ✅ **Server Logs**

   - Check terminal where `npm start` is running
   - Look for error messages
   - Verify "✅ All required environment variables are set"

5. ✅ **Test Sequence**
   - Always start with `00-health.http`
   - Don't skip prerequisites
   - Follow numbered order for best results

### Error Response Codes

| Code | Meaning       | Action                           |
| ---- | ------------- | -------------------------------- |
| 200  | Success       | Test passed ✅                   |
| 400  | Bad Request   | Check request payload format     |
| 401  | Unauthorized  | Verify API keys/tokens           |
| 404  | Not Found     | Check endpoint URL and method    |
| 422  | Unprocessable | Check required fields in payload |
| 500  | Server Error  | Check server logs for details    |

## 📚 Best Practices

### Testing Strategy

1. **Start Simple, Build Up**

   - Begin with `00-health.http`
   - Gradually progress through numbered files
   - Don't jump to complex workflows without basics passing

2. **Test in Logical Sequence**

   - Create data before querying it
   - Add AI users before testing auto-response
   - Populate database before running analytics

3. **Monitor Resource Usage**

   - Performance tests consume Azure OpenAI tokens
   - Large queries may take time
   - Check Azure quota before heavy testing

4. **Document Custom Tests**

   - Add clear comments explaining test purpose
   - Note expected results
   - Include cleanup steps if needed

5. **Version Control**
   - Commit test files with code changes
   - Update tests when API changes
   - Keep README.md synchronized

### Data Management

- **Clean Slate:** `rm libraries/database/whatsapp_messages.db && npm run bootstrap`
- **Sample Data:** `npm run bootstrap:sample`
- **Production:** Never run performance tests against production data

## 📦 Archive Folder

The `/rest/archive/` folder contains legacy test files that have been consolidated:

- `andrew.http` - Consolidated into `01-webhook.http` (AI tests)
- `test-andrew-simple.http` - Consolidated into `01-webhook.http`
- `basic.http` - Consolidated into `00-health.http`
- `test-suite.http` - Distributed across new numbered files
- `webhook.http` - Consolidated into `01-webhook.http`
- `env-validation.http` - Consolidated into `99-performance.http`
- `phone.http` - Consolidated into `99-performance.http`
- `performance.http` - Consolidated into `99-performance.http`
- `workflows.http` - Enhanced and moved to `06-workflows.http`

**Note:** Archive files are kept for reference but are no longer maintained.

## 🚀 Advanced Usage

### CI/CD Integration

While these are REST Client tests, you can:

1. **Convert to automated tests:**

   - Use tools like Newman (Postman CLI)
   - Export to Postman format
   - Create Jest/Mocha equivalents

2. **Generate documentation:**

   - Export successful responses as examples
   - Create API documentation from tests
   - Build interactive API explorers

3. **Regression testing:**
   - Run test suite after each deployment
   - Compare responses against baselines
   - Alert on breaking changes

### Performance Monitoring

Track key metrics during test execution:

```bash
# Monitor server resources
# CPU, Memory, Response Times
top -p $(pgrep node)

# Monitor database size
watch -n 1 'ls -lh libraries/database/whatsapp_messages.db'

# Monitor Azure OpenAI usage
# Check Azure Portal → Your Resource → Metrics
```

## � Test Coverage Summary

| Category                 | Files | Tests    | Coverage                       |
| ------------------------ | ----- | -------- | ------------------------------ |
| Health & Smoke           | 1     | ~5       | API status, connectivity       |
| Webhooks & Ingestion     | 1     | ~25      | Message reception, AI triggers |
| Database Queries         | 1     | ~20      | CRUD operations, search        |
| AI Features              | 1     | ~15      | Chat, analysis, summarization  |
| User Management          | 1     | ~35      | Whitelist CRUD, integration    |
| Message Sending          | 1     | ~12      | Outbound messaging             |
| Workflows                | 1     | ~30      | End-to-end scenarios           |
| Performance & Edge Cases | 1     | ~40      | Load, stress, validation       |
| **Total**                | **8** | **~180** | **Full API coverage**          |

---

## 🆘 Getting Help

- **Main Documentation:** `../README.md` (project root)
- **API Reference:** See main README.md for all endpoints
- **Server Logs:** Check terminal where `npm start` is running
- **Database Issues:** Run `npm run bootstrap` to reset
- **AI Issues:** Verify Azure OpenAI configuration in .env

---

**Happy Testing!** 🚀

_Test suite consolidated and organized on October 7, 2025_
_Using domain-based structure with numbered prefixes for clarity_
