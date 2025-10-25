"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface User {
  userId: string;
  name: string;
  createdAt: string;
  isAdmin?: boolean;
  suspended?: boolean;
  deleted?: boolean;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterStatus, users]);

  const fetchUsers = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("ユーザー一覧の取得に失敗しました");

      const data = await res.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.userId?.toLowerCase().includes(term) ||
          u.name?.toLowerCase().includes(term)
      );
    }

    // ステータスフィルター
    if (filterStatus === "active") {
      filtered = filtered.filter((u) => !u.suspended && !u.deleted);
    } else if (filterStatus === "suspended") {
      filtered = filtered.filter((u) => u.suspended);
    } else if (filterStatus === "deleted") {
      filtered = filtered.filter((u) => u.deleted);
    }

    setFilteredUsers(filtered);
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
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          ユーザー管理
        </h1>
        <p className="text-gray-400">ユーザーの検索・閲覧・管理を行います</p>
      </div>

      {/* 検索バー */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="ユーザーIDまたは名前で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-black text-white border-2 border-yellow-400 rounded focus:border-yellow-500 focus:outline-none"
        />
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
            全て ({users.length})
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "active"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            有効 (
            {users.filter((u) => !u.suspended && !u.deleted).length})
          </button>
          <button
            onClick={() => setFilterStatus("suspended")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "suspended"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            停止中 ({users.filter((u) => u.suspended).length})
          </button>
          <button
            onClick={() => setFilterStatus("deleted")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "deleted"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            削除済み ({users.filter((u) => u.deleted).length})
          </button>
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-yellow-400 text-black">
            <tr>
              <th className="px-4 py-3 text-left">ユーザーID</th>
              <th className="px-4 py-3 text-left">名前</th>
              <th className="px-4 py-3 text-left">登録日</th>
              <th className="px-4 py-3 text-left">権限</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.userId} className="border-t border-gray-700">
                  <td className="px-4 py-3 font-mono text-sm">
                    {user.userId}
                  </td>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("ja-JP")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {user.isAdmin ? (
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                        管理者
                      </span>
                    ) : (
                      <span className="text-gray-400">一般</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge user={user} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Link
                        href={`/admin/users/${user.userId}`}
                        className="bg-white text-black px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        詳細
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {searchTerm || filterStatus !== "all"
                    ? "条件に一致するユーザーが見つかりません"
                    : "ユーザーがいません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ user }: { user: User }) {
  if (user.deleted) {
    return (
      <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium">
        削除済み
      </span>
    );
  }

  if (user.suspended) {
    return (
      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
        停止中
      </span>
    );
  }

  return (
    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
      有効
    </span>
  );
}
