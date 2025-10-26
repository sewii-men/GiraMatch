"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";
import { apiBase } from "@/lib/apiBase";

const templates = [
  "今日はありがとうございました!",
  "また一緒に観戦したいです!",
  "楽しい時間を過ごせました!",
  "次の試合も一緒に行きましょう!",
];

export default function ReviewPage() {
  const params = useParams();
  const matchId = params.id;
  const { token, userId } = useAuth();

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<{ id: string; date?: string; opponent?: string; venue?: string } | null>(null);
  const [partner, setPartner] = useState<{ id: string; name?: string; icon?: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const base = apiBase();
        // 試合詳細
        const resMatch = await fetch(`${base}/matches/${matchId}`);
        if (resMatch.ok) {
          const m = await resMatch.json();
          setMatch({ id: String(m.matchId), date: m.date, opponent: m.opponent, venue: m.venue });
        }
        // チャットから同行者を特定
        if (token) {
          const resChats = await fetch(`${base}/chats`, { headers: { Authorization: `Bearer ${token}` } });
          if (resChats.ok) {
            const chats = await resChats.json();
            const chat = (chats || []).find((c: { matchId?: string | number; partner?: { id?: string; name?: string; icon?: string } }) => String(c.matchId) === String(matchId));
            if (chat?.partner?.id) setPartner(chat.partner);
          }
        }
      } catch (err) {
        console.error(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId, token]);

  const handleSubmit = async () => {
    if (rating > 0) {
      const base = apiBase();
      if (!partner?.id) {
        setError("同行者情報が見つかりません");
        return;
      }
      await fetch(`${base}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          matchId,
          partnerId: partner.id,
          rating,
          message,
          userId: userId || "",
        }),
      });
      setSubmitted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex items-center justify-center">
        <p className="text-gray-800">読み込み中...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
        {/* ヘッダー */}
        <header className="bg-black text-white py-4 px-6 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/dashboard">
              <h1 className="text-2xl font-bold cursor-pointer">
                <span className="text-yellow-400">GiraMatch</span>
              </h1>
            </Link>
            <nav className="flex gap-4">
              <Link
                href="/matches"
                className="hover:text-yellow-400 transition"
              >
                試合一覧
              </Link>
              <Link href="/chat" className="hover:text-yellow-400 transition">
                チャット
              </Link>
              <Link
                href="/check-in"
                className="hover:text-yellow-400 transition"
              >
                来場チェック
              </Link>
            </nav>
          </div>
        </header>

        {/* 送信完了画面 */}
        <main className="py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-12 shadow-lg text-center">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold text-black mb-4">
                評価を送信しました!
              </h2>
              <p className="text-gray-700 mb-8">
                {(partner?.name ?? "同行者")}さんへの感謝の気持ちが届きました。
                <br />
                また一緒にギラヴァンツを応援しましょう!
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/matches"
                  className="bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition"
                >
                  次の試合を探す
                </Link>
                <Link
                  href="/dashboard"
                  className="bg-yellow-400 text-black px-8 py-3 rounded-full font-bold hover:bg-yellow-500 transition"
                >
                  ホームに戻る
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />
      {/* ヘッダー */}
      <header className="bg-black text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-2xl font-bold cursor-pointer">
              <span className="text-yellow-400">GiraMatch</span>
            </h1>
          </Link>
          <nav className="flex gap-4">
            <Link href="/matches" className="hover:text-yellow-400 transition">
              試合一覧
            </Link>
            <Link href="/chat" className="hover:text-yellow-400 transition">
              チャット
            </Link>
            <Link href="/check-in" className="hover:text-yellow-400 transition">
              来場チェック
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <Link
            href="/check-in"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-black mb-6"
          >
            <span>←</span> 来場チェックに戻る
          </Link>

          <div className="bg-white rounded-lg p-8 shadow-lg">
            {/* 試合情報 */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-black mb-2">
                試合お疲れ様でした!
              </h2>
              <p className="text-gray-600">
                {match?.date} {match?.opponent}
              </p>
            </div>

            {/* 同行者情報 */}
            <div className="bg-yellow-50 rounded-lg p-6 mb-8 text-center">
              <p className="text-sm text-gray-600 mb-3">同行者への評価</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-4xl">{partner?.icon || "🙂"}</div>
                <h3 className="text-2xl font-bold text-black">
                  {partner?.name || "同行者"}
                </h3>
              </div>
            </div>

            {/* 星評価 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-center mb-4 text-black">
                評価を選択してください
              </h3>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-5xl transition hover:scale-110"
                  >
                    {star <= rating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
              <p className="text-center text-gray-600 mt-2">
                {rating > 0 && `${rating}.0`}
              </p>
            </div>

            {/* メッセージ */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 text-black">
                感謝のメッセージ (任意)
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">テンプレート</p>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setMessage(template)}
                      className="bg-yellow-50 border border-yellow-400 px-4 py-2 rounded-lg text-sm hover:bg-yellow-100 transition text-left"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="感謝のメッセージを入力してください..."
                rows={4}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-400"
              />
            </div>

            {/* 送信ボタン */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className={`w-full py-4 rounded-full font-bold text-xl transition ${
                rating > 0
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              評価を送信
            </button>
            <p className="text-center text-sm text-gray-600 mt-4">
              ※評価は{partner?.name || "同行者"}さんの信頼スコアに反映されます
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
