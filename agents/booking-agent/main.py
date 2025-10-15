"""
Booking Agent Main Application
===========================

Main entry point for the Booking Agent service that consumes from RabbitMQ
and processes messages using Google ADK with InMemorySessionService.
"""

import asyncio
import logging
import signal
import sys
from typing import Optional
from dotenv import load_dotenv
import os

from libraries.queue_consumer import QueueConsumer

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('booking_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class BookingAgentService:
    """
    Main service orchestrator for the Booking Agent
    """
    
    def __init__(self):
        """Initialize the service"""
        self.consumer: Optional[QueueConsumer] = None
        self.is_running = False
        
        # Get configuration from environment
        self.rabbitmq_url = os.getenv(
            'RABBITMQ_URL',
            'amqp://admin:wasp_rabbit_2024@localhost:5672/'
        )
        self.ag_queue = os.getenv('AG_QUEUE', 'ag_queue')
        self.wb_queue = os.getenv('WB_QUEUE', 'wb_queue')
        self.max_concurrent = int(os.getenv('MAX_CONCURRENT_SESSIONS', '5'))
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"\nReceived signal {signum}")
        asyncio.create_task(self.shutdown())
    
    async def start(self):
        """Start the agent service"""
        try:
            logger.info("=" * 70)
            logger.info("Starting Booking Agent Service")
            logger.info("=" * 70)
            
            # Display configuration
            logger.info(f"RabbitMQ URL: {self.rabbitmq_url}")
            logger.info(f"Consuming from: {self.ag_queue}")
            logger.info(f"Publishing to: {self.wb_queue}")
            logger.info(f"Max concurrent sessions: {self.max_concurrent}")
            
            # Initialize consumer
            self.consumer = QueueConsumer(
                rabbitmq_url=self.rabbitmq_url,
                ag_queue=self.ag_queue,
                wb_queue=self.wb_queue,
                max_concurrent=self.max_concurrent
            )
            
            # Connect to RabbitMQ
            connected = await self.consumer.connect()
            if not connected:
                logger.error("Failed to connect to RabbitMQ")
                return
            
            logger.info("=" * 70)
            logger.info("Booking Agent Service is running!")
            logger.info("Listening for booking requests...")
            logger.info("Press CTRL+C to stop")
            logger.info("=" * 70)
            
            self.is_running = True
            
            # Start consuming
            await self.consumer.start_consuming()
            
        except Exception as e:
            logger.error(f"Service error: {e}", exc_info=True)
            await self.shutdown()
    
    async def shutdown(self):
        """Graceful shutdown"""
        if not self.is_running:
            return
        
        logger.info("\n" + "=" * 70)
        logger.info("Shutting down Booking Agent Service...")
        logger.info("=" * 70)
        
        self.is_running = False
        
        if self.consumer:
            await self.consumer.stop()
        
        logger.info("Booking Agent Service stopped")
        logger.info("=" * 70)


async def main():
    """Main entry point"""
    
    # Validate required environment variables
    required_vars = [
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_DEPLOYMENT_NAME'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please set them in your .env file")
        sys.exit(1)
    
    # Create and start service
    service = BookingAgentService()
    
    try:
        await service.start()
    except KeyboardInterrupt:
        logger.info("\nService interrupted by user")
    finally:
        await service.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
