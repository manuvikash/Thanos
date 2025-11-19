"""
Rules handler Lambda function.
Manages custom rules in DynamoDB with CRUD operations.
"""
import json
import os
import sys
from typing import Any, Dict, List, Optional
from datetime import datetime
from decimal import Decimal
import uuid

# Add common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.models import Rule
from common.logging import get_logger
import boto3
from botocore.exceptions import ClientError

logger = get_logger(__name__)

# Environment variables
RULES_TABLE = os.environ.get("RULES_TABLE", "")
dynamodb = boto3.resource("dynamodb", region_name="us-west-1")


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal objects from DynamoDB."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)


def get_table():
    """Get DynamoDB table resource."""
    return dynamodb.Table(RULES_TABLE)


def list_rules(tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    List all rules from DynamoDB.
    Includes global rules (defaults + global custom) and tenant-specific rules.
    """
    table = get_table()
    all_rules = []
    
    # Get global rules (includes system defaults marked as source='default')
    try:
        response = table.query(
            KeyConditionExpression="PK = :pk",
            ExpressionAttributeValues={":pk": "GLOBAL#RULE"},
        )
        
        for item in response.get("Items", []):
            all_rules.append({
                "id": item["rule_id"],
                "resource_type": item["resource_type"],
                "check": item["check"],
                "severity": item["severity"],
                "message": item["message"],
                "category": item.get("category", "compliance"),
                "selector": item.get("selector", {}),
                "source": item.get("source", "global"),
                "created_at": item.get("created_at"),
                "created_by": item.get("created_by"),
                "updated_at": item.get("updated_at"),
                "enabled": item.get("enabled", True),
                "editable": item.get("editable", True),
            })
    except ClientError as e:
        logger.error(f"Error querying global rules: {e}")
    
    # Get tenant-specific custom rules if tenant_id provided
    if tenant_id:
        try:
            response = table.query(
                IndexName="TenantRulesIndex",
                KeyConditionExpression="tenant_id = :tid",
                ExpressionAttributeValues={":tid": tenant_id},
            )
            
            for item in response.get("Items", []):
                all_rules.append({
                    "id": item["rule_id"],
                    "resource_type": item["resource_type"],
                    "check": item["check"],
                    "severity": item["severity"],
                    "message": item["message"],
                    "category": item.get("category", "compliance"),
                    "selector": item.get("selector", {}),
                    "source": "custom",
                    "tenant_id": item["tenant_id"],
                    "created_at": item.get("created_at"),
                    "created_by": item.get("created_by"),
                    "updated_at": item.get("updated_at"),
                    "enabled": item.get("enabled", True),
                    "editable": item.get("editable", True),
                })
        except ClientError as e:
            logger.error(f"Error querying custom rules: {e}")
    
    return all_rules


def get_rule(rule_id: str, tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get a specific rule by ID from DynamoDB."""
    table = get_table()
    
    # Check tenant-specific rules first
    if tenant_id:
        try:
            response = table.get_item(
                Key={"PK": f"TENANT#{tenant_id}#RULE", "SK": rule_id}
            )
            if "Item" in response:
                item = response["Item"]
                return {
                    "id": item["rule_id"],
                    "resource_type": item["resource_type"],
                    "check": item["check"],
                    "severity": item["severity"],
                    "message": item["message"],
                    "category": item.get("category", "compliance"),
                    "selector": item.get("selector", {}),
                    "source": "custom",
                    "tenant_id": item["tenant_id"],
                    "created_at": item.get("created_at"),
                    "created_by": item.get("created_by"),
                    "updated_at": item.get("updated_at"),
                    "enabled": item.get("enabled", True),
                    "editable": item.get("editable", True),
                }
        except ClientError as e:
            logger.error(f"Error getting tenant rule: {e}")
    
    # Check global rules
    try:
        response = table.get_item(Key={"PK": "GLOBAL#RULE", "SK": rule_id})
        if "Item" in response:
            item = response["Item"]
            return {
                "id": item["rule_id"],
                "resource_type": item["resource_type"],
                "check": item["check"],
                "severity": item["severity"],
                "message": item["message"],
                "category": item.get("category", "compliance"),
                "selector": item.get("selector", {}),
                "source": item.get("source", "global"),
                "created_at": item.get("created_at"),
                "created_by": item.get("created_by"),
                "updated_at": item.get("updated_at"),
                "enabled": item.get("enabled", True),
                "editable": item.get("editable", True),
            }
    except ClientError as e:
        logger.error(f"Error getting global rule: {e}")
    
    return None


def create_rule(rule_data: Dict[str, Any], tenant_id: Optional[str] = None) -> Dict[str, Any]:
    """Create a new custom rule."""
    table = get_table()
    
    rule_id = rule_data.get("id") or str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Determine PK based on scope
    pk = f"TENANT#{tenant_id}#RULE" if tenant_id else "GLOBAL#RULE"
    
    item = {
        "PK": pk,
        "SK": rule_id,
        "rule_id": rule_id,
        "tenant_id": tenant_id or "GLOBAL",
        "resource_type": rule_data["resource_type"],
        "check": rule_data["check"],
        "severity": rule_data["severity"],
        "message": rule_data["message"],
        "category": rule_data.get("category", "compliance"),
        "selector": rule_data.get("selector", {}),
        "created_at": timestamp,
        "created_by": rule_data.get("created_by", "api"),
        "enabled": rule_data.get("enabled", True),
        "editable": True,  # Custom rules are always editable
        "source": "custom" if tenant_id else "global",
    }
    
    try:
        table.put_item(Item=item)
        logger.info(f"Created rule {rule_id} for {pk}")
        
        return {
            "id": rule_id,
            "resource_type": item["resource_type"],
            "check": item["check"],
            "severity": item["severity"],
            "message": item["message"],
            "category": item["category"],
            "selector": item["selector"],
            "source": item["source"],
            "tenant_id": tenant_id,
            "created_at": timestamp,
            "created_by": item["created_by"],
            "enabled": item["enabled"],
            "editable": True,
        }
    except ClientError as e:
        logger.error(f"Error creating rule: {e}")
        raise


def update_rule(rule_id: str, rule_data: Dict[str, Any], tenant_id: Optional[str] = None) -> Dict[str, Any]:
    """Update an existing custom rule."""
    table = get_table()
    
    pk = f"TENANT#{tenant_id}#RULE" if tenant_id else "GLOBAL#RULE"
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    update_expr = "SET "
    expr_values = {}
    expr_names = {}
    
    if "resource_type" in rule_data:
        update_expr += "resource_type = :rt, "
        expr_values[":rt"] = rule_data["resource_type"]
    
    if "check" in rule_data:
        update_expr += "#chk = :chk, "
        expr_values[":chk"] = rule_data["check"]
        expr_names["#chk"] = "check"
    
    if "severity" in rule_data:
        update_expr += "severity = :sev, "
        expr_values[":sev"] = rule_data["severity"]
    
    if "message" in rule_data:
        update_expr += "message = :msg, "
        expr_values[":msg"] = rule_data["message"]
    
    if "category" in rule_data:
        update_expr += "category = :cat, "
        expr_values[":cat"] = rule_data["category"]
    
    if "selector" in rule_data:
        update_expr += "selector = :sel, "
        expr_values[":sel"] = rule_data["selector"]
    
    if "enabled" in rule_data:
        update_expr += "enabled = :en, "
        expr_values[":en"] = rule_data["enabled"]
    
    update_expr += "updated_at = :ua, updated_by = :ub"
    expr_values[":ua"] = timestamp
    expr_values[":ub"] = rule_data.get("updated_by", "api")
    
    try:
        update_params = {
            "Key": {"PK": pk, "SK": rule_id},
            "UpdateExpression": update_expr,
            "ExpressionAttributeValues": expr_values,
            "ReturnValues": "ALL_NEW",
        }
        
        if expr_names:
            update_params["ExpressionAttributeNames"] = expr_names
        
        response = table.update_item(**update_params)
        
        item = response["Attributes"]
        logger.info(f"Updated rule {rule_id} for {pk}")
        
        return {
            "id": item["rule_id"],
            "resource_type": item["resource_type"],
            "check": item["check"],
            "severity": item["severity"],
            "message": item["message"],
            "category": item.get("category", "compliance"),
            "selector": item.get("selector", {}),
            "source": "custom" if tenant_id else "global",
            "tenant_id": tenant_id,
            "created_at": item.get("created_at"),
            "created_by": item.get("created_by"),
            "updated_at": item.get("updated_at"),
            "updated_by": item.get("updated_by"),
            "enabled": item.get("enabled", True),
            "editable": item.get("editable", True),
        }
    except ClientError as e:
        logger.error(f"Error updating rule: {e}")
        raise


def delete_rule(rule_id: str, tenant_id: Optional[str] = None) -> bool:
    """Delete a custom rule."""
    table = get_table()
    
    pk = f"TENANT#{tenant_id}#RULE" if tenant_id else "GLOBAL#RULE"
    
    try:
        table.delete_item(Key={"PK": pk, "SK": rule_id})
        logger.info(f"Deleted rule {rule_id} for {pk}")
        return True
    except ClientError as e:
        logger.error(f"Error deleting rule: {e}")
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for rules CRUD operations.
    
    Routes:
    - GET /rules?tenant_id=xxx → list all rules
    - GET /rules/{rule_id}?tenant_id=xxx → get specific rule
    - POST /rules → create rule
    - PUT /rules/{rule_id} → update rule
    - DELETE /rules/{rule_id} → delete rule
    """
    try:
        http_method = event.get("requestContext", {}).get("http", {}).get("method")
        path = event.get("rawPath", "")
        query_params = event.get("queryStringParameters") or {}
        path_params = event.get("pathParameters") or {}
        tenant_id = query_params.get("tenant_id")
        
        logger.info(f"{http_method} {path} - tenant_id: {tenant_id}")
        
        # GET /rules - list all rules
        if http_method == "GET" and path == "/rules":
            rules = list_rules(tenant_id)
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"rules": rules}, cls=DecimalEncoder),
            }
        
        # GET /rules/{rule_id} - get specific rule
        elif http_method == "GET" and path_params.get("rule_id"):
            rule_id = path_params["rule_id"]
            rule = get_rule(rule_id, tenant_id)
            
            if not rule:
                return {
                    "statusCode": 404,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                    "body": json.dumps({"error": "Rule not found"}, cls=DecimalEncoder),
                }
            
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(rule, cls=DecimalEncoder),
            }
        
        # POST /rules - create new rule
        elif http_method == "POST" and path == "/rules":
            body = event.get("body")
            if isinstance(body, str):
                body = json.loads(body)
            
            rule = create_rule(body, tenant_id)
            
            return {
                "statusCode": 201,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(rule, cls=DecimalEncoder),
            }
        
        # PUT /rules/{rule_id} - update rule
        elif http_method == "PUT" and path_params.get("rule_id"):
            rule_id = path_params["rule_id"]
            body = event.get("body")
            if isinstance(body, str):
                body = json.loads(body)
            
            rule = update_rule(rule_id, body, tenant_id)
            
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(rule, cls=DecimalEncoder),
            }
        
        # DELETE /rules/{rule_id} - delete rule
        elif http_method == "DELETE" and path_params.get("rule_id"):
            rule_id = path_params["rule_id"]
            success = delete_rule(rule_id, tenant_id)
            
            if not success:
                return {
                    "statusCode": 404,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                    "body": json.dumps({"error": "Rule not found or cannot be deleted"}, cls=DecimalEncoder),
                }
            
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"message": "Rule deleted successfully"}, cls=DecimalEncoder),
            }
        
        else:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Route not found"}, cls=DecimalEncoder),
            }
        
    except Exception as e:
        logger.error(f"Error in rules handler: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}, cls=DecimalEncoder),
        }
