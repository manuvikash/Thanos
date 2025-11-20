"""
S3 I/O utilities for snapshots.
"""
import json
import boto3
from typing import Any, Dict, List, Optional
from datetime import datetime
from botocore.exceptions import ClientError
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

