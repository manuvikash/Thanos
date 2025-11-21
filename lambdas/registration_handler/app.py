"""
Registration Lambda Handler

Handles customer registration requests by validating input and storing
customer records in DynamoDB.
"""

import json
import os
import boto3
import re
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from datetime import datetime

# Import from common modules
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'common'))

from common.customer_models import Customer, validate_customer_data
from common.logging import get_logger

logger = get_logger(__name__)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sts_client = boto3.client('sts')
cloudformation_client = boto3.client('cloudformation')


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


def verify_cloudformation_stack(account_id: str, region: str, role_arn: str) -> bool:
    """
    Verify that the CloudFormation stack exists in the customer's account.
    
    Args:
        account_id: AWS account ID
        region: AWS region
        role_arn: IAM role ARN to assume
        
    Returns:
        True if stack exists and is in CREATE_COMPLETE state, False otherwise
    """
    try:
        # Assume role in customer account
        assumed_role = sts_client.assume_role(
            RoleArn=role_arn,
            RoleSessionName='CloudGoldenGuardVerification',
            ExternalId='cloud-golden-guard-audit'
        )
        
        # Create CloudFormation client with assumed credentials
        cfn_client = boto3.client(
            'cloudformation',
            region_name=region,
            aws_access_key_id=assumed_role['Credentials']['AccessKeyId'],
            aws_secret_access_key=assumed_role['Credentials']['SecretAccessKey'],
            aws_session_token=assumed_role['Credentials']['SessionToken']
        )
        
        # Check for stack
        response = cfn_client.describe_stacks(
            StackName='CloudGoldenGuardAuditRole'
        )
        
        stacks = response.get('Stacks', [])
        if not stacks:
            logger.warning(f"Stack not found in account {account_id}")
            return False
        
        stack = stacks[0]
        stack_status = stack.get('StackStatus')
        
        logger.info(f"Stack status in account {account_id}: {stack_status}")
        
        # Check if stack is in a successful state
        return stack_status in ['CREATE_COMPLETE', 'UPDATE_COMPLETE']
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'ValidationError':
            logger.warning(f"Stack does not exist in account {account_id}")
            return False
        logger.error(f"Error verifying stack: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error verifying stack: {e}")
        return False


def generate_tenant_id(account_id: str) -> str:
    """
    Generate a tenant ID from account ID.
    
    Args:
        account_id: AWS account ID
        
    Returns:
        Generated tenant ID
    """
    return f"customer-{account_id}"


def get_role_arn_from_stack(account_id: str, region: str, role_arn: str) -> Optional[str]:
    """
    Get the IAM role ARN from the CloudFormation stack outputs.
    
    Args:
        account_id: AWS account ID
        region: AWS region
        role_arn: IAM role ARN to assume for verification
        
    Returns:
        Role ARN from stack output or None
    """
    try:
        # Assume role in customer account
        assumed_role = sts_client.assume_role(
            RoleArn=role_arn,
            RoleSessionName='CloudGoldenGuardRoleRetrieval'
        )
        
        # Create CloudFormation client
        cfn_client = boto3.client(
            'cloudformation',
            region_name=region,
            aws_access_key_id=assumed_role['Credentials']['AccessKeyId'],
            aws_secret_access_key=assumed_role['Credentials']['SecretAccessKey'],
            aws_session_token=assumed_role['Credentials']['SessionToken']
        )
        
        # Get stack outputs
        response = cfn_client.describe_stacks(
            StackName='CloudGoldenGuardAuditRole'
        )
        
        stacks = response.get('Stacks', [])
        if not stacks:
            return None
        
        outputs = stacks[0].get('Outputs', [])
        for output in outputs:
            if output.get('OutputKey') == 'RoleArn':
                return output.get('OutputValue')
        
        # If not in outputs, construct it
        return f"arn:aws:iam::{account_id}:role/CloudGoldenGuardAuditRole"
        
    except Exception as e:
        logger.error(f"Error getting role ARN from stack: {e}")
        # Fallback: construct the ARN
        return f"arn:aws:iam::{account_id}:role/CloudGoldenGuardAuditRole"


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
    Main Lambda handler - routes requests to appropriate handlers.
    
    Args:
        event: API Gateway event
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
    
    # Get the path from the event
    path = event.get('path', event.get('rawPath', ''))
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', ''))
    
    logger.info(f"Request: {http_method} {path}")
    
    # Route to appropriate handler
    if path.endswith('/verify-and-register') and http_method == 'POST':
        return handle_verify_and_register(event, table_name)
    elif path.endswith('/register') and http_method == 'POST':
        return handle_register(event, table_name)
    else:
        return create_response(404, {
            'error': 'Not found'
        })


def handle_register(event: Dict[str, Any], table_name: str) -> Dict[str, Any]:
    """
    Handle customer registration.
    
    Validates customer data, checks for duplicates, and stores in DynamoDB.
    
    Args:
        event: API Gateway event containing customer registration data
        table_name: DynamoDB table name
        
    Returns:
        API Gateway response with status code and body
    """
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


