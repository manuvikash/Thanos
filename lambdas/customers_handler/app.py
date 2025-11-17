"""
Customers Lambda Handler
Retrieves the list of registered customers from DynamoDB.
"""
import json
import os
import logging
from typing import Dict, Any, List

import boto3
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
CUSTOMERS_TABLE = os.environ.get('CUSTOMERS_TABLE')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for GET /customers endpoint.
    Retrieves all registered customers from DynamoDB.
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response with customer list
    """
    logger.info("Retrieving customer list")
    
    try:
        # Get DynamoDB table
        table = dynamodb.Table(CUSTOMERS_TABLE)
        
        # Scan the table to get all customers
        response = table.scan()
        customers = response.get('Items', [])
        
        # Handle pagination if there are more items
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            customers.extend(response.get('Items', []))
        
        # Sort customers by customer_name
        customers_sorted = sorted(customers, key=lambda x: x.get('customer_name', '').lower())
        
        logger.info(f"Successfully retrieved {len(customers_sorted)} customers")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'customers': customers_sorted
            })
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"DynamoDB error: {error_code} - {error_message}")
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Failed to retrieve customers. Please try again.'
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Failed to retrieve customers. Please try again.'
            })
        }
