"use client";

import Link from "next/link";
import { useState } from "react";

// モックデータ
const upcomingMatches = [
  {
    id: 1,
    date: "2025/03/15 (土)",
    time: "14:00 キックオフ",
    opponent: "vs アビスパ福岡",
    venue: "ミクニワールドスタジアム北九州",
    partner: {
      id: 1,
      name: "サッカー太郎",
      icon: "⚽",
      checkedIn: false,
    },
    myCheckIn: false,
  },
  {
    id: 2,
    date: "2025/03/22 (土)",
    time: "15:00 キックオフ",
    opponent: "vs V・ファーレン長崎",
    venue: "ミクニワールドスタジアム北九州",
    partner: {
      id: 2,
      name: "応援花子",
      icon: "🎺",
      checkedIn: true,
    },
    myCheckIn: false,
  },
];

export default function CheckInPage() {
  const [matches, setMatches] = useState(upcomingMatches);

  const handleCheckIn = (matchId: number) => {
    setMatches(
      matches.map((match) =>
        match.id === matchId ? { ...match, myCheckIn: true } : match
      )
    );
  };

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
            <Link href="/matches" className="hover:text-yellow-400 transition">
              試合一覧
            </Link>
            <Link href="/chat" className="hover:text-yellow-400 transition">
              チャット
            </Link>
            <Link href="/check-in" className="text-yellow-400 font-bold">
              来場チェック
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-black">
            来場チェック
          </h2>
          <p className="text-center text-gray-700 mb-8">
            スタジアムに到着したらチェックインしましょう
          </p>

          {/* マッチ済み試合リスト */}
          <div className="space-y-6">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white border-2 border-yellow-400 rounded-lg p-6 shadow-md"
              >
                {/* 試合情報 */}
                <div className="mb-6">
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

                {/* 同行者情報 */}
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">同行者</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{match.partner.icon}</div>
                      <div>
                        <p className="font-bold text-black">
                          {match.partner.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {match.partner.checkedIn ? (
                            <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                              <span>✓</span> 来場済み
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">
                              未チェックイン
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/chat/${match.id}`}
                      className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition text-sm"
                    >
                      チャット
                    </Link>
                  </div>
                </div>

                {/* チェックインボタン */}
                {match.myCheckIn ? (
                  <div className="bg-green-100 border-2 border-green-400 text-green-700 px-6 py-4 rounded-lg text-center">
                    <p className="font-bold text-lg mb-1">
                      チェックイン完了 ✓
                    </p>
                    <p className="text-sm">
                      楽しい観戦をお楽しみください!
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckIn(match.id)}
                    className="w-full bg-red-600 text-white py-4 rounded-full font-bold text-lg hover:bg-red-700 transition"
                  >
                    📍 到着ボタンを押す
                  </button>
                )}

                {/* 試合後評価へのリンク (チェックイン済みの場合のみ表示) */}
                {match.myCheckIn && (
                  <Link
                    href={`/review/${match.id}`}
                    className="block mt-4 text-center text-gray-600 hover:text-black transition"
                  >
                    試合後に評価を送る →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {matches.length === 0 && (
            <div className="bg-white rounded-lg p-12 text-center shadow-lg">
              <div className="text-6xl mb-4">📍</div>
              <p className="text-gray-700 mb-6">
                マッチング済みの試合がありません
              </p>
              <Link
                href="/matches"
                className="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition"
              >
                試合を探す
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
