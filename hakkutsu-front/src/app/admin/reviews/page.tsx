"use client";

import { useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface Review {
  reviewId: string;
  userId: string;
  partnerId: string;
  matchId: string;
  rating: number;
  message: string;
  createdAt: string;
  approved: boolean;
}

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/reviews`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("レビュー一覧の取得に失敗しました");

      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/reviews/${reviewId}/approve`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("承認に失敗しました");

      alert("承認しました");
      fetchReviews();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/reviews/${reviewId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("削除に失敗しました");

      alert("削除しました");
      fetchReviews();
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

  const pendingCount = reviews.filter((r) => !r.approved).length;
  const approvedCount = reviews.filter((r) => r.approved).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">レビュー管理</h1>
        <p className="text-gray-400">レビューの承認・削除を行います</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">総レビュー数</h3>
          <p className="text-yellow-400 text-3xl font-bold">{reviews.length}</p>
        </div>
        <div className="bg-white bg-opacity-10 border-2 border-red-600 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">承認待ち</h3>
          <p className="text-red-600 text-3xl font-bold">{pendingCount}</p>
        </div>
        <div className="bg-white bg-opacity-10 border-2 border-green-600 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">承認済み</h3>
          <p className="text-green-600 text-3xl font-bold">{approvedCount}</p>
        </div>
      </div>

      <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-yellow-400 text-black">
            <tr>
              <th className="px-4 py-3 text-left">投稿者</th>
              <th className="px-4 py-3 text-left">対象ユーザー</th>
              <th className="px-4 py-3 text-left">評価</th>
              <th className="px-4 py-3 text-left">コメント</th>
              <th className="px-4 py-3 text-left">投稿日時</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <tr key={review.reviewId} className="border-t border-gray-700">
                  <td className="px-4 py-3">{review.userId}</td>
                  <td className="px-4 py-3">{review.partnerId}</td>
                  <td className="px-4 py-3">
                    <span className="text-yellow-400">
                      {"⭐".repeat(review.rating)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {review.message || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    {review.approved ? (
                      <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                        承認済み
                      </span>
                    ) : (
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                        承認待ち
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      {!review.approved && (
                        <button
                          onClick={() => handleApprove(review.reviewId)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          承認
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(review.reviewId)}
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
                  レビューがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
