"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AuthGuard() {
  const { token, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      const next = encodeURIComponent(pathname || "/");
      router.push(`/login?next=${next}`);
    }
  }, [token, pathname, router, isReady]);

  return null;
}
