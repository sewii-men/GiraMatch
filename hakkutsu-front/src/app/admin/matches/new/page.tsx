"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiBase } from "@/lib/apiBase";

export default function NewMatch() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    matchId: "",
    opponent: "",
    date: "",
    time: "",
    venue: "",
    status: "scheduled",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "試合の追加に失敗しました");
      }

      alert("試合を追加しました");
      router.push("/admin/matches");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">試合追加</h1>
      <p className="text-gray-400 mb-8">新しい試合を追加します</p>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-6 space-y-6">
          {/* 試合ID */}
          <div>
            <label className="block text-white font-medium mb-2">
              試合ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.matchId}
              onChange={(e) =>
                setFormData({ ...formData, matchId: e.target.value })
              }
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
              placeholder="例: match-2025-001"
            />
            <p className="text-gray-400 text-sm mt-1">
              一意の識別子を入力してください
            </p>
          </div>

          {/* 対戦相手 */}
          <div>
            <label className="block text-white font-medium mb-2">
              対戦相手 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.opponent}
              onChange={(e) =>
                setFormData({ ...formData, opponent: e.target.value })
              }
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
              placeholder="例: FC東京"
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
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
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
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
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
              value={formData.venue}
              onChange={(e) =>
                setFormData({ ...formData, venue: e.target.value })
              }
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
              placeholder="例: ミクニワールドスタジアム北九州"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-white font-medium mb-2">
              ステータス <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
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
              {submitting ? "追加中..." : "試合を追加"}
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
