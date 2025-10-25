"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // client-side basic validation
    const idOk = /^[a-zA-Z0-9_-]{3,30}$/.test(userId.trim());
    if (!idOk) {
      setError("ユーザーIDは3〜30文字、英数字・_・-のみ利用できます");
      return;
    }
    const nameTrim = name.trim();
    if (nameTrim.length < 1 || nameTrim.length > 50) {
      setError("表示名は1〜50文字で入力してください");
      return;
    }
    if (password.length < 8 || password.length > 72 || !(/[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
      setError("パスワードは8〜72文字で英字と数字を含めてください");
      return;
    }
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), name: nameTrim, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "登録に失敗しました");
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user?.userId || userId);
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      window.location.href = next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "登録に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border-2 border-yellow-400 p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-black">新規登録</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">ユーザーID</label>
            <input
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-400"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="例: your-id"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">表示名</label>
            <input
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 山田 太郎"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上を推奨"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-full font-bold text-white ${loading ? "bg-gray-300" : "bg-red-600 hover:bg-red-700"}`}
          >
            {loading ? "処理中..." : "登録"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          すでにアカウントをお持ちの方は {" "}
          <Link href="/login" className="text-red-600 font-bold hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
