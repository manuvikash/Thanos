"""
Initialization Lambda function.
Runs once to populate DynamoDB with default rules from YAML.
"""
import json
import os
import sys
from typing import Any, Dict

# Add common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.s3io import read_rules_from_repo
from common.logging import get_logger
import boto3
from datetime import datetime

logger = get_logger(__name__)

# Environment variables
RULES_TABLE = os.environ.get("RULES_TABLE", "")
dynamodb = boto3.resource("dynamodb", region_name="us-west-1")


def initialize_default_rules():
    """
    Load default rules from YAML and populate DynamoDB.
    Only adds rules that don't already exist (idempotent).
    """
    table = dynamodb.Table(RULES_TABLE)
    
    # Load default rules from YAML
    default_rules = read_rules_from_repo()
    logger.info(f"Loaded {len(default_rules)} default rules from YAML")
    
    added_count = 0
    skipped_count = 0
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    for rule in default_rules:
        pk = "GLOBAL#RULE"
        sk = rule.id
        
        # Check if rule already exists
        try:
            response = table.get_item(Key={"PK": pk, "SK": sk})
            if "Item" in response:
                logger.info(f"Rule {rule.id} already exists, skipping")
                skipped_count += 1
                continue
        except Exception as e:
            logger.error(f"Error checking rule {rule.id}: {e}")
            continue
        
        # Add rule to DynamoDB
        item = {
            "PK": pk,
            "SK": sk,
            "rule_id": rule.id,
            "tenant_id": "GLOBAL",
            "resource_type": rule.resource_type,
            "check": {
                "type": rule.check.type,
                "path": rule.check.path,
            },
            "severity": rule.severity,
            "message": rule.message,
            "category": rule.category,
            "selector": rule.selector,
            "created_at": timestamp,
            "created_by": "system-init",
            "enabled": True,
            "source": "default",
            "editable": True,  
        }
        
        # Add optional check fields
        if rule.check.expected is not None:
            item["check"]["expected"] = rule.check.expected
        if rule.check.forbidden is not None:
            item["check"]["forbidden"] = rule.check.forbidden
        if rule.check.params is not None:
            item["check"]["params"] = rule.check.params
        
        try:
            table.put_item(Item=item)
            logger.info(f"Added default rule: {rule.id}")
            added_count += 1
        except Exception as e:
            logger.error(f"Error adding rule {rule.id}: {e}")
    
    return {
        "total_rules": len(default_rules),
        "added": added_count,
        "skipped": skipped_count,
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for initialization.
    Can be invoked manually or triggered on first deployment.
    """
    try:
        logger.info("Starting default rules initialization")
        
        result = initialize_default_rules()
        
        logger.info(f"Initialization complete: {result}")
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Default rules initialized successfully",
                "result": result,
            }),
        }
        
    except Exception as e:
        logger.error(f"Error in initialization: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
        }
