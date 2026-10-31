import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/lib/auth/rbac";
import { productSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const type = searchParams.get("type");

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(type && { type: type as Prisma.EnumProductTypeFilter }),
        ...(query && {
          name: { contains: query, mode: "insensitive" },
        }),
      },
      include: {
        variants: true,
        plans: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch products";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { variants, salesPrice, costPrice, ...rest } = validation.data;

    const newProduct = await prisma.product.create({
      data: {
        ...rest,
        salesPrice: new Prisma.Decimal(salesPrice),
        costPrice: costPrice ? new Prisma.Decimal(costPrice) : null,
        variants: variants && variants.length > 0 ? {
          create: variants.map((v) => ({
            name: v.name,
            priceAdjustment: new Prisma.Decimal(v.priceAdjustment),
            description: v.description,
            status: v.status,
          })),
        } : undefined,
      },
      include: { variants: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_PRODUCT",
        resource: "PRODUCT",
        resourceId: newProduct.id,
        description: `Created product: ${newProduct.name}`,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create product";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

