"""
Rule evaluation engine with support for multiple check types.
"""
from typing import Any, Dict, List, Optional
import re
from .models import Rule, Resource, Finding
from .logging import get_logger

logger = get_logger(__name__)


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


def evaluate_rule(resource: Resource, rule: Rule, tenant_id: str) -> Optional[Finding]:
    """
    Evaluate a single rule against a resource.
    
    Args:
        resource: The resource to check
        rule: The rule to evaluate
        tenant_id: Tenant identifier
        
    Returns:
        Finding if the rule fails, None otherwise
    """
    # Check if rule applies to this resource type
    if resource.resource_type != rule.resource_type:
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
    else:
        logger.warning(f"Unknown check type: {check_type}")
        return None
    
    # Set tenant_id if finding was created
    if finding:
        finding.tenant_id = tenant_id
    
    return finding


def evaluate_resources(
    resources: List[Resource],
    rules: List[Rule],
    tenant_id: str,
) -> List[Finding]:
    """
    Evaluate all resources against all rules.
    
    Args:
        resources: List of resources to check
        rules: List of rules to evaluate
        tenant_id: Tenant identifier
        
    Returns:
        List of findings
    """
    findings = []
    
    for resource in resources:
        for rule in rules:
            try:
                finding = evaluate_rule(resource, rule, tenant_id)
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
