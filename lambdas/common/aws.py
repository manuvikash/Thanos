"""
AWS client utilities for assuming roles and creating regional clients.
"""
import boto3
from typing import Dict, Any
from botocore.exceptions import ClientError
from .logging import get_logger

logger = get_logger(__name__)


def assume_role(role_arn: str, session_name: str = "GoldenGuardScan") -> Dict[str, str]:
    """
    Assume an IAM role and return temporary credentials.
    
    Args:
        role_arn: The ARN of the role to assume
        session_name: Session name for the assumed role
        
    Returns:
        Dict with AccessKeyId, SecretAccessKey, SessionToken
    """
    sts = boto3.client("sts")
    
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


def get_regional_client(service: str, region: str, credentials: Dict[str, str]) -> Any:
    """
    Create a boto3 client for a specific service and region with assumed credentials.
    
    Args:
        service: AWS service name (e.g., 's3', 'ec2', 'iam')
        region: AWS region
        credentials: Credentials dict from assume_role
        
    Returns:
        boto3 client
    """
    return boto3.client(
        service,
        region_name=region,
        aws_access_key_id=credentials["aws_access_key_id"],
        aws_secret_access_key=credentials["aws_secret_access_key"],
        aws_session_token=credentials["aws_session_token"],
    )


def get_enabled_regions(credentials: Dict[str, str]) -> list[str]:
    """
    Get list of all enabled regions for the account.
    
    Args:
        credentials: AWS credentials from assume_role
        
    Returns:
        List of region names
    """
    try:
        # Use us-east-1 as a safe default for listing regions
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
