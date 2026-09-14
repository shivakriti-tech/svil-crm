"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import {
  ModuleKey,
  ActionType,
  PermissionsMap,
  parsePermissions,
  hasPermission,
  getDefaultPermissions,
} from "@/lib/permissions";

export function usePermissions() {
  const { data: session, status } = useSession();

  const role = (session?.user as any)?.role || "SALES";
  const rawPermissions = (session?.user as any)?.permissions;

  const permissions: PermissionsMap = useMemo(() => {
    return parsePermissions(rawPermissions, role);
  }, [rawPermissions, role]);

  const isAdmin = role.toUpperCase() === "ADMIN";
  const isManager = role.toUpperCase() === "MANAGER";

  const can = (moduleKey: ModuleKey, action: ActionType = "view"): boolean => {
    return hasPermission(permissions, role, moduleKey, action);
  };

  const hasModule = (moduleKey: ModuleKey): boolean => {
    return can(moduleKey, "view");
  };

  return {
    user: session?.user,
    role,
    isAdmin,
    isManager,
    permissions,
    can,
    hasModule,
    loading: status === "loading",
  };
}
