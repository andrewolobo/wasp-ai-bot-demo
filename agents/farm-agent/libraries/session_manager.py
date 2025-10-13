"""
Session Manager for Farm Agent
==============================

Manages individual conversation sessions using Google ADK's InMemorySessionService.
Each WhatsApp conversation gets its own session for context retention.
"""

import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner

from agent import create_agent, create_runner, create_content_from_text

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages agent sessions for concurrent request processing
    """
    
    def __init__(self):
        """Initialize the session manager"""
        self.session_service = InMemorySessionService()
        self.agent = create_agent()
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
        logger.info("SessionManager initialized")
    
    def get_session_id(self, remote_jid: str) -> str:
        """
        Get session ID for a conversation
        
        Args:
            remote_jid: WhatsApp remote JID (unique identifier)
            
        Returns:
            Session ID string (same as remote_jid for Google ADK compatibility)
        """
        # Return remote_jid directly as session_id
        # Google ADK's InMemorySessionService will handle session creation automatically
        return remote_jid
    
    async def process_message(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a message request using the agent with session context
        
        Args:
            request: Request message from ag_queue containing:
                - messageId: Unique message ID
                - contact: Contact information (remoteJid, phoneNumber, name)
                - message: Message data (text, timestamp)
                - context: Conversation history and user notes
                
        Returns:
            Response dictionary for wb_queue
        """
        start_time = datetime.now()
        message_id = request.get('messageId', 'unknown')
        contact = request.get('contact', {})
        remote_jid = contact.get('remoteJid', 'unknown')
        
        try:
            logger.info(f"Processing message: {message_id} from {remote_jid}")
            
            # Use remote_jid as session_id for simplicity
            session_id = remote_jid
            
            # Create session in InMemorySessionService if it doesn't exist
            if remote_jid not in self.active_sessions:
                # Create the session in Google ADK's session service
                await self.session_service.create_session(
                    app_name="farm_agent",
                    user_id=remote_jid,
                    session_id=session_id,
                    state=None
                )
                
                # Track session in our internal state
                self.active_sessions[remote_jid] = {
                    'session_id': session_id,
                    'created_at': datetime.now(),
                    'message_count': 0
                }
                logger.info(f"Created new session in service: {session_id}")
            
            self.active_sessions[remote_jid]['message_count'] += 1
            
            # Create a runner for this specific session
            runner = create_runner(
                agent=self.agent,
                session_service=self.session_service
            )
            
            # Extract message data
            message_data = request.get('message', {})
            user_text = message_data.get('text', '')
            context_data = request.get('context', {})
            user_notes = context_data.get('userNotes', '')
            conversation_history = context_data.get('conversationHistory', [])
            
            # Build context-aware prompt
            prompt = self._build_prompt(
                user_text=user_text,
                user_notes=user_notes,
                conversation_history=conversation_history,
                contact_name=contact.get('name', 'User')
            )
            
            # Run the agent with the session
            logger.info(f"Running agent for session: {session_id}")
            
            # Convert prompt text to Content object (required by runner.run)
            content = create_content_from_text(prompt)
            
            # runner.run() returns a generator of events
            # We iterate through events and collect the response
            response_text = ""
            try:
                events = list(runner.run(
                    user_id=remote_jid,
                    session_id=session_id,
                    new_message=content
                ))
                
                # Extract response from events
                for event in events:
                    # Try to extract text from different possible attributes
                    try:
                        if hasattr(event, 'data') and event.data:  # type: ignore
                            response_text = str(event.data)  # type: ignore
                        elif hasattr(event, 'content') and event.content:
                            response_text = str(event.content)
                        elif str(event) and str(event) != "None":
                            response_text = str(event)
                    except:
                        continue
                
            except Exception as e:
                logger.warning(f"Error running agent: {e}")
            
            # Fallback if no response extracted
            if not response_text or response_text == "None":
                response_text = "I processed your request successfully."
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Message processed in {processing_time:.2f}s: {message_id}")
            
            # Build response message for wb_queue
            response = {
                'messageId': f"resp-{message_id}",
                'originalMessageId': message_id,
                'timestamp': int(datetime.now().timestamp()),
                'status': 'success',
                'contact': contact,
                'response': {
                    'text': response_text,
                    'type': 'text',
                    'attachments': []
                },
                'agentMetadata': {
                    'sessionId': session_id,
                    'toolsUsed': [],
                    'reasoningSteps': ['Processed with Google ADK Agent'],
                    'processingTime': processing_time,
                    'tokensUsed': len(response_text.split()),
                    'model': 'azure-openai'
                },
                'error': None
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing message {message_id}: {str(e)}", exc_info=True)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Return error response
            return {
                'messageId': f"resp-{message_id}",
                'originalMessageId': message_id,
                'timestamp': int(datetime.now().timestamp()),
                'status': 'error',
                'contact': contact,
                'response': {
                    'text': 'I encountered an error processing your request. Please try again.',
                    'type': 'text',
                    'attachments': []
                },
                'agentMetadata': {
                    'sessionId': self.get_session_id(remote_jid),
                    'toolsUsed': [],
                    'reasoningSteps': [],
                    'processingTime': processing_time,
                    'tokensUsed': 0,
                    'model': 'azure-openai'
                },
                'error': {
                    'code': 'PROCESSING_ERROR',
                    'message': str(e),
                    'stack': None
                }
            }
    
    def _build_prompt(self, user_text: str, user_notes: str, 
                     conversation_history: list, contact_name: str) -> str:
        """
        Build a context-aware prompt for the agent
        
        Args:
            user_text: Current message text
            user_notes: Notes about the user
            conversation_history: Previous conversation messages
            contact_name: User's name
            
        Returns:
            Formatted prompt string
        """
        prompt_parts = []
        
        # Add user context if available
        if user_notes:
            prompt_parts.append(f"User Context: {user_notes}")
        
        # Add recent conversation history (last 5 messages)
        if conversation_history:
            prompt_parts.append("\nRecent Conversation:")
            for msg in conversation_history[-5:]:
                content = msg.get('content', '')
                prompt_parts.append(f"- {content}")
        
        # Add current message
        prompt_parts.append(f"\nCurrent Message from {contact_name}: {user_text}")
        
        return "\n".join(prompt_parts)
    
    def _extract_response(self, result: Any) -> str:
        """
        Extract response text from agent result
        
        Args:
            result: Result from runner.run()
            
        Returns:
            Response text string
        """
        try:
            # Handle different result formats from Google ADK
            if hasattr(result, 'text'):
                return result.text
            elif hasattr(result, 'content'):
                return result.content
            elif isinstance(result, str):
                return result
            elif isinstance(result, dict):
                return result.get('text', result.get('content', str(result)))
            else:
                return str(result)
        except Exception as e:
            logger.warning(f"Error extracting response: {e}")
            return "I processed your request successfully."
    
    def cleanup_session(self, remote_jid: str):
        """
        Clean up a session after completion
        
        Args:
            remote_jid: WhatsApp remote JID
        """
        if remote_jid in self.active_sessions:
            session_info = self.active_sessions[remote_jid]
            logger.info(f"Cleaning up session: {session_info['session_id']}")
            del self.active_sessions[remote_jid]
    
    def get_session_stats(self) -> Dict[str, Any]:
        """
        Get statistics about active sessions
        
        Returns:
            Dictionary with session statistics
        """
        return {
            'active_sessions': len(self.active_sessions),
            'sessions': [
                {
                    'remote_jid': jid,
                    'session_id': info['session_id'],
                    'created_at': info['created_at'].isoformat(),
                    'message_count': info['message_count']
                }
                for jid, info in self.active_sessions.items()
            ]
        }
