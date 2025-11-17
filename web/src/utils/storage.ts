/**
 * LocalStorage utilities for tenant management
 */

export interface SavedTenant {
  id: string;
  name: string;
  roleArn: string;
  accountId: string;
  regions: string[];
  rulesSource: 'repo' | 's3';
  lastUsed: string;
}

const STORAGE_KEY = 'thanos_tenants';

export function getSavedTenants(): SavedTenant[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveTenant(tenant: SavedTenant): void {
  try {
    const tenants = getSavedTenants();
    const existing = tenants.findIndex(t => t.id === tenant.id);
    
    if (existing >= 0) {
      tenants[existing] = { ...tenant, lastUsed: new Date().toISOString() };
    } else {
      tenants.push({ ...tenant, lastUsed: new Date().toISOString() });
    }
    
    // Keep only last 10 tenants
    const sorted = tenants.sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    ).slice(0, 10);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch (error) {
    console.error('Failed to save tenant:', error);
  }
}

export function deleteTenant(tenantId: string): void {
  try {
    const tenants = getSavedTenants().filter(t => t.id !== tenantId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  } catch (error) {
    console.error('Failed to delete tenant:', error);
  }
}

export function parseUrlParams(): Partial<SavedTenant> | null {
  const params = new URLSearchParams(window.location.search);
  const tenant = params.get('tenant');
  const roleArn = params.get('role');
  const accountId = params.get('account');
  const regions = params.get('regions');
  
  if (!tenant && !roleArn) return null;
  
  return {
    id: tenant || undefined,
    roleArn: roleArn || undefined,
    accountId: accountId || undefined,
    regions: regions ? regions.split(',') : undefined,
  };
}

export function extractAccountIdFromArn(arn: string): string | null {
  // Parse: arn:aws:iam::123456789012:role/RoleName
  const match = arn.match(/^arn:aws:iam::(\d{12}):/);
  return match ? match[1] : null;
}
