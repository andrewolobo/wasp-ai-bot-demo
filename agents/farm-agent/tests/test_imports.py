"""
Test script to verify all imports work correctly
"""

import sys
import os

# Add current directory to path (mimics running main.py)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("🧪 Testing Import Structure")
print("=" * 70)

try:
    print("\n1. Testing agent imports...")
    from agent import create_agent, create_runner, create_content_from_text
    print("   ✅ agent imports successful")
except ImportError as e:
    print(f"   ❌ agent import failed: {e}")
    sys.exit(1)

try:
    print("\n2. Testing session_manager imports...")
    from libraries.session_manager import SessionManager
    print("   ✅ session_manager imports successful")
except ImportError as e:
    print(f"   ❌ session_manager import failed: {e}")
    sys.exit(1)

try:
    print("\n3. Testing queue_consumer imports...")
    from libraries.queue_consumer import QueueConsumer
    print("   ✅ queue_consumer imports successful")
except ImportError as e:
    print(f"   ❌ queue_consumer import failed: {e}")
    sys.exit(1)

try:
    print("\n4. Testing cross-imports (session_manager -> agent)...")
    # This verifies that session_manager can import from agent
    import libraries.session_manager
    print("   ✅ Cross-imports successful")
except ImportError as e:
    print(f"   ❌ Cross-import failed: {e}")
    sys.exit(1)

try:
    print("\n5. Testing cross-imports (queue_consumer -> session_manager)...")
    # This verifies that queue_consumer can import session_manager
    import libraries.queue_consumer
    print("   ✅ Cross-imports successful")
except ImportError as e:
    print(f"   ❌ Cross-import failed: {e}")
    sys.exit(1)

print("\n" + "=" * 70)
print("✅ All imports verified successfully!")
print("=" * 70)
print("\nImport structure:")
print("  main.py")
print("    └── libraries.queue_consumer.QueueConsumer")
print("          └── libraries.session_manager.SessionManager")
print("                └── agent (create_agent, create_runner, create_content_from_text)")
print("\n💡 You can safely run: python main.py")
print("=" * 70)
