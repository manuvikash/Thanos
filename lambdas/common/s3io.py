"""
S3 I/O utilities for snapshots and rules.
"""
import json
import yaml
import boto3
import os
from typing import Any, Dict, List, Optional
from datetime import datetime
from botocore.exceptions import ClientError
from .models import Rule
from .logging import get_logger

logger = get_logger(__name__)


def write_snapshot(
    bucket: str,
    tenant_id: str,
    resources: List[Dict[str, Any]],
    timestamp: Optional[str] = None,
) -> str:
    """
    Write resource snapshot to S3.
    
    Args:
        bucket: S3 bucket name
        tenant_id: Tenant identifier
        resources: List of resource dicts
        timestamp: Optional timestamp (defaults to now)
        
    Returns:
        S3 key of the written snapshot
    """
    s3 = boto3.client("s3")
    
    if timestamp is None:
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    
    key = f"tenants/{tenant_id}/snapshots/{timestamp}/resources.json"
    
    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(resources, indent=2),
            ContentType="application/json",
        )
        logger.info(f"Wrote snapshot to s3://{bucket}/{key}")
        return key
    except ClientError as e:
        logger.error(f"Error writing snapshot to S3: {e}")
        raise


def read_rules_from_s3(bucket: str, tenant_id: str) -> List[Rule]:
    """
    Read rules from S3.
    
    Args:
        bucket: S3 bucket name
        tenant_id: Tenant identifier
        
    Returns:
        List of Rule objects
    """
    s3 = boto3.client("s3")
    key = f"tenants/{tenant_id}/rules.yaml"
    
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response["Body"].read().decode("utf-8")
        data = yaml.safe_load(content)
        
        rules = [Rule.from_dict(rule_data) for rule_data in data.get("rules", [])]
        logger.info(f"Loaded {len(rules)} rules from s3://{bucket}/{key}")
        return rules
        
    except ClientError as e:
        logger.error(f"Error reading rules from S3: {e}")
        raise


def read_rules_from_repo(rules_path: str = "rules/default.rules.yaml") -> List[Rule]:
    """
    Read rules from local repository file.
    
    Args:
        rules_path: Path to rules file (relative to Lambda root or absolute)
        
    Returns:
        List of Rule objects
    """
    # Try multiple possible paths for Lambda environment
    possible_paths = [
        rules_path,
        f"/var/task/{rules_path}",
        os.path.join(os.path.dirname(__file__), "..", "..", rules_path),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    data = yaml.safe_load(f)
                    rules = [Rule.from_dict(rule_data) for rule_data in data.get("rules", [])]
                    logger.info(f"Loaded {len(rules)} rules from {path}")
                    return rules
            except Exception as e:
                logger.error(f"Error reading rules from {path}: {e}")
                continue
    
    raise FileNotFoundError(f"Could not find rules file at any of: {possible_paths}")


def load_rules(rules_source: str, tenant_id: str, rules_bucket: Optional[str] = None) -> List[Rule]:
    """
    Load rules from the specified source.
    
    Args:
        rules_source: "s3" or "repo"
        tenant_id: Tenant identifier
        rules_bucket: S3 bucket for rules (required if rules_source is "s3")
        
    Returns:
        List of Rule objects
    """
    if rules_source == "s3":
        if not rules_bucket:
            raise ValueError("rules_bucket is required when rules_source is 's3'")
        return read_rules_from_s3(rules_bucket, tenant_id)
    elif rules_source == "repo":
        return read_rules_from_repo()
    else:
        raise ValueError(f"Invalid rules_source: {rules_source}")
