"""
Lambda handler for public configuration.
Returns non-sensitive configuration needed by the frontend.
"""
import json
import os
from typing import Dict, Any
import boto3

def get_cors_headers() -> Dict[str, str]:
    """Get CORS headers for responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-api-key',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

def response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create a response with CORS headers."""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(),
        'body': json.dumps(body)
    }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle public configuration requests.
    GET /config/public
    """
    try:
        # Get configuration from environment variables
        trusted_account_id = os.environ.get('TRUSTED_ACCOUNT_ID', '')
        template_url = os.environ.get('CLOUDFORMATION_TEMPLATE_URL', '')
        
        # If trusted account ID is not set, try to get it from current identity
        if not trusted_account_id:
            try:
                sts = boto3.client('sts')
                trusted_account_id = sts.get_caller_identity()['Account']
            except Exception as e:
                print(f"Error getting account ID: {e}")
        
        return response(200, {
            'trusted_account_id': trusted_account_id,
            'cloudformation_template_url': template_url
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return response(500, {'error': str(e)})
