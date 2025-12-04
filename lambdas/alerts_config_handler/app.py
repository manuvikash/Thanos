"""
Alerts Configuration Handler
Manages alert configuration settings for SNS notifications.
"""
import json
import os
import logging
from typing import Dict, Any
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')

ALERT_CONFIGS_TABLE = os.environ.get('ALERT_CONFIGS_TABLE', '')
SNS_TOPIC_ARN = os.environ.get('ALERTS_TOPIC_ARN', '')


def decimal_default(obj):
    """JSON serializer for Decimal objects."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def get_cors_headers():
    """Get CORS headers for responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-api-key',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS'
    }


def response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create API Gateway response."""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(),
        'body': json.dumps(body, default=decimal_default)
    }


def get_default_config() -> Dict[str, Any]:
    """Return default alert configuration."""
    return {
        'enabled': True,
        'severity_levels': ['CRITICAL', 'HIGH'],
        'email_addresses': [],
        'sns_topic_arn': SNS_TOPIC_ARN,
        'updated_at': None,
        'updated_by': None
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle alert configuration API requests.
    
    Routes:
        GET /alerts/config     - Get current configuration
        PUT /alerts/config     - Update configuration
        OPTIONS /alerts/config - CORS preflight
    """
    try:
        http_method = (
            event.get('requestContext', {}).get('http', {}).get('method') or
            event.get('requestContext', {}).get('httpMethod') or
            event.get('httpMethod')
        )
        
        logger.info(f"Processing {http_method} request")
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return response(200, {})
        
        # Get user email from authorizer
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        jwt_claims = authorizer.get('jwt', {}).get('claims', {}) if 'jwt' in authorizer else authorizer.get('claims', {})
        user_email = jwt_claims.get('email')
        
        if http_method == 'GET':
            return get_alert_config()
        
        elif http_method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return update_alert_config(body, user_email)
        
        else:
            return response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return response(500, {'error': str(e)})


def get_alert_config() -> Dict[str, Any]:
    """Retrieve current alert configuration."""
    try:
        if not ALERT_CONFIGS_TABLE:
            return response(500, {'error': 'Alert configs table not configured'})
        
        table = dynamodb.Table(ALERT_CONFIGS_TABLE)
        
        result = table.get_item(
            Key={
                'PK': 'CONFIG#global',
                'SK': 'v1'
            }
        )
        
        if 'Item' in result:
            config = result['Item']
            # Remove DynamoDB keys from response
            config.pop('PK', None)
            config.pop('SK', None)
            logger.info("Retrieved alert configuration")
            return response(200, config)
        else:
            # Return default config if none exists
            logger.info("No config found, returning defaults")
            return response(200, get_default_config())
    
    except ClientError as e:
        logger.error(f"DynamoDB error: {e}")
        return response(500, {'error': 'Failed to retrieve configuration'})


def update_alert_config(config: Dict[str, Any], user_email: str) -> Dict[str, Any]:
    """Update alert configuration."""
    try:
        if not ALERT_CONFIGS_TABLE:
            return response(500, {'error': 'Alert configs table not configured'})
        
        # Validate input
        if 'enabled' not in config:
            return response(400, {'error': 'enabled field is required'})
        
        if not isinstance(config.get('severity_levels', []), list):
            return response(400, {'error': 'severity_levels must be an array'})
        
        if not isinstance(config.get('email_addresses', []), list):
            return response(400, {'error': 'email_addresses must be an array'})
        
        # Validate severity levels
        valid_severities = {'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'}
        for severity in config.get('severity_levels', []):
            if severity not in valid_severities:
                return response(400, {'error': f'Invalid severity level: {severity}'})
        
        table = dynamodb.Table(ALERT_CONFIGS_TABLE)
        
        from datetime import datetime
        
        # Prepare item for storage
        item = {
            'PK': 'CONFIG#global',
            'SK': 'v1',
            'enabled': bool(config['enabled']),
            'severity_levels': config.get('severity_levels', ['CRITICAL', 'HIGH']),
            'email_addresses': config.get('email_addresses', []),
            'sns_topic_arn': SNS_TOPIC_ARN,
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            'updated_by': user_email or 'unknown'
        }
        
        # Store in DynamoDB
        table.put_item(Item=item)
        
        logger.info(f"Updated alert configuration by {user_email}")
        
        # Return updated config (without PK/SK)
        response_item = {k: v for k, v in item.items() if k not in ['PK', 'SK']}
        
        return response(200, response_item)
    
    except ClientError as e:
        logger.error(f"DynamoDB error: {e}")
        return response(500, {'error': 'Failed to update configuration'})
    except Exception as e:
        logger.error(f"Error updating config: {e}", exc_info=True)
        return response(500, {'error': str(e)})
