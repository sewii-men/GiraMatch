"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  notes?: string;
  reporter?: { userId: string; name: string };
  reportedUser?: { userId: string; name: string };
}

export default function ReportDetail() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/reports/${reportId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("報告情報の取得に失敗しました");

      const data = await res.json();
      setReport(data);
      setNotes(data.notes || "");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, reason?: string) => {
    if (!confirm(`この操作を実行しますか？`)) return;

    setSubmitting(true);
    setError("");

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/reports/${reportId}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "アクション実行に失敗しました");
      }

      alert("アクションを実行しました");
      fetchReport();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    setSubmitting(true);
    setError("");

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/reports/${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notes, status: "in_progress" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新に失敗しました");
      }

      alert("メモを保存しました");
      fetchReport();
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

  if (error && !report) {
    return <div className="bg-red-600 text-white p-4 rounded">{error}</div>;
  }

  if (!report) {
    return <div className="text-white">報告が見つかりません</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">報告詳細・対応</h1>
      <p className="text-gray-400 mb-8">報告内容を確認し、適切な対応を行います</p>

      {error && (
        <div className="bg-red-600 text-white p-4 rounded mb-6">{error}</div>
      )}

      {/* 報告情報 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">報告情報</h2>
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-gray-400 text-sm mb-1">報告ID</h3>
              <p className="text-white font-mono">{report.reportId}</p>
            </div>
            <div>
              <h3 className="text-gray-400 text-sm mb-1">報告日時</h3>
              <p className="text-white">
                {new Date(report.createdAt).toLocaleString("ja-JP")}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm mb-1">ステータス</h3>
            <StatusBadge status={report.status} />
          </div>

          <div>
            <h3 className="text-gray-400 text-sm mb-1">報告理由</h3>
            <p className="text-white font-medium">{report.reason}</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm mb-1">詳細内容</h3>
            <p className="text-white whitespace-pre-wrap">{report.details}</p>
          </div>
        </div>
      </div>

      {/* ユーザー情報 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">関係者情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-6">
            <h3 className="text-yellow-400 font-bold mb-3">報告者</h3>
            <p className="text-white mb-1">
              <span className="text-gray-400">ID:</span>{" "}
              {report.reporter?.userId || report.reporterId}
            </p>
            <p className="text-white">
              <span className="text-gray-400">名前:</span>{" "}
              {report.reporter?.name || "-"}
            </p>
          </div>
          <div className="bg-white bg-opacity-10 border-2 border-red-600 rounded-lg p-6">
            <h3 className="text-red-600 font-bold mb-3">被報告者</h3>
            <p className="text-white mb-1">
              <span className="text-gray-400">ID:</span>{" "}
              {report.reportedUser?.userId || report.reportedUserId}
            </p>
            <p className="text-white">
              <span className="text-gray-400">名前:</span>{" "}
              {report.reportedUser?.name || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* 対応履歴 */}
      {report.actionTaken && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">対応履歴</h2>
          <div className="bg-white bg-opacity-10 border-2 border-green-600 rounded-lg p-6">
            <p className="text-white">{report.actionTaken}</p>
          </div>
        </div>
      )}

      {/* メモ */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">管理者メモ</h2>
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg p-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-black text-white border-2 border-gray-700 rounded focus:border-yellow-400 focus:outline-none"
            placeholder="対応に関するメモを記録..."
          />
          <button
            onClick={handleSaveNotes}
            disabled={submitting}
            className="mt-4 bg-yellow-400 text-black px-6 py-2 rounded font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            メモを保存
          </button>
        </div>
      </div>

      {/* 対応アクション */}
      {report.status !== "resolved" && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">対応アクション</h2>
          <div className="bg-white bg-opacity-10 border-2 border-red-600 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-4">
              ※ 実行後は取り消せません。慎重に選択してください。
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleAction("warn")}
                disabled={submitting}
                className="bg-yellow-600 text-white px-6 py-3 rounded font-bold hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                警告を送信
              </button>
              <button
                onClick={() => handleAction("suspend", "報告内容に基づく違反行為")}
                disabled={submitting}
                className="bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                アカウントを停止
              </button>
              <button
                onClick={() => handleAction("delete", "重大な規約違反")}
                disabled={submitting}
                className="bg-red-900 text-white px-6 py-3 rounded font-bold hover:bg-red-950 transition-colors disabled:opacity-50"
              >
                アカウントを削除
              </button>
              <button
                onClick={() => handleAction("dismiss")}
                disabled={submitting}
                className="bg-gray-700 text-white px-6 py-3 rounded font-bold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                報告を却下
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 戻るボタン */}
      <button
        onClick={() => router.back()}
        className="bg-gray-700 text-white px-6 py-3 rounded font-bold hover:bg-gray-600 transition-colors"
      >
        一覧に戻る
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "未対応", color: "bg-red-600" },
    in_progress: { label: "対応中", color: "bg-yellow-600" },
    resolved: { label: "解決済み", color: "bg-green-600" },
  };

  const config = statusConfig[status] || { label: status, color: "bg-gray-600" };

  return (
    <span className={`${config.color} text-white px-3 py-1 rounded text-sm font-medium`}>
      {config.label}
    </span>
  );
}
