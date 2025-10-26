"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiBase } from "@/lib/apiBase";

export default function AdminLoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const base = apiBase();

      // バックエンドAPIでログイン
      const loginRes = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData?.error || "ログインに失敗しました");
      }

      // 管理者権限を確認
      const verifyRes = await fetch(`${base}/admin/verify`, {
        headers: { Authorization: `Bearer ${loginData.token}` },
      });

      if (!verifyRes.ok) {
        throw new Error("管理者権限がありません");
      }

      // トークンとユーザー情報を保存
      localStorage.setItem("token", loginData.token);
      localStorage.setItem("userId", loginData.user?.userId || userId);
      localStorage.setItem("adminAuthenticated", "true");
      localStorage.setItem("adminUserId", loginData.user?.userId || userId);

      // 管理者ダッシュボードにリダイレクト
      router.push("/admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "ログインに失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-lg border-2 border-yellow-400 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">
            Giravent 管理画面
          </h1>
          <p className="text-gray-400 text-sm">管理者ログイン</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-300 mb-2">メールアドレス</label>
            <input
              type="text"
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">パスワード</label>
            <input
              type="password"
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-black transition ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-500"
            }`}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {/* 管理者パスワードの表示は行いません */}
      </div>
    </div>
  );
}
