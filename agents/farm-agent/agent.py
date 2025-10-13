"""
Farm Agent - Payment Collections Agent
======================================

This agent handles payment collection requests from WhatsApp messages.
It uses Google ADK with Azure OpenAI and processes messages from RabbitMQ.
"""

from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import agent_tool
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
import os
from typing import Optional
from dotenv import load_dotenv
from prompt import DESCRIPTION, INSTRUCTIONS

# Load environment variables
load_dotenv()


class FarmAgentConfig:
    """Configuration for the Farm Agent"""
    
    def __init__(self):
        # Azure OpenAI Configuration
        self.api_url = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.api_key = os.getenv("AZURE_OPENAI_API_KEY")
        self.model = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME") or "gpt-4o-mini"
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION") or "2024-02-15-preview"
        
        # Validate required configuration
        if not self.api_url:
            raise ValueError("AZURE_OPENAI_ENDPOINT is required")
        if not self.api_key:
            raise ValueError("AZURE_OPENAI_API_KEY is required")
        
        # Agent Configuration
        self.agent_name = "payment_collections_agent"
        
    def get_model_name(self) -> str:
        """Get the full model name for Azure"""
        return f"azure/{self.model}"


# Initialize configuration
config = FarmAgentConfig()


def create_agent() -> Agent:
    """
    Create and configure the Farm Agent
    
    Returns:
        Configured Agent instance
    """
    agent = Agent(
        name=config.agent_name,
        model=LiteLlm(
            model=config.get_model_name(),
            api_key=config.api_key,
            api_version=config.api_version,
            api_base=config.api_url
        ),
        description=DESCRIPTION,
        instruction=INSTRUCTIONS,
    )
    return agent


def create_session_service() -> InMemorySessionService:
    """
    Create an in-memory session service for managing conversations
    
    Returns:
        InMemorySessionService instance
    """
    return InMemorySessionService()


def create_runner(agent: Optional[Agent] = None, 
                  session_service: Optional[InMemorySessionService] = None) -> Runner:
    """
    Create a Runner instance for executing the agent
    
    Args:
        agent: Agent instance (creates new one if not provided)
        session_service: Session service (creates new one if not provided)
        
    Returns:
        Runner instance ready to process requests
    """
    if agent is None:
        agent = create_agent()
    
    if session_service is None:
        session_service = create_session_service()
    
    runner = Runner(
        app_name="farm_agent",
        agent=agent,
        session_service=session_service
    )
    
    return runner


def create_content_from_text(text: str) -> Content:
    """
    Helper function to create a Content object from text string.
    Required for runner.run() new_message parameter.
    
    Args:
        text: The text content to wrap
        
    Returns:
        Content object containing the text as a Part
    """
    return Content(parts=[Part(text=text)])


# Create the root agent instance (singleton)
root_agent = create_agent()

# Create session service (singleton)
session_service = create_session_service()

# Create runner (singleton)
runner = create_runner(root_agent, session_service)
