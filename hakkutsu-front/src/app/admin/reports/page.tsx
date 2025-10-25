"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface Report {
  reportId: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details: string;
  status: string;
  priority: string;
  createdAt: string;
  actionTaken?: string;
}

export default function ReportsAdmin() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterStatus, reports]);

  const fetchReports = async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/reports`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("報告一覧の取得に失敗しました");

      const data = await res.json();
      setReports(data);
      setFilteredReports(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    setFilteredReports(filtered);
  };

  if (loading) {
    return <div className="text-white text-xl">読み込み中...</div>;
  }

  if (error) {
    return <div className="bg-red-600 text-white p-4 rounded">{error}</div>;
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          ユーザー報告管理
        </h1>
        <p className="text-gray-400">ユーザーからの報告を確認・対応します</p>
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
            全て ({reports.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "pending"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            未対応 ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("in_progress")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "in_progress"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            対応中 ({inProgressCount})
          </button>
          <button
            onClick={() => setFilterStatus("resolved")}
            className={`px-4 py-2 rounded transition-colors ${
              filterStatus === "resolved"
                ? "bg-yellow-400 text-black font-bold"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            解決済み ({resolvedCount})
          </button>
        </div>
      </div>

      {/* 報告一覧 */}
      <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-yellow-400 text-black">
            <tr>
              <th className="px-4 py-3 text-left">報告ID</th>
              <th className="px-4 py-3 text-left">報告者</th>
              <th className="px-4 py-3 text-left">被報告者</th>
              <th className="px-4 py-3 text-left">理由</th>
              <th className="px-4 py-3 text-left">報告日時</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <tr key={report.reportId} className="border-t border-gray-700">
                  <td className="px-4 py-3 font-mono text-sm">
                    {report.reportId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">{report.reporterId}</td>
                  <td className="px-4 py-3">{report.reportedUserId}</td>
                  <td className="px-4 py-3">{report.reason}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(report.createdAt).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Link
                        href={`/admin/reports/${report.reportId}`}
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
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {filterStatus !== "all"
                    ? "条件に一致する報告がありません"
                    : "報告がありません"}
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
  const statusConfig: Record<
    string,
    { label: string; color: string }
  > = {
    pending: { label: "未対応", color: "bg-red-600" },
    in_progress: { label: "対応中", color: "bg-yellow-600" },
    resolved: { label: "解決済み", color: "bg-green-600" },
  };

  const config = statusConfig[status] || {
    label: status,
    color: "bg-gray-600",
  };

  return (
    <span
      className={`${config.color} text-white px-2 py-1 rounded text-xs font-medium`}
    >
      {config.label}
    </span>
  );
}
