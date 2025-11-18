"""
Core data models for the golden config drift detector.
"""
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid


@dataclass
class RuleCheck:
    """Defines how to evaluate a rule."""
    type: str  # equals, forbidden-any, forbidden-cidr-port
    path: str
    expected: Optional[Any] = None
    forbidden: Optional[List[str]] = None
    params: Optional[Dict[str, Any]] = None


@dataclass
class Rule:
    """A golden configuration rule."""
    id: str
    resource_type: str
    check: RuleCheck
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    message: str
    selector: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Rule":
        """Parse a rule from YAML dict."""
        check_data = data["check"]
        check = RuleCheck(
            type=check_data["type"],
            path=check_data["path"],
            expected=check_data.get("expected"),
            forbidden=check_data.get("forbidden"),
            params=check_data.get("params"),
        )
        return cls(
            id=data["id"],
            resource_type=data["resource_type"],
            check=check,
            severity=data["severity"],
            message=data["message"],
            selector=data.get("selector", {}),
        )


@dataclass
class Resource:
    """A normalized AWS resource."""
    arn: str
    resource_type: str
    config: Dict[str, Any]
    region: str
    account_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Finding:
    """A configuration drift finding."""
    finding_id: str
    tenant_id: str
    rule_id: str
    resource_arn: str
    severity: str
    message: str
    observed: Any
    expected: Any
    timestamp: str
    account_id: str
    region: str
    snapshot_key: str = ""

    @classmethod
    def create(
        cls,
        tenant_id: str,
        rule: Rule,
        resource: Resource,
        observed: Any,
        expected: Any,
        snapshot_key: str = "",
    ) -> "Finding":
        """Create a new finding."""
        return cls(
            finding_id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            rule_id=rule.id,
            resource_arn=resource.arn,
            severity=rule.severity,
            message=rule.message,
            observed=observed,
            expected=expected,
            timestamp=datetime.utcnow().isoformat() + "Z",
            account_id=resource.account_id,
            region=resource.region,
            snapshot_key=snapshot_key,
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
