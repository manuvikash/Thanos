"""
Findings handler Lambda function.
Retrieves findings from DynamoDB.
"""
import json
import os
import sys
from typing import Any, Dict

# Add common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.ddb import query_findings
from common.logging import get_logger

logger = get_logger(__name__)

# Environment variables
FINDINGS_TABLE = os.environ.get("FINDINGS_TABLE", "")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for findings retrieval.
    
    Expected query parameters:
    - tenant_id: required
    - limit: optional (default 50)
    - cursor: optional (for pagination)
    
    Returns:
    {
        "items": [...],
        "next_cursor": "..." (optional)
    }
    """
    try:
        # Parse query parameters
        query_params = event.get("queryStringParameters", {}) or {}
        tenant_id = query_params.get("tenant_id")
        limit = int(query_params.get("limit", 50))
        cursor = query_params.get("cursor")
        
        # Validate required fields
        if not tenant_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required parameter: tenant_id"}),
            }
        
        logger.info(f"Querying findings for tenant: {tenant_id}")
        
        # Parse cursor if provided
        last_evaluated_key = None
        if cursor:
            try:
                last_evaluated_key = json.loads(cursor)
            except json.JSONDecodeError:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "Invalid cursor format"}),
                }
        
        # Query findings
        result = query_findings(FINDINGS_TABLE, tenant_id, limit, last_evaluated_key)
        
        # Prepare response
        response_body = {"items": result["items"]}
        
        if "last_evaluated_key" in result:
            response_body["next_cursor"] = json.dumps(result["last_evaluated_key"])
        
        logger.info(f"Retrieved {len(result['items'])} findings for tenant {tenant_id}")
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response_body),
        }
        
    except Exception as e:
        logger.error(f"Error in findings handler: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}),
        }
