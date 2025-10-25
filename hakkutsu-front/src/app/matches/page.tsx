"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Match = {
  matchId: string;
  date: string;
  time: string;
  opponent: string;
  venue: string;
  status?: string;
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${base}/matches`);
        const data = await res.json();
        setMatches(data);
      } catch {
        setError("試合一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      {/* ヘッダーは NavBar に置き換え済み */}

      {/* メインコンテンツ */}
      <main className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-black">
            ホーム戦一覧
          </h2>
          <p className="text-center text-gray-700 mb-8">
            観戦したい試合を選んで、一緒に応援する仲間を見つけましょう
          </p>

          {/* 試合カード一覧 */}
          {loading && <p className="text-center text-gray-700">読み込み中...</p>}
          {error && <p className="text-center text-red-600">{error}</p>}
          <div className="space-y-4">
            {matches.map((match) => (
              <Link key={match.matchId} href={`/matches/${match.matchId}`}>
                <div className="bg-white border-2 border-yellow-400 rounded-lg p-6 shadow-md hover:shadow-xl transition cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {match.status || "募集中"}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-black mb-2">
                        {match.opponent}
                      </h3>
                      <p className="text-gray-600">
                        <span className="font-bold">{match.date}</span> {match.time}
                      </p>
                      <p className="text-gray-600 flex items-center gap-1">
                        <span>📍</span> {match.venue}
                      </p>
                    </div>
                    <div className="text-4xl">⚽</div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <div className="flex-1 text-center">
                      <p className="text-sm text-gray-600">募集中</p>
                      <p className="text-xl font-bold text-red-600">12人</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-sm text-gray-600">参加希望</p>
                      <p className="text-xl font-bold text-yellow-600">8人</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
