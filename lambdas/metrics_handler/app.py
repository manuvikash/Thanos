"""
Metrics handler Lambda function.
Aggregates findings data to provide dashboard metrics.
"""
import json
import os
import sys
from typing import Any, Dict, List
from collections import defaultdict
from decimal import Decimal

# Add common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.ddb import query_all_findings
from common.logging import get_logger

logger = get_logger(__name__)

# Environment variables
FINDINGS_TABLE = os.environ.get("FINDINGS_TABLE", "")


def decimal_to_python(obj: Any) -> Any:
    """Convert Decimal types to Python native types for JSON serialization."""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_python(item) for item in obj]
    return obj


def aggregate_metrics(findings: List[Dict[str, Any]], limit: int = 5) -> Dict[str, Any]:
    """
    Aggregate findings into dashboard metrics.
    
    Args:
        findings: List of finding dictionaries
        limit: Number of scans to include in timeline
        
    Returns:
        Dashboard metrics dictionary
    """
    if not findings:
        return None
    
    # Group findings by snapshot_key
    scans = defaultdict(lambda: {
        "snapshot_key": "",
        "timestamp": "",
        "findings": [],
        "severity_counts": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
        "total": 0,
    })
    
    for finding in findings:
        snapshot_key = finding.get("snapshot_key", "")
        if not snapshot_key:
            # Skip findings without snapshot_key (old data)
            continue
        
        timestamp = finding.get("timestamp", "")
        severity = finding.get("severity", "").upper()
        
        scan = scans[snapshot_key]
        scan["snapshot_key"] = snapshot_key
        scan["timestamp"] = max(scan["timestamp"], timestamp)  # Use latest timestamp
        scan["findings"].append(finding)
        
        if severity in scan["severity_counts"]:
            scan["severity_counts"][severity] += 1
        scan["total"] += 1
    
    # Sort scans by timestamp (most recent first)
    sorted_scans = sorted(
        scans.values(),
        key=lambda x: x["timestamp"],
        reverse=True
    )
    
    if not sorted_scans:
        return None
    
    # Current scan (most recent)
    current_scan = sorted_scans[0]
    current_scan_data = {
        "snapshot_key": current_scan["snapshot_key"],
        "timestamp": current_scan["timestamp"],
        "total_findings": current_scan["total"],
        "severity_counts": current_scan["severity_counts"],
    }
    
    # Previous scan (second most recent)
    previous_scan_data = None
    if len(sorted_scans) > 1:
        previous_scan = sorted_scans[1]
        previous_scan_data = {
            "snapshot_key": previous_scan["snapshot_key"],
            "timestamp": previous_scan["timestamp"],
            "total_findings": previous_scan["total"],
        }
    
    # Calculate top 5 rules by finding count (from current scan)
    rule_counts = defaultdict(lambda: {"count": 0, "severity": ""})
    for finding in current_scan["findings"]:
        rule_id = finding.get("rule_id", "")
        severity = finding.get("severity", "")
        rule_counts[rule_id]["count"] += 1
        # Use the first severity we see (they should all be the same for a rule)
        if not rule_counts[rule_id]["severity"]:
            rule_counts[rule_id]["severity"] = severity
    
    top_rules = [
        {
            "rule_id": rule_id,
            "count": data["count"],
            "severity": data["severity"],
        }
        for rule_id, data in sorted(
            rule_counts.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )[:5]
    ]
    
    # Timeline (most recent N scans, reversed to show oldest to newest)
    timeline = [
        {
            "snapshot_key": scan["snapshot_key"],
            "timestamp": scan["timestamp"],
            "severity_counts": scan["severity_counts"],
            "total": scan["total"],
        }
        for scan in reversed(sorted_scans[:limit])
    ]
    
    return {
        "current_scan": current_scan_data,
        "previous_scan": previous_scan_data,
        "top_rules": top_rules,
        "timeline": timeline,
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for metrics aggregation.
    
    Expected query parameters:
    - tenant_id: required
    - limit: optional (default 5, for timeline)
    
    Returns:
    {
        "tenant_id": "customer-123",
        "current_scan": {
            "snapshot_key": "...",
            "timestamp": "...",
            "total_findings": 42,
            "severity_counts": {...}
        },
        "previous_scan": {...} or null,
        "top_rules": [...],
        "timeline": [...]
    }
    """
    try:
        # Parse query parameters
        query_params = event.get("queryStringParameters", {}) or {}
        tenant_id = query_params.get("tenant_id")
        limit = int(query_params.get("limit", 5))
        
        # Validate required fields
        if not tenant_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Missing required parameter: tenant_id"}),
            }
        
        # Validate limit
        if limit < 1 or limit > 20:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "Limit must be between 1 and 20"}),
            }
        
        logger.info(f"Aggregating metrics for tenant: {tenant_id}")
        
        # Query all findings for tenant
        findings = query_all_findings(FINDINGS_TABLE, tenant_id)
        
        if not findings:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "No findings data available for tenant"}),
            }
        
        logger.info(f"Retrieved {len(findings)} findings for tenant {tenant_id}")
        
        # Aggregate metrics
        metrics = aggregate_metrics(findings, limit)
        
        if not metrics:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"error": "No valid scan data available for tenant"}),
            }
        
        # Prepare response
        response_body = {
            "tenant_id": tenant_id,
            **metrics,
        }
        
        # Convert Decimal types to native Python types
        response_body = decimal_to_python(response_body)
        
        logger.info(f"Aggregated metrics for tenant {tenant_id}")
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response_body),
        }
        
    except ValueError as e:
        logger.error(f"Invalid parameter: {e}")
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": f"Invalid parameter: {str(e)}"}),
        }
    except Exception as e:
        logger.error(f"Error in metrics handler: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}),
        }
