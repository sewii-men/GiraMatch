"use client";

import { useEffect, useState } from "react";

interface Matching {
  chatId: string;
  matchId: string;
  participants: string[];
  createdAt?: string;
}

export default function MatchingsAdmin() {
  const [matchings, setMatchings] = useState<Matching[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMatchings();
  }, []);

  const fetchMatchings = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("token");

      // チャットテーブルからマッチング情報を取得
      const res = await fetch(`${base}/admin/chats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("マッチング一覧の取得に失敗しました");

      const data = await res.json();
      setMatchings(data);
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

  // 試合別にグループ化
  const matchGroups = matchings.reduce((acc, matching) => {
    if (!acc[matching.matchId]) {
      acc[matching.matchId] = [];
    }
    acc[matching.matchId].push(matching);
    return acc;
  }, {} as Record<string, Matching[]>);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          マッチング管理
        </h1>
        <p className="text-gray-400">マッチング状況と履歴を確認します</p>
      </div>

      {/* 統計 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">総マッチング数</h3>
          <p className="text-yellow-400 text-3xl font-bold">
            {matchings.length}
          </p>
        </div>
        <div className="bg-white bg-opacity-10 border-2 border-white rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">対象試合数</h3>
          <p className="text-white text-3xl font-bold">
            {Object.keys(matchGroups).length}
          </p>
        </div>
        <div className="bg-white bg-opacity-10 border-2 border-white rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">参加ユーザー</h3>
          <p className="text-white text-3xl font-bold">
            {
              new Set(
                matchings.flatMap((m) => m.participants || [])
              ).size
            }
          </p>
        </div>
      </div>

      {/* 試合別マッチング一覧 */}
      <div className="space-y-6">
        {Object.entries(matchGroups).map(([matchId, matchingList]) => (
          <div key={matchId}>
            <h2 className="text-xl font-bold text-white mb-4">
              試合ID: {matchId}
              <span className="ml-4 text-sm text-gray-400">
                ({matchingList.length} マッチング)
              </span>
            </h2>
            <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-yellow-400 text-black">
                  <tr>
                    <th className="px-4 py-3 text-left">チャットID</th>
                    <th className="px-4 py-3 text-left">参加者1</th>
                    <th className="px-4 py-3 text-left">参加者2</th>
                    <th className="px-4 py-3 text-center">アクション</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {matchingList.map((matching) => (
                    <tr
                      key={matching.chatId}
                      className="border-t border-gray-700"
                    >
                      <td className="px-4 py-3 font-mono text-sm">
                        {matching.chatId}
                      </td>
                      <td className="px-4 py-3">
                        {matching.participants?.[0] || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {matching.participants?.[1] || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <a
                            href={`/chat/${matching.chatId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white text-black px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                          >
                            チャット確認
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {Object.keys(matchGroups).length === 0 && (
          <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-8 text-center">
            <p className="text-gray-400">マッチングがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
