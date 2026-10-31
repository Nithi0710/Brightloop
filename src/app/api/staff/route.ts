import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/rbac";
import { staffSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireAdmin();
    const staffMembers = await prisma.user.findMany({
      where: { role: "STAFF" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { paymentsRecorded: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(staffMembers);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: errorMsg }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const validation = staffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password, isActive } = validation.data;
    const lowerEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newStaff = await prisma.user.create({
      data: {
        name,
        email: lowerEmail,
        password: hashedPassword,
        role: "STAFF",
        isActive,
        managedById: admin.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "CREATE_STAFF",
        resource: "USER",
        resourceId: newStaff.id,
        description: `Admin ${admin.email} created staff account: ${newStaff.email}`,
      },
    });

    return NextResponse.json(newStaff, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create staff member";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
