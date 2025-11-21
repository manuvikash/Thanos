"""
Resource inventory management for DynamoDB.
Stores all scanned resources with compliance status and metadata.
"""
import boto3
from typing import List, Optional, Dict, Any
from botocore.exceptions import ClientError
from .models import Resource
from .logging import get_logger

logger = get_logger(__name__)


def put_resources(table_name: str, resources: List[Resource]) -> None:
    """
    Write resource inventory to DynamoDB with batch writing.
    
    Args:
        table_name: Name of the DynamoDB table
        resources: List of Resource objects to store
    """
    if not table_name:
        logger.warning("No resources table configured, skipping resource storage")
        return
        
    dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
    table = dynamodb.Table(table_name)
    
    successful = 0
    failed = 0
    
    with table.batch_writer() as batch:
        for resource in resources:
            try:
                batch.put_item(Item=resource.to_dynamodb_item())
                successful += 1
            except Exception as e:
                logger.error(f"Error writing resource {resource.arn}: {e}")
                failed += 1
    
    logger.info(f"Wrote {successful} resources to {table_name} ({failed} failed)")


def get_resources_by_snapshot(
    table_name: str, 
    tenant_id: str, 
    snapshot_key: str,
    limit: int = 1000
) -> List[Dict[str, Any]]:
    """
    Query all resources for a specific snapshot.
    
    Args:
        table_name: Name of the DynamoDB table
        tenant_id: Tenant identifier
        snapshot_key: Snapshot key to query
        limit: Maximum number of items to return
        
    Returns:
        List of resource dictionaries
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
        table = dynamodb.Table(table_name)
        
        response = table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={
                ':pk': f"{tenant_id}#{snapshot_key}"
            },
            Limit=limit
        )
        
        return response.get('Items', [])
        
    except ClientError as e:
        logger.error(f"Error querying resources by snapshot: {e}")
        return []


def get_resources_by_compliance(
    table_name: str,
    tenant_id: str,
    compliance_status: str,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Query resources by compliance status using GSI2.
    
    Args:
        table_name: Name of the DynamoDB table
        tenant_id: Tenant identifier
        compliance_status: Compliance status (COMPLIANT, NON_COMPLIANT, NOT_EVALUATED)
        limit: Maximum number of items to return
        
    Returns:
        List of resource dictionaries
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
        table = dynamodb.Table(table_name)
        
        response = table.query(
            IndexName='GSI2',
            KeyConditionExpression='GSI2PK = :pk',
            ExpressionAttributeValues={
                ':pk': f"{tenant_id}#{compliance_status}"
            },
            Limit=limit,
            ScanIndexForward=False  # Most recent first
        )
        
        return response.get('Items', [])
        
    except ClientError as e:
        logger.error(f"Error querying resources by compliance: {e}")
        return []


def get_resources_by_type(
    table_name: str,
    tenant_id: str,
    resource_type: str,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Query resources by type using GSI1.
    
    Args:
        table_name: Name of the DynamoDB table
        tenant_id: Tenant identifier
        resource_type: AWS resource type
        limit: Maximum number of items to return
        
    Returns:
        List of resource dictionaries
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
        table = dynamodb.Table(table_name)
        
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk',
            ExpressionAttributeValues={
                ':pk': f"{tenant_id}#{resource_type}"
            },
            Limit=limit
        )
        
        return response.get('Items', [])
        
    except ClientError as e:
        logger.error(f"Error querying resources by type: {e}")
        return []


def convert_dynamodb_to_dict(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert DynamoDB items to clean dictionary format.
    Removes internal keys like PK, SK, GSI keys.
    
    Args:
        items: List of DynamoDB items
        
    Returns:
        List of cleaned dictionaries
    """
    cleaned = []
    internal_keys = {'PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK'}
    
    for item in items:
        clean_item = {k: v for k, v in item.items() if k not in internal_keys}
        # Convert Decimal to float for drift_score
        if 'drift_score' in clean_item:
            clean_item['drift_score'] = float(clean_item['drift_score'])
        cleaned.append(clean_item)
    
    return cleaned
