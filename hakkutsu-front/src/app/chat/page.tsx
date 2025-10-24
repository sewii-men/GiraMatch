"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";

type Chat = {
  chatId: string;
  matchId: string;
  partner?: { id: string; name: string; icon?: string };
};

export default function ChatListPage() {
  const { token, userId } = useAuth();
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL;
        const uid = userId || "";
        const res = await fetch(`${base}/chats?userId=${encodeURIComponent(uid)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        setChatList(data);
      } catch (e) {
        setError("チャット一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    if (userId !== null) load();
  }, [token, userId]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />
      {/* ヘッダー */}
      {/* NavBar は layout で描画 */}

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
          {loading && <p className="text-center text-gray-700">読み込み中...</p>}
          {error && <p className="text-center text-red-600">{error}</p>}
          <div className="space-y-4">
            {chatList.map((chat) => (
              <Link key={chat.chatId} href={`/chat/${chat.chatId}`}>
                <div className="bg-white border-2 border-yellow-400 rounded-lg p-4 shadow-md hover:shadow-xl transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{chat.partner?.icon || "🙂"}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-bold text-black">{chat.partner?.name}</h3>
                        <span className="text-sm text-gray-500">&nbsp;</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">チャットID: {chat.chatId}</p>
                      <div className="flex items-center justify-between"></div>
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
