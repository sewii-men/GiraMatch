"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function NavBar() {
  const pathname = usePathname();
  const { token, userId, logout } = useAuth();

  // 管理者画面ではNavBarを表示しない
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="bg-black text-white py-4 px-6 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold cursor-pointer">
            <span className="text-yellow-400">Giravent</span>
          </h1>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/matches" className="hover:text-yellow-400 transition">
            試合一覧
          </Link>
          <Link href="/chat" className="hover:text-yellow-400 transition">
            チャット
          </Link>
          <Link href="/check-in" className="hover:text-yellow-400 transition">
            来場チェック
          </Link>
          {!token ? (
            <div className="flex items-center gap-3 ml-4">
              <Link href="/login" className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition text-sm">
                ログイン
              </Link>
              <Link href="/register" className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition text-sm">
                新規登録
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-gray-300">{userId}</span>
              <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition text-sm">
                ログアウト
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
