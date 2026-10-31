import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role === "ADMIN") {
    redirect("/admin/dashboard");
  } else if (role === "STAFF") {
    redirect("/staff/dashboard");
  } else {
    redirect("/portal/dashboard");
  }
}
