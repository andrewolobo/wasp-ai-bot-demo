"""
Test Queue Flow
===============

Test the message flow through the booking agent system.
This includes queue consumption, session management, and response publishing.

NOTE: This is a basic template. Expand with mocks for production testing.
"""

import asyncio
import json
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_test_message():
    """Create a sample test message"""
    return {
        'messageId': f'test-msg-{int(datetime.now().timestamp())}',
        'timestamp': int(datetime.now().timestamp()),
        'contact': {
            'remoteJid': '1234567890@s.whatsapp.net',
            'phoneNumber': '+1234567890',
            'name': 'Test User'
        },
        'message': {
            'text': 'I would like to make a booking for tomorrow at 2pm',
            'timestamp': int(datetime.now().timestamp()),
            'type': 'text'
        },
        'context': {
            'userNotes': 'VIP customer, prefers afternoon appointments',
            'conversationHistory': [
                {
                    'role': 'user',
                    'content': 'What are your available times?',
                    'timestamp': int(datetime.now().timestamp()) - 300
                },
                {
                    'role': 'assistant',
                    'content': 'We have availability throughout the week. What day works best for you?',
                    'timestamp': int(datetime.now().timestamp()) - 240
                }
            ]
        }
    }


def validate_response(response):
    """Validate the structure of an agent response"""
    required_fields = [
        'messageId',
        'originalMessageId',
        'timestamp',
        'status',
        'contact',
        'response',
        'agentMetadata'
    ]
    
    errors = []
    
    for field in required_fields:
        if field not in response:
            errors.append(f"Missing required field: {field}")
    
    # Validate response structure
    if 'response' in response:
        if 'text' not in response['response']:
            errors.append("Response missing 'text' field")
        if 'type' not in response['response']:
            errors.append("Response missing 'type' field")
    
    # Validate agentMetadata
    if 'agentMetadata' in response:
        metadata = response['agentMetadata']
        metadata_fields = ['sessionId', 'processingTime', 'model']
        for field in metadata_fields:
            if field not in metadata:
                errors.append(f"Missing metadata field: {field}")
    
    return errors


async def test_session_manager():
    """Test the session manager directly"""
    try:
        from libraries.session_manager import SessionManager
        
        logger.info("\n" + "=" * 60)
        logger.info("Testing Session Manager")
        logger.info("=" * 60 + "\n")
        
        # Create session manager
        session_manager = SessionManager()
        logger.info("✓ SessionManager created")
        
        # Create test message
        test_msg = create_test_message()
        logger.info(f"✓ Test message created: {test_msg['messageId']}")
        
        # Process message (this would require env vars and Azure OpenAI)
        # In a real test, you'd mock the agent calls
        logger.info("\n⚠ Skipping actual message processing (requires Azure OpenAI)")
        logger.info("  To test fully, configure .env and run the full agent")
        
        # Check session stats
        stats = session_manager.get_session_stats()
        logger.info(f"\n✓ Session stats: {stats}")
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Session Manager test completed")
        logger.info("=" * 60)
        
        return True
        
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        logger.error("   Make sure all dependencies are installed")
        return False
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


async def test_message_structure():
    """Test message structure validation"""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Message Structures")
    logger.info("=" * 60 + "\n")
    
    # Test valid message
    test_msg = create_test_message()
    logger.info("✓ Created test message")
    logger.info(f"  Message ID: {test_msg['messageId']}")
    logger.info(f"  Contact: {test_msg['contact']['name']}")
    logger.info(f"  Text: {test_msg['message']['text'][:50]}...")
    
    # Create sample response
    sample_response = {
        'messageId': f"resp-{test_msg['messageId']}",
        'originalMessageId': test_msg['messageId'],
        'timestamp': int(datetime.now().timestamp()),
        'status': 'success',
        'contact': test_msg['contact'],
        'response': {
            'text': 'Your booking has been confirmed for tomorrow at 2pm.',
            'type': 'text',
            'attachments': []
        },
        'agentMetadata': {
            'sessionId': test_msg['contact']['remoteJid'],
            'toolsUsed': [],
            'reasoningSteps': ['Processed booking request'],
            'processingTime': 1.23,
            'tokensUsed': 50,
            'model': 'azure-openai'
        },
        'error': None
    }
    
    # Validate response
    errors = validate_response(sample_response)
    
    if errors:
        logger.error("\n❌ Response validation failed:")
        for error in errors:
            logger.error(f"   - {error}")
        return False
    else:
        logger.info("\n✓ Response structure is valid")
        logger.info(f"  Response: {sample_response['response']['text'][:50]}...")
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ Message structure test completed")
    logger.info("=" * 60)
    
    return True


async def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("BOOKING AGENT - QUEUE FLOW TESTS")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Message Structure", await test_message_structure()))
    results.append(("Session Manager", await test_session_manager()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status} - {test_name}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    
    print("\n" + "=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60 + "\n")
    
    return all(p for _, p in results)


if __name__ == "__main__":
    success = asyncio.run(main())
    import sys
    sys.exit(0 if success else 1)
