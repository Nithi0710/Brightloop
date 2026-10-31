import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/auth/rbac";
import { customerSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    await requireAdminOrStaff();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const status = searchParams.get("status");

    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(status && { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" }),
        OR: query
          ? [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { businessName: { contains: query, mode: "insensitive" } },
              { customerId: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        _count: {
          select: {
            subscriptions: true,
            invoices: true,
            payments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(customers);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: errorMsg }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdminOrStaff();
    const body = await req.json();
    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || "Validation failed";
      return NextResponse.json(
        { error: firstError, details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const existing = await prisma.customer.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A customer with this email already exists" },
        { status: 409 }
      );
    }

    const count = await prisma.customer.count();
    const customerId = `CUST-${String(count + 1).padStart(5, "0")}`;

    const newCustomer = await prisma.customer.create({
      data: {
        customerId,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        businessName: data.businessName,
        billingAddress: data.billingAddress,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        taxId: data.taxId,
        status: data.status,
        notes: data.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_CUSTOMER",
        resource: "CUSTOMER",
        resourceId: newCustomer.id,
        description: `Customer ${newCustomer.name} (${newCustomer.customerId}) created by ${user.email}`,
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create customer";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

