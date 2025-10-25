"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface Chat {
  chatId: string;
  matchId: string;
  participants: string[];
  partner?: { id: string; name: string };
}

export default function ChatsAdmin() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/chats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("チャット一覧の取得に失敗しました");

      const data = await res.json();
      setChats(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white text-xl">読み込み中...</div>;
  }

  if (error) {
    return <div className="bg-red-600 text-white p-4 rounded">{error}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">チャット管理</h1>
        <p className="text-gray-400">全チャットルームの監視・管理を行います</p>
      </div>

      <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-yellow-400 text-black">
            <tr>
              <th className="px-4 py-3 text-left">チャットID</th>
              <th className="px-4 py-3 text-left">試合ID</th>
              <th className="px-4 py-3 text-left">参加者</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {chats.length > 0 ? (
              chats.map((chat) => (
                <tr key={chat.chatId} className="border-t border-gray-700">
                  <td className="px-4 py-3 font-mono text-sm">{chat.chatId}</td>
                  <td className="px-4 py-3">{chat.matchId}</td>
                  <td className="px-4 py-3">
                    {chat.participants.join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Link
                        href={`/chat/${chat.chatId}`}
                        className="bg-white text-black px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        内容確認
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  チャットがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
