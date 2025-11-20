"""
Core data models for the golden config drift detector.
"""
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid


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
    rule_id: str  # Now references config ID (base config or group ID)
    resource_arn: str
    severity: str
    message: str
    observed: Any
    expected: Any
    timestamp: str
    account_id: str
    region: str
    category: str = "compliance"
    snapshot_key: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
