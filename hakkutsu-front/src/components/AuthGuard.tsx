"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AuthGuard() {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token) {
      const next = encodeURIComponent(pathname || "/");
      router.push(`/login?next=${next}`);
    }
  }, [token, pathname, router]);

  return null;
}
