# RabbitMQ Queue Precondition Error - Complete Fix

## Errors Encountered

### Error 1:

```
PRECONDITION_FAILED - inequivalent arg 'x-message-ttl' for queue 'ag_queue' in vhost '/':
received '300' but current is '300000'
```

### Error 2:

```
PRECONDITION_FAILED - inequivalent arg 'x-message-ttl' for queue 'ag_queue' in vhost '/':
received none but current is the value '300000' of type 'signedint'
```

---

## Root Causes

1. **Error 1:** Initial queue creation used wrong TTL value (300ms instead of 300000ms)
2. **Error 2:** Subsequent queue declarations didn't include the same arguments as the initial declaration

RabbitMQ requires that **ALL declarations of the same queue must have identical parameters**. If a queue exists with certain arguments, you must either:

- Declare it again with the EXACT same arguments, or
- Use `passive=True` to just reference the existing queue without modifying it

---

## Fixes Applied

### Fix 1: Corrected TTL Value (Line 80)

**Before:**

```python
arguments={
    'x-message-ttl': 300,  # WRONG: 300ms = 0.3 seconds
    'x-dead-letter-exchange': 'dlx_agent'
}
```

**After:**

```python
arguments={
    'x-message-ttl': 300000,  # CORRECT: 300000ms = 5 minutes
    'x-dead-letter-exchange': 'dlx_agent'
}
```

---

### Fix 2: Use Passive Declaration for Subsequent References

#### In `start_consuming()` method (~line 187):

**Before:**

```python
queue = await self.channel.declare_queue(
    self.ag_queue_name,
    durable=True
    # Missing arguments - causes conflict!
)
```

**After:**

```python
# Get the existing queue (passive=True means don't create/modify)
queue = await self.channel.declare_queue(
    self.ag_queue_name,
    durable=True,
    passive=True  # Just reference existing queue
)
```

#### In `publish_response()` method (~line 154):

**Before:**

```python
queue = await self.channel.declare_queue(
    self.wb_queue_name,
    durable=True
    # Missing arguments - causes conflict!
)
```

**After:**

```python
# Get the existing queue (passive=True means don't create/modify)
queue = await self.channel.declare_queue(
    self.wb_queue_name,
    durable=True,
    passive=True  # Just reference existing queue
)
```

---

## How It Works Now

### Queue Creation Flow:

1. **First Declaration in `connect()` method:**

   - Creates the queue WITH full arguments (TTL, DLX, etc.)
   - This happens once when the service starts

2. **Subsequent Declarations:**
   - Use `passive=True` to just get a reference to the existing queue
   - Don't try to create or modify the queue
   - Avoids "inequivalent arguments" errors

---

## Clean Slate Setup (Optional)

If you want to start fresh, delete existing queues:

### Option 1: RabbitMQ Management UI

1. Open http://localhost:15672
2. Login (admin / wasp_rabbit_2024)
3. Go to "Queues" tab
4. Delete `ag_queue` and `wb_queue`

### Option 2: Command Line

```bash
docker exec rabbitmq rabbitmqctl delete_queue ag_queue
docker exec rabbitmq rabbitmqctl delete_queue wb_queue
```

### Option 3: Python Script

```python
import pika

connection = pika.BlockingConnection(
    pika.URLParameters('amqp://admin:wasp_rabbit_2024@localhost:5672/')
)
channel = connection.channel()

# Delete queues
channel.queue_delete('ag_queue')
channel.queue_delete('wb_queue')

connection.close()
print("Queues deleted successfully!")
```

---

## Testing

After applying fixes, restart the application:

```powershell
cd agents/farm-agent
C:/Users/olobo/Documents/AI/wasp-ai-bot/.adk/Scripts/python.exe main.py
```

Expected output:

```
======================================================================
Starting Farm Agent Service
======================================================================
RabbitMQ URL: amqp://admin:wasp_rabbit_2024@localhost:5672/
Consuming from: ag_queue
Publishing to: wb_queue
Max concurrent sessions: 5
======================================================================
Connecting to RabbitMQ: amqp://admin:wasp_rabbit_2024@localhost:5672/
Connected to RabbitMQ
======================================================================
Farm Agent Service is running!
Listening for payment collection requests...
Press CTRL+C to stop
======================================================================
Starting to consume from ag_queue
Max concurrent sessions: 5
Press CTRL+C to stop
```

---

## Key Takeaways

### RabbitMQ Queue Declaration Rules:

1. **All declarations must match exactly** - Same arguments every time
2. **Use `passive=True`** when you just need a reference to an existing queue
3. **TTL is in milliseconds** - 300000ms = 5 minutes, not 300ms
4. **Declare once with full config** - Subsequent uses should be passive

### Best Practices:

- Declare queues with full arguments only once (in initialization)
- Use passive declarations everywhere else
- Or configure queues externally and always use passive mode
- Document TTL values clearly (always include unit: milliseconds)

---

## Status: ✅ FIXED

All queue declaration conflicts resolved. Application should now start without errors.
