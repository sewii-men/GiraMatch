"use client";

import Link from "next/link";

// モックデータ
const matches = [
  {
    id: 1,
    date: "2025/03/15 (土)",
    time: "14:00 キックオフ",
    opponent: "vs アビスパ福岡",
    venue: "ミクニワールドスタジアム北九州",
    status: "募集中",
  },
  {
    id: 2,
    date: "2025/03/22 (土)",
    time: "15:00 キックオフ",
    opponent: "vs V・ファーレン長崎",
    venue: "ミクニワールドスタジアム北九州",
    status: "募集中",
  },
  {
    id: 3,
    date: "2025/04/05 (土)",
    time: "14:00 キックオフ",
    opponent: "vs ロアッソ熊本",
    venue: "ミクニワールドスタジアム北九州",
    status: "募集中",
  },
  {
    id: 4,
    date: "2025/04/19 (土)",
    time: "15:00 キックオフ",
    opponent: "vs サガン鳥栖",
    venue: "ミクニワールドスタジアム北九州",
    status: "募集中",
  },
];

export default function MatchesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      {/* ヘッダー */}
      <header className="bg-black text-white py-4 px-6 shadow-lg">
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
          <h2 className="text-3xl font-bold text-center mb-8 text-black">
            ホーム戦一覧
          </h2>
          <p className="text-center text-gray-700 mb-8">
            観戦したい試合を選んで、一緒に応援する仲間を見つけましょう
          </p>

          {/* 試合カード一覧 */}
          <div className="space-y-4">
            {matches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <div className="bg-white border-2 border-yellow-400 rounded-lg p-6 shadow-md hover:shadow-xl transition cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {match.status}
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