def handle_verify_and_register(event: Dict[str, Any], table_name: str) -> Dict[str, Any]:
    """
    Handle verification and registration of customer.
    Verifies CloudFormation stack exists, then registers the customer.
    
    Args:
        event: API Gateway event
        table_name: DynamoDB table name
        
    Returns:
        API Gateway response
    """
    try:
        # Parse request body
        try:
            data = parse_request_body(event)
        except ValueError as e:
            logger.warning(f"Invalid request: {str(e)}")
            return create_response(400, {'error': str(e)})
        
        # Extract fields
        account_id = data.get('account_id', '').strip()
        regions = data.get('regions', [])
        
        # Validate account ID
        if not re.match(r'^\d{12}$', account_id):
            return create_response(400, {
                'error': 'Invalid account_id. Must be a 12-digit number.'
            })
        
        # Validate regions
        if not isinstance(regions, list) or len(regions) == 0:
            return create_response(400, {
                'error': 'regions must be a non-empty array'
            })
        
        # Use the first region for verification
        primary_region = regions[0]
        
        # Generate tenant ID and role ARN
        tenant_id = generate_tenant_id(account_id)
        expected_role_arn = f"arn:aws:iam::{account_id}:role/CloudGoldenGuardAuditRole"
        
        # Check if already registered
        table = dynamodb.Table(table_name)
        existing_customer = None
        
        if check_duplicate_tenant(table_name, tenant_id):
            logger.info(f"Customer already registered: {tenant_id}, checking if regions need updating")
            response = table.get_item(Key={'tenant_id': tenant_id})
            if 'Item' in response:
                existing_customer = response['Item']
                existing_regions = set(existing_customer.get('regions', []))
                new_regions = set(regions)
                
                # Check if we need to add new regions
                if not new_regions.issubset(existing_regions):
                    # Merge regions
                    merged_regions = list(existing_regions.union(new_regions))
                    
                    # Update the customer record with merged regions
                    now = datetime.utcnow().isoformat() + "Z"
                    table.update_item(
                        Key={'tenant_id': tenant_id},
                        UpdateExpression='SET regions = :regions, updated_at = :updated_at',
                        ExpressionAttributeValues={
                            ':regions': merged_regions,
                            ':updated_at': now
                        }
                    )
                    
                    logger.info(f"Updated regions for customer {tenant_id}: {merged_regions}")
                    
                    # Fetch updated record
                    response = table.get_item(Key={'tenant_id': tenant_id})
                    existing_customer = response['Item']
                
                return create_response(200, {
                    'message': 'Customer already registered' if new_regions.issubset(existing_regions) else 'Customer updated with new regions',
                    'customer': existing_customer,
                    'tenant_id': tenant_id
                })
        
        # Verify CloudFormation stack exists
        logger.info(f"Verifying CloudFormation stack for account {account_id} in region {primary_region}")
        
        # First, try to assume the role to verify it exists
        try:
            assumed_role = sts_client.assume_role(
                RoleArn=expected_role_arn,
                RoleSessionName='CloudGoldenGuardVerification',
                ExternalId='cloud-golden-guard-audit'
            )
            logger.info(f"Successfully assumed role for account {account_id}")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            logger.error(f"Failed to assume role: {error_code} - {str(e)}")
            return create_response(400, {
                'error': 'Could not assume the IAM role. Please ensure the CloudFormation stack was created successfully and the role has the correct trust policy.'
            })
        
        # Verify stack exists using the assumed role
        stack_exists = verify_cloudformation_stack(account_id, primary_region, expected_role_arn)
        
        if not stack_exists:
            return create_response(400, {
                'error': 'CloudFormation stack "CloudGoldenGuardAuditRole" not found or not in completed state. Please create the stack first.'
            })
        
        # Get role ARN from stack (or use expected one)
        role_arn = get_role_arn_from_stack(account_id, primary_region, expected_role_arn) or expected_role_arn
        
        # Generate customer name from account ID
        customer_name = f"AWS-{account_id}"
        
        # Create customer object
        customer = Customer.create(
            tenant_id=tenant_id,
            customer_name=customer_name,
            role_arn=role_arn,
            account_id=account_id,
            regions=regions
        )
        
        # Register customer in DynamoDB
        register_customer(table_name, customer)
        
        logger.info(f"Customer verified and registered successfully: {tenant_id}")
        
        return create_response(201, {
            'message': 'Customer verified and registered successfully',
            'customer': customer.to_dict(),
            'tenant_id': tenant_id
        })
        
    except ClientError as e:
        logger.error(f"AWS error during verification: {e}")
        return create_response(500, {
            'error': 'Failed to verify and register customer. Please try again.'
        })
    except Exception as e:
        logger.error(f"Unexpected error during verification: {e}")
        return create_response(500, {
            'error': f'An unexpected error occurred: {str(e)}'
        })
