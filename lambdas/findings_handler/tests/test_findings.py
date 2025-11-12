"""
Tests for findings handler.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from unittest.mock import Mock, patch
from findings_handler.app import lambda_handler


def test_lambda_handler_missing_tenant_id():
    """Test handler with missing tenant_id."""
    event = {"queryStringParameters": {}}
    context = Mock()
    
    response = lambda_handler(event, context)
    
    assert response["statusCode"] == 400
    assert "tenant_id" in response["body"]


@patch("findings_handler.app.query_findings")
def test_lambda_handler_success(mock_query):
    """Test successful findings retrieval."""
    mock_query.return_value = {
        "items": [
            {
                "finding_id": "123",
                "tenant_id": "test-tenant",
                "rule_id": "test-rule",
                "severity": "HIGH",
            }
        ]
    }
    
    event = {
        "queryStringParameters": {
            "tenant_id": "test-tenant",
            "limit": "10",
        }
    }
    context = Mock()
    
    response = lambda_handler(event, context)
    
    assert response["statusCode"] == 200
    assert "items" in response["body"]
