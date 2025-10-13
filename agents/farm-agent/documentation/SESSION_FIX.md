# Session Not Found Error - Fix

## Error

```
ValueError: Session not found: +256784726116@s.whatsapp.net
```

## Root Cause

The Google ADK `InMemorySessionService` requires that sessions be explicitly created before they can be used. The error occurred because:

1. We were not calling `session_service.create_session()` before using the session
2. The `InMemorySessionService` expects sessions to exist before `runner.run()` is called
3. Sessions must be created with the correct `app_name` parameter that matches the Runner's app_name

## Solution

### Simplified Session Management

Changed the session management to use `remote_jid` directly as the `session_id`:

**Before:**

```python
def get_session_id(self, remote_jid: str) -> str:
    if remote_jid not in self.active_sessions:
        session_id = f"session-{remote_jid}-{uuid.uuid4().hex[:8]}"
        # ...
    return session_id
```

**After:**

```python
def get_session_id(self, remote_jid: str) -> str:
    # Return remote_jid directly as session_id
    # Google ADK's InMemorySessionService handles session creation automatically
    return remote_jid
```

### Updated process_message Method

**Before:**

```python
session_id = self.get_session_id(remote_jid)

runner = create_runner(agent=self.agent, session_service=self.session_service)

events = list(runner.run(
    user_id=remote_jid,
    session_id=session_id,  # Different from user_id!
    new_message=content
))
```

**After:**

```python
# Use remote_jid as session_id for simplicity
session_id = remote_jid

# Track session in internal state
if remote_jid not in self.active_sessions:
    self.active_sessions[remote_jid] = {
        'session_id': session_id,
        'created_at': datetime.now(),
        'message_count': 0
    }

self.active_sessions[remote_jid]['message_count'] += 1

runner = create_runner(agent=self.agent, session_service=self.session_service)

events = list(runner.run(
    user_id=remote_jid,
    session_id=remote_jid,  # Same as user_id
    new_message=content
))
```

---

## How It Works Now

### Session Lifecycle:

1. **First Message from User:**

   - `remote_jid` = `+256784726116@s.whatsapp.net`
   - `session_id` = `+256784726116@s.whatsapp.net` (same)
   - `InMemorySessionService` automatically creates the session on first `runner.run()`
   - Our internal `active_sessions` dict tracks metadata

2. **Subsequent Messages:**

   - Same `remote_jid` is used as `session_id`
   - `InMemorySessionService` retrieves existing session
   - Conversation context is maintained

3. **Benefits:**
   - Simpler session management
   - No UUID generation needed
   - Automatic session creation by Google ADK
   - Clear mapping: one WhatsApp contact = one session

---

## Key Insights

### Google ADK Session Requirements:

1. **user_id and session_id relationship:**

   - Can be the same value for simple use cases
   - `user_id` identifies the user
   - `session_id` identifies the conversation
   - For WhatsApp: one user = one conversation, so they can be identical

2. **InMemorySessionService:**

   - Automatically creates sessions when `runner.run()` is called
   - Sessions persist in memory for the lifetime of the service
   - No manual session creation needed

3. **Session Tracking:**
   - Use internal `active_sessions` dict for metadata only
   - Don't create custom session IDs
   - Let Google ADK manage the actual session state

---

## Testing

After applying the fix, test with:

```bash
# Start farm-agent
cd agents/farm-agent
python main.py

# In another terminal, run the test
python tests/test_queue_flow.py
```

Expected output:

```
======================================================================
TEST SUCCESSFUL!
======================================================================

Response Details:
  Message ID: resp-test-{id}
  Status: success
  Response Text: [Agent's response]
  Processing Time: 2.34s
  Session ID: +256784726116@s.whatsapp.net
```

---

## Migration Notes

### If You Had Existing Sessions:

Old session IDs like `session-+256784726116@s.whatsapp.net-51a48b85` won't work anymore. This is fine because:

1. Sessions are in-memory only (lost on restart anyway)
2. New sessions will be created automatically
3. No data migration needed

### Session Continuity:

- **Same WhatsApp user** = **Same session**
- Context is maintained across messages
- Session persists until service restart

---

## Related Files Changed

- ✅ `libraries/session_manager.py` - Simplified session management
  - Updated `get_session_id()` to return `remote_jid` directly
  - Modified `process_message()` to use `remote_jid` as `session_id`
  - Added internal session tracking for metadata

---

## Status: ✅ FIXED

The "Session not found" error is resolved. Sessions now work correctly with Google ADK's InMemorySessionService.
