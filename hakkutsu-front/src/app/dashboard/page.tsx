"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { calculateAge } from "@/lib/utils";
import GiraNomiImage from "@/images/GiraNomi.png";

interface Match {
  matchId: string;
  date: string;
  time: string;
  opponent: string;
  venue: string;
  status: string;
}

interface Chat {
  chatId: string;
  matchId: string;
  partner: {
    id: string;
    name: string;
    icon: string;
  };
}

interface CheckIn {
  id: string;
  date: string;
  time: string;
  opponent: string;
  myCheckIn: boolean;
  partnerCheckedIn: boolean;
}

interface Recruitment {
  id: string;
  matchId: string;
  matchName: string;
  opponent: string;
  date: string;
  time: string;
  status?: string;
  conditions: string[];
  message: string;
  requestCount: number;
  createdAt: string;
}

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
  requester?: {
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

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [pendingCheckIns, setPendingCheckIns] = useState<CheckIn[]>([]);
  const [recentRecruitments, setRecentRecruitments] = useState<Recruitment[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [removingRequestId, setRemovingRequestId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatRequestDate = (value: string) => {
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

  const getRequestStatusMeta = (status: string) => {
    switch (status) {
      case "approved":
        return { label: "承認済み", classes: "bg-green-100 text-green-700 border-green-300" };
      case "declined":
      case "rejected":
        return { label: "見送り", classes: "bg-gray-200 text-gray-600 border-gray-300" };
      case "cancelled":
        return { label: "取り消し済み", classes: "bg-gray-100 text-gray-600 border-gray-300" };
      default:
        return { label: "審査中", classes: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      setIsLoggedIn(true);
      setUserName(userId);
      fetchDashboardData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const handleCancelRecruitment = async (recruitmentId: string, opponent: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!confirm(`「${opponent}」の募集を取り消しますか？\n\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setCancellingId(recruitmentId);
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/matching/my-recruitments/${recruitmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "募集の取り消しに失敗しました");
      }

      alert("募集を取り消しました");
      // ダッシュボードを再取得
      await fetchDashboardData(token);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "募集の取り消しに失敗しました";
      alert(message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteRecruitment = async (recruitmentId: string, opponent: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!confirm(`「${opponent}」の募集を削除しますか？\n\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setDeletingId(recruitmentId);
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/matching/my-recruitments/${recruitmentId}/permanent`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "募集の削除に失敗しました");
      }

      alert("募集を削除しました");
      // ダッシュボードを再取得
      await fetchDashboardData(token);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "募集の削除に失敗しました";
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelSentRequest = async (request: SentRequest) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const opponentLabel = request.opponent || "この募集";
    if (
      !confirm(
        `「${opponentLabel}」へのリクエストを取り消しますか？\n\n再度参加したい場合は募集一覧から改めてリクエストを送信できます。`
      )
    ) {
      return;
    }

    try {
      setCancellingRequestId(request.requestId);
      const base = process.env.NEXT_PUBLIC_API_URL;
      const defaultError = "リクエストの取り消しに失敗しました";

      const cancelByRecruitment = async () => {
        if (!request.recruitmentId) {
          throw new Error(defaultError);
        }
        const fallbackRes = await fetch(`${base}/matching/request`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recruitmentId: request.recruitmentId }),
        });
        if (!fallbackRes.ok) {
          const errorData = await fallbackRes.json().catch(() => ({}));
          throw new Error(errorData.error || defaultError);
        }
      };

      const cancelById = async () => {
        if (!request.requestId) {
          return false;
        }
        const res = await fetch(`${base}/matching/requests/${request.requestId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          return true;
        }
        if (res.status === 404) {
          return false;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || defaultError);
      };

      const cancelledWithId = await cancelById();
      if (!cancelledWithId) {
        await cancelByRecruitment();
      }

      alert("リクエストを取り消しました");
      setSentRequests((prev) =>
        prev.map((item) =>
          item.requestId === request.requestId
            ? { ...item, status: "cancelled", isRequested: false }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "リクエストの取り消しに失敗しました";
      alert(message);
    } finally {
      setCancellingRequestId(null);
    }
  };

  const handleRemoveRequestCard = (requestId: string) => {
    if (
      !confirm(
        "この履歴をダッシュボードから非表示にしますか？\n\n必要であれば後から再度一覧で確認できます。"
      )
    ) {
      return;
    }
    setRemovingRequestId(requestId);
    setSentRequests((prev) => prev.filter((item) => item.requestId !== requestId));
    setTimeout(() => setRemovingRequestId(null), 0);
  };

  const fetchDashboardData = async (token: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;

      // 試合一覧取得
      const matchesRes = await fetch(`${base}/matches`);
      const matchesData = await matchesRes.json();
      const upcoming = Array.isArray(matchesData)
        ? matchesData
            .filter((m: Match) => m.status === "募集中" || m.status === "scheduled")
            .slice(0, 3)
        : [];
      setUpcomingMatches(upcoming);

      // チャット一覧取得
      const chatsRes = await fetch(`${base}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setActiveChats(Array.isArray(chatsData) ? chatsData.slice(0, 3) : []);
      }

      // 来場チェック一覧取得
      const checkInsRes = await fetch(`${base}/check-ins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (checkInsRes.ok) {
        const checkInsData = await checkInsRes.json();
        const pending = Array.isArray(checkInsData)
          ? checkInsData.filter((c: CheckIn) => !c.myCheckIn).slice(0, 3)
          : [];
        setPendingCheckIns(pending);
      }

      // 最近の募集取得
      const recruitmentsRes = await fetch(`${base}/matching/my-recruitments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (recruitmentsRes.ok) {
        const recruitmentsData = await recruitmentsRes.json();
        setRecentRecruitments(Array.isArray(recruitmentsData) ? recruitmentsData.slice(0, 3) : []);
      }

      // 自分が送ったリクエスト一覧取得
      const requestsRes = await fetch(`${base}/matching/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setSentRequests(Array.isArray(requestsData) ? requestsData : []);
      } else {
        setSentRequests([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex items-center justify-center">
        <p className="text-xl text-gray-800">読み込み中...</p>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
        {/* ダッシュボード */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* ウェルカムメッセージ */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-black mb-2">
              おかえりなさい、{userName}さん
            </h1>
            <p className="text-gray-700">今日もギラヴァンツを応援しましょう！</p>
          </div>

          {/* クイックアクション */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <Link
              href="/matches?mode=recruit"
              className="bg-red-600 text-white p-6 rounded-xl shadow-lg hover:bg-red-700 transition"
            >
              <div className="text-3xl mb-2">📢</div>
              <h3 className="text-xl font-bold mb-1">仲間を募集</h3>
              <p className="text-sm opacity-90">一緒に観戦する仲間を探す</p>
            </Link>
            <Link
              href="/recruitments"
              className="bg-yellow-400 text-black p-6 rounded-xl shadow-lg hover:bg-yellow-500 transition"
            >
              <div className="text-3xl mb-2">🙋</div>
              <h3 className="text-xl font-bold mb-1">試合に参加</h3>
              <p className="text-sm">募集に参加して観戦しよう</p>
            </Link>
            <Link
              href="/my-recruitments"
              className="bg-white text-black p-6 rounded-xl shadow-lg hover:bg-gray-50 transition border-2 border-yellow-400"
            >
              <div className="text-3xl mb-2">📋</div>
              <h3 className="text-xl font-bold mb-1">マイ募集</h3>
              <p className="text-sm text-gray-600">自分の募集を管理</p>
            </Link>
            <Link
              href="/chat"
              className="bg-white text-black p-6 rounded-xl shadow-lg hover:bg-gray-50 transition border-2 border-yellow-400"
            >
              <div className="text-3xl mb-2">💬</div>
              <h3 className="text-xl font-bold mb-1">チャット</h3>
              <p className="text-sm text-gray-600">マッチした仲間と話そう</p>
            </Link>
          </div>

          {/* ギラ飲みチャット CTA */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-6 sm:p-8 mb-8 shadow-2xl border border-white/20">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_50%)]" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1 text-white">
                <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase bg-white/15 backdrop-blur px-3 py-1 rounded-full mb-3">
                  <span className="text-lg leading-none">🍻</span>
                  After Match Social
                </p>
                <h2 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">
                  ギラ飲みチャットで<span className="text-yellow-200">試合後の熱量</span>をそのまま乾杯へ
                </h2>
                <p className="text-sm sm:text-base text-white/90 mb-4">
                  その日の感想を語り合いながら、近くの居酒屋情報や参加メンバーの動きをチェック。盛り上がりの中心に飛び込もう。
                </p>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-semibold text-orange-100 mb-5">
                  <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur">居酒屋マップ</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur">リアルタイムチャット</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur">参加状況が一目でわかる</span>
                </div>
                <Link
                  href="/post-match-chat/test_match_001"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white text-red-600 font-bold px-6 py-4 rounded-full shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition transform"
                >
                  ギラ飲みチャットを開く
                  <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="flex-1 w-full">
                <div className="relative h-64 sm:h-72 lg:h-[380px] min-h-[260px] rounded-2xl overflow-hidden shadow-2xl border border-white/30">
                  <Image
                    src={GiraNomiImage}
                    alt="居酒屋で乾杯するサポーターの様子"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 480px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* 近日開催の試合 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-black">近日開催の試合</h2>
              <Link href="/matches" className="text-red-600 font-bold hover:underline">
                すべて見る
              </Link>
            </div>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <Link
                    key={match.matchId}
                    href={`/matching/${match.matchId}`}
                    className="block p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-black">{match.opponent}</p>
                        <p className="text-sm text-gray-600">
                          {match.date} {match.time}
                        </p>
                      </div>
                      <div className="text-red-600 font-bold text-sm">
                        {match.status}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">近日開催の試合はありません</p>
            )}
          </div>

          {/* 進行中のチャット */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-black">進行中のチャット</h2>
              <Link href="/chat" className="text-red-600 font-bold hover:underline">
                すべて見る
              </Link>
            </div>
            {activeChats.length > 0 ? (
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <Link
                    key={chat.chatId}
                    href={`/chat/${chat.chatId}`}
                    className="block p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{chat.partner.icon}</div>
                      <div>
                        <p className="font-bold text-black">{chat.partner.name}</p>
                        <p className="text-sm text-gray-600">クリックしてメッセージを見る</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">進行中のチャットはありません</p>
            )}
          </div>

          {/* 最近の募集 */}
          {recentRecruitments.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">最近の募集</h2>
                <Link href="/my-recruitments" className="text-red-600 font-bold hover:underline">
                  すべて見る
                </Link>
              </div>
              <div className="space-y-3">
                {recentRecruitments.map((recruitment) => {
                  const status = recruitment.status || "active";
                  const isCancelled = status === "cancelled";
                  const isDeleted = status === "deleted";

                  return (
                    <div
                      key={recruitment.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 transition"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-black text-lg">{recruitment.opponent}</p>
                            {isCancelled && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                取り消し済み
                              </span>
                            )}
                            {status === "active" && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                募集中
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {recruitment.date} {recruitment.time}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recruitment.conditions.slice(0, 3).map((condition, idx) => (
                              <span
                                key={idx}
                                className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs"
                              >
                                {condition}
                              </span>
                            ))}
                            {recruitment.conditions.length > 3 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{recruitment.conditions.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4 flex flex-col gap-2">
                          <div className="bg-yellow-400 text-black px-4 py-2 rounded-full font-bold">
                            {recruitment.requestCount} 件
                          </div>
                          <Link
                            href={`/my-recruitments/${recruitment.id}/requests`}
                            className="inline-block bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition"
                          >
                            リクエスト一覧
                          </Link>
                          {status === "active" && (
                            <button
                              onClick={() => handleCancelRecruitment(recruitment.id, recruitment.opponent)}
                              disabled={cancellingId === recruitment.id}
                              className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                                cancellingId === recruitment.id
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-white border-2 border-red-600 text-red-600 hover:bg-red-50"
                              }`}
                            >
                              {cancellingId === recruitment.id ? "取り消し中..." : "募集を取り消す"}
                            </button>
                          )}
                          {isCancelled && (
                            <button
                              onClick={() => handleDeleteRecruitment(recruitment.id, recruitment.opponent)}
                              disabled={deletingId === recruitment.id}
                              className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                                deletingId === recruitment.id
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-gray-600 text-white hover:bg-gray-700"
                              }`}
                            >
                              {deletingId === recruitment.id ? "削除中..." : "削除"}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {recruitment.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* リクエスト履歴 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-black">あなたのリクエスト</h2>
              <Link href="/my-requests" className="text-red-600 font-bold hover:underline">
                全て表示
              </Link>
            </div>
            {sentRequests.length > 0 ? (
              <div className="space-y-4">
                {sentRequests.slice(0, 3).map((request) => {
                  const meta = getRequestStatusMeta(request.status);
                  const recruiterAge = calculateAge(request.recruiter?.birthDate);
                  const recruiterGenderLabel =
                    request.recruiter?.gender === "male"
                      ? "男性"
                      : request.recruiter?.gender === "female"
                      ? "女性"
                      : request.recruiter?.gender
                      ? "その他"
                      : null;
                  return (
                    <div
                      key={request.requestId}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 transition"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">
                            {request.recruiter?.icon || "🙋"}
                          </div>
                          <div>
                            <p className="font-bold text-black text-lg">
                              {request.recruiter?.nickname || "募集者"}
                              {recruiterAge !== null && (
                                <span className="ml-2 text-sm text-gray-600">{recruiterAge}歳</span>
                              )}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                              {recruiterGenderLabel && <span>性別: {recruiterGenderLabel}</span>}
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
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold border ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="font-bold text-black text-lg">
                          {request.opponent || "募集中の試合"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {request.date} {request.time} ・ {request.venue || "-"}
                        </p>
                      </div>

                      {request.conditions?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {request.conditions.slice(0, 4).map((condition, idx) => (
                            <span
                              key={`${request.requestId}-cond-${idx}`}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs"
                            >
                              {condition}
                            </span>
                          ))}
                          {request.conditions.length > 4 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{request.conditions.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {request.message && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-3">
                          {request.message}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2">
                        <span>送信日: {formatRequestDate(request.createdAt)}</span>
                        <span>募集ID: {request.recruitmentId}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.status === "cancelled" ? (
                          <button
                            onClick={() => handleRemoveRequestCard(request.requestId)}
                            disabled={removingRequestId === request.requestId}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                              removingRequestId === request.requestId
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-white border-2 border-gray-400 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {removingRequestId === request.requestId ? "処理中..." : "表示から削除"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCancelSentRequest(request)}
                            disabled={cancellingRequestId === request.requestId}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                              cancellingRequestId === request.requestId
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-white border-2 border-red-600 text-red-600 hover:bg-red-50"
                            }`}
                          >
                            {cancellingRequestId === request.requestId
                              ? "処理中..."
                              : "リクエストを取り消す"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">
                まだリクエストはありません。気になる募集に参加してみましょう。
              </p>
            )}
          </div>

          {/* 来場チェックが必要な試合 */}
          {pendingCheckIns.length > 0 && (
            <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-2 border-yellow-400">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">来場チェックが必要な試合</h2>
                <Link href="/check-in" className="text-red-600 font-bold hover:underline">
                  すべて見る
                </Link>
              </div>
              <div className="space-y-3">
                {pendingCheckIns.map((checkIn) => (
                  <Link
                    key={checkIn.id}
                    href="/check-in"
                    className="block p-4 bg-white rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-black">{checkIn.opponent}</p>
                        <p className="text-sm text-gray-600">
                          {checkIn.date} {checkIn.time}
                        </p>
                      </div>
                      <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        チェックイン
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      {/* ヘッダー */}
      {/* ヘッダーは NavBar に置き換え済み */}

      {/* ヒーローセクション */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-black mb-6">
            仲間と一緒に<br />
            <span className="text-red-600">ギラヴァンツ北九州</span>を応援しよう
          </h2>
          <p className="text-xl text-gray-800 mb-8">
            サッカー観戦 × マッチング<br />
            同じ熱量で応援する仲間と出会える新しい観戦体験
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/matches" className="inline-block bg-red-600 text-white text-xl font-bold px-8 py-4 rounded-full hover:bg-red-700 transition shadow-lg">
              試合を探す
            </Link>
            <Link href="/login" className="inline-block bg-white text-black text-xl font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition shadow-lg">
              ログイン
            </Link>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-black">
            Giraventの特徴
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* 試合選択 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">⚽</div>
              <h4 className="text-xl font-bold mb-2 text-black">試合を選ぶ</h4>
              <p className="text-gray-700">
                ホーム戦から観戦したい試合を選択。同行募集か参加希望を選べます。
              </p>
            </div>

            {/* マッチング */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">🤝</div>
              <h4 className="text-xl font-bold mb-2 text-black">仲間を見つける</h4>
              <p className="text-gray-700">
                応援スタイルと席の希望が合う仲間を自動マッチング。気になる人にリクエスト送信。
              </p>
            </div>

            {/* チャット */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">💬</div>
              <h4 className="text-xl font-bold mb-2 text-black">チャットで相談</h4>
              <p className="text-gray-700">
                承認後に1対1チャット開始。待ち合わせ場所や時間をテンプレで簡単相談。
              </p>
            </div>

            {/* 来場チェック */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">📍</div>
              <h4 className="text-xl font-bold mb-2 text-black">来場チェック</h4>
              <p className="text-gray-700">
                スタジアムに到着したら手動でチェック。同行者の来場状況もリアルタイムで確認。
              </p>
            </div>

            {/* 事後評価 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">⭐</div>
              <h4 className="text-xl font-bold mb-2 text-black">感謝を伝える</h4>
              <p className="text-gray-700">
                試合後に同行者へ星評価と感謝のメッセージ。信頼スコアで安心・安全。
              </p>
            </div>

            {/* 安心・安全 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="text-xl font-bold mb-2 text-black">安心・安全</h4>
              <p className="text-gray-700">
                SMS認証と信頼スコアで安心。承認制チャットで自分のペースで交流。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-yellow-100">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-black">
            使い方はカンタン5ステップ
          </h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">試合を選ぶ</h4>
                <p className="text-gray-700">観戦したいホーム戦を選択</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">マッチング</h4>
                <p className="text-gray-700">応援スタイルと席の希望を選択して仲間を探す</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">チャットで相談</h4>
                <p className="text-gray-700">待ち合わせ場所や時間を相談</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">来場チェック</h4>
                <p className="text-gray-700">スタジアムに到着したらチェック</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">感謝を伝える</h4>
                <p className="text-gray-700">試合後に星評価とメッセージで感謝を伝える</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-black text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-6">
            さあ、一緒にギラヴァンツを応援しよう
          </h3>
          <Link
            href="/matches"
            className="inline-block bg-yellow-400 text-black text-xl font-bold px-12 py-4 rounded-full hover:bg-yellow-500 transition shadow-lg"
          >
            試合を探す
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center">
        <p>&copy; 2025 Giravent - ギラヴァンツ北九州ファン創出アプリ</p>
      </footer>
    </div>
  );
}
