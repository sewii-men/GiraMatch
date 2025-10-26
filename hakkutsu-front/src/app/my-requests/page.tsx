"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";
import { calculateAge } from "@/lib/utils";

interface SentRequest {
  requestId: string;
  recruitmentId: string;
  matchId?: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  status: string;
  createdAt: string;
  message?: string;
  conditions?: string[];
  isRequested?: boolean;
  recruiter?: {
    userId: string;
    nickname: string;
    icon?: string;
    gender?: string;
    birthDate?: string;
    style?: string;
    seat?: string;
    trustScore?: number;
  };
}

const statusMeta = {
  pending: { label: "審査中", classes: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  approved: { label: "承認済み", classes: "bg-green-100 text-green-700 border-green-300" },
  declined: { label: "見送り", classes: "bg-gray-200 text-gray-600 border-gray-300" },
  rejected: { label: "見送り", classes: "bg-gray-200 text-gray-600 border-gray-300" },
  cancelled: { label: "取り消し済み", classes: "bg-gray-100 text-gray-600 border-gray-300" },
} as const;

export default function MyRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined" | "cancelled">("all");

  useEffect(() => {
    if (!token) return;
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const base = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${base}/matching/my-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("リクエスト一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [token]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((req) => (req.status || "pending") === statusFilter);
  }, [requests, statusFilter]);

  const formatDate = (value: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancel = async (request: SentRequest) => {
    if (!token) return;
    if (
      !confirm(
        `「${request.opponent || "この募集"}」へのリクエストを取り消しますか？\n\n再参加する時は募集一覧から再度リクエストしてください。`
      )
    ) {
      return;
    }

    try {
      setCancellingId(request.requestId);
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/matching/requests/${request.requestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "リクエストの取り消しに失敗しました");
      }
      alert("リクエストを取り消しました");
      setRequests((prev) =>
        prev.map((item) =>
          item.requestId === request.requestId ? { ...item, status: "cancelled" } : item
        )
      );
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "リクエストの取り消しに失敗しました");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRemove = (requestId: string) => {
    if (!confirm("この履歴を非表示にしますか？")) return;
    setRemovingId(requestId);
    setRequests((prev) => prev.filter((item) => item.requestId !== requestId));
    setTimeout(() => setRemovingId(null), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />
      <main className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-2 mb-8">
            <Link href="/dashboard" className="text-gray-700 hover:text-black text-sm">
              ← ダッシュボードに戻る
            </Link>
            <h1 className="text-4xl font-bold text-black">送信したリクエスト</h1>
            <p className="text-gray-700">過去に送信した参加リクエストを確認できます</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6 border-2 border-gray-100">
            <div className="flex flex-wrap gap-2 text-sm">
              {(["all", "pending", "approved", "declined", "cancelled"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full border-2 ${
                    statusFilter === status
                      ? "border-red-600 bg-red-50 text-red-700 font-bold"
                      : "border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {
                    {
                      all: "全て",
                      pending: "審査中",
                      approved: "承認済み",
                      declined: "見送り",
                      cancelled: "取り消し済み",
                    }[status]
                  }
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-700">
              読み込み中...
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow p-12 text-center text-red-600">
              {error}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-600">
              表示できるリクエストはありません。
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const meta = statusMeta[request.status as keyof typeof statusMeta] || statusMeta.pending;
                const recruiterAge = calculateAge(request.recruiter?.birthDate);
                return (
                  <div
                    key={request.requestId}
                    className="p-5 border-2 border-gray-100 rounded-2xl bg-white hover:border-yellow-400 transition"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-5xl">{request.recruiter?.icon || "🙋"}</div>
                        <div>
                          <p className="text-xl font-bold text-black">
                            {request.recruiter?.nickname || "募集者"}
                            {recruiterAge !== null && (
                              <span className="ml-2 text-base text-gray-600">{recruiterAge}歳</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1">
                            {request.recruiter?.gender && <span>性別: {request.recruiter.gender}</span>}
                            {request.recruiter?.style && (
                              <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full">
                                {request.recruiter.style}
                              </span>
                            )}
                            {request.recruiter?.seat && (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full">
                                {request.recruiter.seat}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${meta.classes}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-lg font-bold text-black">{request.opponent || "募集中の試合"}</p>
                      <p className="text-sm text-gray-600">
                        {request.date} {request.time} ・ {request.venue || "-"}
                      </p>
                    </div>

                    {request.conditions?.length ? (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {request.conditions.map((condition, idx) => (
                          <span
                            key={`${request.requestId}-${condition}-${idx}`}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs"
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {request.message && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 mb-3">{request.message}</p>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2">
                      <span>送信日: {formatDate(request.createdAt)}</span>
                      <span>募集ID: {request.recruitmentId}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {request.status === "cancelled" ? (
                        <button
                          onClick={() => handleRemove(request.requestId)}
                          disabled={removingId === request.requestId}
                          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                            removingId === request.requestId
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-white border-2 border-gray-400 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {removingId === request.requestId ? "処理中..." : "表示から削除"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancel(request)}
                          disabled={cancellingId === request.requestId}
                          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                            cancellingId === request.requestId
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-white border-2 border-red-600 text-red-600 hover:bg-red-50"
                          }`}
                        >
                          {cancellingId === request.requestId ? "処理中..." : "リクエストを取り消す"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
