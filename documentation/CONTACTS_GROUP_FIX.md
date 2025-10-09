# Group Message Contact Fix

> **Fixed: Group messages now save participant (sender) instead of group ID**  
> _Fixed: October 8, 2025_

## Problem

When group messages were received, the system was incorrectly saving the **group ID** as a contact instead of the **individual person** who sent the message.

**Example of the Problem:**

```json
{
  "remoteJid": "256704966899-1625215002@g.us", // Group ID
  "participant": "256703722888@s.whatsapp.net", // Actual sender
  "pushName": "John Doe"
}
```

**What was happening:**

- ❌ System saved `256704966899-1625215002@g.us` as contact
- ❌ Contact type: "group"
- ❌ No way to identify individual senders
- ❌ Message counts attributed to group, not person

## Solution

Updated the webhook handler to detect group messages and save the **participant** (actual sender) instead of the group ID.

### Code Changes (`server.js`)

```javascript
// BEFORE (Incorrect)
const phoneInfo = extractPhoneNumberFromRemoteJid(originalData.remoteJid);
const contactData = {
  remoteJid: originalData.remoteJid, // This was group ID for group messages!
  // ...
};

// AFTER (Correct)
let contactJid = originalData.remoteJid;
let isGroupMessage = false;

if (originalData.remoteJid && originalData.remoteJid.includes("@g.us")) {
  isGroupMessage = true;

  // Look for participant field (actual sender)
  if (originalData.participant) {
    contactJid = originalData.participant;
  } else if (originalData.key && originalData.key.participant) {
    contactJid = originalData.key.participant;
  } else if (webhookData.data.messages.participant) {
    contactJid = webhookData.data.messages.participant;
  }

  console.log(
    "👥 Group message detected. Group:",
    originalData.remoteJid,
    "Participant:",
    contactJid
  );
}

const phoneInfo = extractPhoneNumberFromRemoteJid(contactJid);
const contactData = {
  remoteJid: contactJid, // Now uses participant for groups!
  // ...
  groupId: isGroupMessage ? originalData.remoteJid : null, // Store group reference
};
```

## What This Means

### Individual Messages (Unchanged)

```
Webhook receives individual message:
{
  "remoteJid": "256703722777@s.whatsapp.net"
}

Saved Contact:
- remoteJid: "256703722777@s.whatsapp.net"
- contactType: "individual"
- groupId: null
✅ Works correctly
```

### Group Messages (Fixed)

```
Webhook receives group message:
{
  "remoteJid": "256704966899-1625215002@g.us",
  "participant": "256703722888@s.whatsapp.net"
}

Saved Contact:
- remoteJid: "256703722888@s.whatsapp.net" ✅ (participant, not group)
- contactType: "individual" ✅ (person, not group)
- groupId: "256704966899-1625215002@g.us" ✅ (reference to group)
✅ Now correct!
```

## Benefits

### Before Fix

- ❌ Groups saved as contacts
- ❌ Can't identify individual senders
- ❌ Message counts wrong (attributed to group)
- ❌ Can't target individuals for AI responses
- ❌ Confusing contact list with group IDs

### After Fix

- ✅ **Individuals** saved as contacts
- ✅ Clear identification of who sent what
- ✅ Accurate message counts per person
- ✅ Can enable AI responses for specific people
- ✅ Clean contact list with actual people
- ✅ Group context preserved in `groupId` field

## Use Cases Now Possible

### 1. Identify Active Group Participants

```sql
SELECT remoteJid, pushName, messageCount, groupId
FROM contacts
WHERE groupId IS NOT NULL
ORDER BY messageCount DESC;
```

### 2. Enable AI for Individual in Group

```bash
# Add specific person to AI whitelist, even if they message from groups
curl -X POST http://localhost/ai/users/add \
  -d '{"remoteJid": "256703722888@s.whatsapp.net"}'
```

### 3. Track Individual Across Groups

```bash
# See all messages from a person, including group messages
curl http://localhost/messages/contact/256703722888@s.whatsapp.net
```

