# Booking Agent Tests

This directory contains tests for the booking agent.

## Test Files

- `test_imports.py` - Verify all imports work correctly
- `test_queue_flow.py` - Test message flow through the agent

## Running Tests

```bash
# Install test dependencies first
pip install pytest pytest-asyncio

# Run all tests
pytest tests/

# Run specific test
pytest tests/test_imports.py

# Run with verbose output
pytest -v tests/
```

## Writing Tests

When adding new tests:

1. Use `pytest` framework
2. Use `pytest-asyncio` for async tests
3. Mock external dependencies (RabbitMQ, Azure OpenAI)
4. Test both success and error cases
5. Keep tests isolated and independent

## Test Coverage

To measure test coverage:

```bash
pip install pytest-cov
pytest --cov=. --cov-report=html tests/
```

This will generate an HTML report in `htmlcov/index.html`.
