export type ModuleKey =
  | "dashboard"
  | "inquiries"
  | "quotations"
  | "jobs"
  | "dailyStatus"
  | "finance"
  | "hr"
  | "reports"
  | "masters"
  | "users";

export type ActionType = "view" | "add" | "edit" | "delete";

export interface ActionPermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export type PermissionsMap = Record<ModuleKey, ActionPermissions>;

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  path: string;
  category: "operations" | "financial" | "administration";
}

export const MODULES: ModuleDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Analytics overview, live statistics & KPI cards",
    path: "/dashboard",
    category: "operations",
  },
  {
    key: "inquiries",
    label: "Inquiries",
    description: "Lead management, quotation triggers & conversion to jobs",
    path: "/inquiries",
    category: "operations",
  },
  {
    key: "quotations",
    label: "Quotations",
    description: "Quotation generation, pricing breakdown & official PDF export",
    path: "/quotations",
    category: "operations",
  },
  {
    key: "jobs",
    label: "Jobs & Shipments",
    description: "Active shipments, Cargo Arrival Notices (CAN), and Seaway BLs",
    path: "/jobs",
    category: "operations",
  },
  {
    key: "dailyStatus",
    label: "Daily Status (DSR)",
    description: "Container tracking, remarks log & automated DSR email dispatch",
    path: "/daily-status",
    category: "operations",
  },
  {
    key: "finance",
    label: "Finance & Invoicing",
    description: "Invoicing ledger, buy/sale/cost tracking & weekly/monthly statements",
    path: "/finance",
    category: "financial",
  },
  {
    key: "hr",
    label: "HR & Payroll",
    description: "Staff salaries, daily/monthly attendance (P/A/HD) & payslip generation",
    path: "/hr",
    category: "administration",
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    description: "Employee performance, lead conversion & shipment volume summaries",
    path: "/reports",
    category: "financial",
  },
  {
    key: "masters",
    label: "Masters Data",
    description: "Customer directory, ports, shipping lines, CHAs, transporters & agents",
    path: "/masters",
    category: "administration",
  },
  {
    key: "users",
    label: "Users & Roles",
    description: "User account creation, role assignments & granular per-module permissions",
    path: "/users",
    category: "administration",
  },
];

const emptyPerm = (): ActionPermissions => ({ view: false, add: false, edit: false, delete: false });
const fullPerm = (): ActionPermissions => ({ view: true, add: true, edit: true, delete: true });
const readOnlyPerm = (): ActionPermissions => ({ view: true, add: false, edit: false, delete: false });
const operationalPerm = (): ActionPermissions => ({ view: true, add: true, edit: true, delete: false });

export const ROLE_PRESETS: Record<string, PermissionsMap> = {
  ADMIN: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: fullPerm(),
    hr: fullPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: fullPerm(),
  },
  MANAGER: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: fullPerm(),
    hr: fullPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: operationalPerm(),
  },
  SALES: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: readOnlyPerm(),
    hr: readOnlyPerm(),
    reports: fullPerm(),
    masters: operationalPerm(),
    users: emptyPerm(),
  },
  FINANCE: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: fullPerm(),
    hr: fullPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: emptyPerm(),
  },
  OPERATIONS: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: operationalPerm(),
    hr: readOnlyPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: emptyPerm(),
  },
  QUOTATION: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: readOnlyPerm(),
    hr: readOnlyPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: emptyPerm(),
  },
};

/**
 * Returns default permissions for a role
 */
export function getDefaultPermissions(role: string): PermissionsMap {
  const normRole = (role || "SALES").toUpperCase();
  return ROLE_PRESETS[normRole] || ROLE_PRESETS.SALES;
}

/**
 * Parse permissions from user JSON string or fallback to role defaults
 */
export function parsePermissions(rawJson: string | null | undefined, role: string): PermissionsMap {
  const defaults = getDefaultPermissions(role);
  if (!rawJson) return defaults;

  try {
    const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
    const result: any = { ...defaults };

    for (const mod of MODULES) {
      if (parsed[mod.key]) {
        result[mod.key] = {
          view: Boolean(parsed[mod.key].view),
          add: Boolean(parsed[mod.key].add),
          edit: Boolean(parsed[mod.key].edit),
          delete: Boolean(parsed[mod.key].delete),
        };
      }
    }
    return result as PermissionsMap;
  } catch {
    return defaults;
  }
}

/**
 * Check if a user has permission to perform an action on a module
 */
export function hasPermission(
  permissions: PermissionsMap | null | undefined,
  role: string | null | undefined,
  moduleKey: ModuleKey | string,
  action: ActionType = "view"
): boolean {
  const normRole = (role || "SALES").toUpperCase();
  if (normRole === "ADMIN") return true;

  if (!permissions) {
    const defaults = getDefaultPermissions(normRole);
    return Boolean(defaults[moduleKey as ModuleKey]?.[action]);
  }

  const mod = permissions[moduleKey as ModuleKey];
  if (!mod) return false;
  return Boolean(mod[action]);
}

/**
 * Helper to count active accessible modules
 */
export function countAccessibleModules(permissions: PermissionsMap): number {
  return Object.values(permissions).filter((p) => p.view).length;
}
