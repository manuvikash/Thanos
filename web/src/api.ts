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
  resource_type: string;
  severity: string;
  message: string;
  observed: any;
  expected: any;
  timestamp: string;
  account_id: string;
  region: string;
  category?: string; // compliance, type-golden, instance-golden
  status?: string;
  differences?: Array<{
    path: string;
    actual: any;
    expected: any;
  }>;
  metadata?: any;
}

export interface Resource {
  // Identity
  arn: string;
  resource_type: string;
  region: string;
  account_id: string;
  tenant_id: string;
  
  // Configuration
  config: any;
  desired_config?: any;
  metadata: any;
  
  // Compliance
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_EVALUATED';
  drift_score: number;
  findings_count: number;
  
  // Tracking
  last_evaluated: string;
  snapshot_key: string;
  scan_id: string;
  
  // Hierarchy
  base_config_applied?: string;
  groups_applied?: string[];
}

export interface ScanResponse {
  tenant_id: string;
  account_id: string;
  regions: string[];
  scan_id: string;
  totals: {
    resources: number;
    findings: number;
  };
  compliance: {
    total: number;
    compliant: number;
    non_compliant: number;
    not_evaluated: number;
    compliance_percentage: number;
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
  tenant_id?: string;
}

export interface VerifyAndRegisterRequest {
  account_id: string;
  regions: string[];
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
  resources: Resource[];
  totals: {
    total_resources: number;
    by_type: Record<string, number>;
    by_compliance: Record<string, number>;
  };
}

export interface BaseConfig {
  resource_type: string;
  desired_config: object;
  version: string;
  editable: boolean;
  created_at: string;
  updated_at: string;
}

export interface BaseConfigsResponse {
  configs: BaseConfig[];
}

export interface BaseConfigCreateRequest {
  resource_type: string;
  desired_config: object;
  save_as_template?: boolean;
  template_name?: string;
  template_description?: string;
}

export interface ConfigTemplate {
  template_id: string;
  name: string;
  resource_type: string;
  description: string;
  desired_config: any;
  category: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceGroup {
  group_id: string;
  name: string;
  resource_type: string;
  selector: {
    tags?: Record<string, string>;
    arn_pattern?: string;
    name_pattern?: string;
  };
  priority: number;
  description: string;
  desired_config: any;
  created_at: string;
  updated_at: string;
}

export interface ResourceGroupsResponse {
  groups: ResourceGroup[];
}

export interface ResourceGroupCreateRequest {
  name: string;
  resource_type: string;
  description: string;
  priority: number;
  selector: {
    tags?: Record<string, string>;
    arn_pattern?: string;
    name_pattern?: string;
  };
  desired_config: any;
}

export interface TemplatesResponse {
  templates: ConfigTemplate[];
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

export interface TopResource {
  resource_type: string;
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
  top_resources: TopResource[];
  timeline: TimelinePoint[];
}

export interface PublicConfig {
  trusted_account_id: string;
  cloudformation_template_url: string;
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

export async function verifyAndRegisterCustomer(
  data: VerifyAndRegisterRequest
): Promise<CustomerResponse> {
  const response = await fetch(`${API_URL}/customers/verify-and-register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: Verification failed`);
  }

  return response.json();
}

export async function getResources(
  tenantId: string,
  snapshotKey?: string,
  complianceStatus?: string,
  resourceType?: string,
  limit: number = 100
): Promise<ResourcesResponse> {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    limit: limit.toString(),
  });

  if (snapshotKey) {
    params.append('snapshot_key', snapshotKey);
  }

  if (complianceStatus) {
    params.append('compliance_status', complianceStatus);
  }

