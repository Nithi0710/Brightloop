import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth/rbac";
import { productSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
        plans: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
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

    // Preserve historical integrity: Updating base product price does not mutate existing historical invoice/subscription snapshots
    const updated = await prisma.$transaction(async (tx) => {
      // Update core product details
      const prod = await tx.product.update({
        where: { id: params.id },
        data: {
          ...rest,
          salesPrice: new Prisma.Decimal(salesPrice),
          costPrice: costPrice ? new Prisma.Decimal(costPrice) : null,
        },
      });

      // Synchronize variants
      if (variants) {
        for (const v of variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name,
                priceAdjustment: new Prisma.Decimal(v.priceAdjustment),
                description: v.description,
                status: v.status,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: params.id,
                name: v.name,
                priceAdjustment: new Prisma.Decimal(v.priceAdjustment),
                description: v.description,
                status: v.status,
              },
            });
          }
        }
      }

      return prod;
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_PRODUCT",
        resource: "PRODUCT",
        resourceId: updated.id,
        description: `Updated product: ${updated.name}`,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update product";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin();
    await prisma.product.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ARCHIVE_PRODUCT",
        resource: "PRODUCT",
        resourceId: params.id,
        description: `Archived product ID ${params.id}`,
      },
    });

    return NextResponse.json({ message: "Product archived successfully" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete product";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

