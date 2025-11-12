"""
Resource normalization for S3, IAM, and Security Groups.
"""
from typing import Any, Dict, List
from botocore.exceptions import ClientError
from .models import Resource
from .logging import get_logger

logger = get_logger(__name__)


def normalize_s3_buckets(s3_client: Any, account_id: str, region: str) -> List[Resource]:
    """
    Collect and normalize S3 bucket configurations.
    
    Args:
        s3_client: boto3 S3 client
        account_id: AWS account ID
        region: AWS region
        
    Returns:
        List of normalized S3 bucket resources
    """
    resources = []
    
    try:
        response = s3_client.list_buckets()
        buckets = response.get("Buckets", [])
        
        for bucket in buckets:
            bucket_name = bucket["Name"]
            arn = f"arn:aws:s3:::{bucket_name}"
            
            # Get public access block configuration
            public_access_config = {
                "BlockPublicAcls": False,
                "IgnorePublicAcls": False,
                "BlockPublicPolicy": False,
                "RestrictPublicBuckets": False,
            }
            
            try:
                pab_response = s3_client.get_public_access_block(Bucket=bucket_name)
                config = pab_response.get("PublicAccessBlockConfiguration", {})
                public_access_config.update(config)
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code")
                if error_code != "NoSuchPublicAccessBlockConfiguration":
                    logger.warning(
                        f"Error getting public access block for {bucket_name}: {e}"
                    )
            
            resource = Resource(
                arn=arn,
                resource_type="AWS::S3::Bucket",
                config={
                    "BucketName": bucket_name,
                    "PublicAccessBlockConfiguration": public_access_config,
                },
                region=region,
                account_id=account_id,
            )
            resources.append(resource)
            
    except ClientError as e:
        logger.error(f"Error listing S3 buckets: {e}")
    
    return resources


def normalize_iam_policies(iam_client: Any, account_id: str, region: str) -> List[Resource]:
    """
    Collect and normalize IAM policy configurations.
    
    Args:
        iam_client: boto3 IAM client
        account_id: AWS account ID
        region: AWS region (IAM is global but we track it)
        
    Returns:
        List of normalized IAM policy resources
    """
    resources = []
    
    try:
        paginator = iam_client.get_paginator("list_policies")
        page_iterator = paginator.paginate(Scope="Local", OnlyAttached=False)
        
        for page in page_iterator:
            policies = page.get("Policies", [])
            
            for policy in policies:
                policy_arn = policy["Arn"]
                policy_name = policy["PolicyName"]
                default_version_id = policy["DefaultVersionId"]
                
                # Get policy document
                try:
                    version_response = iam_client.get_policy_version(
                        PolicyArn=policy_arn,
                        VersionId=default_version_id,
                    )
                    policy_document = version_response["PolicyVersion"]["Document"]
                    
                    resource = Resource(
                        arn=policy_arn,
                        resource_type="AWS::IAM::Policy",
                        config={
                            "PolicyName": policy_name,
                            "PolicyDocument": policy_document,
                        },
                        region=region,
                        account_id=account_id,
                    )
                    resources.append(resource)
                    
                except ClientError as e:
                    logger.warning(
                        f"Error getting policy version for {policy_arn}: {e}"
                    )
                    continue
                    
    except ClientError as e:
        logger.error(f"Error listing IAM policies: {e}")
    
    return resources


def normalize_security_groups(ec2_client: Any, account_id: str, region: str) -> List[Resource]:
    """
    Collect and normalize EC2 security group configurations.
    
    Args:
        ec2_client: boto3 EC2 client
        account_id: AWS account ID
        region: AWS region
        
    Returns:
        List of normalized security group resources
    """
    resources = []
    
    try:
        response = ec2_client.describe_security_groups()
        security_groups = response.get("SecurityGroups", [])
        
        for sg in security_groups:
            sg_id = sg["GroupId"]
            sg_name = sg["GroupName"]
            vpc_id = sg.get("VpcId", "")
            
            arn = f"arn:aws:ec2:{region}:{account_id}:security-group/{sg_id}"
            
            resource = Resource(
                arn=arn,
                resource_type="AWS::EC2::SecurityGroup",
                config={
                    "GroupId": sg_id,
                    "GroupName": sg_name,
                    "VpcId": vpc_id,
                    "IpPermissions": sg.get("IpPermissions", []),
                    "IpPermissionsEgress": sg.get("IpPermissionsEgress", []),
                },
                region=region,
                account_id=account_id,
            )
            resources.append(resource)
            
    except ClientError as e:
        logger.error(f"Error describing security groups in {region}: {e}")
    
    return resources


def collect_resources(
    credentials: Dict[str, str],
    account_id: str,
    regions: List[str],
) -> List[Resource]:
    """
    Collect all resources from the specified regions.
    
    Args:
        credentials: AWS credentials from assume_role
        account_id: AWS account ID
        regions: List of regions to scan
        
    Returns:
        List of all collected resources
    """
    import boto3
    
    all_resources = []
    
    for region in regions:
        logger.info(f"Collecting resources from region: {region}")
        
        # S3 (global service, only collect once)
        if region == regions[0]:
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=credentials["aws_access_key_id"],
                aws_secret_access_key=credentials["aws_secret_access_key"],
                aws_session_token=credentials["aws_session_token"],
            )
            s3_resources = normalize_s3_buckets(s3_client, account_id, region)
            all_resources.extend(s3_resources)
            logger.info(f"Collected {len(s3_resources)} S3 buckets")
        
        # IAM (global service, only collect once)
        if region == regions[0]:
            iam_client = boto3.client(
                "iam",
                aws_access_key_id=credentials["aws_access_key_id"],
                aws_secret_access_key=credentials["aws_secret_access_key"],
                aws_session_token=credentials["aws_session_token"],
            )
            iam_resources = normalize_iam_policies(iam_client, account_id, region)
            all_resources.extend(iam_resources)
            logger.info(f"Collected {len(iam_resources)} IAM policies")
        
        # EC2 Security Groups (regional)
        ec2_client = boto3.client(
            "ec2",
            region_name=region,
            aws_access_key_id=credentials["aws_access_key_id"],
            aws_secret_access_key=credentials["aws_secret_access_key"],
            aws_session_token=credentials["aws_session_token"],
        )
        sg_resources = normalize_security_groups(ec2_client, account_id, region)
        all_resources.extend(sg_resources)
        logger.info(f"Collected {len(sg_resources)} security groups from {region}")
    
    return all_resources
