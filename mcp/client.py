"""
API client for Thanos backend with automatic Cognito authentication.
"""
import requests
import os
from typing import Dict, List, Optional, Any
import logging

# Handle both module and script imports
try:
    from .auth import CognitoAuthManager
except ImportError:
    # When running as a script, use absolute imports
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from auth import CognitoAuthManager

logger = logging.getLogger(__name__)


class ThanosAPIClient:
    """
    Client for Thanos API with automatic authentication and token management.
    
    Environment variables required:
    - THANOS_API_URL: Base URL for Thanos API Gateway
    - THANOS_USER_POOL_ID, THANOS_CLIENT_ID, THANOS_EMAIL, THANOS_PASSWORD (via auth manager)
    """
    
    def __init__(self):
        # Validate required environment variables
        required_vars = ['THANOS_API_URL']
        missing_vars = [var for var in required_vars if var not in os.environ]
        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}\n"
                "Please set these in your Claude Desktop config or environment."
            )
        
        self.api_url = os.environ['THANOS_API_URL']
        self.auth_manager = CognitoAuthManager()
        logger.info(f"Initialized ThanosAPIClient for {self.api_url}")
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated request to Thanos API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path (e.g., '/resources')
            params: Query parameters
            json_data: Request body for POST/PUT
        
        Returns:
            dict: Response JSON
        
        Raises:
            requests.HTTPError: On API errors
        """
        # Get valid token (handles refresh automatically)
        token = self.auth_manager.authenticate()
        
        headers = {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
        
        url = f"{self.api_url}{endpoint}"
        
        logger.debug(f"{method} {endpoint}")
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_data,
                timeout=30
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.HTTPError as e:
            logger.error(f"API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Request error: {e}")
            raise
    
    # Resource Management
    
    def list_resources(
        self,
        tenant_id: str,
        snapshot_key: Optional[str] = None,
        compliance_status: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Query resources with filters.
        
        Args:
            tenant_id: Customer/tenant identifier
            snapshot_key: Filter by specific snapshot
            compliance_status: Filter by COMPLIANT, NON_COMPLIANT, or NOT_EVALUATED
            resource_type: Filter by AWS resource type (e.g., AWS::S3::Bucket)
            limit: Maximum number of results
        
        Returns:
            dict: Response with resources array and totals
        """
        params = {'tenant_id': tenant_id, 'limit': limit}
        
        if snapshot_key:
            params['snapshot_key'] = snapshot_key
        if compliance_status:
            params['compliance_status'] = compliance_status
        if resource_type:
            params['resource_type'] = resource_type
        
        return self._make_request('GET', '/resources', params=params)
    
    # Findings Management
    
    def get_findings(
        self,
        tenant_id: str,
        limit: int = 50,
        cursor: Optional[str] = None,
        severity: Optional[str] = None,
        resource_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get security findings with optional filters.
        
        Args:
            tenant_id: Customer identifier
            limit: Maximum number of results
            cursor: Pagination cursor
            severity: Filter by CRITICAL, HIGH, MEDIUM, or LOW
            resource_type: Filter by AWS resource type
        
        Returns:
            dict: Response with findings array and optional next_cursor
        """
        params = {'tenant_id': tenant_id, 'limit': limit}
        
        if cursor:
            params['cursor'] = cursor
        if severity:
            params['severity'] = severity
        if resource_type:
            params['resource_type'] = resource_type
        
        return self._make_request('GET', '/findings', params=params)
    
    def get_dashboard_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get dashboard metrics including scan history and top violations.
        
        Args:
            tenant_id: Customer identifier
        
        Returns:
            dict: Dashboard metrics with current_scan, previous_scan, top_rules, timeline
        """
        params = {'tenant_id': tenant_id}
        return self._make_request('GET', '/findings/metrics', params=params)
    
    # Scan Management
    
    def trigger_scan(
        self,
        tenant_id: str,
        role_arn: str,
        account_id: str,
        regions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Trigger a new compliance scan for a customer account.
        
        Args:
            tenant_id: Customer identifier
            role_arn: AWS IAM role ARN to assume
            account_id: AWS account ID to scan
            regions: List of AWS regions to scan (defaults to ['us-east-1'])
        
        Returns:
            dict: Scan response with scan_id, totals, and compliance stats
        """
        payload = {
            'tenant_id': tenant_id,
            'role_arn': role_arn,
            'account_id': account_id,
            'regions': regions or ['us-east-1']
        }
        
        return self._make_request('POST', '/scan', json_data=payload)
    
    # Customer Management
    
    def get_customers(self) -> List[Dict[str, Any]]:
        """
        List all registered customers.
        
        Returns:
            list: Array of customer objects
        """
        response = self._make_request('GET', '/customers')
        return response.get('customers', [])
    
    def register_customer(
        self,
        tenant_id: str,
        customer_name: str,
        role_arn: str,
        account_id: str,
        regions: List[str]
    ) -> Dict[str, Any]:
        """
        Register a new customer for monitoring.
        
        Args:
            tenant_id: Unique customer identifier
            customer_name: Display name for customer
            role_arn: AWS IAM role ARN to assume
            account_id: AWS account ID
            regions: List of AWS regions to monitor
        
        Returns:
            dict: Registration response with customer details
        """
        payload = {
            'tenant_id': tenant_id,
            'customer_name': customer_name,
            'role_arn': role_arn,
            'account_id': account_id,
            'regions': regions
        }
        
        return self._make_request('POST', '/customers/register', json_data=payload)
    
    # Configuration Management
    
    def get_rules(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get compliance rules.
        
        Args:
            tenant_id: Optional tenant filter for custom rules
        
        Returns:
            dict: Response with rules array
        """
        params = {}
        if tenant_id:
            params['tenant_id'] = tenant_id
        
        return self._make_request('GET', '/config/rules', params=params)
    
    def get_base_configs(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get base configuration templates.
        
        Args:
            tenant_id: Optional tenant filter
        
        Returns:
            dict: Response with configs array
        """
        params = {}
        if tenant_id:
            params['tenant_id'] = tenant_id
        
        return self._make_request('GET', '/config/base', params=params)
    
    def get_groups(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get configuration groups.
        
        Args:
            tenant_id: Optional tenant filter
        
        Returns:
            dict: Response with groups array
        """
        params = {}
        if tenant_id:
            params['tenant_id'] = tenant_id
        
        return self._make_request('GET', '/config/groups', params=params)
