import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0A0A0F" }}>
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
