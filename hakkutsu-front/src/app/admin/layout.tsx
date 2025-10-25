"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ログインページの場合は認証チェックをスキップ
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    // 管理者認証チェック
    const adminAuth = localStorage.getItem("adminAuthenticated");

    if (adminAuth !== "true") {
      router.push("/admin/login");
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [router, pathname]);

  // ログインページの場合は認証チェックなしで表示
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { label: "ダッシュボード", path: "/admin", icon: "📊" },
    { label: "試合管理", path: "/admin/matches", icon: "⚽" },
    { label: "ユーザー管理", path: "/admin/users", icon: "👥" },
    { label: "ユーザー報告", path: "/admin/reports", icon: "⚠️" },
    { label: "チャット管理", path: "/admin/chats", icon: "💬" },
    { label: "来場チェック", path: "/admin/check-ins", icon: "✅" },
    { label: "レビュー管理", path: "/admin/reviews", icon: "⭐" },
    { label: "マッチング管理", path: "/admin/matchings", icon: "🤝" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* ヘッダー */}
      <header className="bg-black border-b-2 border-yellow-400 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold text-yellow-400">
                Giravent 管理画面
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">
                管理者: {localStorage.getItem("adminUserId")}
              </span>
        
              <button
                onClick={() => {
                  localStorage.removeItem("adminAuthenticated");
                  localStorage.removeItem("adminUserId");
                  router.push("/admin/login");
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* サイドバーとメインコンテンツ */}
      <div className="flex">
        {/* サイドバー */}
        <aside className="w-64 bg-black border-r-2 border-yellow-400 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.path ||
                  (item.path !== "/admin" && pathname?.startsWith(item.path));

                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                        isActive
                          ? "bg-yellow-400 text-black font-bold"
                          : "text-white hover:bg-gray-800 hover:text-yellow-400"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
