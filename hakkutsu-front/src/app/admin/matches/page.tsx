"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface Match {
  matchId: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  status: string;
}

export default function MatchesAdmin() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (filterStatus === "all") {
      setFilteredMatches(matches);
    } else {
      setFilteredMatches(matches.filter((m) => m.status === filterStatus));
    }
  }, [filterStatus, matches]);

  const fetchMatches = async () => {
    try {
      const base = apiBase();
      const res = await fetch(`${base}/matches`);

      if (!res.ok) throw new Error("試合一覧の取得に失敗しました");

      const data = await res.json();
      console.log("取得した試合データ:", data);
      console.log("最初の試合:", data[0]);
      setMatches(data);
      setFilteredMatches(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/matches/${matchId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("削除に失敗しました");

      alert("削除しました");
      fetchMatches();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "削除に失敗しました");
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">試合管理</h1>
          <p className="text-gray-400">試合の追加・編集・削除を行います</p>
        </div>
        <Link
          href="/admin/matches/new"
          className="bg-yellow-400 text-black px-6 py-3 rounded font-bold hover:bg-yellow-500 transition-colors"
        >
          + 新規試合追加
        </Link>
      </div>

      {/* フィルター */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "all"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            全て ({matches.length})
          </button>
          <button
            onClick={() => setFilterStatus("scheduled")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "scheduled"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            開催予定 ({matches.filter((m) => m.status === "scheduled").length})
          </button>
          <button
            onClick={() => setFilterStatus("ongoing")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "ongoing"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            開催中 ({matches.filter((m) => m.status === "ongoing").length})
          </button>
          <button
            onClick={() => setFilterStatus("finished")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "finished"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            終了 ({matches.filter((m) => m.status === "finished").length})
          </button>
        </div>
      </div>

      {/* 試合一覧 */}
      <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-yellow-400 text-black">
            <tr>
              <th className="px-4 py-3 text-left">試合ID</th>
              <th className="px-4 py-3 text-left">対戦相手</th>
              <th className="px-4 py-3 text-left">日付</th>
              <th className="px-4 py-3 text-left">時間</th>
              <th className="px-4 py-3 text-left">会場</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900">
            {filteredMatches.length > 0 ? (
              filteredMatches.map((match) => (
                <tr key={match.matchId} className="border-t border-gray-700 hover:bg-gray-800">
                  <td className="px-4 py-3 font-mono text-sm text-white">{match.matchId}</td>
                  <td className="px-4 py-3 font-medium text-white">{match.opponent}</td>
                  <td className="px-4 py-3 text-white">{match.date}</td>
                  <td className="px-4 py-3 text-white">{match.time}</td>
                  <td className="px-4 py-3 text-white">{match.venue}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={match.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Link
                        href={`/admin/matches/${match.matchId}`}
                        className="bg-white text-black px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleDelete(match.matchId)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  試合が見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: "開催予定", color: "bg-blue-600" },
    ongoing: { label: "開催中", color: "bg-green-600" },
    finished: { label: "終了", color: "bg-gray-600" },
  };

  const config = statusConfig[status] || { label: status, color: "bg-gray-600" };

  return (
    <span className={`${config.color} text-white px-2 py-1 rounded text-xs font-medium`}>
      {config.label}
    </span>
  );
}
