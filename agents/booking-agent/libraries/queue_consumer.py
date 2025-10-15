"""
RabbitMQ Queue Consumer for Booking Agent
======================================

Consumes messages from ag_queue and processes them asynchronously
using Google ADK sessions.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import aio_pika
from aio_pika import Message, ExchangeType
from aio_pika.abc import AbstractRobustConnection, AbstractChannel

from .session_manager import SessionManager

logger = logging.getLogger(__name__)


class QueueConsumer:
    """
    Asynchronous RabbitMQ consumer for processing agent requests
    """
    
    def __init__(
        self,
        rabbitmq_url: str = "amqp://admin:wasp_rabbit_2024@localhost:5672/",
        ag_queue: str = "ag_queue",
        wb_queue: str = "wb_queue",
        prefetch_count: int = 1,
        max_concurrent: int = 5
    ):
        """
        Initialize the queue consumer
        
        Args:
            rabbitmq_url: RabbitMQ connection URL
            ag_queue: Queue to consume from (agent input)
            wb_queue: Queue to publish to (webhook input)
            prefetch_count: Number of messages to prefetch
            max_concurrent: Maximum concurrent sessions
        """
        self.rabbitmq_url = rabbitmq_url
        self.ag_queue_name = ag_queue
        self.wb_queue_name = wb_queue
        self.prefetch_count = prefetch_count
        self.max_concurrent = max_concurrent
        
        self.connection: AbstractRobustConnection | None = None
        self.channel: AbstractChannel | None = None
        self.session_manager = SessionManager()
        self.is_running = False
        
        # Semaphore to limit concurrent processing
        self.semaphore = asyncio.Semaphore(max_concurrent)
        
        logger.info(f"QueueConsumer initialized for {ag_queue} -> {wb_queue}")
    
    async def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            logger.info(f"Connecting to RabbitMQ: {self.rabbitmq_url}")
            
            self.connection = await aio_pika.connect_robust(
                self.rabbitmq_url,
                heartbeat=600,
                timeout=300
            )
            
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=self.prefetch_count)
            
            # Declare queues
            await self.channel.declare_queue(
                self.ag_queue_name,
                durable=True,
                arguments={
                    'x-message-ttl': 300000,  # 5 minutes (in milliseconds)
                    'x-dead-letter-exchange': 'dlx_agent'
                }
            )
            
            await self.channel.declare_queue(
                self.wb_queue_name,
                durable=True,
                arguments={
                    'x-message-ttl': 60000,  # 1 minute
                    'x-dead-letter-exchange': 'dlx_webhook'
                }
            )
            
            logger.info(f"Connected to RabbitMQ")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False
    
    async def process_message(self, message: aio_pika.abc.AbstractIncomingMessage):
        """
        Process a single message from the queue
        
        Args:
            message: Incoming RabbitMQ message
        """
        async with self.semaphore:  # Limit concurrent processing
            try:
                # Decode message
                body = message.body.decode('utf-8')
                request = json.loads(body)
                
                message_id = request.get('messageId', 'unknown')
                contact = request.get('contact', {})
                phone = contact.get('phoneNumber', 'unknown')
                
                logger.info(f"Received message {message_id} from {phone}")
                
                # Process with session manager
                response = await self.session_manager.process_message(request)
                
                # Publish response to wb_queue
                await self.publish_response(response)
                
                # Acknowledge message
                await message.ack()
                
                logger.info(f"Message {message_id} processed and acknowledged")
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in message: {e}")
                await message.reject(requeue=False)
                
            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)
                # Requeue for retry
                await message.nack(requeue=True)
    
    async def publish_response(self, response: Dict[str, Any]):
        """
        Publish agent response to wb_queue
        
        Args:
            response: Response dictionary
        """
        if not self.channel:
            logger.error("Cannot publish response: Channel not initialized")
            return
            
        try:
            # Get the existing queue (passive=True means don't create/modify)
            queue = await self.channel.declare_queue(
                self.wb_queue_name,
                durable=True,
                passive=True
            )
            
            message_body = json.dumps(response, ensure_ascii=False)
            
            await self.channel.default_exchange.publish(
                Message(
                    body=message_body.encode('utf-8'),
                    content_type='application/json',
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    message_id=response.get('messageId', 'unknown')
                ),
                routing_key=self.wb_queue_name
            )
            
            logger.info(f"Published response: {response.get('messageId')}")
            
        except Exception as e:
            logger.error(f"Error publishing response: {e}")
    
    async def start_consuming(self):
        """Start consuming messages from the queue"""
        try:
            if not self.connection or self.connection.is_closed:
                await self.connect()
            
            if not self.channel:
                logger.error("Cannot start consuming: Channel not initialized")
                return
            
            # Get the existing queue (passive=True means don't create/modify)
            queue = await self.channel.declare_queue(
                self.ag_queue_name,
                durable=True,
                passive=True
            )
            
            logger.info(f"Starting to consume from {self.ag_queue_name}")
            logger.info(f"Max concurrent sessions: {self.max_concurrent}")
            logger.info("Press CTRL+C to stop")
            
            self.is_running = True
            
            # Start consuming
            await queue.consume(self.process_message)
            
            # Keep running until stopped
            while self.is_running:
                await asyncio.sleep(1)
            
        except asyncio.CancelledError:
            logger.info("Consumer cancelled")
        except Exception as e:
            logger.error(f"Error in consumer: {e}", exc_info=True)
    
    async def stop(self):
        """Stop consuming and close connections"""
        try:
            logger.info("Stopping consumer...")
            self.is_running = False
            
            if self.channel and not self.channel.is_closed:
                await self.channel.close()
            
            if self.connection and not self.connection.is_closed:
                await self.connection.close()
            
            logger.info("Consumer stopped and connections closed")
            
        except Exception as e:
            logger.error(f"Error stopping consumer: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get consumer statistics
        
        Returns:
            Dictionary with consumer stats
        """
        return {
            'is_running': self.is_running,
            'max_concurrent': self.max_concurrent,
            'ag_queue': self.ag_queue_name,
            'wb_queue': self.wb_queue_name,
            **self.session_manager.get_session_stats()
        }


# Example usage
if __name__ == "__main__":
    """Test the consumer"""
    
    async def main():
        consumer = QueueConsumer()
        
        try:
            await consumer.start_consuming()
        except KeyboardInterrupt:
            logger.info("\nInterrupted by user")
        finally:
            await consumer.stop()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run
    asyncio.run(main())
