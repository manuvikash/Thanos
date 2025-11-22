#!/usr/bin/env python3
"""
Thanos MCP Server - Model Context Protocol integration for AWS compliance monitoring.

Provides AI assistants with tools to query compliance status, findings, resources,
and trigger security scans across AWS accounts.
"""
import asyncio
import logging
import json
import sys
from typing import Any, Sequence

from mcp.server import Server
from mcp.types import Tool, TextContent, EmbeddedResource, ImageContent
import mcp.server.stdio

from .client import ThanosAPIClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize server
app = Server("thanos-compliance")

# Initialize API client (will be created on first use)
client: ThanosAPIClient = None


def get_client() -> ThanosAPIClient:
    """Get or create API client instance."""
    global client
    if client is None:
        client = ThanosAPIClient()
    return client


@app.list_tools()
async def list_tools() -> list[Tool]:
    """Define available MCP tools for Thanos compliance monitoring."""
    return [
        Tool(
            name="list_resources",
            description="Query AWS resources with compliance status, drift scores, and findings counts. Returns resources filtered by tenant, compliance status, resource type, or snapshot.",
            inputSchema={
                "type": "object",
                "properties": {
                    "tenant_id": {
                        "type": "string",
                        "description": "Customer/tenant identifier (required)"
                    },
                    "compliance_status": {
                        "type": "string",
                        "enum": ["COMPLIANT", "NON_COMPLIANT", "NOT_EVALUATED"],
                        "description": "Filter by compliance status"
                    },
                    "resource_type": {
                        "type": "string",
                        "description": "Filter by AWS resource type (e.g., AWS::S3::Bucket, AWS::IAM::Policy)"
                    },
                    "snapshot_key": {
                        "type": "string",
                        "description": "Filter by specific snapshot/scan"
                    },
                    "limit": {
                        "type": "number",
                        "description": "Maximum number of results to return (default: 100)",
                        "default": 100
                    }
                },
                "required": ["tenant_id"]
            }
        ),
        Tool(
            name="get_findings",
            description="Get security compliance findings and violations. Returns detailed findings with severity, observed vs expected values, and resource information.",
            inputSchema={
                "type": "object",
                "properties": {
                    "tenant_id": {
                        "type": "string",
                        "description": "Customer/tenant identifier (required)"
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
                        "description": "Filter by severity level"
                    },
                    "resource_type": {
                        "type": "string",
                        "description": "Filter by AWS resource type"
                    },
                    "limit": {
                        "type": "number",
                        "description": "Maximum number of results (default: 50)",
                        "default": 50
                    },
                    "cursor": {
                        "type": "string",
                        "description": "Pagination cursor for next page"
                    }
                },
                "required": ["tenant_id"]
            }
        ),
        Tool(
            name="get_dashboard_metrics",
            description="Get comprehensive dashboard metrics including current scan summary, comparison with previous scan, top violated rules, and timeline of findings.",
            inputSchema={
                "type": "object",
                "properties": {
                    "tenant_id": {
                        "type": "string",
                        "description": "Customer/tenant identifier (required)"
                    }
                },
                "required": ["tenant_id"]
            }
        ),
        Tool(
            name="trigger_scan",
            description="Initiate a new compliance scan for a customer's AWS account. This will scan resources across specified regions and evaluate them against security rules.",
            inputSchema={
                "type": "object",
                "properties": {
                    "tenant_id": {
                        "type": "string",
                        "description": "Customer/tenant identifier (required)"
                    },
                    "role_arn": {
                        "type": "string",
                        "description": "AWS IAM role ARN to assume for scanning (required)"
                    },
                    "account_id": {
                        "type": "string",
                        "description": "AWS account ID to scan (required)"
                    },
                    "regions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of AWS regions to scan (default: ['us-east-1'])"
                    }
                },
                "required": ["tenant_id", "role_arn", "account_id"]
            }
        ),
        Tool(
            name="list_customers",
            description="List all registered customers/tenants being monitored for compliance.",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="get_rules",
            description="Get compliance rules and security checks. Can filter to show only custom tenant-specific rules or all rules including defaults.",
            inputSchema={
                "type": "object",
                "properties": {
                    "tenant_id": {
                        "type": "string",
                        "description": "Optional: Filter to show only custom rules for this tenant"
                    }
                }
            }
        ),
        Tool(
            name="search_violations",
            description="Search for specific security violations across all findings. Useful for finding specific misconfigurations like public S3 buckets, overly permissive IAM policies, or open security groups.",
            inputSchema={
                "type": "object",
                "properties": {
                    "tenant_id": {
                        "type": "string",
                        "description": "Customer/tenant identifier (required)"
                    },
                    "search_term": {
                        "type": "string",
                        "description": "Term to search for in finding messages (e.g., 'public access', 'wildcard', 'SSH')"
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
                        "description": "Filter by severity"
                    }
                },
                "required": ["tenant_id", "search_term"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
    """Execute MCP tool calls."""
    
    try:
        api_client = get_client()
        
        if name == "list_resources":
            result = api_client.list_resources(**arguments)
            
            resources = result.get('resources', [])
            totals = result.get('totals', {})
            
            # Build formatted response
            lines = [
                f"# Resources for {arguments['tenant_id']}",
                f"",
                f"**Total Resources:** {totals.get('total_resources', 0)}",
                f""
            ]
            
            # Compliance breakdown
            compliance_totals = totals.get('by_compliance', {})
            if compliance_totals:
                lines.append("## Compliance Status")
                for status, count in compliance_totals.items():
                    lines.append(f"- **{status}:** {count}")
                lines.append("")
            
            # Type breakdown
            type_totals = totals.get('by_type', {})
            if type_totals:
                lines.append("## By Resource Type")
                for rtype, count in sorted(type_totals.items(), key=lambda x: x[1], reverse=True)[:10]:
                    lines.append(f"- {rtype}: {count}")
                lines.append("")
            
            # Top resources by drift
            if resources:
                lines.append("## Resources with Highest Drift")
                sorted_resources = sorted(resources, key=lambda x: x.get('drift_score', 0), reverse=True)[:15]
                
                for r in sorted_resources:
                    drift = r.get('drift_score', 0)
                    status = r.get('compliance_status', 'UNKNOWN')
                    findings = r.get('findings_count', 0)
                    
                    # Status emoji
                    emoji = "✅" if status == "COMPLIANT" else "❌" if status == "NON_COMPLIANT" else "⚪"
                    
                    lines.append(f"### {emoji} {r.get('resource_type', 'Unknown')}")
                    lines.append(f"**ARN:** `{r.get('arn', 'N/A')}`")
                    lines.append(f"**Status:** {status} | **Drift Score:** {drift:.2f} | **Findings:** {findings}")
                    lines.append(f"**Region:** {r.get('region', 'N/A')}")
                    lines.append("")
            
            return [TextContent(type="text", text="\n".join(lines))]
        
        elif name == "get_findings":
            result = api_client.get_findings(**arguments)
            findings = result.get('items', [])
            
            lines = [
                f"# Security Findings for {arguments['tenant_id']}",
                f"",
                f"**Total Findings:** {len(findings)}",
                f""
            ]
            
            # Group by severity
            by_severity = {}
            for f in findings:
                sev = f.get('severity', 'UNKNOWN')
                by_severity.setdefault(sev, []).append(f)
            
            for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                findings_list = by_severity.get(severity, [])
                if findings_list:
                    lines.append(f"## {severity} ({len(findings_list)})")
                    
                    for f in findings_list[:20]:  # Limit to 20 per severity
                        lines.append(f"### {f.get('message', 'No message')}")
                        lines.append(f"**Resource:** `{f.get('resource_arn', 'N/A')}`")
                        lines.append(f"**Type:** {f.get('resource_type', 'N/A')}")
                        lines.append(f"**Expected:** `{json.dumps(f.get('expected', 'N/A'))}`")
                        lines.append(f"**Observed:** `{json.dumps(f.get('observed', 'N/A'))}`")
                        
                        if f.get('region'):
                            lines.append(f"**Region:** {f['region']}")
                        
                        lines.append("")
            
            if result.get('next_cursor'):
                lines.append(f"---")
                lines.append(f"**More results available.** Use cursor: `{result['next_cursor']}`")
            
            return [TextContent(type="text", text="\n".join(lines))]
        
        elif name == "get_dashboard_metrics":
            result = api_client.get_dashboard_metrics(**arguments)
            
            lines = [
                f"# Dashboard Metrics for {arguments['tenant_id']}",
                f""
            ]
            
            # Current scan
            current = result.get('current_scan', {})
            if current:
                lines.append("## Current Scan")
                lines.append(f"- **Resources Scanned:** {current.get('total_resources', 0)}")
                lines.append(f"- **Findings:** {current.get('total_findings', 0)}")
                lines.append(f"- **Compliance Rate:** {current.get('compliance_percentage', 0):.1f}%")
                
                by_severity = current.get('by_severity', {})
                if by_severity:
                    lines.append(f"- **By Severity:**")
                    for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                        if sev in by_severity:
                            lines.append(f"  - {sev}: {by_severity[sev]}")
                lines.append("")
            
            # Previous scan comparison
            previous = result.get('previous_scan')
            if previous:
                lines.append("## Comparison with Previous Scan")
                current_findings = current.get('total_findings', 0)
                prev_findings = previous.get('total_findings', 0)
                delta = current_findings - prev_findings
                
                trend = "📈" if delta > 0 else "📉" if delta < 0 else "➡️"
                lines.append(f"{trend} **Change in Findings:** {delta:+d}")
                lines.append("")
            
            # Top violated rules
            top_rules = result.get('top_rules', [])
            if top_rules:
                lines.append("## Most Violated Rules")
                for rule in top_rules[:10]:
                    lines.append(f"- **{rule.get('message', 'Unknown')}** ({rule.get('severity', 'N/A')}): {rule.get('count', 0)} violations")
                lines.append("")
            
            # Timeline
            timeline = result.get('timeline', [])
            if timeline:
                lines.append("## Findings Timeline")
                for point in timeline[-10:]:  # Last 10 data points
                    lines.append(f"- {point.get('date', 'N/A')}: {point.get('count', 0)} findings")
            
            return [TextContent(type="text", text="\n".join(lines))]
        
        elif name == "trigger_scan":
            result = api_client.trigger_scan(**arguments)
            
            lines = [
                f"# Scan Initiated",
                f"",
                f"**Scan ID:** `{result.get('scan_id', 'N/A')}`",
                f"**Tenant:** {result.get('tenant_id', 'N/A')}",
                f"**Account:** {result.get('account_id', 'N/A')}",
                f"**Regions:** {', '.join(result.get('regions', []))}",
                f"",
                f"## Results",
                f"- **Resources Scanned:** {result.get('totals', {}).get('resources', 0)}",
                f"- **Findings Detected:** {result.get('totals', {}).get('findings', 0)}",
                f""
            ]
            
            compliance = result.get('compliance', {})
            if compliance:
                lines.append(f"## Compliance Summary")
                lines.append(f"- **Total Resources:** {compliance.get('total', 0)}")
                lines.append(f"- **Compliant:** {compliance.get('compliant', 0)}")
                lines.append(f"- **Non-Compliant:** {compliance.get('non_compliant', 0)}")
                lines.append(f"- **Compliance Rate:** {compliance.get('compliance_percentage', 0):.1f}%")
            
            return [TextContent(type="text", text="\n".join(lines))]
        
        elif name == "list_customers":
            customers = api_client.get_customers()
            
            lines = [
                f"# Registered Customers",
                f"",
                f"**Total:** {len(customers)}",
                f""
            ]
            
            for customer in customers:
                lines.append(f"## {customer.get('customer_name', 'Unknown')}")
                lines.append(f"- **Tenant ID:** `{customer.get('tenant_id', 'N/A')}`")
                lines.append(f"- **Account ID:** {customer.get('account_id', 'N/A')}")
                lines.append(f"- **Role ARN:** `{customer.get('role_arn', 'N/A')}`")
                lines.append(f"- **Regions:** {', '.join(customer.get('regions', []))}")
                lines.append(f"- **Status:** {customer.get('status', 'unknown')}")
                lines.append("")
            
            return [TextContent(type="text", text="\n".join(lines))]
        
        elif name == "get_rules":
            result = api_client.get_rules(arguments.get('tenant_id'))
            rules = result.get('rules', [])
            
            lines = [
                f"# Compliance Rules",
                f"",
                f"**Total Rules:** {len(rules)}",
                f""
            ]
            
            # Group by resource type
            by_type = {}
            for rule in rules:
                rtype = rule.get('resource_type', 'Unknown')
                by_type.setdefault(rtype, []).append(rule)
            
            for rtype, type_rules in sorted(by_type.items()):
                lines.append(f"## {rtype} ({len(type_rules)} rules)")
                
                for rule in type_rules:
                    source = rule.get('source', 'unknown')
                    severity = rule.get('severity', 'N/A')
                    enabled = rule.get('enabled', True)
                    status = "✓" if enabled else "✗"
                    
                    lines.append(f"- {status} **[{severity}]** {rule.get('message', 'No description')}")
                    lines.append(f"  - ID: `{rule.get('id', 'N/A')}` | Source: {source}")
                
                lines.append("")
            
            return [TextContent(type="text", text="\n".join(lines))]
        
        elif name == "search_violations":
            # Get all findings and filter by search term
            result = api_client.get_findings(
                tenant_id=arguments['tenant_id'],
                severity=arguments.get('severity'),
                limit=200  # Get more for searching
            )
            
            findings = result.get('items', [])
            search_term = arguments['search_term'].lower()
            
            # Filter findings by search term in message
            matched = [f for f in findings if search_term in f.get('message', '').lower()]
            
            lines = [
                f"# Search Results: '{arguments['search_term']}'",
                f"",
                f"**Matched Findings:** {len(matched)} (searched {len(findings)} total)",
                f""
            ]
            
            for f in matched[:30]:  # Limit to 30 results
                lines.append(f"## {f.get('message', 'No message')}")
                lines.append(f"- **Severity:** {f.get('severity', 'N/A')}")
                lines.append(f"- **Resource:** `{f.get('resource_arn', 'N/A')}`")
                lines.append(f"- **Type:** {f.get('resource_type', 'N/A')}")
                lines.append(f"- **Expected:** `{json.dumps(f.get('expected', 'N/A'))}`")
                lines.append(f"- **Observed:** `{json.dumps(f.get('observed', 'N/A'))}`")
                lines.append("")
            
            return [TextContent(type="text", text="\n".join(lines))]
        
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    except Exception as e:
        logger.error(f"Error executing tool {name}: {e}", exc_info=True)
        error_msg = f"Error: {str(e)}\n\nPlease check:\n- Environment variables are set correctly\n- API endpoint is accessible\n- Credentials are valid"
        return [TextContent(type="text", text=error_msg)]


async def main():
    """Run the MCP server."""
    logger.info("Starting Thanos MCP Server")
    
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
