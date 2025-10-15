# Booking Agent Template - Complete

## ✅ What Was Created

A complete, templatized copy of the `farm-agent` has been created in the `booking-agent` folder. This template is fully functional and ready to be customized for any booking/appointment scheduling use case.

## 📁 Created Structure

```
agents/booking-agent/
├── agent.py                      # Core agent setup (Google ADK)
├── main.py                       # Service entry point
├── prompt.py                     # Agent prompts (CUSTOMIZE THIS!)
├── requirements.txt              # Python dependencies
├── start.bat                     # Windows startup script
├── .env.example                  # Environment template
├── README.md                     # Quick start guide
│
├── libraries/
│   ├── __init__.py              # Package init
│   ├── queue_consumer.py        # RabbitMQ consumer
│   └── session_manager.py       # Session management
│
├── tests/
│   ├── README.md                # Testing guide
│   ├── test_imports.py          # Import verification
│   └── test_queue_flow.py       # Message flow tests
│
└── documentation/
    ├── README.md                # Documentation index
    └── CUSTOMIZATION_GUIDE.md   # How to customize
```

## 🎯 Key Changes from Farm Agent

All references to "farm" have been replaced with "booking":

1. **Class Names:**
   - `FarmAgentConfig` → `BookingAgentConfig`
   - `FarmAgentService` → `BookingAgentService`
2. **Agent Names:**
   - `farm_agent` → `booking_agent`
3. **Log Files:**

   - `farm_agent.log` → `booking_agent.log`

4. **Prompts:**
   - Farm-specific prompts replaced with generic booking templates
   - Clear TODO markers for customization
   - Example structures provided

## 🚀 Quick Start for Users

1. **Navigate to the folder:**

   ```bash
   cd agents\booking-agent
   ```

2. **Set up environment:**

   ```bash
   copy .env.example .env
   # Edit .env with your credentials
   ```

3. **Customize prompts:**

   - Open `prompt.py`
   - Replace TODO sections with your specific use case
   - Add your services, pricing, availability

4. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

5. **Test imports:**

   ```bash
   python tests\test_imports.py
   ```

6. **Run the agent:**
   ```bash
   start.bat
   ```

## 🎨 Customization Points

### Primary (Required):

- **`prompt.py`** - Define your agent's behavior and knowledge
- **`.env`** - Configure your environment

### Secondary (Optional):

- **`agent.py`** - Add custom tools/functions
- **`session_manager.py`** - Add custom validation/processing
- **`libraries/`** - Add integration modules

### Advanced (As Needed):

- **`main.py`** - Modify service behavior
- **`queue_consumer.py`** - Adjust queue handling

## 📚 Documentation Provided

### Core Guides:

1. **README.md** - Quick start and overview
2. **CUSTOMIZATION_GUIDE.md** - Detailed customization instructions
3. **Tests README** - How to test your agent

### Features Documented:

- Complete setup instructions
- Customization patterns
- Testing procedures
- Troubleshooting tips
- Common use case examples

## 🔧 Template Features

### ✅ Included:

- Complete Google ADK integration
- Azure OpenAI configuration
- RabbitMQ queue processing
- Session management (conversation context)
- Concurrent message handling
- Error handling and logging
- Graceful shutdown
- Test suite structure
- Comprehensive documentation

### 🎯 Ready to Customize:

- Agent prompts and instructions
- Business logic and rules
- Service offerings/pricing
- Validation rules
- Response formats
- External integrations

## 💡 Example Use Cases

This template can be adapted for:

- Restaurant reservations
- Hotel bookings
- Medical appointments
- Spa/salon appointments
- Event tickets
- Car rentals
- Tour bookings
- Service appointments (plumbing, cleaning, etc.)
- Class/workshop registrations
- Conference room bookings

## 🛠️ Technical Details

### Architecture:

- **Message Flow**: RabbitMQ (ag_queue) → Agent → RabbitMQ (wb_queue)
- **Session Management**: InMemorySessionService (per user context)
- **Concurrency**: Configurable concurrent session limit
- **Error Handling**: Automatic retry with requeue
- **Logging**: File and console output

### Dependencies:

- google-adk (Agent framework)
- litellm (LLM interface)
- aio-pika (Async RabbitMQ)
- python-dotenv (Config management)
- Various utilities (requests, httpx, pandas, etc.)

## 🎓 Learning Path

For someone new to this template:

1. **Read** `README.md` - Understand the basics
2. **Review** `prompt.py` - See how prompts work
3. **Study** `CUSTOMIZATION_GUIDE.md` - Learn customization options
4. **Examine** farm-agent - See a working example
5. **Experiment** - Make small changes and test
6. **Build** - Create your specific booking agent

## 🔒 Security Notes

- `.env` file is not created (only `.env.example`)
- Never commit real credentials
- Keep API keys secure
- Use environment-specific configs for prod/dev

## ✨ Best Practices

1. **Start Simple**: Begin with basic prompts, add complexity gradually
2. **Test Often**: Run tests after each change
3. **Log Everything**: Use logging to track issues
4. **Document Changes**: Update README as you customize
5. **Version Control**: Commit working versions frequently

## 📊 What's Different from Farm Agent

### Similarities (Core Structure):

- All core files are identical in structure
- RabbitMQ integration unchanged
- Session management logic preserved
- Error handling maintained

### Differences (Customization):

- All "farm" references → "booking"
- Prompts are generic templates with TODOs
- Documentation focused on customization
- Examples for multiple use cases
- Clear markers for where to customize

## 🎉 Ready to Use!

The template is:

- ✅ Complete and functional
- ✅ Well-documented
- ✅ Easy to customize
- ✅ Production-ready structure
- ✅ Includes tests and examples

## Next Steps

1. Navigate to `agents\booking-agent`
2. Open `prompt.py` and start customizing
3. Configure `.env` with your credentials
4. Test with `python tests\test_imports.py`
5. Run with `start.bat`
6. Start building your specific booking agent!

---

**Created**: October 14, 2025
**Template Version**: 1.0
**Based On**: farm-agent (working implementation)
**Status**: Ready for customization
