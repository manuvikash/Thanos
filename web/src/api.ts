/**
 * API client for Thanos backend
 */

import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// const API_KEY = import.meta.env.VITE_API_KEY || '';

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
  category?: string; // compliance, type-golden, instance-golden
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

export interface Rule {
  id: string;
  resource_type: string;
  check: {
    type: string;
    path: string;
    expected?: any;
    forbidden?: string[];
    params?: Record<string, any>;
  };
  severity: string;
  message: string;
  category: string;
  selector: Record<string, any>;
  source: 'default' | 'custom' | 'global';
  tenant_id?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  enabled?: boolean;
  editable?: boolean;
}

export interface RulesResponse {
  rules: Rule[];
}

export interface RuleCreateRequest {
  id?: string;
  resource_type: string;
  check: {
    type: string;
    path: string;
    expected?: any;
    forbidden?: string[];
    params?: Record<string, any>;
  };
  severity: string;
  message: string;
  category?: string;
  selector?: Record<string, any>;
  created_by?: string;
  enabled?: boolean;
}

export interface RuleUpdateRequest {
  resource_type?: string;
  check?: {
    type: string;
    path: string;
    expected?: any;
    forbidden?: string[];
    params?: Record<string, any>;
  };
  severity?: string;
  message?: string;
  category?: string;
  selector?: Record<string, any>;
  updated_by?: string;
  enabled?: boolean;
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

export interface CustomerRegistration {
  tenant_id: string;
  customer_name: string;
  role_arn: string;
  account_id: string;
  regions: string[];
}

export interface CustomerResponse {
  message: string;
  customer: Customer;
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
  let token = '';
  try {
    const session = await fetchAuthSession();
    token = session.tokens?.idToken?.toString() || '';
  } catch (e) {
    // console.warn('No auth session found', e);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': token } : {}),
    ...options.headers as Record<string, string>,
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

export async function registerCustomer(
  registration: CustomerRegistration
): Promise<CustomerResponse> {
  const response = await fetch(`${API_URL}/customers/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registration),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (response.status === 409) {
      throw new Error(error.error || 'Customer with this Tenant ID already exists');
    }

    throw new Error(error.error || `HTTP ${response.status}: Registration failed`);
  }

  return response.json();
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

// Rules API
export async function getRules(tenantId?: string): Promise<RulesResponse> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }

  const url = params.toString() ? `/rules?${params.toString()}` : '/rules';
  return fetchAPI(url);
}

export async function getRule(ruleId: string, tenantId?: string): Promise<Rule> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }

  const url = params.toString() ? `/rules/${ruleId}?${params.toString()}` : `/rules/${ruleId}`;
  return fetchAPI(url);
}

export async function createRule(
  rule: RuleCreateRequest,
  tenantId?: string
): Promise<Rule> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }

  const url = params.toString() ? `/rules?${params.toString()}` : '/rules';
  return fetchAPI(url, {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

export async function updateRule(
  ruleId: string,
  updates: RuleUpdateRequest,
  tenantId?: string
): Promise<Rule> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }

  const url = params.toString() ? `/rules/${ruleId}?${params.toString()}` : `/rules/${ruleId}`;
  return fetchAPI(url, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteRule(ruleId: string, tenantId?: string): Promise<{ message: string }> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }

  const url = params.toString() ? `/rules/${ruleId}?${params.toString()}` : `/rules/${ruleId}`;
  return fetchAPI(url, {
    method: 'DELETE',
  });
}
