"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "@/lib/apiBase";

interface Stats {
  totalUsers: number;
  totalMatches: number;
  totalChats: number;
  totalCheckIns: number;
  totalReviews: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topMatches: Array<{
    matchId: string;
    opponent: string;
    date: string;
    chatCount: number;
    checkinCount: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const base = apiBase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/admin/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error("統計データの取得に失敗しました");
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-white text-xl">統計データを読み込み中...</div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 text-white p-4 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">
        ダッシュボード
      </h1>
      <p className="text-gray-400 mb-8">
        管理画面へようこそ。各種統計情報と管理機能にアクセスできます。
      </p>

      {/* 全体統計 */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">全体統計</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="総ユーザー数" value={stats?.totalUsers || 0} color="yellow" />
          <StatCard title="総試合数" value={stats?.totalMatches || 0} color="red" />
          <StatCard title="チャット数" value={stats?.totalChats || 0} color="white" />
          <StatCard title="来場チェック" value={stats?.totalCheckIns || 0} color="yellow" />
          <StatCard title="レビュー数" value={stats?.totalReviews || 0} color="white" />
        </div>
      </section>

      {/* アクティブユーザー */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">アクティブユーザー</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="日次"
            value={stats?.activeUsers.daily || 0}
            color="white"
            subtitle="過去24時間"
          />
          <StatCard
            title="週次"
            value={stats?.activeUsers.weekly || 0}
            color="white"
            subtitle="過去7日間"
          />
          <StatCard
            title="月次"
            value={stats?.activeUsers.monthly || 0}
            color="white"
            subtitle="過去30日間"
          />
        </div>
      </section>

      {/* 人気試合ランキング */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">人気試合ランキング（チャット数順）</h2>
        <div className="bg-white bg-opacity-10 border-2 border-yellow-400 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-yellow-400 text-black">
              <tr>
                <th className="px-4 py-3 text-left">順位</th>
                <th className="px-4 py-3 text-left">対戦相手</th>
                <th className="px-4 py-3 text-left">日付</th>
                <th className="px-4 py-3 text-right">チャット数</th>
                <th className="px-4 py-3 text-right">来場チェック</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {stats?.topMatches && stats.topMatches.length > 0 ? (
                stats.topMatches.map((match, index) => (
                  <tr key={match.matchId} className="border-t border-gray-700">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{match.opponent}</td>
                    <td className="px-4 py-3 text-gray-400">{match.date}</td>
                    <td className="px-4 py-3 text-right">{match.chatCount}</td>
                    <td className="px-4 py-3 text-right">{match.checkinCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* クイックアクション */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="試合を追加"
            href="/admin/matches/new"
            icon="⚽"
          />
          <ActionCard
            title="ユーザー検索"
            href="/admin/users"
            icon="👤"
          />
          <ActionCard
            title="報告を確認"
            href="/admin/reports"
            icon="⚠️"
          />
          <ActionCard
            title="チャット監視"
            href="/admin/chats"
            icon="💬"
          />
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  color: "yellow" | "red" | "white";
  subtitle?: string;
}

function StatCard({ title, value, color, subtitle }: StatCardProps) {
  const colorClasses = {
    yellow: "border-yellow-400 bg-yellow-400 bg-opacity-10",
    red: "border-red-600 bg-red-600 bg-opacity-10",
    white: "border-white bg-white bg-opacity-10",
  };

  const textColorClasses = {
    yellow: "text-yellow-400",
    red: "text-red-600",
    white: "text-white",
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
      <h3 className="text-white text-sm font-medium mb-2">{title}</h3>
      <p className={`text-4xl font-bold ${textColorClasses[color]}`}>{value.toLocaleString()}</p>
      {subtitle && <p className="text-gray-400 text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

interface ActionCardProps {
  title: string;
  href: string;
  icon: string;
}

function ActionCard({ title, href, icon }: ActionCardProps) {
  return (
    <Link
      href={href}
      className="p-6 rounded-lg border-2 border-yellow-400 bg-yellow-400 bg-opacity-10 hover:bg-opacity-20 transition-all flex flex-col items-center justify-center text-center group"
    >
      <div className="text-4xl mb-2">{icon}</div>
      <h3 className="text-white font-medium group-hover:text-yellow-400 transition-colors">
        {title}
      </h3>
    </Link>
  );
}
