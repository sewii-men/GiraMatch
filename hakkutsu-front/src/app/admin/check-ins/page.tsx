"use client";

import { useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface CheckIn {
  matchId: string;
  userId: string;
  checkedIn: boolean;
  matchInfo?: {
    opponent: string;
    date: string;
  };
}

interface Duplicate {
  userId: string;
  matchId: string;
  count: number;
  checkins: CheckIn[];
}

export default function CheckInsAdmin() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  useEffect(() => {
    fetchCheckIns();
    fetchDuplicates();
  }, []);

  const fetchCheckIns = async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/check-ins`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("チェックイン一覧の取得に失敗しました");

      const data = await res.json();
      setCheckIns(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchDuplicates = async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/check-ins/duplicates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("重複検出に失敗しました");

      const data = await res.json();
      setDuplicates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (matchId: string, userId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/check-ins/${matchId}/${userId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("削除に失敗しました");

      alert("削除しました");
      fetchCheckIns();
      fetchDuplicates();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  if (loading) {
    return <div className="text-white text-xl">読み込み中...</div>;
  }

  if (error) {
    return <div className="bg-red-600 text-white p-4 rounded">{error}</div>;
  }

  const displayData = showDuplicatesOnly
    ? duplicates.flatMap((d) => d.checkins)
    : checkIns;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          来場チェック管理
        </h1>
        <p className="text-gray-400">
          来場チェックの履歴と不正検出を行います
        </p>
      </div>

      {/* 統計 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">総チェックイン数</h3>
          <p className="text-yellow-400 text-3xl font-bold">
            {checkIns.length}
          </p>
        </div>
        <div className="bg-white bg-opacity-10 border-2 border-red-600 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">重複検出</h3>
          <p className="text-red-600 text-3xl font-bold">{duplicates.length}</p>
        </div>
        <div className="bg-white bg-opacity-10 border-2 border-white rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">ユニークユーザー</h3>
          <p className="text-white text-3xl font-bold">
            {new Set(checkIns.map((c) => c.userId)).size}
          </p>
        </div>
      </div>

      {/* フィルター */}
      <div className="mb-6">
        <button
          onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
          className={`px-4 py-2 rounded transition-colors ${
            showDuplicatesOnly
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-white hover:bg-gray-700"
          }`}
        >
          {showDuplicatesOnly ? "全て表示" : "重複のみ表示"}
        </button>
      </div>

      {/* チェックイン一覧 */}
      <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-yellow-400 text-black">
            <tr>
              <th className="px-4 py-3 text-left">ユーザーID</th>
              <th className="px-4 py-3 text-left">試合ID</th>
              <th className="px-4 py-3 text-left">対戦相手</th>
              <th className="px-4 py-3 text-left">日付</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {displayData.length > 0 ? (
              displayData.map((checkin, index) => (
                <tr
                  key={`${checkin.matchId}-${checkin.userId}-${index}`}
                  className="border-t border-gray-700"
                >
                  <td className="px-4 py-3">{checkin.userId}</td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {checkin.matchId}
                  </td>
                  <td className="px-4 py-3">
                    {checkin.matchInfo?.opponent || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {checkin.matchInfo?.date || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {checkin.checkedIn ? (
                      <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                        チェック済み
                      </span>
                    ) : (
                      <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">
                        未チェック
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() =>
                          handleDelete(checkin.matchId, checkin.userId)
                        }
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
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {showDuplicatesOnly
                    ? "重複は検出されませんでした"
                    : "チェックインがありません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
