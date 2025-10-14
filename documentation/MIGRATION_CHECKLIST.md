# Migration Checklist

Use this checklist to track your migration from the original server.js to the refactored version.

## Pre-Migration

- [ ] Read `SUMMARY.md` for overview
- [ ] Read `QUICK_START.md` for instructions
- [ ] Backup current `.env` file
- [ ] Note current server configuration
- [ ] Document any custom modifications

## Migration Steps

### 1. Backup Original Files
- [ ] Rename `server.js` to `server-old.js`
- [ ] Keep a backup of entire project folder

### 2. Deploy Refactored Version
- [ ] Rename `server-refactored.js` to `server.js`
- [ ] Verify all route files are in `routes/` folder
- [ ] Verify all utility files are in `utils/` folder

### 3. Configuration Check
- [ ] Verify `.env` file is present
- [ ] Check `WASENDER_API_TOKEN` is set
- [ ] Check `WASENDER_API_URL` is set
- [ ] Check Azure OpenAI credentials are set
- [ ] Check `USE_QUEUE` setting (true/false)
- [ ] Verify database file path

### 4. Start Server
- [ ] Run `node server.js`
- [ ] Server starts without errors
- [ ] No missing module errors
- [ ] Database connects successfully
- [ ] Azure OpenAI validates successfully

## Testing Endpoints

### System Endpoints
- [ ] GET `/` - Returns server info
- [ ] GET `/health` - Returns OK status

### Webhook Endpoint
- [ ] POST `/webhook` - Receives webhook data
- [ ] Webhook saves message to database
- [ ] Webhook saves contact information
- [ ] AI-enabled users are detected
- [ ] Queue mode works (if enabled)
- [ ] Direct mode works (if enabled)

### Message Endpoints
- [ ] GET `/messages/session/:sessionId` - Returns messages
- [ ] GET `/messages/contact/:remoteJid` - Returns messages
- [ ] GET `/messages/search?q=term` - Searches messages
- [ ] GET `/messages/recent?hours=24` - Returns recent messages
- [ ] GET `/messages/stats` - Returns statistics

### AI Endpoints
- [ ] POST `/ai/chat` - Returns AI response
- [ ] POST `/ai/analyze-conversation` - Analyzes conversation
- [ ] POST `/ai/summarize` - Summarizes messages
- [ ] POST `/ai/users/add` - Adds AI user
- [ ] DELETE `/ai/users/remove` - Removes AI user
- [ ] DELETE `/ai/users/delete` - Deletes AI user
- [ ] PATCH `/ai/users/toggle` - Toggles AI status
- [ ] GET `/ai/users/list` - Lists AI users
- [ ] GET `/ai/users/:remoteJid` - Gets AI user details
- [ ] GET `/ai/users/check/:remoteJid` - Checks AI status

### Phone Endpoints
- [ ] POST `/phone/extract` - Extracts phone number
- [ ] GET `/phone/contacts` - Returns contacts with phones
- [ ] GET `/phone/stats` - Returns phone statistics

### Contact Endpoints
- [ ] GET `/contacts` - Lists contacts
- [ ] GET `/contacts/stats/summary` - Returns statistics
- [ ] GET `/contacts/search/:term` - Searches contacts
- [ ] GET `/contacts/:remoteJid` - Gets specific contact
- [ ] DELETE `/contacts/:remoteJid` - Deletes contact

### Messaging Endpoints
- [ ] POST `/message/send` - Sends single message
- [ ] POST `/message/send-bulk` - Sends bulk messages

## Integration Testing

### WhatsApp Integration
- [ ] Receive real WhatsApp webhook
- [ ] Message saved to database
- [ ] Contact created/updated
- [ ] AI response sent (if AI-enabled user)

### Database Integration
- [ ] Messages saved correctly
- [ ] Contacts saved correctly
- [ ] AI users managed correctly
- [ ] Queries return expected results

### Azure OpenAI Integration
- [ ] Chat completions work
- [ ] Conversation analysis works
- [ ] Message summarization works

### RabbitMQ Integration (if queue mode)
- [ ] Messages publish to queue
- [ ] Queue connection is stable
- [ ] Agent processes messages

### Wasender API Integration
- [ ] Single messages send successfully
- [ ] Bulk messages send successfully
- [ ] Error handling works correctly

## Performance Testing

- [ ] Server responds quickly to requests
- [ ] No memory leaks after extended running
- [ ] Database queries are performant
- [ ] Multiple concurrent requests handled

## Error Handling

- [ ] Invalid requests return appropriate errors
- [ ] Missing parameters return 400 errors
- [ ] Database errors are caught and logged
- [ ] API errors are handled gracefully

## Graceful Shutdown

- [ ] CTRL+C stops server cleanly
- [ ] Database connection closes
- [ ] RabbitMQ connection closes (if queue mode)
- [ ] No hanging processes

## Documentation Review

- [ ] Read `REFACTORING.md` completely
- [ ] Understand `ARCHITECTURE.md` diagrams
- [ ] Bookmarked `QUICK_START.md` for reference

## Clean Up

- [ ] Remove `server-old.js` (after confidence in new version)
- [ ] Update any external documentation
- [ ] Update deployment scripts if needed
- [ ] Update monitoring/alerting if needed

## Team Communication

- [ ] Notify team of refactoring
- [ ] Share documentation with team
- [ ] Conduct knowledge transfer session (if needed)
- [ ] Update README.md with new structure

## Optional Enhancements

- [ ] Add unit tests for utilities
- [ ] Add integration tests for routes
- [ ] Add API documentation (Swagger)
- [ ] Add input validation middleware
- [ ] Add authentication middleware
- [ ] Add rate limiting
- [ ] Add logging middleware
- [ ] Add error handling middleware

## Notes

Use this space to track any issues or observations during migration:

```
Date: ________________
Issue: 




Resolution:




```

```
Date: ________________
Issue: 




Resolution:




```

## Migration Status

**Start Date:** ________________  
**Completed Date:** ________________  
**Status:** [ ] Not Started  [ ] In Progress  [ ] Completed  [ ] Issues Found  

**Overall Result:** 
- [ ] Success - All tests passed
- [ ] Partial - Some issues to resolve
- [ ] Failed - Rollback needed

**Notes:**
```




```

---

## Quick Commands for Testing

```bash
# Start server
node server.js

# Test health endpoint
curl http://localhost:80/health

# Test root endpoint
curl http://localhost:80/

# Test message stats
curl http://localhost:80/messages/stats

# Test AI users list
curl http://localhost:80/ai/users/list

# Test contacts list
curl http://localhost:80/contacts

# Stop server
# Press CTRL+C in the terminal
```

---

**Remember:** Keep `server-old.js` as backup until you're completely confident in the refactored version!
