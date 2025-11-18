/**
 * API client for Thanos backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export interface ScanRequest {
  tenant_id: string;
  role_arn: string;
  account_id: string;
  regions?: string[];
  rules_source?: 'repo' | 's3';
}

export interface Finding {
  finding_id: string;
  tenant_id: string;
  rule_id: string;
  resource_arn: string;
  severity: string;
  message: string;
  observed: any;
  expected: any;
  timestamp: string;
  account_id: string;
  region: string;
}

export interface ScanResponse {
  tenant_id: string;
  account_id: string;
  regions: string[];
  totals: {
    resources: number;
    findings: number;
  };
  findings_sample: Finding[];
  snapshot_key: string;
}

export interface FindingsResponse {
  items: Finding[];
  next_cursor?: string;
}

export interface Customer {
  tenant_id: string;
  customer_name: string;
  role_arn: string;
  account_id: string;
  regions: string[];
  created_at: string;
  status: string;
}

export interface ResourceDetail {
  arn: string;
  resource_type: string;
  region: string;
  account_id: string;
  config: any;
  metadata: any;
}

export interface ResourcesResponse {
  tenant_id: string;
  snapshot_key: string;
  resources: ResourceDetail[];
  totals: {
    total_resources: number;
    by_type: Record<string, number>;
  };
}

export interface SeverityCounts {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface CurrentScan {
  snapshot_key: string;
  timestamp: string;
  total_findings: number;
  severity_counts: SeverityCounts;
}

export interface PreviousScan {
  snapshot_key: string;
  timestamp: string;
  total_findings: number;
}

export interface TopRule {
  rule_id: string;
  count: number;
  severity: string;
}

export interface TimelinePoint {
  snapshot_key: string;
  timestamp: string;
  severity_counts: SeverityCounts;
  total: number;
}

export interface DashboardMetrics {
  tenant_id: string;
  current_scan: CurrentScan;
  previous_scan: PreviousScan | null;
  top_rules: TopRule[];
  timeline: TimelinePoint[];
}

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function runScan(request: ScanRequest): Promise<ScanResponse> {
  return fetchAPI('/scan', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getFindings(
  tenantId: string,
  limit: number = 50,
  cursor?: string
): Promise<FindingsResponse> {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    limit: limit.toString(),
  });

  if (cursor) {
    params.append('cursor', cursor);
  }

  return fetchAPI(`/findings?${params.toString()}`);
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const response = await fetchAPI('/customers');
    return response.customers || [];
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}

export async function getResources(
  tenantId: string,
  snapshotKey: string
): Promise<ResourcesResponse> {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    snapshot_key: snapshotKey,
  });

  return fetchAPI(`/resources?${params.toString()}`);
}

export async function getDashboardMetrics(
  tenantId: string,
  timelineLimit: number = 5
): Promise<DashboardMetrics> {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    limit: timelineLimit.toString(),
  });

  return fetchAPI(`/findings/metrics?${params.toString()}`);
}
