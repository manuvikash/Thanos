"""
Data models for hierarchical configuration management.
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime


@dataclass
class BaseConfig:
    """Base desired configuration for a resource type."""
    resource_type: str
    desired_config: Dict[str, Any]  # What the config should look like
    version: str = "v1"
    editable: bool = True
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: str = "system"
    
    def to_dynamodb(self) -> Dict[str, Any]:
        """Convert to DynamoDB item."""
        return {
            'PK': f'BASE_CONFIG#{self.resource_type}',
            'SK': self.version,
            'desired_config': self.desired_config,
            'editable': self.editable,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'created_by': self.created_by,
            'GSI1PK': self.resource_type,
            'GSI1SK': '0'  # Base configs have priority 0
        }
    
    @classmethod
    def from_dynamodb(cls, item: Dict[str, Any]) -> 'BaseConfig':
        """Create from DynamoDB item."""
        resource_type = item['PK'].replace('BASE_CONFIG#', '')
        return cls(
            resource_type=resource_type,
            desired_config=item.get('desired_config', {}),
            version=item.get('SK', 'v1'),
            editable=item.get('editable', True),
            created_at=item.get('created_at', ''),
            updated_at=item.get('updated_at', ''),
            created_by=item.get('created_by', 'system')
        )


@dataclass
class ResourceGroup:
    """Resource group with desired config for matching resources."""
    group_id: str
    name: str
    resource_type: str
    selector: Dict[str, Any]
    priority: int = 100
    description: str = ""
    desired_config: Dict[str, Any] = field(default_factory=dict)  # What matching resources should look like
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: str = "system"
    
    def to_dynamodb(self) -> Dict[str, Any]:
        """Convert to DynamoDB item."""
        return {
            'PK': f'GROUP#{self.group_id}',
            'SK': 'METADATA',
            'name': self.name,
            'resource_type': self.resource_type,
            'selector': self.selector,
            'priority': self.priority,
            'description': self.description,
            'desired_config': self.desired_config,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'created_by': self.created_by,
            'GSI1PK': self.resource_type,
            'GSI1SK': str(self.priority)
        }
    
    @classmethod
    def from_dynamodb(cls, item: Dict[str, Any]) -> 'ResourceGroup':
        """Create from DynamoDB item."""
        group_id = item['PK'].replace('GROUP#', '')
        return cls(
            group_id=group_id,
            name=item.get('name', ''),
            resource_type=item.get('resource_type', ''),
            selector=item.get('selector', {}),
            priority=item.get('priority', 100),
            description=item.get('description', ''),
            desired_config=item.get('desired_config', {}),
            created_at=item.get('created_at', ''),
            updated_at=item.get('updated_at', ''),
            created_by=item.get('created_by', 'system')
        )


@dataclass
class ConfigTemplate:
    """Pre-built desired configuration template."""
    template_id: str
    name: str
    resource_type: str
    description: str
    desired_config: Dict[str, Any]  # What the config should look like
    category: str = "general"  # general, security, compliance, performance
    is_custom: bool = False
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: str = "system"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'template_id': self.template_id,
            'name': self.name,
            'resource_type': self.resource_type,
            'description': self.description,
            'desired_config': self.desired_config,
            'category': self.category,
            'is_custom': self.is_custom,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def to_dynamodb(self) -> Dict[str, Any]:
        """Convert to DynamoDB item."""
        return {
            'PK': f'TEMPLATE#{self.template_id}',
            'SK': 'v1',
            'name': self.name,
            'resource_type': self.resource_type,
            'description': self.description,
            'desired_config': self.desired_config,
            'category': self.category,
            'is_custom': self.is_custom,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'created_by': self.created_by,
            'GSI1PK': self.resource_type,
            'GSI1SK': 'TEMPLATE'
        }
    
    @classmethod
    def from_dynamodb(cls, item: Dict[str, Any]) -> 'ConfigTemplate':
        """Create from DynamoDB item."""
        template_id = item['PK'].replace('TEMPLATE#', '')
        return cls(
            template_id=template_id,
            name=item.get('name', ''),
            resource_type=item.get('resource_type', ''),
            description=item.get('description', ''),
            desired_config=item.get('desired_config', {}),
            category=item.get('category', 'general'),
            is_custom=item.get('is_custom', False),
            created_at=item.get('created_at', ''),
            updated_at=item.get('updated_at', ''),
            created_by=item.get('created_by', 'system')
        )


@dataclass
class ConflictResolution:
    """Conflict resolution for a specific resource."""
    resource_arn: str
    resolutions: Dict[str, Any]  # path -> resolution strategy
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dynamodb(self) -> Dict[str, Any]:
        """Convert to DynamoDB item."""
        return {
            'PK': f'RESOURCE#{self.resource_arn}',
            'SK': 'CONFLICT_RESOLUTION',
            'resolutions': self.resolutions,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dynamodb(cls, item: Dict[str, Any]) -> 'ConfigResolution':
        """Create from DynamoDB item."""
        resource_arn = item['PK'].replace('RESOURCE#', '')
        return cls(
            resource_arn=resource_arn,
            resolutions=item.get('resolutions', {}),
            created_at=item.get('created_at', ''),
            updated_at=item.get('updated_at', '')
        )


@dataclass
class Conflict:
    """Configuration conflict between multiple sources."""
    path: str
    values: List[tuple]  # [(priority, value, source), ...]
    resource_arn: str
    resolution_strategy: str = "use_highest_priority"  # or "manual"
    manual_value: Optional[Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'path': self.path,
            'values': [{'priority': p, 'value': v, 'source': s} for p, v, s in self.values],
            'resource_arn': self.resource_arn,
            'resolution_strategy': self.resolution_strategy,
            'manual_value': self.manual_value
        }
