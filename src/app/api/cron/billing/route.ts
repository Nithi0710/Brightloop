import { NextResponse } from "next/server";
import { runRecurringBillingEngine } from "@/lib/billing/engine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function POST(req: Request) {
  try {
    // 1. Verify authorization: either via CRON_SECRET bearer token or authenticated Admin/Staff session
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "brightloop-cron-authorization-secret-token";
    const isCronAuthorized = authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const session = await getServerSession(authOptions);
      if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
        return NextResponse.json(
          { error: "Unauthorized. Requires Admin or Staff permissions." },
          { status: 401 }
        );
      }
    }

    // 2. Parse optional target subscription ID for manual retry/single execution
    let targetSubId: string | undefined = undefined;
    try {
      const body = await req.json();
      if (body?.subscriptionId) {
        targetSubId = body.subscriptionId;
      }
    } catch {
      // Body may be empty in scheduled GET/POST
    }

    // 3. Execute billing engine
    const result = await runRecurringBillingEngine(targetSubId);

    return NextResponse.json({
      message: "Recurring billing cycle evaluation completed successfully",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Billing cron execution error:", error);
    return NextResponse.json(
      {
        error: "Billing engine execution encountered an error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Allow GET for simple health-check or cron ping
export async function GET(req: Request) {
  return POST(req);
}

