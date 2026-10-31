import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password, businessName, phone } = validation.data;
    const lowerEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcryptjs
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Atomically create User and Customer in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // 1. Create User with CUSTOMER role strictly
      const user = await tx.user.create({
        data: {
          name,
          email: lowerEmail,
          password: hashedPassword,
          role: "CUSTOMER", // STRICT: Never allow public registration to pick Admin or Staff
          isActive: true,
        },
      });

      // 2. Generate unique Customer ID
      const customerCount = await tx.customer.count();
      const customerId = `CUST-${String(customerCount + 1).padStart(5, "0")}`;

      // 3. Create linked Customer record
      const customer = await tx.customer.create({
        data: {
          customerId,
          userId: user.id,
          name,
          email: lowerEmail,
          phone: phone || null,
          businessName: businessName || null,
          status: "ACTIVE",
        },
      });

      // 4. Log audit event
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REGISTER",
          resource: "USER",
          resourceId: user.id,
          description: `Customer account registered: ${lowerEmail}`,
        },
      });

      return { user, customer };
    });

    return NextResponse.json(
      {
        message: "Registration successful. You can now log in.",
        userId: newUser.user.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}

