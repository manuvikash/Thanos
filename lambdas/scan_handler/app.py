"""
Scan handler Lambda function.
Assumes role, collects resources, evaluates against rules, stores findings.
"""
import json
import os
import boto3
import sys
from datetime import datetime
from typing import Any, Dict

# Add common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.aws import assume_role, get_enabled_regions
from common.normalize import collect_resources
from common.s3io import write_snapshot
from common.eval import evaluate_resources
from common.ddb import put_findings
from common.resource_inventory import put_resources
from common.logging import get_logger, log_context

logger = get_logger(__name__)

# Environment variables
SNAPSHOTS_BUCKET = os.environ.get("SNAPSHOTS_BUCKET", "")
RULES_BUCKET = os.environ.get("RULES_BUCKET", "")
RULES_TABLE = os.environ.get("RULES_TABLE", "")
FINDINGS_TABLE = os.environ.get("FINDINGS_TABLE", "")
RESOURCES_TABLE = os.environ.get("RESOURCES_TABLE", "")
SNS_TOPIC_ARN = os.environ.get("ALERTS_TOPIC_ARN", "")
sns_client = boto3.client("sns")

def publish_critical_alert(finding):
    """
    Publish a simple message when a high-severity finding is detected.
    `finding` is expected to be a dict with keys like tenant_id, rule_id, severity, details, etc.
    """
    if not SNS_TOPIC_ARN:
        # Topic not configured; silently skip to avoid breaking scans
        return

    subject = f"[CRITICAL] Finding: {finding.get('rule_id', 'unknown')}"
    message = {
        "tenant_id": finding.get("tenant_id"),
        "rule_id": finding.get("rule_id"),
        "severity": finding.get("severity"),
        "timestamp": finding.get("timestamp"),
        "details": finding.get("details"),
    }

    # SNS email subject must be <= 100 chars; body is plaintext, so json-dump
    try:
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject[:100],
            Message=json.dumps(message, default=str)
        )
    except Exception as e:
        # Don't fail the whole scan on alert errors; just log
        print(f"SNS publish failed: {e}")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for scan operations.
    
    Expected input:
    {
        "tenant_id": "customer-123",
        "role_arn": "arn:aws:iam::123456789012:role/AuditRole",
        "account_id": "123456789012",
        "regions": ["us-east-1", "us-west-2"],
        "rules_source": "repo"  # or "s3"
    }
    
    Returns:
    {
        "tenant_id": "customer-123",
        "account_id": "123456789012",
        "regions": ["us-east-1"],
        "totals": {
            "resources": 150,
            "findings": 12
        },
        "findings_sample": [...],
        "snapshot_key": "tenants/customer-123/snapshots/20240101-120000/resources.json"
    }
    """
    try:
        # Log the incoming event for debugging
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Parse input
        body = event.get("body")
        if isinstance(body, str):
            body = json.loads(body)
        else:
            body = event
        
        tenant_id = body.get("tenant_id")
        role_arn = body.get("role_arn")
        account_id = body.get("account_id")
        regions = body.get("regions", ["us-east-1"])
        rules_source = body.get("rules_source", "repo")
        
        # Validate required fields
        if not all([tenant_id, role_arn, account_id]):
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "Missing required fields: tenant_id, role_arn, account_id"
                }),
            }
        
        log_context(
            logger,
            "info",
            "Starting scan",
            tenant_id=tenant_id,
            account_id=account_id,
            regions=regions,
        )
        
        # Step 1: Assume role
        logger.info(f"Assuming role: {role_arn}")
        credentials = assume_role(role_arn)

        # Handle "ALL" regions
        if regions == ["ALL"]:
            logger.info("Fetching all enabled regions for account")
            regions = get_enabled_regions(credentials)
        
        # Step 2: Collect resources
        logger.info(f"Collecting resources from {len(regions)} region(s)")
        resources = collect_resources(credentials, account_id, regions)
        log_context(
            logger,
            "info",
            "Resources collected",
            tenant_id=tenant_id,
            count=len(resources),
        )
        
        # Step 3: Write snapshot to S3
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        snapshot_key = write_snapshot(
            SNAPSHOTS_BUCKET,
            tenant_id,
            [r.to_dict() for r in resources],
            timestamp,
        )
        
        # Generate unique scan ID
        scan_id = f"scan-{uuid.uuid4().hex[:12]}"
        
        # Step 4: Evaluate resources against hierarchical configuration
        logger.info("Evaluating resources against hierarchical configuration")
        
        # Set snapshot and scan info on resources before evaluation
        for resource in resources:
            resource.tenant_id = tenant_id
            resource.snapshot_key = snapshot_key
            resource.scan_id = scan_id
        
        evaluated_resources, findings = evaluate_resources(
            tenant_id=tenant_id,
            resources=resources,
            table_name=RULES_TABLE
        )
        log_context(
            logger,
            "info",
            "Evaluation complete",
            tenant_id=tenant_id,
            findings_count=len(findings),
        )
        
        # Step 5: Write resources to inventory table
        if RESOURCES_TABLE:
            logger.info(f"Writing {len(evaluated_resources)} resources to inventory")
            put_resources(RESOURCES_TABLE, evaluated_resources)
        
        # Step 6: Write findings to DynamoDB
        if findings:
            put_findings(FINDINGS_TABLE, findings)
            for f in findings:
                fd = f.to_dict() if hasattr(f, "to_dict") else f
                if str(fd.get("severity", "")).lower() == "high":
                    publish_critical_alert(fd)
        
        # Calculate compliance statistics
        compliance_stats = {
            'total': len(evaluated_resources),
            'compliant': sum(1 for r in evaluated_resources if r.compliance_status == 'COMPLIANT'),
            'non_compliant': sum(1 for r in evaluated_resources if r.compliance_status == 'NON_COMPLIANT'),
            'not_evaluated': sum(1 for r in evaluated_resources if r.compliance_status == 'NOT_EVALUATED'),
        }
        compliance_stats['compliance_percentage'] = (
            (compliance_stats['compliant'] / compliance_stats['total'] * 100) 
            if compliance_stats['total'] > 0 else 0
        )
        
        # Prepare response
        findings_sample = [f.to_dict() for f in findings[:10]]
        
        response_body = {
            "tenant_id": tenant_id,
            "account_id": account_id,
            "regions": regions,
            "scan_id": scan_id,
            "totals": {
                "resources": len(evaluated_resources),
                "findings": len(findings),
            },
            "compliance": compliance_stats,
            "findings_sample": findings_sample,
            "snapshot_key": snapshot_key,
        }
        
        log_context(
            logger,
            "info",
            "Scan completed successfully",
            tenant_id=tenant_id,
            account_id=account_id,
            compliance_percentage=compliance_stats['compliance_percentage'],
        )
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response_body),
        }
        
    except Exception as e:
        logger.error(f"Error in scan handler: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}),
        }
