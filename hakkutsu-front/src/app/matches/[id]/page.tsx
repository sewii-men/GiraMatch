"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id;

  useEffect(() => {
    // 仲間を募集フローでは参加方法選択をスキップして直接こだわり条件選択画面へ
    window.location.href = `/matching/${matchId}`;
  }, [matchId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex items-center justify-center">
      <p className="text-xl text-gray-700">読み込み中...</p>
    </div>
  );
}
