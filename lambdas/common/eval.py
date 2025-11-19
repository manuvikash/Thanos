"""
Rule evaluation engine with support for multiple check types.
"""
from typing import Any, Dict, List, Optional
import re
from .models import Rule, Resource, Finding
from .logging import get_logger

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


def evaluate_rule(resource: Resource, rule: Rule, tenant_id: str, snapshot_key: str = "") -> Optional[Finding]:
    """
    Evaluate a single rule against a resource.
    
    Args:
        resource: The resource to check
        rule: The rule to evaluate
        tenant_id: Tenant identifier
        snapshot_key: Snapshot key for grouping findings by scan
        
    Returns:
        Finding if the rule fails, None otherwise
    """
    # Check if rule applies to this resource type
    if resource.resource_type != rule.resource_type:
        return None
    
    # Check if rule selector matches the resource
    if not matches_selector(resource, rule.selector):
        return None
    
    # Evaluate based on check type
    check_type = rule.check.type
    finding = None
    
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
) -> List[Finding]:
    """
    Evaluate all resources against all rules.
    
    Args:
        resources: List of resources to check
        rules: List of rules to evaluate
        tenant_id: Tenant identifier
        snapshot_key: Snapshot key for grouping findings by scan
        
    Returns:
        List of findings
    """
    findings = []
    
    for resource in resources:
        for rule in rules:
            try:
                finding = evaluate_rule(resource, rule, tenant_id, snapshot_key)
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
