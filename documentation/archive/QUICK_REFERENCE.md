# Quick Reference: AI-Enabled Users Management

## API Endpoints

### Add User

```http
POST /ai/users/add
Content-Type: application/json

{
  "remoteJid": "256703722777@s.whatsapp.net",
  "phoneNumber": "+256703722777",
  "name": "John Doe",
  "notes": "VIP customer"
}
```

### List Users

```http
GET /ai/users/list
GET /ai/users/list?includeDisabled=true
```

### Check User

```http
GET /ai/users/check/256703722777@s.whatsapp.net
```

### Get User Details

```http
GET /ai/users/256703722777@s.whatsapp.net
```

### Toggle Status

```http
PATCH /ai/users/toggle
Content-Type: application/json

{
  "remoteJid": "256703722777@s.whatsapp.net"
}
```

### Remove User (Soft Delete)

```http
DELETE /ai/users/remove
Content-Type: application/json

{
  "remoteJid": "256703722777@s.whatsapp.net"
}
```

### Delete User (Permanent)

```http
DELETE /ai/users/delete
Content-Type: application/json

{
  "remoteJid": "256703722777@s.whatsapp.net"
}
```

## Database Queries

### Check enabled users

```sql
SELECT * FROM ai_enabled_users WHERE enabled = TRUE;
```

### View recent interactions

```sql
SELECT remoteJid, name, last_interaction
FROM ai_enabled_users
WHERE enabled = TRUE
ORDER BY last_interaction DESC;
```

### Count users

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN enabled THEN 1 ELSE 0 END) as enabled,
  SUM(CASE WHEN NOT enabled THEN 1 ELSE 0 END) as disabled
FROM ai_enabled_users;
```

## Testing

### REST Client Tests

Open `rest/ai-users.http` in VS Code and click "Send Request"

### Command Line

```bash
# Add user
curl -X POST http://localhost/ai/users/add \
  -H "Content-Type: application/json" \
  -d '{"remoteJid":"256703722777@s.whatsapp.net","name":"Test User"}'

# List users
curl http://localhost/ai/users/list

# Check user
curl http://localhost/ai/users/check/256703722777@s.whatsapp.net
```

## Common Tasks

### Add your first user

1. Open `rest/ai-users.http`
2. Update Test 1 with your WhatsApp number
3. Click "Send Request"
4. Verify with Test 9 (list users)

### Enable AI for a group chat

```json
{
  "remoteJid": "120363169319669622-1234567890@g.us",
  "name": "My Group Chat",
  "notes": "AI enabled for group"
}
```

### Disable AI temporarily

```json
PATCH /ai/users/toggle
{"remoteJid": "256703722777@s.whatsapp.net"}
```

### Re-enable after testing

```json
PATCH /ai/users/toggle
{"remoteJid": "256703722777@s.whatsapp.net"}
```
