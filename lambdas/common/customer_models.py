"""
Customer data models and validation utilities for the customer management system.
"""
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional
from datetime import datetime
import re


@dataclass
class Customer:
    """A registered customer with AWS account details."""
    tenant_id: str
    customer_name: str
    role_arn: str
    account_id: str
    regions: List[str]
    created_at: str
    updated_at: str
    status: str = "active"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert customer to dictionary representation."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Customer":
        """Create Customer instance from dictionary."""
        return cls(**data)
    
    @classmethod
    def create(
        cls,
        tenant_id: str,
        customer_name: str,
        role_arn: str,
        account_id: str,
        regions: List[str],
    ) -> "Customer":
        """Create a new customer with timestamps."""
        now = datetime.utcnow().isoformat() + "Z"
        return cls(
            tenant_id=tenant_id,
            customer_name=customer_name,
            role_arn=role_arn,
            account_id=account_id,
            regions=regions,
            created_at=now,
            updated_at=now,
            status="active",
        )


def validate_tenant_id(tenant_id: str) -> Optional[str]:
    """
    Validate tenant_id format.
    
    Args:
        tenant_id: The tenant identifier to validate
        
    Returns:
        Error message if validation fails, None if valid
        
    Rules:
        - Must be 3-50 characters long
        - Must contain only alphanumeric characters and hyphens
    """
    if not tenant_id:
        return "tenant_id is required"
    
    if len(tenant_id) < 3 or len(tenant_id) > 50:
        return "tenant_id must be 3-50 characters"
    
    if not re.match(r'^[a-zA-Z0-9-]+$', tenant_id):
        return "tenant_id must contain only alphanumeric characters and hyphens"
    
    return None


def validate_customer_name(customer_name: str) -> Optional[str]:
    """
    Validate customer_name format.
    
    Args:
        customer_name: The customer name to validate
        
    Returns:
        Error message if validation fails, None if valid
        
    Rules:
        - Must be 1-100 characters long
        - Must not be empty
    """
    if not customer_name:
        return "customer_name is required"
    
    if len(customer_name) < 1 or len(customer_name) > 100:
        return "customer_name must be 1-100 characters"
    
    return None


def validate_role_arn(role_arn: str) -> Optional[str]:
    """
    Validate IAM role ARN format.
    
    Args:
        role_arn: The IAM role ARN to validate
        
    Returns:
        Error message if validation fails, None if valid
        
    Rules:
        - Must match pattern: arn:aws:iam::<12-digit-account-id>:role/<role-name>
    """
    if not role_arn:
        return "role_arn is required"
    
    pattern = r'^arn:aws:iam::\d{12}:role/.+$'
    if not re.match(pattern, role_arn):
        return "role_arn must be a valid IAM role ARN (format: arn:aws:iam::<account-id>:role/<role-name>)"
    
    return None


def validate_account_id(account_id: str) -> Optional[str]:
    """
    Validate AWS account ID format.
    
    Args:
        account_id: The AWS account ID to validate
        
    Returns:
        Error message if validation fails, None if valid
        
    Rules:
        - Must be exactly 12 digits
    """
    if not account_id:
        return "account_id is required"
    
    if not re.match(r'^\d{12}$', account_id):
        return "account_id must be a 12-digit number"
    
    return None


def validate_regions(regions: List[str]) -> Optional[str]:
    """
    Validate AWS regions list.
    
    Args:
        regions: List of AWS region identifiers to validate
        
    Returns:
        Error message if validation fails, None if valid
        
    Rules:
        - Must contain at least one region
        - Each region must match AWS region pattern (e.g., us-east-1, eu-west-2)
    """
    if not regions or len(regions) == 0:
        return "regions must contain at least one region"
    
    region_pattern = r'^[a-z]{2}-[a-z]+-\d{1}$'
    for region in regions:
        if not re.match(region_pattern, region):
            return f"Invalid region format: {region}"
    
    return None


def validate_customer_data(
    tenant_id: str,
    customer_name: str,
    role_arn: str,
    account_id: str,
    regions: List[str],
) -> Optional[str]:
    """
    Validate all customer data fields.
    
    Args:
        tenant_id: The tenant identifier
        customer_name: The customer name
        role_arn: The IAM role ARN
        account_id: The AWS account ID
        regions: List of AWS regions
        
    Returns:
        First validation error message encountered, or None if all fields are valid
    """
    error = validate_tenant_id(tenant_id)
    if error:
        return error
    
    error = validate_customer_name(customer_name)
    if error:
        return error
    
    error = validate_role_arn(role_arn)
    if error:
        return error
    
    error = validate_account_id(account_id)
    if error:
        return error
    
    error = validate_regions(regions)
    if error:
        return error
    
    return None
