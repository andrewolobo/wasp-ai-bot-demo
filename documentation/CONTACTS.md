# Contacts Management System

> **Automatic contact storage and management for WhatsApp messages**  
> _Added: October 8, 2025_

## Overview

The contacts management system automatically stores information about everyone who sends a message to your WhatsApp bot. It tracks message counts, timestamps, and contact details to help you understand your user base.

## Features

✅ **Automatic Storage** - Contacts saved automatically when messages received  
✅ **Smart Updates** - Message count and last seen updated on each message  
✅ **Phone Extraction** - Automatically extracts country codes and local numbers  
✅ **Contact Types** - Supports individuals, groups, newsletters, and unknown types  
✅ **Search & Filter** - Query contacts by name, phone, type, or activity  
✅ **Statistics** - Track total contacts, messages, and activity patterns  
✅ **No Duplicates** - Checks before storing to prevent duplicate entries

---

## Database Schema

### contacts Table

```sql
CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remoteJid TEXT NOT NULL UNIQUE,          -- WhatsApp identifier
    phoneNumber TEXT,                         -- Full phone (+256703722777)
    countryCode TEXT,                         -- Country code (256)
    localNumber TEXT,                         -- Local number (703722777)
    pushName TEXT,                            -- Display name
    contactType TEXT DEFAULT 'individual',    -- Type of contact
    groupId TEXT,                             -- Group ID if type=group
    channelId TEXT,                           -- Channel ID if type=newsletter
    messageCount INTEGER DEFAULT 0,           -- Total messages received
    firstSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

- `idx_contacts_remoteJid` - Fast lookups by WhatsApp ID
- `idx_contacts_phoneNumber` - Search by phone number
- `idx_contacts_contactType` - Filter by contact type
- `idx_contacts_lastSeen` - Sort by recent activity

---

## How It Works

### Automatic Contact Saving

When a webhook message is received:

```javascript
// 1. Check if this is a group message
let contactJid = originalData.remoteJid;
if (originalData.remoteJid.includes("@g.us")) {
  // For group messages, use participant (actual sender) instead of group ID
  contactJid = originalData.participant || originalData.remoteJid;
  console.log("👥 Group message detected. Saving participant:", contactJid);
}

// 2. Extract phone information from the contact JID
const phoneInfo = extractPhoneNumberFromRemoteJid(contactJid);

// 3. Prepare contact data
const contactData = {
  remoteJid: contactJid, // Participant for groups, remoteJid for individuals
  phoneNumber: "+256703722777",
  countryCode: "256",
  localNumber: "703722777",
  pushName: "John Doe",
  contactType: "individual",
  groupId: isGroupMessage ? originalData.remoteJid : null, // Store group reference
  channelId: null,
};

// 4. Save or update contact
const result = await db.saveContact(contactData);
// Result: { id: 1, remoteJid: "...", action: "created", messageCount: 1 }
```

**Special Handling for Group Messages:**

- Group messages include `remoteJid` (group ID) and `participant` (sender)
- System saves the **participant** (individual) as the contact
- Group ID is stored in the `groupId` field for reference
- This ensures we track individuals, not groups

### First Message (Creates Contact)

- Contact doesn't exist → INSERT new record
- Sets `messageCount = 1`
- Sets `firstSeen` and `lastSeen` to current time

### Subsequent Messages (Updates Contact)

- Contact exists → UPDATE record
- Increments `messageCount`
- Updates `lastSeen` to current time
- Preserves `firstSeen` (unchanged)

---

## API Endpoints

### 1. Get All Contacts

```http
GET /contacts
GET /contacts?limit=100
GET /contacts?type=individual
GET /contacts?type=group
GET /contacts?orderBy=messageCount
```

**Response:**

```json
{
  "status": "success",
  "count": 45,
  "filter": "individual",
  "contacts": [
    {
      "id": 1,
      "remoteJid": "256703722777@s.whatsapp.net",
      "phoneNumber": "+256703722777",
      "countryCode": "256",
      "localNumber": "703722777",
      "pushName": "John Doe",
      "contactType": "individual",
      "messageCount": 23,
      "firstSeen": "2025-10-01 10:30:00",
      "lastSeen": "2025-10-08 14:20:00"
    }
  ]
}
```

### 2. Get Specific Contact

```http
GET /contacts/256703722777@s.whatsapp.net
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "remoteJid": "256703722777@s.whatsapp.net",
    "phoneNumber": "+256703722777",
    "countryCode": "256",
    "localNumber": "703722777",
    "pushName": "John Doe",
    "contactType": "individual",
    "messageCount": 23,
    "firstSeen": "2025-10-01 10:30:00",
    "lastSeen": "2025-10-08 14:20:00",
    "created_at": "2025-10-01 10:30:00",
    "updated_at": "2025-10-08 14:20:00"
  }
}
```

### 3. Search Contacts

```http
GET /contacts/search/John
GET /contacts/search/256703
GET /contacts/search/John?limit=10
```

**Response:**

```json
{
  "status": "success",
  "count": 3,
  "searchTerm": "John",
  "contacts": [...]
}
```

### 4. Get Contact Statistics

```http
GET /contacts/stats/summary
```

**Response:**

```json
{
  "status": "success",
  "stats": {
    "totalContacts": 150,
    "individuals": 120,
    "groups": 25,
    "newsletters": 3,
    "unknown": 2,
    "totalMessages": 1847,
    "mostRecentContact": "2025-10-08 14:20:00"
  }
}
```

### 5. Delete Contact

```http
DELETE /contacts/256703722777@s.whatsapp.net
```

**Response:**

```json
{
  "status": "success",
  "message": "Contact deleted successfully",
  "remoteJid": "256703722777@s.whatsapp.net"
}
```

---

## Database Helper Methods

### saveContact(contactData)

Saves or updates a contact (checks if exists before inserting).

```javascript
const contactData = {
  remoteJid: "256703722777@s.whatsapp.net",
  phoneNumber: "+256703722777",
  countryCode: "256",
  localNumber: "703722777",
  pushName: "John Doe",
  contactType: "individual",
};

