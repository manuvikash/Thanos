"""
MCP Server Lambda - Hosted Model Context Protocol server for AI assistants.

This Lambda provides MCP endpoints for AI assistants to query Thanos infrastructure data.
It validates API keys and provides access to findings, resources, and compliance data.
"""

import json
import os
import logging
from typing import Dict, Any, List, Optional
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
mcp_keys_table = dynamodb.Table(os.environ['MCP_KEYS_TABLE'])

# Lambda client for direct invocation
lambda_client = boto3.client('lambda')

# Lambda function names from environment
CUSTOMERS_LAMBDA = os.environ.get('CUSTOMERS_LAMBDA_NAME', '')
FINDINGS_LAMBDA = os.environ.get('FINDINGS_LAMBDA_NAME', '')
RESOURCES_LAMBDA = os.environ.get('RESOURCES_LAMBDA_NAME', '')
METRICS_LAMBDA = os.environ.get('METRICS_LAMBDA_NAME', '')


def invoke_lambda(function_name: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Invoke a Lambda function directly (bypasses API Gateway auth).
    
    Args:
        function_name: Lambda function name
        event: Event payload to send to Lambda
    
    Returns:
        dict: Lambda response payload
    """
    if not function_name:
        raise ValueError(f"Lambda function name not configured")
    
    try:
        logger.info(f"Invoking Lambda: {function_name}")
        
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(event)
        )
        
        # Parse response
        payload = json.loads(response['Payload'].read())
        
        # Check for Lambda errors
        if 'errorMessage' in payload:
            logger.error(f"Lambda error: {payload.get('errorMessage')}")
            raise Exception(f"Lambda error: {payload.get('errorMessage')}")
        
        # Parse the body from API Gateway Lambda proxy response
        if 'statusCode' in payload:
            if payload['statusCode'] >= 400:
                error_body = json.loads(payload.get('body', '{}'))
                logger.error(f"Lambda returned error: {payload['statusCode']} - {error_body}")
                raise Exception(f"Lambda error: {payload['statusCode']}")
            
            # Return parsed body
            return json.loads(payload.get('body', '{}'))
        
        # Direct Lambda response (not API Gateway proxy)
        return payload
        
    except Exception as e:
        logger.error(f"Error invoking Lambda {function_name}: {e}", exc_info=True)
        raise


def validate_api_key(api_key: str) -> Optional[Dict[str, Any]]:
    """
    Validate an API key and return the associated user info.
    Keys are stored with api_key as the primary key in DynamoDB.
    """
    if not api_key:
        return None
    
    try:
        # Look up by api_key directly (stored as primary key in DynamoDB)
        response = mcp_keys_table.get_item(Key={'api_key': api_key})
        
        if 'Item' not in response:
            logger.warning(f"API key not found: {api_key[:20]}...")
            return None
        
        key_data = response['Item']
        
        # Check if key is active
        if key_data.get('status') != 'active':
            logger.warning(f"API key is not active: {api_key[:20]}...")
            return None
        
        # Check expiration
        expires_at = key_data.get('expires_at', 0)
        if expires_at and expires_at < int(datetime.now().timestamp()):
            logger.warning(f"API key expired: {api_key[:20]}...")
            return None
        
        # Update last_used timestamp
        mcp_keys_table.update_item(
            Key={'api_key': api_key},
            UpdateExpression='SET last_used = :now',
            ExpressionAttributeValues={':now': int(datetime.now().timestamp())}
        )
        
        return key_data
        
    except Exception as e:
        logger.error(f"Error validating API key: {e}", exc_info=True)
        return None


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for MCP server.
    
    Supports both Lambda Function URL and API Gateway v2 event formats.
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get request details
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod', 'GET')
        path = event.get('rawPath') or event.get('path', '/')
        
        # Handle OPTIONS for CORS
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'x-api-key, content-type, authorization',
                    'Access-Control-Max-Age': '86400'
                },
                'body': ''
            }
        
        # Normalize path (remove trailing slash, handle /mcp prefix)
        # API Gateway passes full path including /mcp
        original_path = path
        if path.startswith('/mcp'):
            path = path[4:]  # Remove /mcp prefix
        if not path or path == '/':
            path = '/'
        else:
            path = path.rstrip('/')
        
        logger.info(f"Processing request: {http_method} {original_path} -> {path}")
        
        # Extract API key from headers (normalize header names)
        headers = event.get('headers', {}) or {}
        # API Gateway v2 lowercases header names, Lambda Function URL might not
        api_key = (headers.get('x-api-key') or headers.get('X-Api-Key') or 
                  headers.get('X-API-Key'))
        
        # ALL requests require API key for security
        # MCP clients should include the API key in the initial handshake
        if not api_key:
            logger.warning("Request missing x-api-key header")
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'jsonrpc': '2.0',
                    'error': {
                        'code': -32000,
                        'message': 'Missing x-api-key header'
                    },
                    'id': None
                })
            }
        
        # Validate API key
        key_data = validate_api_key(api_key)
        if not key_data:
            logger.warning(f"Invalid API key: {api_key[:20]}...")
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'jsonrpc': '2.0',
                    'error': {
                        'code': -32000,
                        'message': 'Invalid or inactive API key'
                    },
                    'id': None
                })
            }
        
        logger.info(f"Authenticated request from {key_data.get('user_email')}: {http_method} {path}")
        
        # Route to appropriate handler (all require authentication now)
        if path == '/initialize' or path == '/init' or path.endswith('/initialize') or path.endswith('/init'):
            return handle_initialize(event, key_data)
        elif path == '/register' or path.endswith('/register'):
            return handle_register(event, key_data)
        elif path == '/messages' or path.endswith('/messages'):
            return handle_message(event, key_data)
        elif path == '/sse' or path.endswith('/sse'):
            return handle_sse_stream(event, key_data)
        elif http_method == 'POST':
            # Default POST handler for MCP messages
            return handle_message(event, key_data)
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'jsonrpc': '2.0',
                    'error': {
                        'code': -32601,
                        'message': 'Endpoint not found'
                    },
                    'id': None
                })
            }
            
    except Exception as e:
        logger.error(f"Error in lambda_handler: {e}", exc_info=True)
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
                    'message': f'Internal server error: {str(e)}'
                },
                'id': None
            })
        }


def handle_initialize(event: Dict[str, Any], key_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle MCP initialize request (path-based).
    Returns server capabilities and metadata.
    Works with or without key_data (for registration).
    """
    response = {
        'protocolVersion': '2024-11-05',
        'capabilities': {
            'tools': {
                'listChanged': True
            },
            'resources': {
                'subscribe': True,
                'listChanged': True
            }
        },
        'serverInfo': {
            'name': 'thanos-mcp-server',
            'version': '1.0.0',
            'description': 'Thanos Cloud Compliance Platform MCP Server'
        },
        'instructions': 'Use this server to query cloud infrastructure compliance data, findings, and resources.'
    }
    
    # If key_data is provided, add user info
    if key_data and key_data.get('user_email'):
        response['user'] = key_data.get('user_email')
    
    logger.info("Initialize request handled successfully")
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'x-api-key, content-type, authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps(response)
    }


