# Booking Agent Customization Guide

This guide walks you through customizing the booking agent template for your specific use case.

## 🎯 Customization Checklist

### 1. Define Your Agent's Purpose

Before starting, clearly define:

- [ ] What type of bookings will this handle?
- [ ] What information needs to be collected?
- [ ] What business rules apply?
- [ ] What external systems need integration?

### 2. Update Agent Prompts (`prompt.py`)

This is the most important file to customize:

```python
DESCRIPTION = """
Your agent's description here.
Be specific about what it does and its personality.
"""

INSTRUCTIONS = """
Detailed instructions for the agent's behavior.
Include:
- Conversation flow
- Required information to collect
- Business rules
- Error handling
- Available services/products
"""
```

#### Examples by Use Case:

**Restaurant Booking:**

- Collect: date, time, party size, special requests
- Check: table availability, operating hours
- Provide: confirmation, cancellation policy

**Medical Appointments:**

- Collect: reason for visit, preferred date/time, insurance info
- Check: doctor availability, insurance coverage
- Provide: pre-appointment instructions, location

**Hotel Reservations:**

- Collect: check-in/out dates, room type, guests
- Check: room availability, pricing
- Provide: amenities, policies, booking confirmation

### 3. Configure Environment (`.env`)

```bash
# Copy the example file
copy .env.example .env
```

Update these values:

- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY`: Your API key
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Your model deployment
- `AGENT_NAME`: Change from "booking_agent" to your specific name
- `AG_QUEUE`: Custom queue name if needed
- `LOG_FILE`: Custom log file name

### 4. Customize Agent Name

Search and replace "booking" with your specific agent name:

**Files to update:**

- `agent.py`: Class names, agent_name config
- `main.py`: Service class name, log messages
- `.env.example`: AGENT_NAME variable
- `start.bat`: Script title and messages

### 5. Add Custom Tools (Optional)

If your agent needs to perform actions, add tools in `agent.py`:

```python
from google.adk.tools import agent_tool

@agent_tool
def check_availability(date: str, time: str) -> str:
    """Check if a slot is available"""
    # Your logic here
    return "Available" or "Not available"

# Then in create_agent():
agent = Agent(
    name=config.agent_name,
    model=LiteLlm(...),
    description=DESCRIPTION,
    instruction=INSTRUCTIONS,
    tools=[check_availability]  # Add your tools
)
```

### 6. External Integrations

If you need to integrate with external systems:

1. **Create integration modules** in `libraries/`:

   ```python
   # libraries/booking_system.py
   class BookingSystem:
       def create_booking(self, details):
           # API call to your system
           pass
   ```

2. **Use in session_manager.py**:

   ```python
   from libraries.booking_system import BookingSystem

   # In SessionManager.__init__:
   self.booking_system = BookingSystem()
   ```

3. **Call in process_message**:
   ```python
   # After getting user input
   booking_result = self.booking_system.create_booking(details)
   ```

### 7. Customize Response Format

In `session_manager.py`, modify the response structure if needed:

```python
response = {
    'messageId': f"resp-{message_id}",
    # ... standard fields ...
    'response': {
        'text': response_text,
        'type': 'text',
        'attachments': [],
        # Add custom fields:
        'bookingReference': 'ABC123',
        'confirmationUrl': 'https://...'
    },
    # ...
}
```

### 8. Add Validation Logic

In `session_manager.py`, add custom validation:

```python
def _validate_booking_details(self, details: dict) -> tuple[bool, str]:
    """Validate booking details"""
    # Check date is in future
    # Check time is within business hours
    # Check capacity
    return (valid, error_message)
```

### 9. Custom Logging

Add specific logging for your use case in `main.py`:

```python
# Log booking attempts
logger.info(f"Booking request: {booking_type} for {date} at {time}")

# Log successful bookings
logger.info(f"Booking confirmed: Reference #{reference}")

# Log cancellations
logger.warning(f"Booking cancelled: Reference #{reference}")
```

### 10. Testing Your Customization

1. **Test imports:**

   ```bash
   python tests/test_imports.py
   ```

2. **Test message structure:**

   ```bash
   python tests/test_queue_flow.py
   ```

3. **Manual testing:**
   - Start the agent
   - Send test messages via RabbitMQ
   - Verify responses
   - Check logs for issues

## 📋 Common Customization Patterns

### Pattern 1: Multi-Step Booking Flow

```python
# In prompt.py INSTRUCTIONS:
"""
1. Ask for service type
2. Ask for date and time
3. Ask for contact information
4. Confirm all details
5. Process booking
6. Send confirmation
"""
```

### Pattern 2: Availability Checking

```python
@agent_tool
def check_availability(date: str, time: str, service: str) -> dict:
    """Check if requested slot is available"""
    # Query your database/calendar
    return {
        'available': True,
        'alternatives': ['2pm', '3pm', '4pm']
    }
```

### Pattern 3: Price Calculation

```python
@agent_tool
def calculate_price(service: str, duration: int, extras: list) -> float:
    """Calculate total price"""
    base_price = get_service_price(service)
    duration_cost = duration * hourly_rate
    extras_cost = sum(get_extra_price(e) for e in extras)
    return base_price + duration_cost + extras_cost
```

### Pattern 4: Confirmation Messages

```python
def _format_confirmation(self, booking: dict) -> str:
    """Format a nice confirmation message"""
    return f"""
✅ Booking Confirmed!

📅 Date: {booking['date']}
⏰ Time: {booking['time']}
👤 Name: {booking['name']}
🎫 Reference: {booking['reference']}

To cancel or modify, reply with your reference number.
    """.strip()
```

## 🚨 Important Notes

1. **Keep the core structure**: Don't modify the RabbitMQ integration or session management unless necessary
2. **Test thoroughly**: Test all conversation flows before deployment
3. **Handle errors gracefully**: Add try-catch blocks for external API calls
4. **Document changes**: Update README.md and add comments
5. **Security**: Never commit `.env` file with real credentials

## 🎓 Learning Resources

- Google ADK Documentation: https://github.com/google/adk
- LiteLLM Documentation: https://docs.litellm.ai/
- RabbitMQ Python Guide: https://www.rabbitmq.com/tutorials/tutorial-one-python.html
- Azure OpenAI Documentation: https://learn.microsoft.com/en-us/azure/ai-services/openai/

## 📞 Need Help?

- Review the farm-agent implementation for working examples
- Check main project documentation
- Test individual components before integration
- Use logging extensively during development
