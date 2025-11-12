"""
Simple API key authorizer for API Gateway.
"""
import os


def lambda_handler(event, context):
    """
    Validate API key from x-api-key header.
    """
    expected_key = os.environ.get("API_KEY", "")
    
    # Extract API key from headers
    headers = event.get("headers", {})
    provided_key = headers.get("x-api-key", "")
    
    # Simple comparison
    is_authorized = provided_key == expected_key and expected_key != ""
    
    return {
        "isAuthorized": is_authorized
    }