def handle_initialize_jsonrpc(params: Dict[str, Any], msg_id: Any) -> Dict[str, Any]:
    """
    Handle MCP initialize request (JSON-RPC format).
    Returns server capabilities and metadata in JSON-RPC 2.0 format.
    """
    result = {
        'protocolVersion': '2024-11-05',
        'capabilities': {
            'tools': {
                'listChanged': True
            },
            'resources': {
                'subscribe': True,
                'listChanged': True
            }
        },
        'serverInfo': {
            'name': 'thanos-mcp-server',
            'version': '1.0.0',
            'description': 'Thanos Cloud Compliance Platform MCP Server'
        },
        'instructions': 'Use this server to query cloud infrastructure compliance data, findings, and resources.'
    }
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'jsonrpc': '2.0',
            'result': result,
            'id': msg_id
        })
    }


def handle_register(event: Dict[str, Any], key_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle MCP client registration.
    Some MCP clients (like Codeium/Windsurf) require a registration endpoint.
    """
    try:
        # Parse request body if present
        body = {}
        if event.get('body'):
            body_str = event.get('body', '{}')
            if isinstance(body_str, str):
                try:
                    body = json.loads(body_str)
                except json.JSONDecodeError:
                    pass
            
            # Handle base64 encoded body
            if event.get('isBase64Encoded') and isinstance(body_str, str):
                import base64
                try:
                    body = json.loads(base64.b64decode(body_str).decode('utf-8'))
                except:
                    pass
        
        # Registration response - return server info and capabilities
        # Some clients expect JSON-RPC format, others expect plain JSON
        result = {
            'status': 'registered',
            'registered': True,
            'serverInfo': {
                'name': 'thanos-mcp-server',
                'version': '1.0.0',
                'description': 'Thanos Cloud Compliance Platform MCP Server'
            },
            'capabilities': {
                'tools': {
                    'listChanged': True
                },
                'resources': {
                    'subscribe': True,
                    'listChanged': True
                }
            },
            'protocolVersion': '2024-11-05'
        }
        
        logger.info(f"Client registration successful")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'x-api-key, content-type, authorization',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps(result)
        }
    except Exception as e:
        logger.error(f"Error handling registration: {e}", exc_info=True)
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'x-api-key, content-type'
            },
            'body': json.dumps({
                'jsonrpc': '2.0',
                'error': {
                    'code': -32603,
                    'message': f'Registration error: {str(e)}'
                },
                'id': None
            })
        }


def handle_message(event: Dict[str, Any], key_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle MCP message request (tool calls, resource queries).
    Supports JSON-RPC 2.0 protocol.
    """
    try:
        # Parse request body
        body = event.get('body', '{}')
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                # Try base64 decoding first
                if event.get('isBase64Encoded'):
                    import base64
                    body = json.loads(base64.b64decode(body).decode('utf-8'))
                else:
                    raise
        
        # Handle base64 encoded body (API Gateway)
        if event.get('isBase64Encoded') and isinstance(body, str):
            import base64
            body = json.loads(base64.b64decode(body).decode('utf-8'))
        
        method = body.get('method')
        params = body.get('params', {})
        msg_id = body.get('id')
        
        logger.info(f"Handling method: {method}, id: {msg_id}")
        
        # Route to appropriate method handler
        if method == 'initialize':
            return handle_initialize_jsonrpc(params, msg_id)
        elif method == 'tools/list':
            return handle_tools_list_jsonrpc(msg_id)
        elif method == 'tools/call':
            return handle_tool_call_jsonrpc(params, key_data, msg_id)
        elif method == 'resources/list':
            return handle_resources_list_jsonrpc(msg_id)
        elif method == 'resources/read':
            return handle_resource_read_jsonrpc(params, key_data, msg_id)
        else:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'jsonrpc': '2.0',
                    'error': {
                        'code': -32601,
                        'message': f'Method not found: {method}'
                    },
                    'id': msg_id
                })
            }
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'jsonrpc': '2.0',
                'error': {
                    'code': -32700,
                    'message': 'Parse error'
                },
                'id': None
            })
        }
    except Exception as e:
        logger.error(f"Error handling message: {e}", exc_info=True)
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'jsonrpc': '2.0',
                'error': {
                    'code': -32603,
                    'message': f'Internal error: {str(e)}'
                },
                'id': body.get('id')
            })
        }


