"use client";

import { useParams, useRouter } from "next/navigation";
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

interface Stats {
  chatCount: number;
  checkinCount: number;
}

export default function MatchDetail() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMatch();
    fetchStats();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const base = apiBase();
      const res = await fetch(`${base}/matches/${matchId}`);

      if (!res.ok) throw new Error("試合情報の取得に失敗しました");

      const data = await res.json();
      setMatch(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/matches/${matchId}/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("統計情報の取得に失敗しました");

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;

    setSubmitting(true);
    setError("");

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/matches/${matchId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(match),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新に失敗しました");
      }

      alert("更新しました");
      router.push("/admin/matches");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-white text-xl">読み込み中...</div>;
  }

  if (error && !match) {
    return <div className="bg-red-600 text-white p-4 rounded">{error}</div>;
  }

  if (!match) {
    return <div className="text-white">試合が見つかりません</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">試合詳細・編集</h1>
      <p className="text-gray-400 mb-8">試合情報を編集します</p>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded mb-6">{error}</div>
      )}

      {/* 統計情報 */}
      {stats && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">試合統計</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
              <h3 className="text-gray-400 text-sm mb-1">チャット数</h3>
              <p className="text-yellow-400 text-3xl font-bold">
                {stats.chatCount}
              </p>
            </div>
            <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
              <h3 className="text-gray-400 text-sm mb-1">来場チェック数</h3>
              <p className="text-yellow-400 text-3xl font-bold">
                {stats.checkinCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 編集フォーム */}
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-6 space-y-6">
          {/* 試合ID（読み取り専用） */}
          <div>
            <label className="block text-white font-medium mb-2">試合ID</label>
            <input
              type="text"
              value={match.matchId}
              disabled
              className="w-full px-4 py-2 bg-gray-800 text-gray-400 border-2 border-gray-700 rounded cursor-not-allowed"
            />
            <p className="text-gray-400 text-sm mt-1">試合IDは変更できません</p>
          </div>

          {/* 対戦相手 */}
          <div>
            <label className="block text-white font-medium mb-2">
              対戦相手 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={match.opponent}
              onChange={(e) =>
                setMatch({ ...match, opponent: e.target.value })
              }
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 日付 */}
          <div>
            <label className="block text-white font-medium mb-2">
              日付 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={match.date}
              onChange={(e) => setMatch({ ...match, date: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 時間 */}
          <div>
            <label className="block text-white font-medium mb-2">
              時間 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              required
              value={match.time}
              onChange={(e) => setMatch({ ...match, time: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 会場 */}
          <div>
            <label className="block text-white font-medium mb-2">
              会場 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={match.venue}
              onChange={(e) => setMatch({ ...match, venue: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-white font-medium mb-2">
              ステータス <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={match.status}
              onChange={(e) => setMatch({ ...match, status: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            >
              <option value="scheduled">開催予定</option>
              <option value="ongoing">開催中</option>
              <option value="finished">終了</option>
            </select>
          </div>

          {/* ボタン */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-yellow-400 text-black px-6 py-3 rounded font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "更新中..." : "更新する"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-700 text-white px-6 py-3 rounded font-bold hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
