"""
Test Queue Publisher and Consumer
==================================

Simple script to test the farm-agent queue flow:
1. Publishes a test message to ag_queue
2. Waits for and retrieves the response from wb_queue

Usage:
    python tests/test_queue_flow.py
"""

import asyncio
import json
import uuid
from datetime import datetime
import aio_pika
from aio_pika import Message, ExchangeType
from aio_pika.abc import AbstractRobustConnection, AbstractChannel
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class QueueTester:
    """Test harness for RabbitMQ queue flow"""
    
    def __init__(self, rabbitmq_url: str = "amqp://admin:wasp_rabbit_2024@localhost:5672/"):
        """
        Initialize the tester
        
        Args:
            rabbitmq_url: RabbitMQ connection URL
        """
        self.rabbitmq_url = rabbitmq_url
        self.ag_queue_name = "ag_queue"
        self.wb_queue_name = "wb_queue"
        self.connection: AbstractRobustConnection | None = None
        self.channel: AbstractChannel | None = None
        self.message_id = None
        
    async def connect(self):
        """Connect to RabbitMQ"""
        try:
            logger.info(f"Connecting to RabbitMQ: {self.rabbitmq_url}")
            
            self.connection = await aio_pika.connect_robust(
                self.rabbitmq_url,
                heartbeat=600,
                timeout=30
            )
            
            self.channel = await self.connection.channel()
            
            logger.info("Connected to RabbitMQ")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    async def publish_test_message(self):
        """
        Publish a test message to ag_queue
        
        Returns:
            str: Message ID of published message
        """
        if not self.channel:
            logger.error("Channel not initialized")
            return None
            
        try:
            # Generate unique message ID
            self.message_id = f"test-{uuid.uuid4().hex[:8]}"
            
            # Create test message payload
            test_message = {
                "messageId": self.message_id,
                "timestamp": int(datetime.now().timestamp()),
                "contact": {
                    "remoteJid": "+256784726116@s.whatsapp.net",
                    "phoneNumber": "+256784726116",
                    "name": "Test User"
                },
                "message": {
                    "text": "Hello there, I would like information on how to enroll my student in your school",
                    "timestamp": int(datetime.now().timestamp()),
                    "type": "text"
                },
                "context": {
                    "userNotes": "Test customer - always pays on time",
                    "conversationHistory": [
                        {
                            "role": "user",
                            "content": "Previous conversation context"
                        }
                    ],
                    "metadata": {
                        "source": "test_script",
                        "test": True
                    }
                }
            }
            
            # Publish to ag_queue
            message_body = json.dumps(test_message, ensure_ascii=False)
            
            await self.channel.default_exchange.publish(
                Message(
                    body=message_body.encode('utf-8'),
                    content_type='application/json',
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    message_id=self.message_id
                ),
                routing_key=self.ag_queue_name
            )
            
            logger.info(f"Published test message to {self.ag_queue_name}")
            logger.info(f"Message ID: {self.message_id}")
            logger.info(f"Message content: {test_message['message']['text']}")
            
            return self.message_id
            
        except Exception as e:
            logger.error(f"Error publishing message: {e}")
            return None
    
    async def consume_response(self, timeout: int = 30):
        """
        Consume response from wb_queue
        
        Args:
            timeout: Maximum time to wait for response (seconds)
            
        Returns:
            dict: Response message or None if timeout
        """
        if not self.channel:
            logger.error("Channel not initialized")
            return None
            
        try:
            logger.info(f"Waiting for response on {self.wb_queue_name} (timeout: {timeout}s)...")
            
            # Declare the queue with passive=True (don't create/modify)
            queue = await self.channel.declare_queue(
                self.wb_queue_name,
                durable=True,
                passive=True
            )
            
            # Set up consumer
            response_received = asyncio.Event()
            response_data = {'message': None}
            
            async def on_message(message: aio_pika.abc.AbstractIncomingMessage):
                async with message.process():
                    body = message.body.decode('utf-8')
                    response = json.loads(body)
                    
                    # Check if this is the response to our message
                    if response.get('originalMessageId') == self.message_id:
                        response_data['message'] = response
                        response_received.set()
                        logger.info(f"Received response for message: {self.message_id}")
            
            # Start consuming
            consumer_tag = await queue.consume(on_message)
            
            # Wait for response or timeout
            try:
                await asyncio.wait_for(response_received.wait(), timeout=timeout)
                
                # Cancel consumer
                await queue.cancel(consumer_tag)
                
                return response_data['message']
                
            except asyncio.TimeoutError:
                logger.warning(f"Timeout waiting for response after {timeout}s")
                await queue.cancel(consumer_tag)
                return None
            
        except Exception as e:
            logger.error(f"Error consuming response: {e}")
            return None
    
    async def close(self):
        """Close connections"""
        try:
            if self.channel and not self.channel.is_closed:
                await self.channel.close()
            
            if self.connection and not self.connection.is_closed:
                await self.connection.close()
            
            logger.info("Connections closed")
            
        except Exception as e:
            logger.error(f"Error closing connections: {e}")
    
    async def run_test(self, timeout: int = 30):
        """
        Run complete test flow
        
        Args:
            timeout: Maximum time to wait for response
        """
        try:
            logger.info("=" * 70)
            logger.info("Starting Queue Flow Test")
            logger.info("=" * 70)
            
            # Connect
            if not await self.connect():
                logger.error("Failed to connect to RabbitMQ")
                return False
            
            # Publish test message
            logger.info("\nStep 1: Publishing test message to ag_queue...")
            message_id = await self.publish_test_message()
            
            if not message_id:
                logger.error("Failed to publish message")
                return False
            
            # Wait and consume response
            logger.info(f"\nStep 2: Waiting for response on wb_queue...")
            response = await self.consume_response(timeout)
            
            if response:
                logger.info("\n" + "=" * 70)
                logger.info("TEST SUCCESSFUL!")
                logger.info("=" * 70)
                logger.info(f"\nResponse Details:")
                logger.info(f"  Message ID: {response.get('messageId')}")
                logger.info(f"  Status: {response.get('status')}")
                logger.info(f"  Response Text: {response.get('response', {}).get('text')}")
                logger.info(f"  Processing Time: {response.get('agentMetadata', {}).get('processingTime')}s")
                logger.info(f"  Session ID: {response.get('agentMetadata', {}).get('sessionId')}")
                logger.info(f"\nFull Response:")
                logger.info(json.dumps(response, indent=2))
                logger.info("=" * 70)
                return True
            else:
                logger.error("\n" + "=" * 70)
                logger.error("TEST FAILED - No response received")
                logger.error("=" * 70)
                logger.error("\nPossible reasons:")
                logger.error("  1. Farm agent service is not running")
                logger.error("  2. Agent encountered an error processing the message")
                logger.error("  3. Response timeout too short")
                logger.error("\nCheck farm_agent.log for details")
                logger.error("=" * 70)
                return False
            
        except Exception as e:
            logger.error(f"\nTest failed with error: {e}", exc_info=True)
            return False
        
        finally:
            await self.close()


async def main():
    """Main entry point"""
    
    # Check if RabbitMQ URL should be overridden
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://admin:wasp_rabbit_2024@localhost:5672/')
    
    # Create tester
    tester = QueueTester(rabbitmq_url)
    
    # Run test
    success = await tester.run_test(timeout=30)
    
    # Exit with appropriate code
    import sys
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\nTest interrupted by user")
