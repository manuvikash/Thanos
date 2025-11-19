"""
AWS client utilities for assuming roles and creating regional clients.
"""
import boto3
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from .logging import get_logger

logger = get_logger(__name__)


def assume_role(role_arn: str, session_name: str = "GoldenGuardScan") -> Optional[Dict[str, str]]:
    """
    Assume an IAM role and return temporary credentials.
    Returns None if same-account scanning is detected.
    
    Args:
        role_arn: The ARN of the role to assume
        session_name: Session name for the assumed role
        
    Returns:
        Dict with AccessKeyId, SecretAccessKey, SessionToken, or None for same-account
    """
    sts = boto3.client("sts")
    
    # Check if we're scanning the same account
    try:
        caller_identity = sts.get_caller_identity()
        current_account = caller_identity["Account"]
        target_account = role_arn.split(":")[4]
        
        if current_account == target_account:
            logger.info(f"Same-account scanning detected. Skipping AssumeRole.")
            return None
    except Exception as e:
        logger.warning(f"Could not check caller identity: {e}")
    
    try:
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName=session_name,
            DurationSeconds=3600,
        )
        
        credentials = response["Credentials"]
        logger.info(f"Successfully assumed role: {role_arn}")
        
        return {
            "aws_access_key_id": credentials["AccessKeyId"],
            "aws_secret_access_key": credentials["SecretAccessKey"],
            "aws_session_token": credentials["SessionToken"],
        }
    except ClientError as e:
        logger.error(f"Failed to assume role {role_arn}: {e}")
        raise


def get_regional_client(service: str, region: str, credentials: Optional[Dict[str, str]] = None) -> Any:
    """
    Create a boto3 client for a specific service and region with assumed credentials.
    If credentials is None, uses default Lambda credentials for same-account scanning.
    
    Args:
        service: AWS service name (e.g., 's3', 'ec2', 'iam')
        region: AWS region
        credentials: Credentials dict from assume_role, or None for same-account
        
    Returns:
        boto3 client
    """
    if credentials is None:
        return boto3.client(service, region_name=region)
    
    return boto3.client(
        service,
        region_name=region,
        aws_access_key_id=credentials["aws_access_key_id"],
        aws_secret_access_key=credentials["aws_secret_access_key"],
        aws_session_token=credentials["aws_session_token"],
    )


def get_enabled_regions(credentials: Optional[Dict[str, str]] = None) -> list[str]:
    """
    Get list of all enabled regions for the account.
    
    Args:
        credentials: AWS credentials from assume_role, or None for same-account
        
    Returns:
        List of region names
    """
    try:
        # Use us-east-1 as a safe default for listing regions
        if credentials is None:
            ec2 = boto3.client("ec2", region_name="us-east-1")
        else:
            ec2 = boto3.client(
                "ec2",
                region_name="us-east-1",
                aws_access_key_id=credentials["aws_access_key_id"],
                aws_secret_access_key=credentials["aws_secret_access_key"],
                aws_session_token=credentials["aws_session_token"],
            )
        
        response = ec2.describe_regions(AllRegions=False)
        return [r["RegionName"] for r in response["Regions"]]
    except ClientError as e:
        logger.error(f"Failed to list regions: {e}")
        # Fallback to us-east-1 if listing fails
        return ["us-east-1"]
