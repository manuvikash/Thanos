"""
Resource inventory query handler Lambda function.
Provides API to query scanned resources with compliance and drift information from DynamoDB.
"""
import json
import os
import sys
from typing import Any, Dict
from decimal import Decimal

# Add common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.resource_inventory import (
    get_resources_by_snapshot,
    get_resources_by_compliance,
    get_resources_by_type,
    convert_dynamodb_to_dict
)
from common.logging import get_logger

logger = get_logger(__name__)

# Environment variables
RESOURCES_TABLE = os.environ.get('RESOURCES_TABLE', '')
SNAPSHOTS_BUCKET = os.environ.get("SNAPSHOTS_BUCKET", "")  # Keep for backward compatibility


def decimal_default(obj):
    """JSON serializer for Decimal objects."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Query resource inventory from DynamoDB.
    
    Query params:
    - tenant_id (required)
    - snapshot_key (optional) - query specific snapshot
    - compliance_status (optional) - filter by COMPLIANT, NON_COMPLIANT, NOT_EVALUATED
    - resource_type (optional) - filter by AWS resource type
    - limit (optional, default 100)
    
    Returns:
    {
        "tenant_id": "customer-123",
        "resources": [...],
        "totals": {
            "total_resources": 150,
            "by_type": {...},
            "by_compliance": {...}
        }
    }
    """
    try:
        params = event.get('queryStringParameters', {}) or {}
        
        tenant_id = params.get('tenant_id')
        if not tenant_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'tenant_id required'})
            }
        
        if not RESOURCES_TABLE:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'Resources table not configured'})
            }
        
        snapshot_key = params.get('snapshot_key')
        compliance_status = params.get('compliance_status')
        resource_type = params.get('resource_type')
        limit = int(params.get('limit', 100))
        
        # Query based on parameters
        if snapshot_key:
            logger.info(f"Querying resources by snapshot: {snapshot_key}")
            items = get_resources_by_snapshot(RESOURCES_TABLE, tenant_id, snapshot_key, limit)
        elif compliance_status:
            logger.info(f"Querying resources by compliance: {compliance_status}")
            items = get_resources_by_compliance(RESOURCES_TABLE, tenant_id, compliance_status, limit)
        elif resource_type:
            logger.info(f"Querying resources by type: {resource_type}")
            items = get_resources_by_type(RESOURCES_TABLE, tenant_id, resource_type, limit)
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'One of snapshot_key, compliance_status, or resource_type required'
                })
            }
        
        # Convert DynamoDB format to clean dict
        resources = convert_dynamodb_to_dict(items)
        
        # Calculate totals
        totals = {
            'total_resources': len(resources),
            'by_type': {},
            'by_compliance': {},
        }
        
        for r in resources:
            rtype = r.get('resource_type', 'unknown')
            status = r.get('compliance_status', 'unknown')
            totals['by_type'][rtype] = totals['by_type'].get(rtype, 0) + 1
            totals['by_compliance'][status] = totals['by_compliance'].get(status, 0) + 1
        
        response_body = {
            'tenant_id': tenant_id,
            'resources': resources,
            'totals': totals
        }
        
        logger.info(f"Retrieved {len(resources)} resources for tenant {tenant_id}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(response_body, default=decimal_default)
        }
        
    except Exception as e:
        logger.error(f"Error in resources handler: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        logger.error(f"Error in resources handler: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}),
        }
