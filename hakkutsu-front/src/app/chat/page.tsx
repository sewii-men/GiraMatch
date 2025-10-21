"use client";

import Link from "next/link";

// モックデータ
const chatList = [
  {
    id: 1,
    partnerId: 1,
    partnerName: "サッカー太郎",
    partnerIcon: "⚽",
    lastMessage: "了解です!当日楽しみにしています!",
    timestamp: "10分前",
    unread: 0,
    match: {
      date: "2025/03/15 (土)",
      opponent: "vs アビスパ福岡",
    },
  },
  {
    id: 2,
    partnerId: 2,
    partnerName: "応援花子",
    partnerIcon: "🎺",
    lastMessage: "小倉駅で13時集合でどうですか?",
    timestamp: "1時間前",
    unread: 2,
    match: {
      date: "2025/03/22 (土)",
      opponent: "vs V・ファーレン長崎",
    },
  },
  {
    id: 3,
    partnerId: 3,
    partnerName: "ギラサポ次郎",
    partnerIcon: "🔥",
    lastMessage: "よろしくお願いします!",
    timestamp: "昨日",
    unread: 0,
    match: {
      date: "2025/04/05 (土)",
      opponent: "vs ロアッソ熊本",
    },
  },
];

export default function ChatListPage() {
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
            <Link href="/chat" className="text-yellow-400 font-bold">
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
            チャット一覧
          </h2>
          <p className="text-center text-gray-700 mb-8">
            マッチングした仲間とメッセージをやり取りできます
          </p>

          {/* チャットリスト */}
          <div className="space-y-4">
            {chatList.map((chat) => (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <div className="bg-white border-2 border-yellow-400 rounded-lg p-4 shadow-md hover:shadow-xl transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{chat.partnerIcon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-bold text-black">
                          {chat.partnerName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {chat.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {chat.match.date} {chat.match.opponent}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-700">{chat.lastMessage}</p>
                        {chat.unread > 0 && (
                          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {chatList.length === 0 && (
            <div className="bg-white rounded-lg p-12 text-center shadow-lg">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-700 mb-6">
                まだチャットがありません
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
