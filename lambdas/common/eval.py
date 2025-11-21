"""
Simplified rule evaluation engine using hierarchical desired configuration.

No complex check types - just compare actual config vs desired config.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
import re
import uuid
import boto3
from botocore.exceptions import ClientError
from .models import Resource, Finding
from .logging import get_logger
from .config_models import BaseConfig, ResourceGroup
from .config_merger import deep_merge, compare_configs

logger = get_logger(__name__)


def matches_selector(resource: Resource, selector: Dict[str, Any]) -> bool:
    """
    Check if a resource matches the given selector criteria.
    
    Supported selector types:
    - tags: Match resources with specific tags
    - arn_pattern: Match resources whose ARN matches a regex
    - name_pattern: Match resources whose name/ID matches a regex
    
    Args:
        resource: The resource to check
        selector: Selector criteria
        
    Returns:
        True if resource matches selector, False otherwise (empty selector matches all)
    """
    if not selector:
        return True
    
    # Check tags
    if "tags" in selector:
        resource_tags = resource.metadata.get("Tags", {})
        # Convert list of {Key: x, Value: y} to dict if needed
        if isinstance(resource_tags, list):
            resource_tags = {tag.get("Key"): tag.get("Value") for tag in resource_tags}
        
        for key, value in selector["tags"].items():
            if resource_tags.get(key) != value:
                return False
    
    # Check ARN pattern
    if "arn_pattern" in selector:
        pattern = selector["arn_pattern"]
        if not re.match(pattern, resource.arn):
            return False
    
    # Check name pattern
    if "name_pattern" in selector:
        pattern = selector["name_pattern"]
        name = resource.arn.split("/")[-1] if "/" in resource.arn else resource.arn.split(":")[-1]
        if not re.match(pattern, name):
            return False
    
    return True


def fetch_base_config(table_name: str, resource_type: str) -> Optional[BaseConfig]:
    """
    Fetch base desired configuration for a resource type from DynamoDB.
    
    Args:
        table_name: DynamoDB table name
        resource_type: AWS resource type (e.g., "AWS::S3::Bucket")
        
    Returns:
        BaseConfig if found, None otherwise
    """
    try:
        dynamodb = boto3.resource("dynamodb", region_name="us-west-1")
        table = dynamodb.Table(table_name)
        
        response = table.get_item(
            Key={
                "PK": f"BASE_CONFIG#{resource_type}",
                "SK": "v1"
            }
        )
        
        if "Item" in response:
            return BaseConfig.from_dynamodb(response["Item"])
        
        return None
        
    except ClientError as e:
        logger.error(f"Error fetching base config for {resource_type}: {e}")
        return None


def fetch_matching_groups(table_name: str, resource: Resource) -> List[ResourceGroup]:
    """
    Fetch all resource groups that match the given resource.
    
    Args:
        table_name: DynamoDB table name
        resource: Resource to match against
        
    Returns:
        List of matching ResourceGroup objects, sorted by priority (lowest first)
    """
    try:
        dynamodb = boto3.resource("dynamodb", region_name="us-west-1")
        table = dynamodb.Table(table_name)
        
        # Query using GSI1 for efficient lookup
        response = table.query(
            IndexName="GSI1",
            KeyConditionExpression="GSI1PK = :resource_type",
            ExpressionAttributeValues={
                ":resource_type": resource.resource_type
            }
        )
        
        matching_groups = []
        
        for item in response.get("Items", []):
            # Skip non-group items
            if not item.get("PK", "").startswith("GROUP#"):
                continue
                
            group = ResourceGroup.from_dynamodb(item)
            
            # Check if resource matches group selector
            if matches_selector(resource, group.selector):
                matching_groups.append(group)
        
        # Sort by priority (lowest first, so they're applied in correct order)
        matching_groups.sort(key=lambda g: g.priority)
        
        return matching_groups
        
    except ClientError as e:
        logger.error(f"Error fetching matching groups for {resource.arn}: {e}")
        return []


def evaluate_resource(resource: Resource, table_name: str) -> tuple:
    """
    Evaluate a resource against hierarchical desired configuration.
    
    Process:
    1. Fetch base config for resource type
    2. Fetch all matching groups
    3. Merge configs hierarchically (base → groups in priority order)
    4. Compare actual resource config vs desired config
    5. Report any differences as findings
    
    Args:
        resource: The resource to evaluate
        table_name: DynamoDB table containing configs
        
    Returns:
        Tuple of (updated_resource, findings_list)
    """
    findings = []
    
    # 1. Fetch base config
    base_config = fetch_base_config(table_name, resource.resource_type)
    if not base_config:
        logger.debug(f"No base config found for {resource.resource_type}")
        resource.compliance_status = "NOT_EVALUATED"
        resource.last_evaluated = datetime.utcnow().isoformat()
        return resource, findings
    
    # 2. Fetch matching groups
    matching_groups = fetch_matching_groups(table_name, resource)
    
    # 3. Build hierarchical desired config
    desired_config = base_config.desired_config.copy()
    
    # Apply each group's config in priority order
    for group in matching_groups:
        desired_config = deep_merge(desired_config, group.desired_config)
    
    # 4. Store hierarchy info in resource
    resource.base_config_applied = f"{base_config.resource_type}#{base_config.version}"
    resource.groups_applied = [g.name for g in matching_groups]
    resource.desired_config = desired_config
    resource.last_evaluated = datetime.utcnow().isoformat()
    
    # 5. Compare actual vs desired
    differences = compare_configs(desired_config, resource.config)
    
    # 6. Calculate compliance and drift score
    if not differences:
        resource.compliance_status = "COMPLIANT"
        resource.drift_score = 0.0
        resource.findings_count = 0
    else:
        resource.compliance_status = "NON_COMPLIANT"
        # Drift score based on number of differences (normalized to 0-1)
        resource.drift_score = min(1.0, len(differences) / 10.0)
        
        # Calculate severity based on difference types and values
        severity = "LOW"
        if len(differences) > 5:
            severity = "MEDIUM"
        if len(differences) > 10:
            severity = "HIGH"
        
        # Generate finding
        finding = Finding(
            tenant_id=resource.tenant_id,
            finding_id=f"{resource.arn}#{uuid.uuid4().hex[:8]}",
            resource_arn=resource.arn,
            resource_type=resource.resource_type,
            rule_id="hierarchical-config",
            severity=severity,
            status="OPEN",
            message=f"Resource configuration drift detected: {len(differences)} differences from desired state",
            observed=resource.config,
            expected=desired_config,
            timestamp=datetime.utcnow().isoformat(),
            account_id=resource.account_id,
            region=resource.region,
            category="compliance",
            differences=differences,
            metadata={
                "base_config_applied": resource.base_config_applied,
                "groups_applied": resource.groups_applied,
                "num_differences": len(differences),
                "drift_score": resource.drift_score
            }
        )
        findings.append(finding)
        resource.findings_count = len(findings)
    
    return resource, findings


def evaluate_resources(tenant_id: str, resources: List[Resource], table_name: str) -> tuple:
    """
    Evaluate multiple resources against hierarchical configuration.
    
    Args:
        tenant_id: Tenant ID for the findings
        resources: List of resources to evaluate
        table_name: DynamoDB table containing configs
        
    Returns:
        Tuple of (updated_resources, all_findings)
    """
    updated_resources = []
    all_findings = []
    
    for resource in resources:
        resource.tenant_id = tenant_id
        updated_resource, findings = evaluate_resource(resource, table_name)
        updated_resources.append(updated_resource)
        all_findings.extend(findings)
    
    logger.info(f"Evaluated {len(resources)} resources, found {len(all_findings)} findings")
    
    return updated_resources, all_findings
