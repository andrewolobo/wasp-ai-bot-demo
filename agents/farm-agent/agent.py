from google.adk.agents import Agent, SequentialAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import agent_tool
import os
from dotenv import load_dotenv
from .prompt import DESCRIPTION, INSTRUCTIONS


load_dotenv()

api_url = os.getenv("LIVE_API_BASE")
api_key = os.getenv("OPENROUTER_API_KEY")
model = os.getenv("LIVE_MODEL")


root_agent = Agent(
    name="payment_collections_agent",
    model=LiteLlm(
        model=model,
        api_key=api_key,
        api_base=api_url
    ),
    description=DESCRIPTION,
    instruction=INSTRUCTIONS,
)
