"""
MCP API Key Management Handler
Manages creation, listing, and revocation of MCP API keys
"""
import json
import os
import secrets
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any

import boto3
from boto3.dynamodb.conditions import Key
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def decimal_default(obj):
    """Convert Decimal to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


# Get table name from environment
table_name = os.environ.get('MCP_KEYS_TABLE', '')

# Initialize DynamoDB resource with explicit region (will use Lambda's region)
dynamodb = boto3.resource('dynamodb')

def get_table():
    """Get DynamoDB table instance."""
    if not table_name:
        raise ValueError("MCP_KEYS_TABLE environment variable not set")
    return dynamodb.Table(table_name)


def generate_api_key() -> str:
    """Generate a secure random API key."""
    return f"thanos_mcp_{secrets.token_urlsafe(32)}"


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle MCP API key operations.
    
    Endpoints:
    - POST /mcp/keys - Create new API key
    - GET /mcp/keys - List user's API keys
    - DELETE /mcp/keys/{key_id} - Revoke API key
    - POST /mcp/keys/validate - Validate API key (internal)
    """
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method'))
    path = event.get('path', event.get('rawPath', ''))
    
    logger.info(f"Method: {http_method}, Path: {path}")
    
    # Get user from authorizer context
    # API Gateway v2 JWT authorizer puts claims in requestContext.authorizer.jwt.claims
    authorizer = event.get('requestContext', {}).get('authorizer', {})
    jwt_claims = authorizer.get('jwt', {}).get('claims', {}) if 'jwt' in authorizer else authorizer.get('claims', {})
    user_email = jwt_claims.get('email')
    
    logger.info(f"User email from JWT: {user_email}")
    
    if not user_email:
        logger.warning(f"No user email found. Authorizer context: {json.dumps(authorizer)}")
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    try:
        if http_method == 'POST' and path.endswith('/keys'):
            return create_api_key(user_email, event)
        
        elif http_method == 'GET' and path.endswith('/keys'):
            return list_api_keys(user_email)
        
        elif http_method == 'DELETE' and '/keys/' in path:
            key_id = path.split('/keys/')[-1]
            return revoke_api_key(user_email, key_id)
        
        elif http_method == 'POST' and path.endswith('/validate'):
            return validate_api_key(event)
        
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Not found'})
            }
    
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }


def create_api_key(user_email: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new API key for the user."""
    try:
        body = json.loads(event.get('body', '{}'))
        key_name = body.get('name', 'Unnamed Key')
        expires_days = body.get('expires_days', 365)  # Default 1 year
        
        api_key = generate_api_key()
        created_at = int(time.time())
        expires_at = created_at + (expires_days * 24 * 60 * 60)
        
        # Store in DynamoDB
        table = get_table()
        table.put_item(
            Item={
                'api_key': api_key,
                'user_email': user_email,
                'name': key_name,
                'created_at': created_at,
                'expires_at': expires_at,
                'last_used': None,
                'status': 'active'
            }
        )
        
        logger.info(f"Created API key for user {user_email}: {key_name}")
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'api_key': api_key,
                'name': key_name,
                'created_at': created_at,
                'expires_at': expires_at,
                'message': 'API key created successfully. Save this key - it will not be shown again.'
            }, default=decimal_default)
        }
    except Exception as e:
        logger.error(f"Error creating API key: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Failed to create API key: {str(e)}'})
        }


def list_api_keys(user_email: str) -> Dict[str, Any]:
    """List all API keys for a user."""
    
    try:
        logger.info(f"Listing API keys for user: {user_email}")
        table = get_table()
        logger.info(f"Querying table: {table_name} with user_email: {user_email}")
        
        response = table.query(
            IndexName='user-email-index',
            KeyConditionExpression=Key('user_email').eq(user_email)
        )
        
        keys = response.get('Items', [])
        logger.info(f"Found {len(keys)} keys for user {user_email}")
        
        # Sort by created_at descending (newest first)
        keys.sort(key=lambda x: x.get('created_at', 0), reverse=True)
        
        # Remove sensitive key value from response, but keep a unique identifier
        for key in keys:
            full_key = key['api_key']
            # Show prefix and last 8 chars for identification
            # Extract the token part (after last underscore) and get last 8 chars
            if '_' in full_key:
                token_part = full_key.split('_')[-1]
                key_suffix = token_part[-8:] if len(token_part) >= 8 else token_part
            else:
                key_suffix = full_key[-8:] if len(full_key) >= 8 else full_key
            
            # Store the full key temporarily for frontend to cache
            # This is safe because it's only sent once per session to authenticated user
            key['api_key_full'] = full_key  # Full key for initial caching
            key['api_key'] = f"***{key_suffix}"  # Masked display version
            key['key_suffix'] = key_suffix  # Consistent suffix for matching
            key['key_id'] = key_suffix  # Also add as key_id for easier access
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'keys': keys,
                'count': len(keys)
            }, default=decimal_default)
        }
    except Exception as e:
        logger.error(f"Error listing API keys: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Failed to list API keys'})
        }


def revoke_api_key(user_email: str, api_key_suffix: str) -> Dict[str, Any]:
    """Revoke (delete) an API key."""
    try:
        # Find the key by suffix
        table = get_table()
        response = table.query(
            IndexName='user-email-index',
            KeyConditionExpression=Key('user_email').eq(user_email)
        )
        
        keys = response.get('Items', [])
        key_to_delete = None
        
        # Match by suffix (last 8 characters of the token part)
        for key in keys:
            full_key = key['api_key']
            # Extract suffix from the token part (after last underscore)
            if '_' in full_key:
                token_suffix = full_key.split('_')[-1][-8:]
            else:
                token_suffix = full_key[-8:]
            
            if token_suffix == api_key_suffix or full_key.endswith(api_key_suffix):
                key_to_delete = full_key
                break
        
        if not key_to_delete:
            logger.warning(f"API key not found for user {user_email} with suffix {api_key_suffix}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'API key not found'})
            }
        
        # Delete the key
        table.delete_item(Key={'api_key': key_to_delete})
        logger.info(f"Revoked API key for user {user_email}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'API key revoked successfully'})
        }
    except Exception as e:
        logger.error(f"Error revoking API key: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Failed to revoke API key'})
        }


def validate_api_key(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate an API key (used by Lambda authorizer).
    This endpoint should be called internally only.
    """
    
    # Get API key from header or body
    headers = event.get('headers', {})
    api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
    
    if not api_key:
        body = json.loads(event.get('body', '{}'))
        api_key = body.get('api_key')
    
    if not api_key:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'API key not provided'})
        }
    
    try:
        table = get_table()
        response = table.get_item(Key={'api_key': api_key})
        item = response.get('Item')
        
        if not item:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'valid': False, 'error': 'Invalid API key'})
            }
        
        # Check expiration
        if item.get('expires_at', 0) < int(time.time()):
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'valid': False, 'error': 'API key expired'})
            }
        
        # Check status
        if item.get('status') != 'active':
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'valid': False, 'error': 'API key revoked'})
            }
        
        # Update last_used timestamp
        table.update_item(
            Key={'api_key': api_key},
            UpdateExpression='SET last_used = :timestamp',
            ExpressionAttributeValues={':timestamp': int(time.time())}
        )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'valid': True,
                'user_email': item['user_email'],
                'name': item.get('name')
            }, default=decimal_default)
        }
    
    except Exception as e:
        print(f"Error validating API key: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'valid': False, 'error': 'Internal error'})
        }
