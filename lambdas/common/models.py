"""
Core data models for the golden config drift detector.
"""
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from datetime import datetime
from decimal import Decimal
import uuid


@dataclass
class Resource:
    """A normalized AWS resource with compliance tracking."""
    arn: str
    resource_type: str
    config: Dict[str, Any]
    region: str
    account_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Compliance tracking
    tenant_id: str = ""
    compliance_status: str = "NOT_EVALUATED"  # COMPLIANT, NON_COMPLIANT, NOT_EVALUATED
    drift_score: float = 0.0  # 0.0 to 1.0
    findings_count: int = 0
    last_evaluated: str = ""
    
    # Configuration hierarchy
    base_config_applied: Optional[str] = None
    groups_applied: List[str] = field(default_factory=list)
    desired_config: Dict[str, Any] = field(default_factory=dict)
    
    # Snapshot tracking
    snapshot_key: str = ""
    scan_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def to_dynamodb_item(self) -> Dict[str, Any]:
        """Convert to DynamoDB item format."""
        return {
            'PK': f"{self.tenant_id}#{self.snapshot_key}",
            'SK': self.arn,
            'tenant_id': self.tenant_id,
            'resource_arn': self.arn,
            'resource_type': self.resource_type,
            'region': self.region,
            'account_id': self.account_id,
            'compliance_status': self.compliance_status,
            'drift_score': Decimal(str(self.drift_score)),
            'findings_count': self.findings_count,
            'last_evaluated': self.last_evaluated,
            'config': self.config,
            'desired_config': self.desired_config,
            'metadata': self.metadata,
            'base_config_applied': self.base_config_applied or '',
            'groups_applied': self.groups_applied,
            'snapshot_key': self.snapshot_key,
            'scan_id': self.scan_id,
            'GSI1PK': f"{self.tenant_id}#{self.resource_type}",
            'GSI1SK': f"{self.compliance_status}#{self.drift_score:.4f}",
            'GSI2PK': f"{self.tenant_id}#{self.compliance_status}",
            'GSI2SK': self.last_evaluated,
        }


@dataclass
class Finding:
    """A configuration drift finding."""
    finding_id: str
    tenant_id: str
    rule_id: str  # Now references config ID (base config or group ID)
    resource_arn: str
    resource_type: str
    severity: str
    message: str
    observed: Any
    expected: Any
    timestamp: str
    account_id: str
    region: str
    category: str = "compliance"
    snapshot_key: str = ""
    status: str = "OPEN"
    differences: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
