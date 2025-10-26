"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">
        管理画面
      </h1>
      <p className="text-gray-400 mb-8">
        管理画面へようこそ。左側のメニューから各種管理機能にアクセスできます。
      </p>

      {/* クイックアクション */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="試合管理"
            href="/admin/matches"
            icon="⚽"
            description="試合の追加・編集・削除"
          />
          <ActionCard
            title="ユーザー管理"
            href="/admin/users"
            icon="👤"
            description="ユーザーの検索・編集"
          />
          <ActionCard
            title="レビュー管理"
            href="/admin/reviews"
            icon="⭐"
            description="レビューの承認・削除"
          />
          <ActionCard
            title="チャット管理"
            href="/admin/chats"
            icon="💬"
            description="チャットの監視・管理"
          />
          <ActionCard
            title="来場チェック"
            href="/admin/check-ins"
            icon="✅"
            description="チェックインの管理"
          />
          <ActionCard
            title="マッチング管理"
            href="/admin/matchings"
            icon="🤝"
            description="マッチング状況の確認"
          />
          <ActionCard
            title="報告管理"
            href="/admin/reports"
            icon="⚠️"
            description="ユーザー報告の対応"
          />
        </div>
      </section>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  href: string;
  icon: string;
  description: string;
}

function ActionCard({ title, href, icon, description }: ActionCardProps) {
  return (
    <Link
      href={href}
      className="p-6 rounded-lg border-2 border-yellow-400 bg-yellow-400 bg-opacity-10 hover:bg-opacity-20 transition-all flex flex-col items-start text-left group"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-white font-bold text-lg mb-2 group-hover:text-yellow-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </Link>
  );
}
