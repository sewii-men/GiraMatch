"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";

interface RecruitmentSummary {
  id: string;
  opponent: string;
  date: string;
  time: string;
  venue?: string;
  status?: string;
  message: string;
  conditions: string[];
  requestCount: number;
  createdAt: string;
}

interface RecruitmentRequest {
  id: string;
  status: string;
  createdAt: string;
  requester: {
    userId: string;
    nickname: string;
    gender?: string;
    icon?: string;
    trustScore?: number;
    style?: string;
    seat?: string;
  };
}

const requestStatusClass: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  declined: "bg-gray-200 text-gray-700 border-gray-200",
};

export default function RecruitmentRequestsPage() {
  const { token } = useAuth();
  const params = useParams<{ recruitmentId: string }>();
  const recruitmentId = Array.isArray(params?.recruitmentId)
    ? params?.recruitmentId[0]
    : params?.recruitmentId;
  const [recruitment, setRecruitment] = useState<RecruitmentSummary | null>(null);
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined">(
    "all"
  );

  useEffect(() => {
    if (!token || !recruitmentId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const base = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${base}/matching/my-recruitments/${recruitmentId}/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("failed to fetch");
        const data = await res.json();
        setRecruitment(data.recruitment);
        setRequests(data.requests || []);
      } catch (err) {
        console.error(err);
        setError("リクエスト一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, recruitmentId]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((req) => (req.status || "pending") === statusFilter);
  }, [requests, statusFilter]);

  const requestStats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => (r.status || "pending") === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const declined = requests.filter((r) => r.status === "declined").length;
    return { total, pending, approved, declined };
  }, [requests]);

  const statusLabel = (status?: string) => {
    switch (status) {
      case "approved":
        return "承認済み";
      case "declined":
        return "辞退/拒否";
      case "active":
        return "募集中";
      case "closed":
        return "終了";
      default:
        return "募集中";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />
      <main className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-2 mb-8">
            <Link href="/my-recruitments" className="text-gray-700 hover:text-black text-sm">
              ← マイ募集一覧に戻る
            </Link>
            <h1 className="text-4xl font-bold text-black">リクエスト管理</h1>
            <p className="text-gray-700">
              募集に届いた参加リクエストを確認し、安心してマッチングを進めましょう
            </p>
          </div>

          {loading && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-700">
              読み込み中...
            </div>
          )}

          {error && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-red-600">{error}</div>
          )}

          {!loading && !error && !recruitment && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-700">
              募集が見つかりませんでした。
            </div>
          )}

          {recruitment && (
            <>
              <section className="bg-white rounded-2xl border-2 border-yellow-400 p-6 shadow mb-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">募集している試合</p>
                    <h2 className="text-3xl font-bold text-black mb-1">{recruitment.opponent}</h2>
                    <p className="text-gray-700">
                      {recruitment.date} {recruitment.time}
                    </p>
                    {recruitment.venue && (
                      <p className="text-gray-600 text-sm mt-1">📍 {recruitment.venue}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full border-2 border-gray-200 text-sm font-bold text-gray-700">
                      {statusLabel(recruitment.status)}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">
                      作成日時:{" "}
                      {new Date(recruitment.createdAt).toLocaleString("ja-JP", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 mt-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">メッセージ</p>
                    <p className="bg-gray-50 rounded-xl p-4 text-gray-800">{recruitment.message}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">条件</p>
                    <div className="flex flex-wrap gap-2">
                      {recruitment.conditions.length > 0 ? (
                        recruitment.conditions.map((condition) => (
                          <span
                            key={condition}
                            className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-bold"
                          >
                            {condition}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">条件は設定されていません</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow text-center">
                  <p className="text-sm text-gray-600">リクエスト合計</p>
                  <p className="text-4xl font-bold text-black mt-2">{requestStats.total}</p>
                </div>
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow text-center">
                  <p className="text-sm text-gray-600">未対応</p>
                  <p className="text-4xl font-bold text-yellow-600 mt-2">{requestStats.pending}</p>
                </div>
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow text-center">
                  <p className="text-sm text-gray-600">承認済み</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">{requestStats.approved}</p>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow p-6 border-2 border-gray-100">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                  <h3 className="text-2xl font-bold text-black">リクエスト一覧</h3>
                  <div className="flex gap-2 text-sm">
                    {(["all", "pending", "approved", "declined"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-full border-2 ${
                          statusFilter === status
                            ? "border-red-600 bg-red-50 text-red-700 font-bold"
                            : "border-gray-200 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {status === "all"
                          ? "全て"
                          : status === "pending"
                          ? "未対応"
                          : status === "approved"
                          ? "承認済み"
                          : "辞退/拒否"}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="text-center text-gray-600 bg-gray-50 rounded-xl p-10">
                    リクエストはまだありません。
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map((request) => {
                      const status = request.status || "pending";
                      const badgeClass =
                        requestStatusClass[status] || "bg-gray-200 text-gray-700 border-gray-200";
                      return (
                        <div
                          key={request.id}
                          className="border-2 border-gray-100 rounded-2xl p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between hover:border-yellow-400 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-4xl bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center">
                              {request.requester.icon || "🙂"}
                            </div>
                            <div>
                              <p className="text-lg font-bold text-black">
                                {request.requester.nickname}
                              </p>
                              <p className="text-sm text-gray-600">
                                {request.requester.style || "スタイル未設定"} ・{" "}
                                {request.requester.seat || "座席未設定"}
                              </p>
                              <p className="text-xs text-gray-500">
                                信頼スコア: {request.requester.trustScore ?? "-"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-bold ${badgeClass}`}
                            >
                              {status === "pending"
                                ? "未対応"
                                : status === "approved"
                                ? "承認済み"
                                : "辞退/拒否"}
                            </span>
                            <p className="text-xs text-gray-500 mt-2">
                              受信日時:{" "}
                              {new Date(request.createdAt).toLocaleString("ja-JP", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