const result = await db.saveContact(contactData);
// Returns: { id, remoteJid, action: 'created' | 'updated', messageCount }
```

### getContact(remoteJid)

Get a specific contact by remoteJid.

```javascript
const contact = await db.getContact("256703722777@s.whatsapp.net");
// Returns: contact object or null
```

### getContacts(options)

Get all contacts with filtering.

```javascript
const contacts = await db.getContacts({
  contactType: "individual", // Optional filter
  limit: 100, // Max results
  orderBy: "lastSeen", // Sort field
});
// Returns: array of contacts
```

### searchContacts(searchTerm, limit)

Search contacts by name, phone, or remoteJid.

```javascript
const results = await db.searchContacts("John", 50);
// Returns: array of matching contacts
```

### getContactStats()

Get contact statistics.

```javascript
const stats = await db.getContactStats();
// Returns: { totalContacts, individuals, groups, newsletters, totalMessages, ... }
```

### deleteContact(remoteJid)

Delete a contact permanently.

```javascript
const deleted = await db.deleteContact("256703722777@s.whatsapp.net");
// Returns: true if deleted, false if not found
```

---

## Contact Types

### Individual (`individual`)

Regular WhatsApp users.

**Format:** `phoneNumber@s.whatsapp.net`  
**Example:** `256703722777@s.whatsapp.net`

**Stored Data:**

- Phone number with country code
- Country code extracted (256)
- Local number (703722777)

### Group (`group`)

WhatsApp group chats.

**Important:** For group messages, the system stores the **individual participant** who sent the message, NOT the group itself.

**Group Format:** `adminPhone-timestamp@g.us`  
**Participant Format:** `phoneNumber@s.whatsapp.net`

**How It Works:**

1. Webhook receives group message with `remoteJid` = group ID
2. System looks for `participant` field (actual sender's JID)
3. Saves the **participant** as an individual contact
4. Stores the group ID in the `groupId` field for reference

**Example Webhook Data:**

```json
{
  "remoteJid": "256704966899-1625215002@g.us",
  "participant": "256703722888@s.whatsapp.net",
  "pushName": "Group Member"
}
```

**Stored Contact:**

- `remoteJid`: `256703722888@s.whatsapp.net` (participant, not group)
- `phoneNumber`: `+256703722888`
- `contactType`: `individual`
- `groupId`: `256704966899-1625215002@g.us` (for reference)

**Why This Design?**

- ✅ Track individual people, not groups
- ✅ See who's messaging from groups
- ✅ Maintain accurate message counts per person
- ✅ Enable AI responses to individuals
- ✅ Keep group context for analysis

### Newsletter (`newsletter`)

WhatsApp channels/newsletters.

**Format:** `channelId@newsletter`  
**Example:** `120363169319669622@newsletter`

**Stored Data:**

- Channel ID
- No extractable phone number

### Unknown (`unknown`)

Unrecognized formats.

**Stored Data:**

- Original remoteJid only

---

## Migration from Existing Messages

If you already have messages in your database, run the migration script to populate the contacts table:

```bash
node migrate-contacts.js
```

### What It Does

1. ✅ Reads all existing messages
2. ✅ Groups by `remoteJid`
3. ✅ Extracts phone information
4. ✅ Creates contact entries
5. ✅ Sets correct `messageCount`
6. ✅ Sets `firstSeen` from earliest message
7. ✅ Sets `lastSeen` from latest message
8. ✅ Shows statistics summary

### Example Output

```
==========================================
  CONTACTS MIGRATION SCRIPT
==========================================

🔄 Starting contacts migration...

✅ Database connected

📊 Found 150 unique contacts in messages

📝 Processed: 150/150

