"use client";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Role = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT";

export function useRequireAuth(allowedRoles?: Role[]) {
  const router = useRouter();
  const { isAuth, user } = useAuthStore();

  useEffect(() => {
    if (!isAuth || !user) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [isAuth, user, router]);

  return { user, isAuth };
}
