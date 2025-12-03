#!/usr/bin/env python3
"""
Simple test script to verify MCP server can start and basic imports work.
"""
import sys
import os

# Add the mcp directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all imports work correctly."""
    print("Testing imports...")
    try:
        from mcp.server import Server
        from mcp.types import Tool, TextContent
        import mcp.server.stdio
        print("✓ MCP library imports successful")
    except ImportError as e:
        print(f"✗ MCP library import failed: {e}")
        print("  Run: pip install -r requirements.txt")
        return False
    
    try:
        from client import ThanosAPIClient
        from auth import CognitoAuthManager
        print("✓ Local module imports successful")
    except ImportError as e:
        print(f"✗ Local module import failed: {e}")
        return False
    
    return True

def test_server_creation():
    """Test that server can be created."""
    print("\nTesting server creation...")
    try:
        from mcp.server import Server
        app = Server("thanos-compliance")
        print("✓ Server instance created successfully")
        return True
    except Exception as e:
        print(f"✗ Server creation failed: {e}")
        return False

def test_environment_vars():
    """Check if environment variables are set (optional for server startup)."""
    print("\nChecking environment variables...")
    required = [
        'THANOS_API_URL',
        'THANOS_USER_POOL_ID',
        'THANOS_CLIENT_ID',
        'THANOS_EMAIL',
        'THANOS_PASSWORD'
    ]
    
    missing = [var for var in required if var not in os.environ]
    if missing:
        print(f"⚠ Missing environment variables: {', '.join(missing)}")
        print("  These are required when the server makes API calls, but")
        print("  the server can start without them (will fail on first tool call).")
        return False
    else:
        print("✓ All environment variables are set")
        return True

if __name__ == "__main__":
    print("=" * 60)
    print("Thanos MCP Server - Startup Test")
    print("=" * 60)
    
    all_ok = True
    all_ok &= test_imports()
    all_ok &= test_server_creation()
    env_ok = test_environment_vars()
    
    print("\n" + "=" * 60)
    if all_ok:
        if env_ok:
            print("✓ All tests passed! Server should work correctly.")
        else:
            print("⚠ Server can start, but will need environment variables")
            print("  when making API calls.")
    else:
        print("✗ Some tests failed. Please fix the issues above.")
    print("=" * 60)
    
    sys.exit(0 if all_ok else 1)

