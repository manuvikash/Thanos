"""
Rule evaluation engine with support for multiple check types and hierarchical configuration.
"""
from typing import Any, Dict, List, Optional, Tuple
import re
import boto3
from botocore.exceptions import ClientError
from .models import Rule, Resource, Finding
from .logging import get_logger
from .config_models import BaseConfig, ResourceGroup
from .config_merger import detect_conflicts, get_effective_config, compare_configs

logger = get_logger(__name__)


def matches_selector(resource: Resource, selector: Dict[str, Any]) -> bool:
    """
    Check if a resource matches the given selector criteria.
    
    Supported selector types:
    - tags: Match resources with specific tags (e.g., {"tags": {"Environment": "production"}})
    - arn_pattern: Match resources whose ARN matches a regex (e.g., {"arn_pattern": ".*:bucket/prod-.*"})
    - name_pattern: Match resources whose name/ID matches a regex (e.g., {"name_pattern": "prod-.*"})
    
    Args:
        resource: The resource to check
        selector: Selector criteria from the rule
        
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
    
    # Check name pattern (extract from ARN or metadata)
    if "name_pattern" in selector:
        pattern = selector["name_pattern"]
        # Try to extract name from ARN (last part after /)
        name = resource.arn.split("/")[-1] if "/" in resource.arn else resource.arn.split(":")[-1]
        if not re.match(pattern, name):
            return False
    
    return True


def get_nested(obj: Any, path: str) -> Any:
    """
    Get a nested value from an object using dot notation and list wildcards.
    
    Examples:
        get_nested(obj, "a.b.c") -> obj["a"]["b"]["c"]
        get_nested(obj, "items[*].name") -> [item["name"] for item in obj["items"]]
    
    Args:
        obj: The object to traverse
        path: Dot-separated path with optional [*] for list expansion
        
    Returns:
        The value at the path, or None if not found
    """
    if not path:
        return obj
    
    parts = path.split(".")
    current = obj
    
    for part in parts:
        if current is None:
            return None
            
        # Handle list wildcard [*]
        if part.endswith("[*]"):
            key = part[:-3]
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
                
            if not isinstance(current, list):
                return None
                
            # Collect remaining path
            remaining_parts = parts[parts.index(part) + 1:]
            if remaining_parts:
                remaining_path = ".".join(remaining_parts)
                return [get_nested(item, remaining_path) for item in current]
            else:
                return current
        else:
            # Regular key access
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
    
    return current


def flatten_list(lst: List[Any]) -> List[Any]:
    """Recursively flatten a nested list."""
    result = []
    for item in lst:
        if isinstance(item, list):
            result.extend(flatten_list(item))
        else:
            result.append(item)
    return result


def evaluate_equals(resource: Resource, rule: Rule) -> Optional[Finding]:
    """
    Evaluate an 'equals' check.
    
    Args:
        resource: The resource to check
        rule: The rule to evaluate
        
    Returns:
        Finding if the check fails, None otherwise
    """
    observed = get_nested(resource.config, rule.check.path)
    expected = rule.check.expected
    
    if observed != expected:
        return Finding.create(
            tenant_id="",  # Will be set by caller
            rule=rule,
            resource=resource,
            observed=observed,
            expected=expected,
        )
    
    return None


def evaluate_forbidden_any(resource: Resource, rule: Rule) -> Optional[Finding]:
    """
    Evaluate a 'forbidden-any' check.
    Checks if any value in the path matches any forbidden value.
    
    Args:
        resource: The resource to check
        rule: The rule to evaluate
        
    Returns:
        Finding if the check fails, None otherwise
    """
    observed = get_nested(resource.config, rule.check.path)
    forbidden = rule.check.forbidden or []
    
    # Flatten if we got a nested list
    if isinstance(observed, list):
        observed = flatten_list(observed)
    else:
        observed = [observed] if observed is not None else []
    
    # Check for intersection
    observed_set = set(str(v) for v in observed if v is not None)
    forbidden_set = set(forbidden)
    violations = observed_set & forbidden_set
    
    if violations:
        return Finding.create(
            tenant_id="",
            rule=rule,
            resource=resource,
            observed=list(violations),
            expected=f"None of: {forbidden}",
        )
    
    return None


def evaluate_forbidden_cidr_port(resource: Resource, rule: Rule) -> Optional[Finding]:
    """
    Evaluate a 'forbidden-cidr-port' check for security groups.
    Checks if any ingress rule allows the specified port from the specified CIDR.
    
    Args:
        resource: The resource to check (must be a security group)
        rule: The rule to evaluate
        
    Returns:
        Finding if the check fails, None otherwise
    """
    ip_permissions = get_nested(resource.config, rule.check.path)
    if not ip_permissions or not isinstance(ip_permissions, list):
        return None
    
    params = rule.check.params or {}
    forbidden_port = params.get("port")
    forbidden_cidr = params.get("cidr")
    
    if forbidden_port is None or forbidden_cidr is None:
        logger.warning(f"forbidden-cidr-port check missing params: {params}")
        return None
    
    violations = []
    
    for permission in ip_permissions:
        from_port = permission.get("FromPort")
        to_port = permission.get("ToPort")
        
        # Check if port is in range
        if from_port is not None and to_port is not None:
            if from_port <= forbidden_port <= to_port:
                # Check CIDRs
                ip_ranges = permission.get("IpRanges", [])
                for ip_range in ip_ranges:
                    cidr = ip_range.get("CidrIp")
                    if cidr == forbidden_cidr:
                        violations.append({
                            "port": forbidden_port,
                            "cidr": cidr,
                            "from_port": from_port,
                            "to_port": to_port,
                        })
    
    if violations:
        return Finding.create(
            tenant_id="",
            rule=rule,
            resource=resource,
            observed=violations,
            expected=f"Port {forbidden_port} not open to {forbidden_cidr}",
        )
    
    return None


def evaluate_golden_config(resource: Resource, rule: Rule) -> Optional[Finding]:
    """
    Evaluate a 'golden-config' check.
    Compares a subset of the resource configuration against a golden record.
    
    Args:
        resource: The resource to check
        rule: The rule to evaluate
        
    Returns:
        Finding if the check fails, None otherwise
    """
    observed = get_nested(resource.config, rule.check.path) if rule.check.path else resource.config
    expected = rule.check.expected
    
    # Simple equality check for now. 
    # In the future, this could support partial matching or ignoring specific fields.
    if observed != expected:
        return Finding.create(
            tenant_id="",
            rule=rule,
            resource=resource,
            observed=observed,
            expected=expected,
        )
    
    return None


def fetch_base_config(table_name: str, resource_type: str) -> Optional[BaseConfig]:
    """
    Fetch base configuration for a resource type from DynamoDB.
    
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
        
        # Query all groups for this resource type
        # Note: This would be more efficient with a GSI on resource_type
        response = table.query(
            IndexName="GSI1",  # Assuming GSI1PK = resource_type, GSI1SK = priority
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
        logger.error(f"Error fetching groups for {resource.arn}: {e}")
        return []


def evaluate_with_hierarchical_config(
    resource: Resource,
    rule: Rule,
    table_name: str,
) -> Tuple[Optional[Finding], List[Dict[str, Any]]]:
    """
    Evaluate resource against hierarchical configuration (base config + groups).
    
    This function:
    1. Fetches base config for resource type
    2. Fetches matching resource groups
    3. Merges configs with conflict detection
    4. Compares resource config against merged config
    5. Returns finding if there's drift
    
    Args:
        resource: The resource to check
        rule: The rule being evaluated (used for metadata)
        table_name: DynamoDB table name for fetching configs
        
    Returns:
        Tuple of (Finding if drift detected, List of conflicts)
    """
    # Fetch base config
    base_config_obj = fetch_base_config(table_name, resource.resource_type)
    
    # Fetch matching groups
    matching_groups = fetch_matching_groups(table_name, resource)
    
    # If no base config and no groups, nothing to evaluate
    if not base_config_obj and not matching_groups:
        return None, []
    
    # Build list of configs to merge
    configs = []
    
    if base_config_obj:
        configs.append({
            "source": f"base:{resource.resource_type}",
            "priority": 0,
            "config": base_config_obj.config
        })
    
    for group in matching_groups:
        configs.append({
            "source": f"group:{group.name}",
            "priority": group.priority,
            "config": group.config_overrides
        })
    
    # Merge configs and detect conflicts
    merged_config, conflicts = detect_conflicts(configs)
    
    # Get effective config (no conflict resolutions in this context)
    effective_config = get_effective_config(configs, {})
    
    # Compare resource config against effective config
    drift = compare_configs(effective_config, resource.config)
    
    if drift:
        # Create finding for configuration drift
        finding = Finding.create(
            tenant_id="",
            rule=rule,
            resource=resource,
            observed=resource.config,
            expected=effective_config,
        )
        
        # Add drift details to finding metadata
        finding.metadata = finding.metadata or {}
        finding.metadata["drift"] = drift
        finding.metadata["applied_configs"] = [c["source"] for c in configs]
        finding.metadata["conflict_count"] = len(conflicts)
        
        return finding, conflicts
    
    return None, conflicts


def evaluate_rule(
    resource: Resource,
    rule: Rule,
    tenant_id: str,
    snapshot_key: str = "",
    table_name: Optional[str] = None,
    use_hierarchical: bool = True,
) -> Optional[Finding]:
    """
    Evaluate a single rule against a resource.
    
    Args:
        resource: The resource to check
        rule: The rule to evaluate
        tenant_id: Tenant identifier
        snapshot_key: Snapshot key for grouping findings by scan
        table_name: DynamoDB table name for fetching hierarchical configs (optional)
        use_hierarchical: Whether to use hierarchical config evaluation (default: True)
        
    Returns:
        Finding if the rule fails, None otherwise
    """
    # Check if rule applies to this resource type
    if resource.resource_type != rule.resource_type:
        return None
    
    # Check if rule selector matches the resource
    if not matches_selector(resource, rule.selector):
        return None
    
    finding = None
    
    # For golden-config checks, optionally use hierarchical evaluation
    if rule.check.type == "golden-config" and use_hierarchical and table_name:
        try:
            finding, conflicts = evaluate_with_hierarchical_config(
                resource, rule, table_name
            )
            
            # Log conflicts for visibility
            if conflicts:
                logger.warning(
                    f"Config conflicts detected for {resource.arn}: {len(conflicts)} conflicts"
                )
                for conflict in conflicts[:5]:  # Log first 5
                    logger.warning(f"  Path: {conflict['path']}, Sources: {conflict['sources']}")
                    
        except Exception as e:
            logger.error(f"Error in hierarchical config evaluation: {e}")
            # Fall back to traditional evaluation
            finding = evaluate_golden_config(resource, rule)
    else:
        # Traditional rule evaluation
        check_type = rule.check.type
        
        if check_type == "equals":
            finding = evaluate_equals(resource, rule)
        elif check_type == "forbidden-any":
            finding = evaluate_forbidden_any(resource, rule)
        elif check_type == "forbidden-cidr-port":
            finding = evaluate_forbidden_cidr_port(resource, rule)
        elif check_type == "golden-config":
            finding = evaluate_golden_config(resource, rule)
        else:
            logger.warning(f"Unknown check type: {check_type}")
            return None
    
    # Set tenant_id and snapshot_key if finding was created
    if finding:
        finding.tenant_id = tenant_id
        finding.snapshot_key = snapshot_key
    
    return finding


def evaluate_resources(
    resources: List[Resource],
    rules: List[Rule],
    tenant_id: str,
    snapshot_key: str = "",
    table_name: Optional[str] = None,
    use_hierarchical: bool = True,
) -> List[Finding]:
    """
    Evaluate all resources against all rules.
    
    Args:
        resources: List of resources to check
        rules: List of rules to evaluate
        tenant_id: Tenant identifier
        snapshot_key: Snapshot key for grouping findings by scan
        table_name: DynamoDB table name for hierarchical configs (optional)
        use_hierarchical: Whether to use hierarchical config evaluation (default: True)
        
    Returns:
        List of findings
    """
    findings = []
    
    for resource in resources:
        for rule in rules:
            try:
                finding = evaluate_rule(
                    resource,
                    rule,
                    tenant_id,
                    snapshot_key,
                    table_name=table_name,
                    use_hierarchical=use_hierarchical,
                )
                if finding:
                    findings.append(finding)
                    logger.info(
                        f"Finding: {rule.id} failed for {resource.arn}"
                    )
            except Exception as e:
                logger.error(
                    f"Error evaluating rule {rule.id} for {resource.arn}: {e}"
                )
                continue
    
    return findings
