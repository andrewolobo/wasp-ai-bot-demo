"""
Test Imports
============

Simple test to verify all required imports work correctly.
Run this before starting the agent to catch dependency issues.
"""

import sys
import importlib


def test_imports():
    """Test that all required packages can be imported"""
    
    required_packages = [
        'google.adk.agents',
        'google.adk.models.lite_llm',
        'google.adk.runners',
        'google.adk.sessions',
        'google.genai.types',
        'dotenv',
        'aio_pika',
        'asyncio',
    ]
    
    print("\n" + "=" * 60)
    print("Testing Package Imports for Booking Agent")
    print("=" * 60 + "\n")
    
    failed = []
    
    for package in required_packages:
        try:
            importlib.import_module(package)
            print(f"✓ {package}")
        except ImportError as e:
            print(f"✗ {package} - FAILED: {e}")
            failed.append(package)
    
    print("\n" + "=" * 60)
    
    if failed:
        print(f"\n❌ {len(failed)} package(s) failed to import:")
        for pkg in failed:
            print(f"   - {pkg}")
        print("\nPlease install missing packages:")
        print("   pip install -r requirements.txt")
        print("=" * 60)
        return False
    else:
        print("✅ All packages imported successfully!")
        print("=" * 60)
        return True


if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
