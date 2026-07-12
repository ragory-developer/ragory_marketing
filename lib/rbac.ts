/**
 * lib/rbac.ts
 * Centralized Role-Based Access Control definitions.
 *
 * PERMISSION KEYS map to navKey entries in the Permission table AND
 * to protected page routes. A "*" means unrestricted access.
 *
 * Suffixes:
 *   ":read"  — list/view only, no create/edit/delete
 *   (none)   — full CRUD access
 */

export type AppRole =
  | 'SUPER_ADMIN'
  | 'MARKETING_DIRECTOR'
  | 'MARKETING_MANAGER'
  | 'FIELD_MARKETING_MANAGER'
  | 'DIGITAL_SPECIALIST'
  | 'FIELD_EXECUTIVE'
  | 'SALES_AGENT'
  | 'SUPPORT_AGENT'
  | 'VIEWER'
  | 'EMPLOYEE'

/** Default nav permissions granted to each role (no override needed in Permission table) */
export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, string[]> = {
  SUPER_ADMIN:             ['*'],
  MARKETING_DIRECTOR:      ['dashboard', 'clients', 'campaigns', 'tasks', 'calls', 'sheets', 'reports', 'employees', 'social'],
  MARKETING_MANAGER:       ['dashboard', 'clients', 'campaigns', 'tasks', 'calls', 'reports'],
  FIELD_MARKETING_MANAGER: ['dashboard', 'clients', 'campaigns', 'tasks', 'calls'],
  DIGITAL_SPECIALIST:      ['dashboard', 'campaigns', 'sheets', 'social'],
  FIELD_EXECUTIVE:         ['dashboard', 'clients:read', 'tasks'],
  SALES_AGENT:             ['dashboard', 'clients', 'calls'],
  SUPPORT_AGENT:           ['dashboard', 'clients:read'],
  VIEWER:                  ['dashboard'],
  EMPLOYEE:                ['dashboard', 'clients'],  // legacy
}

/** Routes that only specific roles may access */
export const ROUTE_ROLE_MAP: { prefix: string; allowed: AppRole[] }[] = [
  {
    prefix: '/settings',
    allowed: ['SUPER_ADMIN'],
  },
  {
    prefix: '/permissions',
    allowed: ['SUPER_ADMIN'],
  },
  {
    prefix: '/employees',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'MARKETING_MANAGER'],
  },
  {
    prefix: '/campaigns',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'MARKETING_MANAGER', 'FIELD_MARKETING_MANAGER', 'DIGITAL_SPECIALIST'],
  },
  {
    prefix: '/tasks',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'MARKETING_MANAGER', 'FIELD_MARKETING_MANAGER', 'FIELD_EXECUTIVE', 'SALES_AGENT'],
  },
  {
    prefix: '/reports',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'MARKETING_MANAGER', 'FIELD_MARKETING_MANAGER'],
  },
  {
    prefix: '/social',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'DIGITAL_SPECIALIST'],
  },
]

/** API routes that only specific roles may call */
export const API_ROLE_MAP: { prefix: string; allowed: AppRole[]; methods?: string[] }[] = [
  {
    prefix: '/api/users',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR'],
  },
  {
    prefix: '/api/permissions',
    allowed: ['SUPER_ADMIN'],
  },
  {
    prefix: '/api/settings',
    allowed: ['SUPER_ADMIN'],
  },
  {
    prefix: '/api/campaigns',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'MARKETING_MANAGER', 'FIELD_MARKETING_MANAGER', 'DIGITAL_SPECIALIST'],
  },
  {
    prefix: '/api/reports',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'MARKETING_MANAGER', 'FIELD_MARKETING_MANAGER'],
  },
  {
    prefix: '/api/social',
    allowed: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'DIGITAL_SPECIALIST'],
  },
]

/** Check if a role has a given permission key */
export function roleHasPermission(role: AppRole, key: string): boolean {
  const perms = ROLE_DEFAULT_PERMISSIONS[role] ?? []
  if (perms.includes('*')) return true
  if (perms.includes(key)) return true
  // allow read-only key match if full access exists
  if (key.endsWith(':read')) {
    return perms.includes(key.replace(':read', ''))
  }
  return false
}

/** Resolve which nav keys a role may access (for SideNav rendering) */
export function getDefaultNavKeys(role: AppRole): string[] {
  const perms = ROLE_DEFAULT_PERMISSIONS[role] ?? []
  if (perms.includes('*')) {
    return [
      'dashboard', 'clients', 'campaigns', 'tasks',
      'calls', 'sheets', 'reports', 'employees', 'permissions', 'settings', 'social'
    ]
  }
  // strip :read suffix for nav key resolution
  return perms.map(p => p.replace(':read', ''))
}

/** Human-readable role labels */
export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN:             'Super Admin',
  MARKETING_DIRECTOR:      'Marketing Director',
  MARKETING_MANAGER:       'Marketing Manager',
  FIELD_MARKETING_MANAGER: 'Field Marketing Manager',
  DIGITAL_SPECIALIST:      'Digital Specialist',
  FIELD_EXECUTIVE:         'Field Executive',
  SALES_AGENT:             'Sales Agent',
  SUPPORT_AGENT:           'Support Agent',
  VIEWER:                  'Viewer',
  EMPLOYEE:                'Employee',
}

/** Badge colors for role pills */
export const ROLE_COLORS: Record<AppRole, string> = {
  SUPER_ADMIN:             '#ef4444',
  MARKETING_DIRECTOR:      '#8b5cf6',
  MARKETING_MANAGER:       '#6366f1',
  FIELD_MARKETING_MANAGER: '#0ea5e9',
  DIGITAL_SPECIALIST:      '#10b981',
  FIELD_EXECUTIVE:         '#f59e0b',
  SALES_AGENT:             '#ec4899',
  SUPPORT_AGENT:           '#14b8a6',
  VIEWER:                  '#6b7280',
  EMPLOYEE:                '#6b7280',
}