### 4. Find Most Active Individuals

```bash
# Get most active people (not groups)
curl "http://localhost/contacts?orderBy=messageCount&type=individual"
```

## Webhook Data Structure

### Expected Format for Group Messages

The webhook should provide the `participant` field for group messages:

```json
{
  "event": "messages.received",
  "data": {
    "messages": {
      "remoteJid": "256704966899-1625215002@g.us",
      "participant": "256703722888@s.whatsapp.net",
      "pushName": "John Doe",
      "message": {
        "conversation": "Hello from the group!"
      }
    }
  }
}
```

### Fallback Behavior

If `participant` field is missing:

1. Checks `originalData.participant`
2. Checks `originalData.key.participant`
3. Checks `webhookData.data.messages.participant`
4. Falls back to `remoteJid` (group ID) if none found

**Note:** The fallback ensures the system doesn't crash, but you should ensure your webhook provider sends the `participant` field for group messages.

## Testing

### Updated Test (`rest/07-contacts.http`)

```http
### Test 3: Group contact (with participant field)
POST {{baseUrl}}/webhook
Content-Type: application/json

{
  "event": "messages.received",
  "data": {
    "messages": {
      "remoteJid": "256704966899-1625215002@g.us",
      "participant": "256703722888@s.whatsapp.net",
      "pushName": "Group Participant",
      "message": { "conversation": "Group message test" }
    }
  }
}

### Verify participant is saved (not group)
GET {{baseUrl}}/contacts/256703722888@s.whatsapp.net
```

### Expected Result

```json
{
  "status": "success",
  "data": {
    "remoteJid": "256703722888@s.whatsapp.net",
    "phoneNumber": "+256703722888",
    "contactType": "individual",
    "groupId": "256704966899-1625215002@g.us",
    "messageCount": 1
  }
}
```

## Console Logs

### Individual Message

```
📨 Webhook received
✅ Message saved to database
👤 Contact saved: created - 256703722777@s.whatsapp.net
```

### Group Message

```
📨 Webhook received
👥 Group message detected. Group: 256704966899-1625215002@g.us Participant: 256703722888@s.whatsapp.net
✅ Message saved to database
👤 Contact saved: created - 256703722888@s.whatsapp.net
```

## Migration Considerations

If you already have group contacts saved incorrectly:

### Option 1: Clean Up Manually

```sql
-- Delete incorrectly saved group contacts
DELETE FROM contacts WHERE remoteJid LIKE '%@g.us';
```

### Option 2: Keep for Reference

```sql
-- Mark existing group contacts for review
UPDATE contacts
SET pushName = '[GROUP] ' || pushName
WHERE remoteJid LIKE '%@g.us';
```

### Option 3: Re-run Migration

```bash
# After cleaning up, re-run migration to populate from messages
node migrate-contacts.js
```

## Documentation Updates

- ✅ Updated `documentation/CONTACTS.md` with group handling explanation
- ✅ Updated `rest/07-contacts.http` with participant field in tests
- ✅ Added console logging for group message detection
- ✅ Created this fix summary document

## Files Modified

1. **`server.js`** - Updated webhook handler to use participant for groups
2. **`rest/07-contacts.http`** - Added participant field to group test
3. **`documentation/CONTACTS.md`** - Updated group section explanation
4. **`documentation/CONTACTS_GROUP_FIX.md`** - Created this document

## Verification

To verify the fix is working:

1. **Send a test group message** with participant field
2. **Check console logs** - Should show "👥 Group message detected"
3. **Query the contact** - Should be participant's JID, not group ID
4. **Verify contactType** - Should be "individual", not "group"
5. **Check groupId field** - Should contain the group reference

## Status

✅ **FIX DEPLOYED**

The system now correctly saves individual participants from group messages instead of group IDs.

---

**Note:** If your webhook provider doesn't send the `participant` field for group messages, you'll need to update your webhook configuration or contact your provider to include this field.
