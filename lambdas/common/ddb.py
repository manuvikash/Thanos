"""
DynamoDB utilities for findings storage and retrieval.
"""
import boto3
from typing import Any, Dict, List, Optional
from decimal import Decimal
from botocore.exceptions import ClientError
from .models import Finding
from .logging import get_logger

logger = get_logger(__name__)


def python_to_dynamodb(obj: Any) -> Any:
    """Convert Python types to DynamoDB-compatible types."""
    if isinstance(obj, dict):
        return {k: python_to_dynamodb(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [python_to_dynamodb(v) for v in obj]
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj


def dynamodb_to_python(obj: Any) -> Any:
    """Convert DynamoDB types to Python types."""
    if isinstance(obj, dict):
        return {k: dynamodb_to_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [dynamodb_to_python(v) for v in obj]
    elif isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj


def put_findings(table_name: str, findings: List[Finding]) -> None:
    """
    Write findings to DynamoDB.
    
    Args:
        table_name: DynamoDB table name
        findings: List of Finding objects
    """
    if not findings:
        return
    
    dynamodb = boto3.resource("dynamodb", region_name="us-west-1")
    table = dynamodb.Table(table_name)
    
    # Batch write in chunks of 25 (DynamoDB limit)
    chunk_size = 25
    
    for i in range(0, len(findings), chunk_size):
        chunk = findings[i:i + chunk_size]
        
        try:
            with table.batch_writer() as batch:
                for finding in chunk:
                    item = python_to_dynamodb(finding.to_dict())
                    batch.put_item(Item=item)
            
            logger.info(f"Wrote {len(chunk)} findings to DynamoDB")
            
        except ClientError as e:
            logger.error(f"Error writing findings to DynamoDB: {e}")
            raise


def query_findings(
    table_name: str,
    tenant_id: str,
    limit: int = 50,
    last_evaluated_key: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Query findings for a tenant.
    
    Args:
        table_name: DynamoDB table name
        tenant_id: Tenant identifier
        limit: Maximum number of items to return
        last_evaluated_key: Pagination token
        
    Returns:
        Dict with 'items' and optional 'last_evaluated_key'
    """
    dynamodb = boto3.resource("dynamodb", region_name="us-west-1")
    table = dynamodb.Table(table_name)
    
    query_params = {
        "KeyConditionExpression": "tenant_id = :tenant_id",
        "ExpressionAttributeValues": {":tenant_id": tenant_id},
        "Limit": limit,
        "ScanIndexForward": False,  # Most recent first
    }
    
    if last_evaluated_key:
        query_params["ExclusiveStartKey"] = last_evaluated_key
    
    try:
        response = table.query(**query_params)
        
        items = [dynamodb_to_python(item) for item in response.get("Items", [])]
        result = {"items": items}
        
        if "LastEvaluatedKey" in response:
            result["last_evaluated_key"] = response["LastEvaluatedKey"]
        
        logger.info(f"Queried {len(items)} findings for tenant {tenant_id}")
        return result
        
    except ClientError as e:
        logger.error(f"Error querying findings from DynamoDB: {e}")
        raise


def query_all_findings(table_name: str, tenant_id: str) -> List[Dict[str, Any]]:
    """
    Query all findings for a tenant (handles pagination automatically).
    
    Args:
        table_name: DynamoDB table name
        tenant_id: Tenant identifier
        
    Returns:
        List of all findings for the tenant
    """
    dynamodb = boto3.resource("dynamodb", region_name="us-west-1")
    table = dynamodb.Table(table_name)
    
    all_items = []
    last_evaluated_key = None
    
    try:
        while True:
            query_params = {
                "KeyConditionExpression": "tenant_id = :tenant_id",
                "ExpressionAttributeValues": {":tenant_id": tenant_id},
            }
            
            if last_evaluated_key:
                query_params["ExclusiveStartKey"] = last_evaluated_key
            
            response = table.query(**query_params)
            
            items = [dynamodb_to_python(item) for item in response.get("Items", [])]
            all_items.extend(items)
            
            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break
        
        logger.info(f"Queried all {len(all_items)} findings for tenant {tenant_id}")
        return all_items
        
    except ClientError as e:
        logger.error(f"Error querying all findings from DynamoDB: {e}")
        raise
