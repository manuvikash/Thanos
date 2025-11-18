"""
Simple test for metrics aggregation logic.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from metrics_handler.app import aggregate_metrics


def test_aggregate_metrics_basic():
    """Test basic metrics aggregation."""
    findings = [
        {
            "finding_id": "1",
            "tenant_id": "test-tenant",
            "rule_id": "rule-1",
            "severity": "CRITICAL",
            "timestamp": "2024-01-01T12:00:00Z",
            "snapshot_key": "snapshot-1",
        },
        {
            "finding_id": "2",
            "tenant_id": "test-tenant",
            "rule_id": "rule-1",
            "severity": "CRITICAL",
            "timestamp": "2024-01-01T12:00:01Z",
            "snapshot_key": "snapshot-1",
        },
        {
            "finding_id": "3",
            "tenant_id": "test-tenant",
            "rule_id": "rule-2",
            "severity": "HIGH",
            "timestamp": "2024-01-01T12:00:02Z",
            "snapshot_key": "snapshot-1",
        },
        {
            "finding_id": "4",
            "tenant_id": "test-tenant",
            "rule_id": "rule-3",
            "severity": "MEDIUM",
            "timestamp": "2024-01-02T12:00:00Z",
            "snapshot_key": "snapshot-2",
        },
    ]
    
    metrics = aggregate_metrics(findings, limit=5)
    
    # Verify structure
    assert metrics is not None
    assert "current_scan" in metrics
    assert "previous_scan" in metrics
    assert "top_rules" in metrics
    assert "timeline" in metrics
    
    # Current scan should be snapshot-2 (most recent)
    assert metrics["current_scan"]["snapshot_key"] == "snapshot-2"
    assert metrics["current_scan"]["total_findings"] == 1
    assert metrics["current_scan"]["severity_counts"]["MEDIUM"] == 1
    
    # Previous scan should be snapshot-1
    assert metrics["previous_scan"]["snapshot_key"] == "snapshot-1"
    assert metrics["previous_scan"]["total_findings"] == 3
    
    # Top rules from current scan
    assert len(metrics["top_rules"]) == 1
    assert metrics["top_rules"][0]["rule_id"] == "rule-3"
    assert metrics["top_rules"][0]["count"] == 1
    
    # Timeline should have 2 scans
    assert len(metrics["timeline"]) == 2
    assert metrics["timeline"][0]["snapshot_key"] == "snapshot-2"
    assert metrics["timeline"][1]["snapshot_key"] == "snapshot-1"
    
    print("✓ Basic aggregation test passed")


def test_aggregate_metrics_empty():
    """Test with empty findings list."""
    metrics = aggregate_metrics([], limit=5)
    assert metrics is None
    print("✓ Empty findings test passed")


def test_aggregate_metrics_no_snapshot_key():
    """Test with findings missing snapshot_key."""
    findings = [
        {
            "finding_id": "1",
            "tenant_id": "test-tenant",
            "rule_id": "rule-1",
            "severity": "CRITICAL",
            "timestamp": "2024-01-01T12:00:00Z",
            # No snapshot_key
        },
    ]
    
    metrics = aggregate_metrics(findings, limit=5)
    assert metrics is None
    print("✓ Missing snapshot_key test passed")


def test_aggregate_metrics_top_rules():
    """Test top rules calculation."""
    findings = [
        {"finding_id": "1", "rule_id": "rule-1", "severity": "CRITICAL", "timestamp": "2024-01-01T12:00:00Z", "snapshot_key": "snap-1"},
        {"finding_id": "2", "rule_id": "rule-1", "severity": "CRITICAL", "timestamp": "2024-01-01T12:00:01Z", "snapshot_key": "snap-1"},
        {"finding_id": "3", "rule_id": "rule-1", "severity": "CRITICAL", "timestamp": "2024-01-01T12:00:02Z", "snapshot_key": "snap-1"},
        {"finding_id": "4", "rule_id": "rule-2", "severity": "HIGH", "timestamp": "2024-01-01T12:00:03Z", "snapshot_key": "snap-1"},
        {"finding_id": "5", "rule_id": "rule-2", "severity": "HIGH", "timestamp": "2024-01-01T12:00:04Z", "snapshot_key": "snap-1"},
        {"finding_id": "6", "rule_id": "rule-3", "severity": "MEDIUM", "timestamp": "2024-01-01T12:00:05Z", "snapshot_key": "snap-1"},
    ]
    
    metrics = aggregate_metrics(findings, limit=5)
    
    # Top rules should be ordered by count
    assert len(metrics["top_rules"]) == 3
    assert metrics["top_rules"][0]["rule_id"] == "rule-1"
    assert metrics["top_rules"][0]["count"] == 3
    assert metrics["top_rules"][1]["rule_id"] == "rule-2"
    assert metrics["top_rules"][1]["count"] == 2
    assert metrics["top_rules"][2]["rule_id"] == "rule-3"
    assert metrics["top_rules"][2]["count"] == 1
    
    print("✓ Top rules test passed")


if __name__ == "__main__":
    test_aggregate_metrics_basic()
    test_aggregate_metrics_empty()
    test_aggregate_metrics_no_snapshot_key()
    test_aggregate_metrics_top_rules()
    print("\n✅ All tests passed!")
