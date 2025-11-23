"""
Cognito authentication manager for Thanos MCP server.
Handles token lifecycle, automatic refresh, and credential management.
"""
import boto3
import os
from typing import Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@dataclass
class TokenSet:
    """Container for Cognito authentication tokens."""
    id_token: str
    access_token: str
    refresh_token: str
    expires_at: datetime


class CognitoAuthManager:
    """
    Manages Cognito authentication with automatic token refresh.
    
    Environment variables required:
    - THANOS_USER_POOL_ID: Cognito User Pool ID
    - THANOS_CLIENT_ID: Cognito App Client ID
    - THANOS_EMAIL: Service account email
    - THANOS_PASSWORD: Service account password
    """
    
    def __init__(self):
        # Validate required environment variables
        required_vars = ['THANOS_USER_POOL_ID', 'THANOS_CLIENT_ID', 'THANOS_EMAIL', 'THANOS_PASSWORD']
        missing_vars = [var for var in required_vars if var not in os.environ]
        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}\n"
                "Please set these in your Claude Desktop config or environment."
            )
        
        self.user_pool_id = os.environ['THANOS_USER_POOL_ID']
        self.client_id = os.environ['THANOS_CLIENT_ID']
        self.email = os.environ['THANOS_EMAIL']
        self.password = os.environ['THANOS_PASSWORD']
        
        # Extract region from user pool ID (format: us-east-1_XXXXX)
        try:
            self.region = self.user_pool_id.split('_')[0]
        except (IndexError, AttributeError):
            raise ValueError(
                f"Invalid THANOS_USER_POOL_ID format: {self.user_pool_id}\n"
                "Expected format: us-east-1_XXXXXXXXX"
            )
        
        self.cognito = boto3.client('cognito-idp', region_name=self.region)
        self.tokens: Optional[TokenSet] = None
        
        logger.info(f"Initialized CognitoAuthManager for pool {self.user_pool_id}")
    
    def authenticate(self) -> str:
        """
        Get a valid ID token for API authentication.
        Automatically handles token refresh when expired.
        
        Returns:
            str: Valid Cognito ID token
        """
        # Check if we have valid cached tokens
        if self.tokens and datetime.now() < self.tokens.expires_at:
            logger.debug("Using cached token")
            return self.tokens.id_token
        
        # Try to refresh if we have a refresh token
        if self.tokens and self.tokens.refresh_token:
            try:
                logger.info("Refreshing expired token")
                return self._refresh_tokens()
            except Exception as e:
                logger.warning(f"Token refresh failed: {e}, re-authenticating")
        
        # Perform initial authentication
        logger.info("Performing initial authentication")
        return self._initial_auth()
    
    def _initial_auth(self) -> str:
        """
        Perform initial authentication using USER_PASSWORD_AUTH flow.
        
        Returns:
            str: ID token
        """
        try:
            response = self.cognito.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': self.email,
                    'PASSWORD': self.password
                }
            )
            
            # Extract tokens from response
            auth_result = response['AuthenticationResult']
            
            # Cache tokens with expiry (refresh 5 minutes early to be safe)
            self.tokens = TokenSet(
                id_token=auth_result['IdToken'],
                access_token=auth_result['AccessToken'],
                refresh_token=auth_result['RefreshToken'],
                expires_at=datetime.now() + timedelta(
                    seconds=auth_result['ExpiresIn'] - 300
                )
            )
            
            logger.info("Successfully authenticated")
            return self.tokens.id_token
            
        except self.cognito.exceptions.NotAuthorizedException:
            logger.error("Authentication failed: Invalid credentials")
            raise ValueError("Invalid Cognito credentials")
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise
    
    def _refresh_tokens(self) -> str:
        """
        Refresh tokens using the refresh token.
        
        Returns:
            str: New ID token
        """
        try:
            response = self.cognito.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': self.tokens.refresh_token
                }
            )
            
            auth_result = response['AuthenticationResult']
            
            # Update tokens (refresh token remains the same)
            self.tokens.id_token = auth_result['IdToken']
            self.tokens.access_token = auth_result['AccessToken']
            self.tokens.expires_at = datetime.now() + timedelta(
                seconds=auth_result['ExpiresIn'] - 300
            )
            
            logger.info("Successfully refreshed tokens")
            return self.tokens.id_token
            
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            # Clear tokens to force re-authentication
            self.tokens = None
            raise
