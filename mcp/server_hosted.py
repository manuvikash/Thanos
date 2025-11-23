#!/usr/bin/env python3
"""
Thanos MCP Server - HTTP/SSE Transport for AWS Lambda
Hosted version that accepts remote connections via API Gateway
"""
import asyncio
import json
import logging
import os
from typing import Any, Dict
import base64

from mcp.server import Server
from mcp.types import Tool, TextContent
import mcp.server.sse

# Import the tool definitions and handlers from the original server
import sys
sys.path.append(os.path.dirname(__file__))
from server import list_tools, call_tool, get_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize server
app = Server("thanos-compliance")

# Register the same tools
app.list_tools()(list_tools)
app.call_tool()(call_tool)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for MCP over HTTP/SSE.
    
    This handles:
    1. API key validation
    2. SSE connection management
    3. MCP protocol message routing
    """
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Validate API key
    headers = event.get('headers', {})
    api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
    
    if not api_key:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Missing API key'})
        }
    
    # Validate key against DynamoDB (simplified - should call mcp_keys handler)
    # For now, just check format
    if not api_key.startswith('thanos_mcp_'):
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid API key'})
        }
    
    try:
        # Handle SSE connection
        path = event.get('path', event.get('rawPath', ''))
        
        if path.endswith('/sse'):
            # SSE endpoint - establish connection
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': handle_sse_connection(event)
            }
        
        elif path.endswith('/messages'):
            # Handle MCP messages
            return handle_mcp_message(event)
        
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Not found'})
            }
    
    except Exception as e:
        logger.error(f"Error handling request: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }


def handle_sse_connection(event: Dict[str, Any]) -> str:
    """Handle SSE connection establishment."""
    
    # Send initial connection event
    events = []
    events.append('event: connected')
    events.append(f'data: {json.dumps({"status": "connected", "server": "thanos-mcp"})}')
    events.append('')
    
    return '\n'.join(events)


def handle_mcp_message(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle MCP protocol messages.
    
    This processes JSON-RPC style messages from MCP clients.
    """
    
    try:
        body = event.get('body', '{}')
        if event.get('isBase64Encoded'):
            body = base64.b64decode(body).decode('utf-8')
        
        message = json.loads(body)
        
        # Process MCP message
        result = asyncio.run(process_mcp_message(message))
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
    
    except Exception as e:
        logger.error(f"Error processing MCP message: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'jsonrpc': '2.0',
                'error': {
                    'code': -32603,
                    'message': str(e)
                },
                'id': message.get('id')
            })
        }


async def process_mcp_message(message: Dict[str, Any]) -> Dict[str, Any]:
    """Process an MCP JSON-RPC message."""
    
    method = message.get('method')
    params = message.get('params', {})
    msg_id = message.get('id')
    
    if method == 'tools/list':
        tools = await list_tools()
        return {
            'jsonrpc': '2.0',
            'result': {'tools': [t.model_dump() for t in tools]},
            'id': msg_id
        }
    
    elif method == 'tools/call':
        tool_name = params.get('name')
        arguments = params.get('arguments', {})
        
        result = await call_tool(tool_name, arguments)
        
        return {
            'jsonrpc': '2.0',
            'result': {
                'content': [c.model_dump() for c in result]
            },
            'id': msg_id
        }
    
    elif method == 'initialize':
        return {
            'jsonrpc': '2.0',
            'result': {
                'protocolVersion': '2024-11-05',
                'capabilities': {
                    'tools': {}
                },
                'serverInfo': {
                    'name': 'thanos-compliance',
                    'version': '1.0.0'
                }
            },
            'id': msg_id
        }
    
    else:
        return {
            'jsonrpc': '2.0',
            'error': {
                'code': -32601,
                'message': f'Method not found: {method}'
            },
            'id': msg_id
        }