  if (resourceType) {
    params.append('resource_type', resourceType);
  }

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

// Base Config API
export async function getBaseConfigs(tenantId?: string): Promise<BaseConfigsResponse> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/base-configs?${params.toString()}` : '/base-configs';
  return fetchAPI(url);
}

export async function getBaseConfig(resourceType: string, tenantId?: string): Promise<BaseConfig> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/base-configs/${resourceType}?${params.toString()}` : `/base-configs/${resourceType}`;
  return fetchAPI(url);
}

export async function createBaseConfig(
  config: BaseConfigCreateRequest,
  tenantId?: string
): Promise<BaseConfig> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/base-configs?${params.toString()}` : '/base-configs';
  return fetchAPI(url, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function updateBaseConfig(
  resourceType: string,
  updates: BaseConfigCreateRequest,
  tenantId?: string
): Promise<BaseConfig> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/base-configs/${resourceType}?${params.toString()}` : `/base-configs/${resourceType}`;
  return fetchAPI(url, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteBaseConfig(resourceType: string, tenantId?: string): Promise<{ message: string }> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/base-configs/${resourceType}?${params.toString()}` : `/base-configs/${resourceType}`;
  return fetchAPI(url, {
    method: 'DELETE',
  });
}

// Templates API
export async function getTemplates(tenantId?: string): Promise<TemplatesResponse> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/templates?${params.toString()}` : '/templates';
  return fetchAPI(url);
}

export async function getTemplatesByResourceType(resourceType: string, tenantId?: string): Promise<TemplatesResponse> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/templates/resource-type/${resourceType}?${params.toString()}` : `/templates/resource-type/${resourceType}`;
  return fetchAPI(url);
}

export async function getTemplate(templateId: string, tenantId?: string): Promise<ConfigTemplate> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/templates/${templateId}?${params.toString()}` : `/templates/${templateId}`;
  return fetchAPI(url);
}

export async function createTemplate(
  template: {
    name: string;
    resource_type: string;
    description: string;
    desired_config: object;
    category?: string;
  },
  tenantId?: string
): Promise<ConfigTemplate> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/templates?${params.toString()}` : '/templates';
  return fetchAPI(url, {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

export async function deleteTemplate(templateId: string, tenantId?: string): Promise<{ message: string }> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/templates/${templateId}?${params.toString()}` : `/templates/${templateId}`;
  return fetchAPI(url, {
    method: 'DELETE',
  });
}

// Resource Groups API
export async function getResourceGroups(tenantId?: string): Promise<ResourceGroupsResponse> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/groups?${params.toString()}` : '/groups';
  return fetchAPI(url);
}

export async function getResourceGroup(groupId: string, tenantId?: string): Promise<ResourceGroup> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/groups/${groupId}?${params.toString()}` : `/groups/${groupId}`;
  return fetchAPI(url);
}

export async function createResourceGroup(
  group: ResourceGroupCreateRequest,
  tenantId?: string
): Promise<ResourceGroup> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/groups?${params.toString()}` : '/groups';
  return fetchAPI(url, {
    method: 'POST',
    body: JSON.stringify(group),
  });
}

export async function updateResourceGroup(
  groupId: string,
  updates: Partial<ResourceGroupCreateRequest>,
  tenantId?: string
): Promise<ResourceGroup> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/groups/${groupId}?${params.toString()}` : `/groups/${groupId}`;
  return fetchAPI(url, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteResourceGroup(groupId: string, tenantId?: string): Promise<{ message: string }> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = params.toString() ? `/groups/${groupId}?${params.toString()}` : `/groups/${groupId}`;
  return fetchAPI(url, {
    method: 'DELETE',
  });
}

export async function getPublicConfig(): Promise<PublicConfig> {
  return fetchAPI('/config/public');
}

// ============================================================================
// MCP (Model Context Protocol) API
// ============================================================================

export interface MCPApiKey {
  api_key: string;
  api_key_full?: string; // Full key returned on first load for caching
  key_suffix?: string; // Consistent suffix for matching
  key_id?: string; // Alias for key_suffix
  name: string;
  created_at: number;
  expires_at: number;
  last_used: number | null;
  status: string;
}

export interface MCPApiKeyCreateRequest {
  name: string;
  expires_days?: number;
}

export interface MCPApiKeyCreateResponse {
  api_key: string;
  name: string;
  created_at: number;
  expires_at: number;
  message: string;
}

export interface MCPApiKeysListResponse {
  keys: MCPApiKey[];
  count: number;
}

export async function getMCPApiKeys(): Promise<MCPApiKeysListResponse> {
  return fetchAPI('/mcp/keys');
}

export async function createMCPApiKey(request: MCPApiKeyCreateRequest): Promise<MCPApiKeyCreateResponse> {
  return fetchAPI('/mcp/keys', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function revokeMCPApiKey(keySuffix: string): Promise<{ message: string }> {
  return fetchAPI(`/mcp/keys/${keySuffix}`, {
    method: 'DELETE',
  });
}
