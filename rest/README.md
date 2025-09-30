# REST Client Test Suite

This folder contains comprehensive REST Client tests for the WhatsApp AI Bot API. These tests are designed to work with the VS Code REST Client extension.

## Prerequisites

1. **VS Code with REST Client Extension**: Install the "REST Client" extension by Huachao Mao
2. **API Server Running**: Ensure your API server is running (`npm start`)
3. **Database Initialized**: Run `npm run bootstrap` to set up the database
4. **Environment Variables**: Configure your `.env` file with Azure OpenAI credentials

## Test Files Overview

| File               | Description                                        | Focus Area                |
| ------------------ | -------------------------------------------------- | ------------------------- |
| `test-suite.http`  | **Start Here** - Complete overview and smoke tests | Quick verification        |
| `basic.http`       | Health checks and core API endpoints               | Basic functionality       |
| `webhook.http`     | WhatsApp webhook message processing                | Message ingestion         |
| `messages.http`    | Message queries and database operations            | Data retrieval            |
| `ai.http`          | Azure OpenAI integration and AI features           | AI processing             |
| `workflows.http`   | End-to-end scenarios and complex flows             | Integration testing       |
| `performance.http` | Load testing and edge cases                        | Performance & reliability |

## Quick Start

### 1. **Start with the Test Suite**

Open `test-suite.http` and run the "QUICK HEALTH CHECK" to verify the API is running.

### 2. **Run Smoke Tests**

Execute the smoke tests in `test-suite.http` to verify core functionality:

- Send a webhook message
- Query the database
- Test AI integration
- Check statistics

### 3. **Populate Sample Data**

Use the "SAMPLE DATA SETUP" section in `test-suite.http` to create test data for more comprehensive testing.

## Testing Workflow

### Recommended Testing Order:

1. **Basic Tests** (`basic.http`)

   - Verify API health and status
   - Test invalid endpoint handling

2. **Webhook Tests** (`webhook.http`)

   - Test message processing with different formats
   - Verify error handling for malformed data

3. **Message Query Tests** (`messages.http`)

   - Test database retrieval functions
   - Verify search and filtering capabilities

4. **AI Integration Tests** (`ai.http`)

   - Test chat completion functionality
   - Verify conversation analysis and summarization

5. **Workflow Tests** (`workflows.http`)

   - Test complete end-to-end scenarios
   - Verify complex multi-step processes

6. **Performance Tests** (`performance.http`)
   - Test system under load
   - Verify edge case handling

## How to Use REST Client

### Running Individual Requests:

1. Open any `.http` file in VS Code
2. Click "Send Request" above any HTTP request
3. View the response in the split panel

### Running Multiple Requests:

1. Use `###` to separate requests
2. Click "Send Request" for each individual test
3. Results appear in separate response tabs

### Variables:

- `@baseUrl = http://localhost` - Change if your API runs on a different port
- Modify the base URL if testing against a deployed instance

## Test Categories Explained

### 🏥 **Basic Tests**

- API health and status verification
- Basic endpoint functionality
- Invalid request handling

### 📨 **Webhook Tests**

- Text message processing
- Emoji and special character handling
- Extended message formats
- Newsletter/broadcast messages
- Error scenarios and validation

### 🔍 **Message Query Tests**

- Session-based message retrieval
- Contact-based message retrieval
- Content search functionality
- Time-based filtering
- Statistical queries

### 🤖 **AI Integration Tests**

- Basic chat completion
- Conversation analysis with context
- Message summarization
- Parameter customization (temperature, tokens)
- Error handling for AI requests

### 🔄 **Workflow Tests**

- Complete user scenarios
- Multi-step processes
- Cross-feature integration
- Real-world use cases

### ⚡ **Performance Tests**

- Rapid message processing
- Large query results
- Edge cases and stress testing
- Memory and load testing

## Sample Test Data

The test files include realistic sample data:

- Customer support conversations
- User feedback messages
- Technical discussions
- Newsletter content
- Error scenarios

## Customization

### Modifying Base URL:

```http
@baseUrl = http://your-server.com:8080
```

### Adding Custom Tests:

1. Follow the existing format
2. Use descriptive comments
3. Include expected behavior
4. Add error test cases

### Environment-Specific Testing:

Create separate `.http` files for different environments:

- `local.http` - Local development
- `staging.http` - Staging environment
- `production.http` - Production testing

## Troubleshooting

### Common Issues:

1. **Connection Refused**

   - Ensure API server is running (`npm start`)
   - Check if port 80 is available or change the port

2. **AI Endpoint Errors**

   - Verify Azure OpenAI credentials in `.env`
   - Check deployment name and endpoint URL

3. **Database Errors**

   - Run `npm run bootstrap` to initialize database
   - Check SQLite3 installation

4. **Empty Query Results**
   - Run webhook tests first to populate database
   - Use sample data setup from `test-suite.http`

### Debug Tips:

- Check server console logs for error details
- Verify environment variables are loaded
- Use health check endpoint to verify service status
- Start with basic tests before complex scenarios

## Best Practices

1. **Test in Order**: Follow the recommended testing sequence
2. **Clean State**: Reset database between major test runs if needed
3. **Monitor Responses**: Check both success and error responses
4. **Use Comments**: Document your custom tests clearly
5. **Version Control**: Keep test files updated with API changes

## Integration with CI/CD

While these are manual tests, you can:

- Export test results for documentation
- Use patterns for automated API testing tools
- Convert to unit tests using the same request patterns
- Create test reports from response validations

---

**Happy Testing!** 🚀

For questions or issues with the test suite, refer to the main project README or check the API server logs for detailed error information.
