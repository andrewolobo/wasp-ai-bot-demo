# RabbitMQ Queue Precondition Error - Fix

## Error

```
PRECONDITION_FAILED - inequivalent arg 'x-message-ttl' for queue 'ag_queue' in vhost '/'
```

## Root Cause

The queue `ag_queue` already exists in RabbitMQ with `x-message-ttl: 300000`, but the code was trying to declare it with `x-message-ttl: 300`.

## Fix Applied

Changed line 80 in `libraries/queue_consumer.py`:

```python
# Before (WRONG - 300 milliseconds = 0.3 seconds)
'x-message-ttl': 300,  # 5 minutes

# After (CORRECT - 300000 milliseconds = 5 minutes)
'x-message-ttl': 300000,  # 5 minutes (in milliseconds)
```

---

## Solutions

### Option 1: Delete Existing Queues (Recommended for Development)

Use RabbitMQ Management UI or CLI to delete the existing queues:

#### Using RabbitMQ Management UI:

1. Open http://localhost:15672
2. Login (admin / wasp_rabbit_2024)
3. Go to "Queues" tab
4. Find `ag_queue` and `wb_queue`
5. Click each queue → "Delete" button at bottom

#### Using RabbitMQ CLI:

```bash
docker exec rabbitmq rabbitmqctl delete_queue ag_queue
docker exec rabbitmq rabbitmqctl delete_queue wb_queue
```

#### Using Python Script:

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

### Option 2: Use Passive Declaration (Production Approach)

If you can't delete queues (production environment), modify the code to not specify arguments:

```python
# In connect() method - just check if queue exists without changing it
await self.channel.declare_queue(
    self.ag_queue_name,
    durable=True,
    passive=True  # Don't create or modify, just check it exists
)
```

Or simply declare without arguments:

```python
await self.channel.declare_queue(
    self.ag_queue_name,
    durable=True
    # No arguments - use whatever is already configured
)
```

---

## Testing

After fixing, restart the application:

```powershell
cd agents/farm-agent
C:/Users/olobo/Documents/AI/wasp-ai-bot/.adk/Scripts/python.exe main.py
```

You should see:

```
Connected to RabbitMQ
Starting to consume from ag_queue
Max concurrent sessions: 5
Press CTRL+C to stop
```

---

## Prevention

In the future, when changing queue arguments:

1. Delete the old queue first (development)
2. Or use queue versioning: `ag_queue_v2` (production)
3. Or configure queues externally and don't specify arguments in code
