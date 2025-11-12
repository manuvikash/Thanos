"""
Tests for the evaluation engine.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from common.eval import get_nested, evaluate_equals, evaluate_forbidden_any, evaluate_forbidden_cidr_port
from common.models import Rule, RuleCheck, Resource


def test_get_nested_simple():
    """Test simple nested path access."""
    obj = {"a": {"b": {"c": 42}}}
    assert get_nested(obj, "a.b.c") == 42
    assert get_nested(obj, "a.b") == {"c": 42}
    assert get_nested(obj, "a.x") is None


def test_get_nested_list_wildcard():
    """Test list wildcard expansion."""
    obj = {
        "items": [
            {"name": "item1", "value": 10},
            {"name": "item2", "value": 20},
        ]
    }
    result = get_nested(obj, "items[*].name")
    assert result == ["item1", "item2"]


def test_evaluate_equals_pass():
    """Test equals check that passes."""
    resource = Resource(
        arn="arn:aws:s3:::test-bucket",
        resource_type="AWS::S3::Bucket",
        config={"PublicAccessBlockConfiguration": {"BlockPublicAcls": True}},
        region="us-east-1",
        account_id="123456789012",
    )
    
    rule = Rule(
        id="test-rule",
        resource_type="AWS::S3::Bucket",
        check=RuleCheck(
            type="equals",
            path="PublicAccessBlockConfiguration.BlockPublicAcls",
            expected=True,
        ),
        severity="HIGH",
        message="Test message",
    )
    
    finding = evaluate_equals(resource, rule)
    assert finding is None


def test_evaluate_equals_fail():
    """Test equals check that fails."""
    resource = Resource(
        arn="arn:aws:s3:::test-bucket",
        resource_type="AWS::S3::Bucket",
        config={"PublicAccessBlockConfiguration": {"BlockPublicAcls": False}},
        region="us-east-1",
        account_id="123456789012",
    )
    
    rule = Rule(
        id="test-rule",
        resource_type="AWS::S3::Bucket",
        check=RuleCheck(
            type="equals",
            path="PublicAccessBlockConfiguration.BlockPublicAcls",
            expected=True,
        ),
        severity="HIGH",
        message="Test message",
    )
    
    finding = evaluate_equals(resource, rule)
    assert finding is not None
    assert finding.observed == False
    assert finding.expected == True


def test_evaluate_forbidden_any_pass():
    """Test forbidden-any check that passes."""
    resource = Resource(
        arn="arn:aws:iam::123456789012:policy/test",
        resource_type="AWS::IAM::Policy",
        config={
            "PolicyDocument": {
                "Statement": [
                    {"Action": ["s3:GetObject", "s3:PutObject"]}
                ]
            }
        },
        region="us-east-1",
        account_id="123456789012",
    )
    
    rule = Rule(
        id="test-rule",
        resource_type="AWS::IAM::Policy",
        check=RuleCheck(
            type="forbidden-any",
            path="PolicyDocument.Statement[*].Action",
            forbidden=["*"],
        ),
        severity="CRITICAL",
        message="No wildcard actions",
    )
    
    finding = evaluate_forbidden_any(resource, rule)
    assert finding is None


def test_evaluate_forbidden_any_fail():
    """Test forbidden-any check that fails."""
    resource = Resource(
        arn="arn:aws:iam::123456789012:policy/test",
        resource_type="AWS::IAM::Policy",
        config={
            "PolicyDocument": {
                "Statement": [
                    {"Action": ["*"]}
                ]
            }
        },
        region="us-east-1",
        account_id="123456789012",
    )
    
    rule = Rule(
        id="test-rule",
        resource_type="AWS::IAM::Policy",
        check=RuleCheck(
            type="forbidden-any",
            path="PolicyDocument.Statement[*].Action",
            forbidden=["*"],
        ),
        severity="CRITICAL",
        message="No wildcard actions",
    )
    
    finding = evaluate_forbidden_any(resource, rule)
    assert finding is not None
    assert "*" in finding.observed


def test_evaluate_forbidden_cidr_port_pass():
    """Test forbidden-cidr-port check that passes."""
    resource = Resource(
        arn="arn:aws:ec2:us-east-1:123456789012:security-group/sg-123",
        resource_type="AWS::EC2::SecurityGroup",
        config={
            "IpPermissions": [
                {
                    "FromPort": 443,
                    "ToPort": 443,
                    "IpRanges": [{"CidrIp": "10.0.0.0/8"}],
                }
            ]
        },
        region="us-east-1",
        account_id="123456789012",
    )
    
    rule = Rule(
        id="test-rule",
        resource_type="AWS::EC2::SecurityGroup",
        check=RuleCheck(
            type="forbidden-cidr-port",
            path="IpPermissions",
            params={"port": 22, "cidr": "0.0.0.0/0"},
        ),
        severity="HIGH",
        message="No public SSH",
    )
    
    finding = evaluate_forbidden_cidr_port(resource, rule)
    assert finding is None


def test_evaluate_forbidden_cidr_port_fail():
    """Test forbidden-cidr-port check that fails."""
    resource = Resource(
        arn="arn:aws:ec2:us-east-1:123456789012:security-group/sg-123",
        resource_type="AWS::EC2::SecurityGroup",
        config={
            "IpPermissions": [
                {
                    "FromPort": 22,
                    "ToPort": 22,
                    "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
                }
            ]
        },
        region="us-east-1",
        account_id="123456789012",
    )
    
    rule = Rule(
        id="test-rule",
        resource_type="AWS::EC2::SecurityGroup",
        check=RuleCheck(
            type="forbidden-cidr-port",
            path="IpPermissions",
            params={"port": 22, "cidr": "0.0.0.0/0"},
        ),
        severity="HIGH",
        message="No public SSH",
    )
    
    finding = evaluate_forbidden_cidr_port(resource, rule)
    assert finding is not None
    assert len(finding.observed) > 0