✅ Migration completed!
   Created: 150 contacts
   Updated: 0 contacts
   Errors: 0

📊 Contact Statistics:
   Total Contacts: 150
   Individuals: 120
   Groups: 25
   Newsletters: 3
   Unknown: 2
   Total Messages: 1847

✅ Database connection closed

✅ All done!
```

---

## Use Cases

### 1. View All Active Contacts

```bash
curl http://localhost/contacts?limit=100
```

### 2. Find Most Active Users

```bash
curl http://localhost/contacts?orderBy=messageCount&limit=20
```

### 3. Find Recent Contacts

```bash
curl http://localhost/contacts?orderBy=lastSeen&limit=50
```

### 4. Search by Name

```bash
curl http://localhost/contacts/search/John
```

### 5. Filter Individual Users

```bash
curl http://localhost/contacts?type=individual
```

### 6. Get Contact Details

```bash
curl http://localhost/contacts/256703722777@s.whatsapp.net
```

### 7. Track Statistics

```bash
curl http://localhost/contacts/stats/summary
```

---

## Testing

### REST Client Tests

Location: `rest/07-contacts.http`

**Test Sections:**

1. Get all contacts (with filters)
2. Get specific contact
3. Search contacts
4. Contact statistics
5. Delete contact
6. Integration tests (webhook → contact creation)
7. Cleanup

**Run Tests:**

1. Open `rest/07-contacts.http` in VS Code
2. Click "Send Request" above each test
3. Verify responses

---

## Database Setup

### Create Table

Run the SQL setup script:

```bash
sqlite3 libraries/database/whatsapp_messages.db < libraries/database/setup.sql
```

Or manually:

```sql
-- The contacts table, indexes, triggers, and view are in setup.sql
-- They will be created automatically when you run the setup script
```

### Verify Table

```bash
sqlite3 libraries/database/whatsapp_messages.db
```

```sql
.tables
-- Should show: contacts, whatsapp_messages, ai_enabled_users

.schema contacts
-- Shows table structure

SELECT COUNT(*) FROM contacts;
-- Shows total contacts
```

---

## Benefits

### For Administrators

✅ **Track User Base** - See all people who've messaged your bot  
✅ **Identify Active Users** - Find who messages most frequently  
✅ **Monitor Growth** - Track when new contacts appear  
✅ **Clean Up** - Remove inactive or test contacts

### For Analytics

✅ **Message Patterns** - See total messages per contact  
✅ **Contact Distribution** - Individuals vs groups vs newsletters  
✅ **Country Codes** - Understand geographic distribution  
✅ **Activity Timeline** - First seen vs last seen analysis

### For Development

✅ **No Manual Entry** - Contacts saved automatically  
✅ **No Duplicates** - Smart upsert logic  
✅ **Fast Queries** - Indexed for performance  
✅ **Easy Integration** - Simple API endpoints

---

## Troubleshooting

### Contact Not Being Saved

**Problem:** Contact not appearing after message received

**Solutions:**

1. Check webhook logs:

   ```
   👤 Contact saved: created - 256703722777@s.whatsapp.net
   ```

2. Verify table exists:

   ```sql
   SELECT * FROM contacts LIMIT 1;
   ```

3. Check for errors in server logs:
   ```
   ⚠️  Failed to save contact: [error message]
   ```

### Duplicate Contacts

**Problem:** Same contact appearing multiple times

**Note:** This shouldn't happen due to UNIQUE constraint on `remoteJid`.

**Solutions:**

1. Check for different remoteJid formats
2. Verify UNIQUE constraint exists:
   ```sql
   .schema contacts
   -- Should show: remoteJid TEXT NOT NULL UNIQUE
   ```

### Message Count Not Updating

**Problem:** `messageCount` stays at 1

**Solutions:**

1. Check if contact is being updated:

   ```
   👤 Contact saved: updated - 256703722777@s.whatsapp.net
   ```

2. Verify update logic in db-helper.js

3. Check database:
   ```sql
   SELECT remoteJid, messageCount, lastSeen
   FROM contacts
   WHERE remoteJid = '256703722777@s.whatsapp.net';
   ```

---

## Future Enhancements

- [ ] Contact tags/labels
- [ ] Custom contact notes
- [ ] Contact grouping/categories
- [ ] Activity analytics dashboard
- [ ] Export contacts to CSV
- [ ] Bulk operations (tag, delete, etc.)
- [ ] Contact merge functionality
- [ ] Integration with AI user management

---

## Resources

- **SQL Setup:** `libraries/database/setup.sql`
- **DB Helper Methods:** `libraries/database/db-helper.js`
- **Migration Script:** `migrate-contacts.js`
- **REST Tests:** `rest/07-contacts.http`
- **Webhook Handler:** `server.js` (lines ~402-422)

---

**Status:** ✅ **PRODUCTION READY**

_Automatically stores and manages contacts from WhatsApp messages. No configuration required._
