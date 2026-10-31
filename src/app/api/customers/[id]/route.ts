import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminOrStaff, canAccessCustomerResource } from "@/lib/auth/rbac";
import { customerSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          orderBy: { invoiceDate: "desc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
        quotations: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Role check: customer can only view own profile
    if (!canAccessCustomerResource(user, customer.id)) {
      return NextResponse.json({ error: "Forbidden access" }, { status: 403 });
    }

    return NextResponse.json(customer);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdminOrStaff();
    const body = await req.json();
    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
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
        action: "UPDATE_CUSTOMER",
        resource: "CUSTOMER",
        resourceId: updated.id,
        description: `Customer ${updated.name} updated by ${user.email}`,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update customer";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdminOrStaff();
    await prisma.customer.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SOFT_DELETE_CUSTOMER",
        resource: "CUSTOMER",
        resourceId: params.id,
        description: `Customer marked inactive / soft deleted by ${user.email}`,
      },
    });

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete customer";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

