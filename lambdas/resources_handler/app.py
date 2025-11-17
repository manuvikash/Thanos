"""
Resources handler Lambda function.
Retrieves resource snapshot from S3 and returns grouped resource details.
"""
import json
import os
import sys
from typing import Any, Dict
from collections import defaultdict

import boto3
from botocore.exceptions import ClientError

# Add common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.logging import get_logger

logger = get_logger(__name__)

# Environment variables
SNAPSHOTS_BUCKET = os.environ.get("SNAPSHOTS_BUCKET", "")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for resources retrieval.
    
    Expected query parameters:
    - tenant_id: required
    - snapshot_key: required
    
    Returns:
    {
        "tenant_id": "customer-123",
        "snapshot_key": "tenants/customer-123/snapshots/20240101-120000/resources.json",
        "resources": [...],
        "totals": {
            "total_resources": 150,
            "by_type": {
                "AWS::S3::Bucket": 25,
                ...
            }
        }
    }
    """
    try:
        # Parse query parameters
        query_params = event.get("queryStringParameters", {}) or {}
        tenant_id = query_params.get("tenant_id")
        snapshot_key = query_params.get("snapshot_key")
        
        # Validate required fields
        if not tenant_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Missing required parameter: tenant_id"}),
            }
        
        if not snapshot_key:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Missing required parameter: snapshot_key"}),
            }
        
        logger.info(f"Retrieving resources for tenant: {tenant_id}, snapshot: {snapshot_key}")
        
        # Retrieve snapshot from S3
        s3 = boto3.client("s3")
        
        try:
            response = s3.get_object(Bucket=SNAPSHOTS_BUCKET, Key=snapshot_key)
            content = response["Body"].read().decode("utf-8")
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "NoSuchKey":
                logger.warning(f"Snapshot not found: {snapshot_key}")
                return {
                    "statusCode": 404,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                    "body": json.dumps({"error": "Snapshot not found"}),
                }
            else:
                logger.error(f"S3 error retrieving snapshot: {e}")
                raise
        
        # Parse JSON
        try:
            resources = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing snapshot JSON: {e}")
            return {
                "statusCode": 500,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Invalid snapshot format"}),
            }
        
        # Calculate totals and group by type
        by_type = defaultdict(int)
        for resource in resources:
            resource_type = resource.get("resource_type", "Unknown")
            by_type[resource_type] += 1
        
        totals = {
            "total_resources": len(resources),
            "by_type": dict(by_type),
        }
        
        # Prepare response
        response_body = {
            "tenant_id": tenant_id,
            "snapshot_key": snapshot_key,
            "resources": resources,
            "totals": totals,
        }
        
        logger.info(f"Retrieved {len(resources)} resources for tenant {tenant_id}")
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response_body),
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
