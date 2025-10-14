# UUID Import Fix

## Issue

When running `npm start`, the following error occurred:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module C:\Users\olobo\Documents\AI\wasp-ai-bot\node_modules\uuid\dist-node\index.js from C:\Users\olobo\Documents\AI\wasp-ai-bot\libraries\queue\publisher.js not supported.
```

## Cause

The `uuid` package (v13.0.0+) is an ES Module and cannot be imported using `require()` in CommonJS modules. The original code attempted:

```javascript
const { v4: uuidv4 } = require("uuid"); // ❌ Not supported
```

## Solution

Changed to use dynamic `import()` which is supported in CommonJS:

```javascript
/**
 * Load uuid module dynamically (ESM module)
 * @returns {Promise<Function>} UUID v4 generator function
 */
async loadUUID() {
    if (!this.uuidv4) {
        const { v4 } = await import('uuid');
        this.uuidv4 = v4;
    }
    return this.uuidv4;
}
```

Then in the `publishToAgentQueue()` method:

```javascript
// Load UUID dynamically if not already loaded
const uuidv4 = await this.loadUUID();
const messageId = uuidv4();
```

## Benefits

- ✅ Works with ES Module packages
- ✅ Loads uuid only once (cached in `this.uuidv4`)
- ✅ No performance impact after first load
- ✅ Maintains compatibility with CommonJS

## Alternative Solutions

If you want to avoid dynamic imports, you could:

1. **Use an older uuid version** (not recommended):

   ```bash
   npm install uuid@8.3.2
   ```

2. **Convert the entire project to ES Modules** by adding to `package.json`:

   ```json
   {
     "type": "module"
   }
   ```

   Then change all `require()` to `import` statements.

3. **Use `crypto.randomUUID()`** (Node.js built-in, v14.17.0+):
   ```javascript
   const crypto = require("crypto");
   const messageId = crypto.randomUUID();
   ```

The dynamic import solution was chosen to maintain CommonJS compatibility while supporting modern ES Modules.

## Status

✅ **Fixed** - Server starts successfully in both Direct and Queue modes.

---

**Date:** 2025-01-10  
**File Modified:** `libraries/queue/publisher.js`  
**Lines Changed:** 2, 10, 23-30, 112-113
