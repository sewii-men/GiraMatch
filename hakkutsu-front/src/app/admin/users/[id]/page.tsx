"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface User {
  userId: string;
  name: string;
  nickname?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  icon?: string;
  style?: string;
  seat?: string;
  trustScore?: number;
  createdAt: string;
  isAdmin?: boolean;
  suspended?: boolean;
  deleted?: boolean;
}

interface Activity {
  chats: number;
  checkins: number;
  reviews: number;
  chatList: unknown[];
  checkinList: unknown[];
  reviewList: unknown[];
}

export default function UserDetail() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("ユーザー情報の取得に失敗しました");

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchActivity = useCallback(async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/users/${userId}/activity`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("アクティビティの取得に失敗しました");

      const data = await res.json();
      setActivity(data);
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
    fetchActivity();
  }, [fetchUser, fetchActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError("");

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: user.name,
          nickname: user.nickname,
          birthDate: user.birthDate,
          gender: user.gender,
          icon: user.icon,
          style: user.style,
          seat: user.seat,
          trustScore: user.trustScore,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新に失敗しました");
      }

      alert("更新しました");
      fetchUser();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (suspended: boolean, deleted: boolean) => {
    if (
      !confirm(
        `ユーザーを${deleted ? "削除" : suspended ? "停止" : "有効化"}しますか？`
      )
    )
      return;

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ suspended, deleted }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ステータス変更に失敗しました");
      }

      alert("ステータスを変更しました");
      fetchUser();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "本当に完全削除しますか？この操作は取り消せません。\n\n通常は「削除済みにする」を使用してください。"
      )
    )
      return;

    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/users/${userId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("削除に失敗しました");

      alert("ユーザーを完全削除しました");
      router.push("/admin/users");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  if (loading) {
    return <div className="text-white text-xl">読み込み中...</div>;
  }

  if (error && !user) {
    return <div className="bg-red-600 text-white p-4 rounded">{error}</div>;
  }

  if (!user) {
    return <div className="text-white">ユーザーが見つかりません</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">
        ユーザー詳細・編集
      </h1>
      <p className="text-gray-400 mb-8">ユーザー情報を管理します</p>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded mb-6">{error}</div>
      )}

      {/* アクティビティ統計 */}
      {activity && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            アクティビティ統計
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
              <h3 className="text-gray-400 text-sm mb-1">チャット参加数</h3>
              <p className="text-yellow-400 text-3xl font-bold">
                {activity.chats}
              </p>
            </div>
            <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
              <h3 className="text-gray-400 text-sm mb-1">来場チェック数</h3>
              <p className="text-yellow-400 text-3xl font-bold">
                {activity.checkins}
              </p>
            </div>
            <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-4">
              <h3 className="text-gray-400 text-sm mb-1">レビュー投稿数</h3>
              <p className="text-yellow-400 text-3xl font-bold">
                {activity.reviews}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 基本情報編集 */}
      <form onSubmit={handleSubmit} className="max-w-2xl mb-8">
        <h2 className="text-xl font-bold text-white mb-4">基本情報</h2>
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-6 space-y-6">
          {/* ユーザーID（読み取り専用） */}
          <div>
            <label className="block text-white font-medium mb-2">
              ユーザーID
            </label>
            <input
              type="text"
              value={user.userId}
              disabled
              className="w-full px-4 py-2 bg-gray-800 text-gray-400 border-2 border-gray-700 rounded cursor-not-allowed"
            />
          </div>

          {/* 名前 */}
          <div>
            <label className="block text-white font-medium mb-2">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* ニックネーム */}
          <div>
            <label className="block text-white font-medium mb-2">
              ニックネーム
            </label>
            <input
              type="text"
              value={user.nickname || ""}
              onChange={(e) => setUser({ ...user, nickname: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label className="block text-white font-medium mb-2">メールアドレス</label>
            <input
              type="text"
              value={user.email || "-"}
              disabled
              className="w-full px-4 py-2 bg-gray-800 text-gray-400 border-2 border-gray-700 rounded cursor-not-allowed"
            />
          </div>

          {/* 誕生日 */}
          <div>
            <label className="block text-white font-medium mb-2">
              誕生日
            </label>
            <input
              type="date"
              value={user.birthDate || ""}
              onChange={(e) => setUser({ ...user, birthDate: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-white font-medium mb-2">
              性別
            </label>
            <select
              value={user.gender || ""}
              onChange={(e) => setUser({ ...user, gender: e.target.value })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            >
              <option value="">未設定</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>

          {/* アイコン */}
          <div>
            <label className="block text-white font-medium mb-2">
              アイコン
            </label>
            <input
              type="text"
              value={user.icon || ""}
              onChange={(e) => setUser({ ...user, icon: e.target.value })}
              placeholder="例: 👤"
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 応援スタイル */}
          <div>
            <label className="block text-white font-medium mb-2">
              応援スタイル
            </label>
            <input
              type="text"
              value={user.style || ""}
              onChange={(e) => setUser({ ...user, style: e.target.value })}
              placeholder="例: 声出し応援OK"
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 席の好み */}
          <div>
            <label className="block text-white font-medium mb-2">
              席の好み
            </label>
            <input
              type="text"
              value={user.seat || ""}
              onChange={(e) => setUser({ ...user, seat: e.target.value })}
              placeholder="例: ゴール裏希望"
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 信頼スコア */}
          <div>
            <label className="block text-white font-medium mb-2">
              信頼スコア
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={user.trustScore || 0}
              onChange={(e) => setUser({ ...user, trustScore: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* 登録日 */}
          <div>
            <label className="block text-white font-medium mb-2">登録日</label>
            <input
              type="text"
              value={
                user.createdAt
                  ? new Date(user.createdAt).toLocaleString("ja-JP")
                  : "-"
              }
              disabled
              className="w-full px-4 py-2 bg-gray-800 text-gray-400 border-2 border-gray-700 rounded cursor-not-allowed"
            />
          </div>

          {/* 権限 */}
          <div>
            <label className="block text-white font-medium mb-2">権限</label>
            <input
              type="text"
              value={user.isAdmin ? "管理者" : "一般ユーザー"}
              disabled
              className="w-full px-4 py-2 bg-gray-800 text-gray-400 border-2 border-gray-700 rounded cursor-not-allowed"
            />
          </div>

          {/* 更新ボタン */}
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

      {/* ステータス管理 */}
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-4">ステータス管理</h2>
        <div className="bg-white bg-opacity-10 border-2 border-red-600 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">現在のステータス</h3>
              <p className="text-gray-400 text-sm mt-1">
                {user.deleted
                  ? "削除済み"
                  : user.suspended
                    ? "停止中"
                    : "有効"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            {!user.deleted && !user.suspended && (
              <button
                onClick={() => handleStatusChange(true, false)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                アカウントを停止
              </button>
            )}

            {user.suspended && !user.deleted && (
              <button
                onClick={() => handleStatusChange(false, false)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                アカウントを有効化
              </button>
            )}

            {!user.deleted && (
              <button
                onClick={() => handleStatusChange(false, true)}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                削除済みにする
              </button>
            )}

            {user.deleted && (
              <button
                onClick={() => handleStatusChange(false, false)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                削除を取り消す
              </button>
            )}

            <button
              onClick={handleDelete}
              className="bg-red-900 text-white px-4 py-2 rounded hover:bg-red-950 transition-colors border border-red-600"
            >
              完全削除（取り消し不可）
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
