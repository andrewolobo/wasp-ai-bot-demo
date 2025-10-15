# Booking Agent Template

This is a templatized agent based on the farm-agent structure. It's designed to be easily customized for any booking or appointment scheduling use case.

## 📋 Quick Start

1. **Copy the environment file:**

   ```bash
   copy .env.example .env
   ```

2. **Configure your .env file:**

   - Set your Azure OpenAI credentials
   - Configure RabbitMQ connection details
   - Adjust agent settings as needed

3. **Customize the agent prompts:**

   - Open `prompt.py`
   - Update `DESCRIPTION` and `INSTRUCTIONS` to match your specific booking agent needs
   - Add your service offerings, pricing, availability, etc.

4. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

5. **Run the agent:**
   ```bash
   start.bat
   ```
   Or:
   ```bash
   python -m main
   ```

## 🎯 Customization Guide

### 1. Agent Identity (`prompt.py`)

Replace the placeholder prompts with your specific use case:

**Examples of what you can build:**

- Hotel/accommodation booking
- Restaurant reservations
- Medical appointments
- Spa/salon bookings
- Event tickets
- Service appointments (plumbing, cleaning, etc.)
- Car rental
- Tour bookings
- Class/workshop registrations

### 2. Configuration (`.env`)

Key settings to customize:

- `AGENT_NAME`: Change to match your agent's purpose
- `AG_QUEUE`: Input queue name (if using custom queues)
- `WB_QUEUE`: Output queue name
- `MAX_CONCURRENT_SESSIONS`: Adjust based on expected load

### 3. Logging

Logs are written to `booking_agent.log` by default. Change this in:

- `main.py` (logging configuration)
- `.env` file (`LOG_FILE` setting)

## 📁 Project Structure

```
booking-agent/
├── agent.py              # Core agent setup using Google ADK
├── main.py               # Main service entry point
├── prompt.py            # Agent prompts (CUSTOMIZE THIS!)
├── requirements.txt      # Python dependencies
├── start.bat            # Windows startup script
├── .env.example         # Environment template
├── README.md            # This file
└── libraries/
    ├── __init__.py
    ├── queue_consumer.py    # RabbitMQ consumer
    └── session_manager.py   # Session management
```

## 🔧 How It Works

1. **Message Flow:**

   - Consumes messages from RabbitMQ (`ag_queue`)
   - Processes with Google ADK agent
   - Maintains conversation context per user
   - Publishes responses to `wb_queue`

2. **Session Management:**

   - Each WhatsApp user gets a unique session
   - Conversation history is maintained
   - Context is preserved across messages

3. **Concurrent Processing:**
   - Handles multiple conversations simultaneously
   - Configurable concurrency limit
   - Graceful error handling and retry logic

## 🚀 Deployment Tips

1. **Environment Variables:**

   - Never commit your `.env` file
   - Use environment-specific configuration
   - Keep API keys secure

2. **Monitoring:**

   - Check `booking_agent.log` for issues
   - Monitor RabbitMQ queue lengths
   - Track response times

3. **Scaling:**
   - Increase `MAX_CONCURRENT_SESSIONS` for more throughput
   - Run multiple instances for horizontal scaling
   - Monitor memory usage with concurrent sessions

## 🛠️ Troubleshooting

**Agent not starting:**

- Check `.env` file exists and is configured
- Verify Azure OpenAI credentials
- Ensure RabbitMQ is running

**Connection errors:**

- Verify RabbitMQ URL and credentials
- Check network connectivity
- Ensure queues are properly configured

**No responses:**

- Check agent logs
- Verify prompt.py is properly configured
- Test Azure OpenAI connection separately

## 📝 Notes

- This is a template - customize it for your needs!
- The core structure is production-ready
- Focus on customizing `prompt.py` for your use case
- Test thoroughly before deploying to production

## 🔗 Related Documentation

See the main project documentation for:

- Architecture overview
- Queue system details
- Integration guides
- API specifications
