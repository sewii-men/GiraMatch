"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        router.push("/login?redirect=/admin");
        return;
      }

      try {
        const base = apiBase();
        const res = await fetch(`${base}/admin/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          setIsAdmin(true);
        } else {
          // 管理者権限がない場合はホームへリダイレクト
          alert("管理者権限が必要です");
          router.push("/");
        }
      } catch (error) {
        console.error("Admin verification failed:", error);
        alert("管理者認証に失敗しました");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">認証確認中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
