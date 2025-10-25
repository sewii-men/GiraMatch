"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";

interface MyRecruitment {
  id: string;
  matchId: string;
  matchName: string;
  opponent: string;
  date: string;
  time: string;
  venue?: string;
  status?: string;
  conditions: string[];
  message: string;
  requestCount: number;
  createdAt: string;
}

const statusColorMap: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
  draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function MyRecruitmentsPage() {
  const { token } = useAuth();
  const [recruitments, setRecruitments] = useState<MyRecruitment[]>([]);
  const [filteredRecruitments, setFilteredRecruitments] = useState<MyRecruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRecruitments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/matching/my-recruitments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("failed to fetch");
      const data = await res.json();
      setRecruitments(data);
    } catch (err) {
      console.error(err);
      setError("マイ募集の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchRecruitments();
  }, [token, fetchRecruitments]);

  useEffect(() => {
    let next = [...recruitments];
    if (statusFilter !== "all") {
      next = next.filter((r) => (r.status || "active") === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      next = next.filter(
        (r) =>
          r.opponent.toLowerCase().includes(term) ||
          r.message.toLowerCase().includes(term) ||
          r.conditions.some((c) => c.toLowerCase().includes(term))
      );
    }
    setFilteredRecruitments(next);
  }, [recruitments, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = recruitments.length;
    const active = recruitments.filter((r) => (r.status || "active") === "active").length;
    const requests = recruitments.reduce((sum, r) => sum + (r.requestCount || 0), 0);
    return { total, active, requests };
  }, [recruitments]);

  const formatDate = (value: string) => {
    const date = value ? new Date(value) : null;
    return date ? date.toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" }) : "-";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />
      <main className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-2 flex items-center gap-2">
                <Link href="/dashboard" className="text-gray-700 hover:text-black">
                  ← ダッシュボードに戻る
                </Link>
              </p>
              <h1 className="text-4xl font-bold text-black mb-2">マイ募集</h1>
              <p className="text-gray-700">
                自分が作成した募集の状況を確認し、参加リクエストを管理しましょう
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchRecruitments}
                className="px-4 py-2 border-2 border-gray-900 rounded-full text-sm font-bold text-black hover:bg-gray-900 hover:text-white transition"
              >
                最新の状態に更新
              </button>
              <Link
                href="/matches?mode=recruit"
                className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold hover:bg-red-700 transition"
              >
                新しい募集を作成
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-8">
            <div className="bg-white rounded-xl border-2 border-yellow-400 p-5 shadow">
              <p className="text-sm text-gray-600">募集の合計</p>
              <p className="text-4xl font-bold text-black mt-2">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-yellow-400 p-5 shadow">
              <p className="text-sm text-gray-600">募集中</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{stats.active}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-yellow-400 p-5 shadow">
              <p className="text-sm text-gray-600">リクエスト合計</p>
              <p className="text-4xl font-bold text-red-600 mt-2">{stats.requests}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mt-10 border-2 border-gray-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <input
                type="search"
                placeholder="試合名やメッセージ、条件で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-600 text-black"
              />
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    statusFilter === "all"
                      ? "border-red-600 bg-red-50 text-red-700 font-bold"
                      : "border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  全て
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    statusFilter === "active"
                      ? "border-red-600 bg-red-50 text-red-700 font-bold"
                      : "border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  募集中
                </button>
                <button
                  onClick={() => setStatusFilter("closed")}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    statusFilter === "closed"
                      ? "border-red-600 bg-red-50 text-red-700 font-bold"
                      : "border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  終了
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            {loading && (
              <p className="text-center text-gray-700 bg-white py-6 rounded-xl shadow">
                読み込み中...
              </p>
            )}
            {error && (
              <p className="text-center text-red-600 bg-white py-6 rounded-xl shadow">
                {error}
              </p>
            )}
            {!loading && !error && filteredRecruitments.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-10 text-center border-2 border-dashed border-gray-300">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-700 mb-4">
                  まだ募集がありません。まずは試合ページから募集を作成しましょう。
                </p>
                <Link
                  href="/matches?mode=recruit"
                  className="inline-block bg-red-600 text-white px-6 py-3 rounded-full font-bold hover:bg-red-700 transition"
                >
                  募集を作成する
                </Link>
              </div>
            )}
            {filteredRecruitments.map((recruitment) => {
              const status = recruitment.status || "active";
              const statusClass = statusColorMap[status] || "bg-gray-100 text-gray-700 border-gray-200";
              return (
                <div
                  key={recruitment.id}
                  className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm hover:border-yellow-400 transition"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">試合</p>
                      <p className="text-2xl font-bold text-black">{recruitment.opponent}</p>
                      <p className="text-gray-600">
                        {recruitment.date} {recruitment.time}
                      </p>
                      {recruitment.venue && (
                        <p className="text-sm text-gray-600 mt-1">📍 {recruitment.venue}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-bold ${statusClass}`}>
                      {status === "active" ? "募集中" : status === "closed" ? "終了" : status}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">募集条件 / メッセージ</p>
                      <p className="text-gray-800 bg-gray-50 rounded-xl p-4">
                        {recruitment.message}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {recruitment.conditions.slice(0, 4).map((condition) => (
                          <span
                            key={condition}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"
                          >
                            {condition}
                          </span>
                        ))}
                        {recruitment.conditions.length > 4 && (
                          <span className="text-xs text-gray-500 px-3 py-1 rounded-full bg-gray-100">
                            +{recruitment.conditions.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <p className="text-sm text-gray-500">リクエスト数</p>
                        <p className="text-4xl font-bold text-red-600">
                          {recruitment.requestCount}
                          <span className="text-base text-gray-600 font-normal ml-1">件</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          作成: {formatDate(recruitment.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <Link
                          href={`/matching/${recruitment.matchId}`}
                          className="text-center w-full border-2 border-gray-200 rounded-full px-4 py-2 text-sm font-bold text-gray-700 hover:border-gray-400 transition"
                        >
                          試合ページを見る
                        </Link>
                        <Link
                          href={`/my-recruitments/${recruitment.id}/requests`}
                          className="text-center w-full bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition"
                        >
                          リクエスト管理
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
