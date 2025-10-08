# Archive - Legacy Test Files

This folder contains the original test files that have been **consolidated and reorganized** into the new numbered structure.

## Consolidation Date

October 7, 2025

## Why These Files Were Archived

The REST test suite was reorganized using **Option 1: Domain-Based Structure** with numbered prefixes for better organization, discoverability, and logical execution order.

## Consolidation Mapping

### Files Archived → New Location

| Archived File             | Consolidated Into            | Notes                                        |
| ------------------------- | ---------------------------- | -------------------------------------------- |
| `basic.http`              | `00-health.http`             | Health checks and smoke tests                |
| `webhook.http`            | `01-webhook.http`            | Message reception tests                      |
| `andrew.http`             | `01-webhook.http`            | AI auto-response tests (now database-driven) |
| `test-andrew-simple.http` | `01-webhook.http`            | Simple AI trigger tests                      |
| `messages.http`           | `02-messages.http`           | Renamed with number prefix                   |
| `ai.http`                 | `03-ai-chat.http`            | Renamed with number prefix                   |
| `ai-users.http`           | `04-ai-users.http`           | Renamed with number prefix                   |
| `messaging.http`          | `05-messaging.http`          | Renamed with number prefix                   |
| `workflows.http`          | `06-workflows.http`          | Enhanced with more scenarios                 |
| `test-suite.http`         | Distributed across all files | Overview distributed to individual domains   |
| `performance.http`        | `99-performance.http`        | Performance tests consolidated               |
| `phone.http`              | `99-performance.http`        | Phone extraction tests                       |
| `env-validation.http`     | `99-performance.http`        | Environment validation tests                 |

## New Structure Benefits

✅ **Numbered Prefixes:** Clear execution order (00 → 99)  
✅ **Domain-Based:** One responsibility per file  
✅ **Better Organization:** Easy to find specific tests  
✅ **Logical Grouping:** Related tests together  
✅ **Comprehensive:** 180+ tests total  
✅ **Well-Documented:** Each file has detailed comments

## Using Archived Files

⚠️ **These files are no longer maintained**

If you need to reference old tests:

1. Check the consolidation mapping above
2. Find the equivalent test in the new numbered files
3. All functionality is preserved in the new structure

## Migration Notes

### What Changed?

1. **Andrew AI Tests**

   - Old: Keyword-based ("Andrew" in message)
   - New: Database-driven whitelist (ai_enabled_users table)
   - Location: `01-webhook.http` sections 2.1-2.4

2. **Test Organization**

   - Old: 14 files with overlapping concerns
   - New: 8 files with clear domains

3. **Naming Convention**

   - Old: Descriptive names only
   - New: Numbered prefixes + descriptive names

4. **Documentation**
   - Old: Brief comments
   - New: Comprehensive headers with prerequisites, expected results, troubleshooting

### What Stayed the Same?

✅ All test cases preserved  
✅ API endpoints unchanged  
✅ Request/response formats identical  
✅ Variable naming consistent  
✅ REST Client compatibility

## Need Help?

See the main test suite documentation:

- `../README.md` - Complete testing guide
- `../00-health.http` - Start here for new tests
- Project root `README.md` - Full API documentation

---

**Note:** These files are kept for historical reference only. Use the new numbered test files for all testing activities.
