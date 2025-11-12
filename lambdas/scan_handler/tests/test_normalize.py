"""
Tests for resource normalization.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from unittest.mock import Mock, MagicMock
from common.normalize import normalize_s3_buckets, normalize_iam_policies, normalize_security_groups


def test_normalize_s3_buckets():
    """Test S3 bucket normalization."""
    mock_client = Mock()
    mock_client.list_buckets.return_value = {
        "Buckets": [
            {"Name": "test-bucket-1"},
            {"Name": "test-bucket-2"},
        ]
    }
    mock_client.get_public_access_block.return_value = {
        "PublicAccessBlockConfiguration": {
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        }
    }
    
    resources = normalize_s3_buckets(mock_client, "123456789012", "us-east-1")
    
    assert len(resources) == 2
    assert resources[0].resource_type == "AWS::S3::Bucket"
    assert resources[0].arn == "arn:aws:s3:::test-bucket-1"
    assert resources[0].config["PublicAccessBlockConfiguration"]["BlockPublicAcls"] == True


def test_normalize_iam_policies():
    """Test IAM policy normalization."""
    mock_client = Mock()
    mock_paginator = Mock()
    mock_client.get_paginator.return_value = mock_paginator
    
    mock_paginator.paginate.return_value = [
        {
            "Policies": [
                {
                    "Arn": "arn:aws:iam::123456789012:policy/test-policy",
                    "PolicyName": "test-policy",
                    "DefaultVersionId": "v1",
                }
            ]
        }
    ]
    
    mock_client.get_policy_version.return_value = {
        "PolicyVersion": {
            "Document": {
                "Statement": [
                    {"Effect": "Allow", "Action": ["s3:GetObject"], "Resource": "*"}
                ]
            }
        }
    }
    
    resources = normalize_iam_policies(mock_client, "123456789012", "us-east-1")
    
    assert len(resources) == 1
    assert resources[0].resource_type == "AWS::IAM::Policy"
    assert resources[0].config["PolicyName"] == "test-policy"


def test_normalize_security_groups():
    """Test security group normalization."""
    mock_client = Mock()
    mock_client.describe_security_groups.return_value = {
        "SecurityGroups": [
            {
                "GroupId": "sg-123",
                "GroupName": "test-sg",
                "VpcId": "vpc-123",
                "IpPermissions": [
                    {
                        "FromPort": 80,
                        "ToPort": 80,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
                    }
                ],
                "IpPermissionsEgress": [],
            }
        ]
    }
    
    resources = normalize_security_groups(mock_client, "123456789012", "us-east-1")
    
    assert len(resources) == 1
    assert resources[0].resource_type == "AWS::EC2::SecurityGroup"
    assert resources[0].config["GroupId"] == "sg-123"
    assert len(resources[0].config["IpPermissions"]) == 1
