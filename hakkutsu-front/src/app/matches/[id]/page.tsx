"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id;

  const [match, setMatch] = useState<{
    matchId: string;
    date: string;
    time: string;
    opponent: string;
    venue: string;
    description?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${base}/matches/${matchId}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setMatch(data);
      } catch {
        setError("試合情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      {/* ヘッダー */}
      <header className="bg-black text-white py-4 px-6 shadow-lg hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <h1 className="text-2xl font-bold cursor-pointer">
              <span className="text-yellow-400">Giravent</span>
            </h1>
          </Link>
          <nav className="flex gap-4">
            <Link href="/matches" className="text-yellow-400 font-bold">
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
          {/* 戻るボタン */}
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-black mb-6"
          >
            <span>←</span> 試合一覧に戻る
          </Link>

          {loading && <p className="text-center text-gray-700">読み込み中...</p>}
          {error && <p className="text-center text-red-600">{error}</p>}
          {/* 試合情報カード */}
          <div className="bg-white border-2 border-yellow-400 rounded-lg p-8 shadow-lg mb-8">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold text-black mb-4">
                {match?.opponent}
              </h2>
              <p className="text-xl text-gray-700 mb-2">
                <span className="font-bold">{match?.date}</span> {match?.time}
              </p>
              <p className="text-gray-600 flex items-center justify-center gap-2">
                <span>📍</span> {match?.venue}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <p className="text-gray-700 text-center">{match?.description}</p>
            </div>
            <div className="flex gap-4 justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-600">募集中</p>
                <p className="text-2xl font-bold text-red-600">12人</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">参加希望</p>
                <p className="text-2xl font-bold text-yellow-600">8人</p>
              </div>
            </div>
          </div>

          {/* 参加方法選択 */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-center mb-6 text-black">
              参加方法を選択
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {/* 同行者を募集 */}
              <Link href={`/matching/${matchId}?mode=recruit`}>
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-8 rounded-lg shadow-md hover:shadow-xl transition cursor-pointer">
                  <div className="text-5xl mb-4 text-center">🔍</div>
                  <h4 className="text-2xl font-bold mb-3 text-center">
                    同行者を募集する
                  </h4>
                  <p className="text-center">
                    一緒に観戦してくれる仲間を募集します
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li>✓ 応援スタイルを設定</li>
                    <li>✓ 席の希望を選択</li>
                    <li>✓ マッチングを待つ</li>
                  </ul>
                </div>
              </Link>

              {/* 募集に参加 */}
              <Link href={`/matching/${matchId}?mode=join`}>
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-black p-8 rounded-lg shadow-md hover:shadow-xl transition cursor-pointer">
                  <div className="text-5xl mb-4 text-center">👥</div>
                  <h4 className="text-2xl font-bold mb-3 text-center">
                    募集に参加する
                  </h4>
                  <p className="text-center">
                    募集中の人を探して参加リクエストを送ります
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li>✓ 応援スタイルを設定</li>
                    <li>✓ 席の希望を選択</li>
                    <li>✓ 条件に合う人を探す</li>
                  </ul>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
