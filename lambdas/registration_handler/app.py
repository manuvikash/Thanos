"""
Registration Lambda Handler

Handles customer registration requests by validating input and storing
customer records in DynamoDB.
"""

import json
import os
import boto3
from typing import Dict, Any
from botocore.exceptions import ClientError

# Import from common modules
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'common'))

from common.customer_models import Customer, validate_customer_data
from common.logging import get_logger

logger = get_logger(__name__)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')


def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create API Gateway response with CORS headers.
    
    Args:
        status_code: HTTP status code
        body: Response body dictionary
        
    Returns:
        API Gateway response dictionary
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps(body)
    }


def parse_request_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse and extract request body from API Gateway event.
    
    Args:
        event: API Gateway event
        
    Returns:
        Parsed request body dictionary
        
    Raises:
        ValueError: If body is missing or invalid JSON
    """
    body = event.get('body')
    if not body:
        raise ValueError("Request body is required")
    
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON in request body")


def check_duplicate_tenant(table_name: str, tenant_id: str) -> bool:
    """
    Check if a tenant_id already exists in DynamoDB.
    
    Args:
        table_name: DynamoDB table name
        tenant_id: Tenant identifier to check
        
    Returns:
        True if tenant_id exists, False otherwise
    """
    table = dynamodb.Table(table_name)
    
    try:
        response = table.get_item(Key={'tenant_id': tenant_id})
        return 'Item' in response
    except ClientError as e:
        logger.error(f"Error checking for duplicate tenant_id: {e}")
        raise


def register_customer(table_name: str, customer: Customer) -> None:
    """
    Write customer record to DynamoDB.
    
    Args:
        table_name: DynamoDB table name
        customer: Customer object to store
        
    Raises:
        ClientError: If DynamoDB operation fails
    """
    table = dynamodb.Table(table_name)
    
    try:
        table.put_item(Item=customer.to_dict())
        logger.info(f"Successfully registered customer: {customer.tenant_id}")
    except ClientError as e:
        logger.error(f"Error writing customer to DynamoDB: {e}")
        raise


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for customer registration.
    
    Validates customer data, checks for duplicates, and stores in DynamoDB.
    
    Args:
        event: API Gateway event containing customer registration data
        context: Lambda context object
        
    Returns:
        API Gateway response with status code and body
    """
    # Get table name from environment
    table_name = os.environ.get('CUSTOMERS_TABLE')
    if not table_name:
        logger.error("CUSTOMERS_TABLE environment variable not set")
        return create_response(500, {
            'error': 'Internal server error'
        })
    
    try:
        # Parse request body
        try:
            data = parse_request_body(event)
        except ValueError as e:
            logger.warning(f"Invalid request: {str(e)}")
            return create_response(400, {'error': str(e)})
        
        # Extract required fields
        tenant_id = data.get('tenant_id', '').strip()
        customer_name = data.get('customer_name', '').strip()
        role_arn = data.get('role_arn', '').strip()
        account_id = data.get('account_id', '').strip()
        regions = data.get('regions', [])
        
        # Ensure regions is a list
        if not isinstance(regions, list):
            logger.warning(f"Invalid regions type: {type(regions)}")
            return create_response(400, {
                'error': 'regions must be an array'
            })
        
        # Validate all fields
        validation_error = validate_customer_data(
            tenant_id=tenant_id,
            customer_name=customer_name,
            role_arn=role_arn,
            account_id=account_id,
            regions=regions
        )
        
        if validation_error:
            logger.warning(f"Validation failed: {validation_error}")
            return create_response(400, {'error': validation_error})
        
        # Check for duplicate tenant_id
        if check_duplicate_tenant(table_name, tenant_id):
            logger.warning(f"Duplicate tenant_id attempted: {tenant_id}")
            return create_response(409, {
                'error': f"Customer with tenant_id '{tenant_id}' already exists"
            })
        
        # Create customer object with timestamps
        customer = Customer.create(
            tenant_id=tenant_id,
            customer_name=customer_name,
            role_arn=role_arn,
            account_id=account_id,
            regions=regions
        )
        
        # Register customer in DynamoDB
        register_customer(table_name, customer)
        
        # Log successful registration
        logger.info(f"Customer registered successfully: {tenant_id}")
        
        # Return success response
        return create_response(201, {
            'message': 'Customer registered successfully',
            'customer': customer.to_dict()
        })
        
    except ClientError as e:
        # DynamoDB errors
        logger.error(f"DynamoDB error during registration: {e}")
        return create_response(500, {
            'error': 'Failed to register customer. Please try again.'
        })
    
    except Exception as e:
        # Unexpected errors
        logger.error(f"Unexpected error during registration: {e}")
        return create_response(500, {
            'error': 'An unexpected error occurred. Please try again.'
        })