def handle_tools_list() -> Dict[str, Any]:
    """
    Return list of available MCP tools (legacy format).
    """
    tools = get_mcp_tools()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'tools': tools})
    }


def handle_tools_list_jsonrpc(msg_id: Any) -> Dict[str, Any]:
    """
    Return list of available MCP tools (JSON-RPC format).
    """
    tools = get_mcp_tools()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'jsonrpc': '2.0',
            'result': {'tools': tools},
            'id': msg_id
        })
    }


def get_mcp_tools() -> List[Dict[str, Any]]:
    """
    Get the list of available MCP tools.
    """
    return [
        {
            'name': 'list_customers',
            'description': 'List all registered customers/tenants. ALWAYS call this first to get available tenant_id values before calling other tools that require tenant_id.',
            'inputSchema': {
                'type': 'object',
                'properties': {},
                'required': []
            }
        },
        {
            'name': 'get_findings',
            'description': 'Get security and compliance findings for a specific customer. Returns violations, misconfigurations, and security issues found in their cloud infrastructure. Call list_customers first to get valid tenant_id values.',
            'inputSchema': {
                'type': 'object',
                'properties': {
                    'tenant_id': {
                        'type': 'string',
                        'description': 'Customer/tenant identifier (required). Get this from list_customers tool first.'
                    },
                    'severity': {
                        'type': 'string',
                        'enum': ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                        'description': 'Filter by severity level (optional)'
                    },
                    'resource_type': {
                        'type': 'string',
                        'description': 'Filter by AWS resource type like AWS::S3::Bucket (optional)'
                    },
                    'limit': {
                        'type': 'number',
                        'description': 'Maximum number of findings to return (default: 50)'
                    }
                },
                'required': ['tenant_id']
            }
        },
        {
            'name': 'get_resources',
            'description': 'Get cloud resources and their compliance status for a specific customer. Shows all AWS resources being monitored with their compliance state. Call list_customers first to get valid tenant_id values.',
            'inputSchema': {
                'type': 'object',
                'properties': {
                    'tenant_id': {
                        'type': 'string',
                        'description': 'Customer/tenant identifier (required). Get this from list_customers tool first.'
                    },
                    'resource_type': {
                        'type': 'string',
                        'description': 'Filter by AWS resource type like AWS::EC2::Instance, AWS::S3::Bucket (optional)'
                    },
                    'region': {
                        'type': 'string',
                        'description': 'Filter by AWS region like us-east-1, us-west-2 (optional)'
                    },
                    'limit': {
                        'type': 'number',
                        'description': 'Maximum number of resources to return (default: 100)'
                    }
                },
                'required': ['tenant_id']
            }
        },
        {
            'name': 'get_metrics',
            'description': 'Get compliance metrics and dashboard statistics for a specific customer. Shows overall compliance rate, findings by severity, and trends. Call list_customers first to get valid tenant_id values.',
            'inputSchema': {
                'type': 'object',
                'properties': {
                    'tenant_id': {
                        'type': 'string',
                        'description': 'Customer/tenant identifier (required). Get this from list_customers tool first.'
                    }
                },
                'required': ['tenant_id']
            }
        }
    ]


