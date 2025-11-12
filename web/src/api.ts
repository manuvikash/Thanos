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
