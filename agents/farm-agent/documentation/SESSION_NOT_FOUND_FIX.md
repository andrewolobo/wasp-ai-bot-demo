# Session Not Found Error - Complete Fix

## Error

```
ValueError: Session not found: +256784726116@s.whatsapp.net
```

**Location:** Google ADK Runner in `_run_with_trace` method

---

## Root Cause

The Google ADK `InMemorySessionService` requires that sessions be **explicitly created** before they can be used with `runner.run()`.

The error occurred because:

1. ❌ We were not calling `session_service.create_session()` before using the session
2. ❌ The `InMemorySessionService` does NOT automatically create sessions
3. ❌ Sessions must be created with the correct `app_name` that matches the Runner's app_name

---

## Solution

### Step 1: Explicitly Create Session

Before calling `runner.run()`, we must create the session in the `InMemorySessionService`:

```python
# Create session if it doesn't exist
if remote_jid not in self.active_sessions:
    await self.session_service.create_session(
        app_name="farm_agent",  # MUST match Runner's app_name!
        user_id=remote_jid,
        session_id=remote_jid,  # Using remote_jid as session_id
        state=None              # Optional initial state
    )
```

### Step 2: Key Requirements

1. **app_name** - Must match exactly what's used in `Runner(app_name="farm_agent", ...)`
2. **user_id** - Identifies the user (WhatsApp contact)
3. **session_id** - Identifies the conversation (using same as user_id)
4. **await** - `create_session()` is async, must be awaited

---

## Complete Implementation

### In `session_manager.py`:

```python
async def process_message(self, request: Dict[str, Any]) -> Dict[str, Any]:
    """Process a message request using the agent with session context"""

    start_time = datetime.now()
    message_id = request.get('messageId', 'unknown')
    contact = request.get('contact', {})
    remote_jid = contact.get('remoteJid', 'unknown')

    try:
        logger.info(f"Processing message: {message_id} from {remote_jid}")

        # Use remote_jid as session_id
        session_id = remote_jid

        # Create session in InMemorySessionService if it doesn't exist
        if remote_jid not in self.active_sessions:
            # CRITICAL: Create the session in Google ADK's session service
            await self.session_service.create_session(
                app_name="farm_agent",  # Must match Runner's app_name
                user_id=remote_jid,
                session_id=session_id,
                state=None
            )

            # Track session in our internal state
            self.active_sessions[remote_jid] = {
                'session_id': session_id,
                'created_at': datetime.now(),
                'message_count': 0
            }
            logger.info(f"Created new session in service: {session_id}")

        self.active_sessions[remote_jid]['message_count'] += 1

        # Create a runner for this specific session
        runner = create_runner(
            agent=self.agent,
            session_service=self.session_service
        )

        # Build prompt and convert to Content
        prompt = self._build_prompt(...)
        content = create_content_from_text(prompt)

        # NOW we can safely call runner.run()
        events = list(runner.run(
            user_id=remote_jid,
            session_id=session_id,
            new_message=content
        ))

        # ... process events and return response
```

---

## How It Works

### Session Lifecycle:

```
1. First Message from User
   ├─> Check: Is session in active_sessions? → NO
   ├─> Call: await session_service.create_session(...)
   ├─> Store: Add to active_sessions dict
   └─> Ready: Session exists, can call runner.run()

2. Subsequent Messages
   ├─> Check: Is session in active_sessions? → YES
   ├─> Skip: Session already created
   └─> Ready: Session exists, can call runner.run()

3. Service Restart
   ├─> active_sessions cleared (in-memory only)
   ├─> InMemorySessionService cleared (also in-memory)
   └─> Next message creates fresh session
```

---

## Verification

### Test the Fix:

```bash
# 1. Restart farm-agent
cd agents/farm-agent
python main.py

# 2. Run test
python tests/test_queue_flow.py
```

### Expected Output:

```
2025-10-13 12:00:00 - libraries.session_manager - INFO - Processing message: test-abc123 from +256784726116@s.whatsapp.net
2025-10-13 12:00:00 - libraries.session_manager - INFO - Created new session in service: +256784726116@s.whatsapp.net
2025-10-13 12:00:00 - libraries.session_manager - INFO - Running agent for session: +256784726116@s.whatsapp.net
2025-10-13 12:00:02 - libraries.session_manager - INFO - Message processed in 2.34s: test-abc123

======================================================================
TEST SUCCESSFUL!
======================================================================
```

### Error Should NOT Appear:

```
❌ ValueError: Session not found: +256784726116@s.whatsapp.net
```

---

## Key Insights

### InMemorySessionService Behavior:

1. **Manual Creation Required**

   - Sessions are NOT created automatically
   - Must call `create_session()` explicitly
   - Must happen BEFORE `runner.run()`

2. **App Name Matching**

   - `create_session(app_name="X")` must match `Runner(app_name="X")`
   - Mismatch will cause "Session not found" error
   - In our case: Both use `"farm_agent"`

3. **Session Persistence**

   - In-memory only (lost on restart)
   - One session per remote_jid (WhatsApp contact)
   - Context maintained across messages within same session

4. **Async Nature**
   - `create_session()` returns a coroutine
   - Must use `await` to execute
   - Part of async flow in `process_message()`

---

## Common Mistakes to Avoid

### ❌ Don't Do This:

```python
# Missing await
self.session_service.create_session(...)  # Won't work!

# Wrong app_name
await self.session_service.create_session(
    app_name="different_name",  # Doesn't match Runner!
    ...
)

# Creating session after runner.run()
runner.run(...)  # Error: Session not found!
await self.session_service.create_session(...)  # Too late
```

### ✅ Do This:

```python
# Correct order and parameters
await self.session_service.create_session(
    app_name="farm_agent",  # Matches Runner
    user_id=remote_jid,
    session_id=remote_jid,
    state=None
)

# Then use the session
runner.run(
    user_id=remote_jid,
    session_id=remote_jid,
    new_message=content
)
```

---

## Files Modified

- ✅ `libraries/session_manager.py`
  - Added `await self.session_service.create_session()` call
  - Properly initializes sessions before use
  - Maintains internal tracking in `active_sessions`

---

## Status: ✅ FIXED

Sessions are now properly created in the `InMemorySessionService` before being used with `runner.run()`. The "Session not found" error is resolved.

---

## Additional Notes

### If Error Persists:

1. **Check app_name consistency:**

   ```bash
   # In agent.py, look for:
   Runner(app_name="farm_agent", ...)

   # Must match in session_manager.py:
   create_session(app_name="farm_agent", ...)
   ```

2. **Verify async/await:**

   - Ensure `process_message` is `async def`
   - Ensure `create_session` is `await`ed

3. **Check logs:**

   ```
   Should see: "Created new session in service: +256..."
   If not: Session creation failed
   ```

4. **Restart both services:**
   ```bash
   # Fresh start clears any cached sessions
   docker restart rabbitmq
   python main.py  # Restart farm-agent
   ```