def handle_tool_call(params: Dict[str, Any], key_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an MCP tool call (legacy format).
    """
    tool_name = params.get('name')
    arguments = params.get('arguments', {})
    
    logger.info(f"Calling tool: {tool_name} with args: {arguments}")
    
    # Placeholder - would integrate with actual Thanos API
    result = {
        'content': [
            {
                'type': 'text',
                'text': f"Tool {tool_name} executed successfully. This is a placeholder response. Integration with Thanos API pending."
            }
        ]
    }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(result)
    }


def handle_tool_call_jsonrpc(params: Dict[str, Any], key_data: Dict[str, Any], msg_id: Any) -> Dict[str, Any]:
    """
    Execute an MCP tool call (JSON-RPC format).
    """
    tool_name = params.get('name')
    arguments = params.get('arguments', {})
    user_email = key_data.get('user_email', 'unknown')
    
    logger.info(f"Calling tool: {tool_name} with args: {arguments} for user: {user_email}")
    
    try:
        # Route to appropriate tool handler
        if tool_name == 'list_customers':
            result = execute_list_customers(arguments)
        elif tool_name == 'get_findings':
            result = execute_get_findings(arguments)
        elif tool_name == 'get_resources':
            result = execute_get_resources(arguments)
        elif tool_name == 'get_metrics':
            result = execute_get_metrics(arguments)
        else:
            result = {
                'content': [
                    {
                        'type': 'text',
                        'text': f"Unknown tool: {tool_name}. Available tools: list_customers, get_findings, get_resources, get_metrics"
                    }
                ]
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'jsonrpc': '2.0',
                'result': result,
                'id': msg_id
            })
        }
        
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'jsonrpc': '2.0',
                'error': {
                    'code': -32603,
                    'message': f"Tool execution error: {str(e)}"
                },
                'id': msg_id
            })
        }


def execute_list_customers(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the list_customers tool."""
    try:
        # Invoke customers Lambda directly
        event = {
            'httpMethod': 'GET',
            'path': '/customers',
            'queryStringParameters': None
        }
        response = invoke_lambda(CUSTOMERS_LAMBDA, event)
        customers = response.get('customers', [])
        
        if not customers:
            text = "No customers registered yet. Register a customer first to start monitoring their infrastructure."
        else:
            lines = ["# Registered Customers", ""]
            lines.append(f"**Total Customers:** {len(customers)}")
            lines.append("")
            
            for customer in customers:
                lines.append(f"## {customer.get('customer_name', 'Unknown')}")
                lines.append(f"- **Tenant ID:** `{customer.get('tenant_id', 'N/A')}` ← Use this ID for other tools")
                lines.append(f"- **AWS Account:** {customer.get('account_id', 'N/A')}")
                lines.append(f"- **Regions:** {', '.join(customer.get('regions', []))}")
                lines.append(f"- **Status:** {customer.get('status', 'unknown')}")
                lines.append("")
            
            lines.append("---")
            lines.append("**Next Steps:**")
            lines.append("- Use the `tenant_id` values above with other tools")
            lines.append("- Example: `get_findings` with tenant_id=\"demo-customer\"")
            lines.append("- Example: `get_metrics` with tenant_id=\"prod-customer\"")
            
            text = "\n".join(lines)
        
        return {
            'content': [
                {
                    'type': 'text',
                    'text': text
                }
            ]
        }
    except Exception as e:
        return {
            'content': [
                {
                    'type': 'text',
                    'text': f"Error fetching customers: {str(e)}"
                }
            ]
        }


def execute_get_findings(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the get_findings tool."""
    tenant_id = arguments.get('tenant_id')
    if not tenant_id:
        return {
            'content': [
                {
                    'type': 'text',
                    'text': 'Error: tenant_id is required. Call list_customers first to get available tenant IDs, then use one of those IDs with this tool.'
                }
            ]
        }
    
    # Build query parameters
    params = {'tenant_id': tenant_id}
    if arguments.get('severity'):
        params['severity'] = arguments['severity']
    if arguments.get('resource_type'):
        params['resource_type'] = arguments['resource_type']
    if arguments.get('limit'):
        params['limit'] = arguments['limit']
    else:
        params['limit'] = 50
    
    # Invoke findings Lambda directly
    try:
        event = {
            'httpMethod': 'GET',
            'path': '/findings',
            'queryStringParameters': params
        }
        response = invoke_lambda(FINDINGS_LAMBDA, event)
        findings = response.get('items', [])
        
        # Format response
        if not findings:
            text = f"No findings found for tenant: {tenant_id}"
        else:
            lines = [f"# Security Findings for {tenant_id}", ""]
            lines.append(f"**Total Findings:** {len(findings)}")
            lines.append("")
            
            # Group by severity
            by_severity = {}
            for f in findings:
                sev = f.get('severity', 'UNKNOWN')
                by_severity.setdefault(sev, []).append(f)
            
            for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                findings_list = by_severity.get(severity, [])
                if findings_list:
                    lines.append(f"## {severity} ({len(findings_list)})")
                    for f in findings_list[:10]:  # Limit to 10 per severity
                        lines.append(f"- **{f.get('message', 'No message')}**")
                        lines.append(f"  - Resource: `{f.get('resource_arn', 'N/A')}`")
                        lines.append(f"  - Type: {f.get('resource_type', 'N/A')}")
                        lines.append("")
            
            text = "\n".join(lines)
        
        return {
            'content': [
                {
                    'type': 'text',
                    'text': text
                }
            ]
        }
    except Exception as e:
        return {
            'content': [
                {
                    'type': 'text',
                    'text': f"Error fetching findings: {str(e)}"
                }
            ]
        }


def execute_get_resources(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the get_resources tool."""
    tenant_id = arguments.get('tenant_id')
    if not tenant_id:
        return {
            'content': [
                {
                    'type': 'text',
                    'text': 'Error: tenant_id is required. Call list_customers first to get available tenant IDs, then use one of those IDs with this tool.'
                }
            ]
        }
    
    # Build query parameters
    params = {'tenant_id': tenant_id}
    if arguments.get('resource_type'):
        params['resource_type'] = arguments['resource_type']
    if arguments.get('region'):
        params['region'] = arguments['region']
    if arguments.get('limit'):
        params['limit'] = arguments['limit']
    else:
        params['limit'] = 100
    
    # Invoke resources Lambda directly
    try:
        event = {
            'httpMethod': 'GET',
            'path': '/resources',
            'queryStringParameters': params
        }
        response = invoke_lambda(RESOURCES_LAMBDA, event)
        resources = response.get('resources', [])
        totals = response.get('totals', {})
        
        # Format response
        lines = [f"# Resources for {tenant_id}", ""]
        lines.append(f"**Total Resources:** {totals.get('total_resources', 0)}")
        lines.append("")
        
        # Compliance breakdown
        compliance_totals = totals.get('by_compliance', {})
        if compliance_totals:
            lines.append("## Compliance Status")
            for status, count in compliance_totals.items():
                lines.append(f"- **{status}:** {count}")
            lines.append("")
        
        # Type breakdown
        type_totals = totals.get('by_type', {})
        if type_totals:
            lines.append("## By Resource Type")
            for rtype, count in sorted(type_totals.items(), key=lambda x: x[1], reverse=True)[:10]:
                lines.append(f"- {rtype}: {count}")
            lines.append("")
        
        text = "\n".join(lines)
        
        return {
            'content': [
                {
                    'type': 'text',
                    'text': text
                }
            ]
        }
    except Exception as e:
        return {
            'content': [
                {
                    'type': 'text',
                    'text': f"Error fetching resources: {str(e)}"
                }
            ]
        }


def execute_get_metrics(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the get_metrics tool."""
    tenant_id = arguments.get('tenant_id')
    if not tenant_id:
        return {
            'content': [
                {
                    'type': 'text',
                    'text': 'Error: tenant_id is required. Call list_customers first to get available tenant IDs, then use one of those IDs with this tool.'
                }
            ]
        }
    
    # Invoke metrics Lambda directly
    try:
        event = {
            'httpMethod': 'GET',
            'path': '/findings/metrics',
            'queryStringParameters': {'tenant_id': tenant_id}
        }
        response = invoke_lambda(METRICS_LAMBDA, event)
        
        # Format response
        lines = [f"# Dashboard Metrics for {tenant_id}", ""]
        
        current = response.get('current_scan', {})
        if current:
            lines.append("## Current Scan")
            lines.append(f"- **Resources Scanned:** {current.get('total_resources', 0)}")
            lines.append(f"- **Findings:** {current.get('total_findings', 0)}")
            lines.append(f"- **Compliance Rate:** {current.get('compliance_percentage', 0):.1f}%")
            
            by_severity = current.get('by_severity', {})
            if by_severity:
                lines.append(f"- **By Severity:**")
                for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                    if sev in by_severity:
                        lines.append(f"  - {sev}: {by_severity[sev]}")
            lines.append("")
        
        text = "\n".join(lines)
        
        return {
            'content': [
                {
                    'type': 'text',
                    'text': text
                }
            ]
        }
    except Exception as e:
        return {
            'content': [
                {
                    'type': 'text',
                    'text': f"Error fetching metrics: {str(e)}"
                }
            ]
        }


def handle_resources_list() -> Dict[str, Any]:
    """
    Return list of available MCP resources (legacy format).
    """
    resources = get_mcp_resources()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'resources': resources})
    }


def handle_resources_list_jsonrpc(msg_id: Any) -> Dict[str, Any]:
    """
    Return list of available MCP resources (JSON-RPC format).
    """
    resources = get_mcp_resources()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'jsonrpc': '2.0',
            'result': {'resources': resources},
            'id': msg_id
        })
    }


def get_mcp_resources() -> List[Dict[str, Any]]:
    """
    Get the list of available MCP resources.
    """
    return [
        {
            'uri': 'thanos://findings/active',
            'name': 'Active Findings',
            'description': 'Currently active security and compliance findings',
            'mimeType': 'application/json'
        },
        {
            'uri': 'thanos://resources/inventory',
            'name': 'Resource Inventory',
            'description': 'Complete inventory of cloud resources',
            'mimeType': 'application/json'
        }
    ]


def handle_resource_read(params: Dict[str, Any], key_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Read an MCP resource (legacy format).
    """
    uri = params.get('uri')
    
    logger.info(f"Reading resource: {uri}")
    
    # Placeholder response
    content = {
        'uri': uri,
        'mimeType': 'application/json',
        'text': json.dumps({'message': 'Resource read placeholder. Integration pending.'})
    }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'contents': [content]})
    }


def handle_resource_read_jsonrpc(params: Dict[str, Any], key_data: Dict[str, Any], msg_id: Any) -> Dict[str, Any]:
    """
    Read an MCP resource (JSON-RPC format).
    """
    uri = params.get('uri')
    
    logger.info(f"Reading resource: {uri}")
    
    # Placeholder response
    content = {
        'uri': uri,
        'mimeType': 'application/json',
        'text': json.dumps({'message': 'Resource read placeholder. Integration pending.'})
    }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'jsonrpc': '2.0',
            'result': {'contents': [content]},
            'id': msg_id
        })
    }


def handle_sse_stream(event: Dict[str, Any], key_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle Server-Sent Events stream for notifications.
    Lambda doesn't support true streaming, but we can return an initial connection event.
    """
    # Return initial SSE connection event
    sse_body = "event: connected\n"
    sse_body += f"data: {json.dumps({'status': 'connected', 'server': 'thanos-mcp-server'})}\n\n"
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'x-api-key'
        },
        'body': sse_body,
        'isBase64Encoded': False
    }
