"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuth) router.replace("/login");
  }, [isAuth, router]);

  if (!isAuth) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
