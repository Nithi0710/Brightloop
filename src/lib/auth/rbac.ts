import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  customerId?: string | null;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as AuthenticatedUser;
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    // If customer tries to access admin or staff, redirect to portal
    if (user.role === "CUSTOMER") {
      redirect("/portal/dashboard");
    }
    // If staff tries to access admin-only, redirect to staff
    if (user.role === "STAFF") {
      redirect("/staff/dashboard");
    }
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireRole(["ADMIN"]);
}

export async function requireAdminOrStaff(): Promise<AuthenticatedUser> {
  return requireRole(["ADMIN", "STAFF"]);
}

export async function requireCustomer(): Promise<AuthenticatedUser> {
  return requireRole(["CUSTOMER"]);
}

/**
 * Checks whether the current user has permission to view or manage a customer's resource
 */
export function canAccessCustomerResource(
  user: AuthenticatedUser,
  resourceCustomerId: string
): boolean {
  if (user.role === "ADMIN" || user.role === "STAFF") {
    return true;
  }
  return user.customerId === resourceCustomerId;
}

