"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";

export default function MatchingPage() {
  const params = useParams();
  const matchId = params.id;
  const { token } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const conditions = [
    "声出し応援OK",
    "静かに観戦",
    "初心者歓迎",
    "ファミリー向け",
    "写真撮影メイン",
    "ゴール裏希望",
    "メインスタンド希望",
    "お酒を飲みながら",
  ];

  const handleNext = () => {
    if (step === 1 && selectedConditions.length > 0) {
      setStep(2);
    }
  };

  const toggleCondition = (condition: string) => {
    if (selectedConditions.includes(condition)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== condition));
    } else {
      setSelectedConditions([...selectedConditions, condition]);
    }
  };

  const handleRecruit = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/matching/recruit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          matchId,
          conditions: selectedConditions,
          message,
        }),
      });

      if (!res.ok) throw new Error("募集の作成に失敗しました");

      // ダッシュボードにリダイレクト
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      alert("募集の作成に失敗しました");
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />
      {/* ヘッダー */}
      <header className="bg-black text-white py-4 px-6 shadow-lg hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-2xl font-bold cursor-pointer">
              <span className="text-yellow-400">Giravent</span>
            </h1>
          </Link>
          <nav className="flex gap-4">
            <Link href="/matches" className="hover:text-yellow-400 transition">
              試合一覧
            </Link>
            <Link href="/chat" className="hover:text-yellow-400 transition">
              チャット
            </Link>
            <Link href="/check-in" className="hover:text-yellow-400 transition">
              来場チェック
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* 戻るボタン */}
          <Link
            href={`/matches/${matchId}`}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-black mb-6"
          >
            <span>←</span> 試合詳細に戻る
          </Link>

          {/* プログレスバー */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span
                className={`text-sm font-bold ${
                  step >= 1 ? "text-red-600" : "text-gray-400"
                }`}
              >
                こだわり条件
              </span>
              <span
                className={`text-sm font-bold ${
                  step >= 2 ? "text-red-600" : "text-gray-400"
                }`}
              >
                メッセージ入力
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-red-600 rounded-full transition-all"
                style={{ width: `${(step / 2) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* ステップ1: こだわり条件選択 */}
          {step === 1 && (
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-center mb-6 text-black">
                こだわり条件を選択
              </h2>
              <p className="text-center text-gray-600 mb-8">
                あなたのこだわり条件を複数選択してください
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {conditions.map((condition) => (
                  <button
                    key={condition}
                    onClick={() => toggleCondition(condition)}
                    className={`p-6 rounded-lg border-2 transition ${
                      selectedConditions.includes(condition)
                        ? "border-red-600 bg-red-50"
                        : "border-gray-300 hover:border-yellow-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-black">{condition}</p>
                      {selectedConditions.includes(condition) && (
                        <span className="text-red-600 text-2xl">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleNext}
                disabled={selectedConditions.length === 0}
                className={`w-full py-4 rounded-full font-bold text-xl transition ${
                  selectedConditions.length > 0
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                次へ
              </button>
            </div>
          )}

          {/* ステップ2: メッセージ入力 */}
          {step === 2 && (
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-center mb-6 text-black">
                一言メッセージを入力
              </h2>
              <p className="text-center text-gray-600 mb-8">
                参加者へのメッセージを入力してください
              </p>

              {/* 選択した条件の確認 */}
              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <p className="text-sm font-bold text-gray-700 mb-2">選択した条件:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedConditions.map((condition) => (
                    <span
                      key={condition}
                      className="bg-red-600 text-white px-3 py-1 rounded-full text-sm"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="例: 初めての観戦です！一緒に楽しく応援しましょう！"
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-600 focus:outline-none text-black mb-8"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 rounded-full font-bold text-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                >
                  戻る
                </button>
                <button
                  onClick={handleRecruit}
                  disabled={!message.trim()}
                  className={`flex-1 py-4 rounded-full font-bold text-xl transition ${
                    message.trim()
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  募集する
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
