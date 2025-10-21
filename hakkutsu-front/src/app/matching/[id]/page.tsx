"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

// モックデータ
const candidates = [
  {
    id: 1,
    nickname: "サッカー太郎",
    icon: "⚽",
    style: "声出し応援",
    seat: "ゴール裏",
    trustScore: 4.8,
    matchRate: 95,
    bio: "毎試合欠かさず応援しています!",
  },
  {
    id: 2,
    nickname: "応援花子",
    icon: "🎺",
    style: "声出し応援",
    seat: "ゴール裏",
    trustScore: 4.6,
    matchRate: 88,
    bio: "一緒に盛り上がりましょう!",
  },
  {
    id: 3,
    nickname: "ギラサポ次郎",
    icon: "🔥",
    style: "声出し応援",
    seat: "ゴール裏",
    trustScore: 4.9,
    matchRate: 92,
    bio: "熱く応援したい方歓迎!",
  },
];

export default function MatchingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id;
  const mode = searchParams.get("mode") || "recruit";

  const [step, setStep] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedSeat, setSelectedSeat] = useState("");
  const [requestSent, setRequestSent] = useState<number[]>([]);

  const styles = ["声出し応援", "静かに観戦", "写真撮影メイン", "ファミリー向け"];
  const seats = ["ゴール裏", "メインスタンド", "バックスタンド", "どこでもOK"];

  const handleNext = () => {
    if (step === 1 && selectedStyle) {
      setStep(2);
    } else if (step === 2 && selectedSeat) {
      setStep(3);
    }
  };

  const handleSendRequest = (candidateId: number) => {
    setRequestSent([...requestSent, candidateId]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      {/* ヘッダー */}
      <header className="bg-black text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
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
                応援スタイル
              </span>
              <span
                className={`text-sm font-bold ${
                  step >= 2 ? "text-red-600" : "text-gray-400"
                }`}
              >
                席の希望
              </span>
              <span
                className={`text-sm font-bold ${
                  step >= 3 ? "text-red-600" : "text-gray-400"
                }`}
              >
                マッチング
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-red-600 rounded-full transition-all"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* ステップ1: 応援スタイル選択 */}
          {step === 1 && (
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-center mb-6 text-black">
                応援スタイルを選択
              </h2>
              <p className="text-center text-gray-600 mb-8">
                あなたの観戦スタイルに合うものを選んでください
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {styles.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`p-6 rounded-lg border-2 transition ${
                      selectedStyle === style
                        ? "border-red-600 bg-red-50"
                        : "border-gray-300 hover:border-yellow-400"
                    }`}
                  >
                    <p className="text-lg font-bold text-black">{style}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={handleNext}
                disabled={!selectedStyle}
                className={`w-full py-4 rounded-full font-bold text-xl transition ${
                  selectedStyle
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                次へ
              </button>
            </div>
          )}

          {/* ステップ2: 席の希望選択 */}
          {step === 2 && (
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-center mb-6 text-black">
                席の希望を選択
              </h2>
              <p className="text-center text-gray-600 mb-8">
                どのエリアで観戦したいですか?
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {seats.map((seat) => (
                  <button
                    key={seat}
                    onClick={() => setSelectedSeat(seat)}
                    className={`p-6 rounded-lg border-2 transition ${
                      selectedSeat === seat
                        ? "border-red-600 bg-red-50"
                        : "border-gray-300 hover:border-yellow-400"
                    }`}
                  >
                    <p className="text-lg font-bold text-black">{seat}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 rounded-full font-bold text-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                >
                  戻る
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedSeat}
                  className={`flex-1 py-4 rounded-full font-bold text-xl transition ${
                    selectedSeat
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  マッチング開始
                </button>
              </div>
            </div>
          )}

          {/* ステップ3: マッチング候補表示 */}
          {step === 3 && (
            <div>
              <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
                <h2 className="text-2xl font-bold text-center mb-4 text-black">
                  {mode === "recruit" ? "あなたを待っている仲間" : "募集中の仲間"}
                </h2>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">応援スタイル:</span> {selectedStyle}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">席の希望:</span> {selectedSeat}
                  </p>
                </div>
              </div>

              {/* 候補者リスト */}
              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="bg-white border-2 border-yellow-400 rounded-lg p-6 shadow-md"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-5xl">{candidate.icon}</div>
                        <div>
                          <h3 className="text-xl font-bold text-black">
                            {candidate.nickname}
                          </h3>
                          <p className="text-sm text-gray-600">{candidate.bio}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-bold text-lg">
                            {candidate.trustScore}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          マッチ率: {candidate.matchRate}%
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mb-4 text-sm">
                      <div className="flex-1 bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">応援スタイル</p>
                        <p className="font-bold text-black">{candidate.style}</p>
                      </div>
                      <div className="flex-1 bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">席の希望</p>
                        <p className="font-bold text-black">{candidate.seat}</p>
                      </div>
                    </div>
                    {requestSent.includes(candidate.id) ? (
                      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-center font-bold">
                        リクエスト送信済み ✓
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(candidate.id)}
                        className="w-full bg-red-600 text-white py-3 rounded-full font-bold hover:bg-red-700 transition"
                      >
                        {mode === "recruit" ? "承認する" : "リクエストを送る"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* チャットへ移動ボタン */}
              {requestSent.length > 0 && (
                <div className="mt-8 bg-white rounded-lg p-6 shadow-lg text-center">
                  <p className="text-gray-700 mb-4">
                    リクエストを送信しました!承認されたらチャットで詳細を相談しましょう。
                  </p>
                  <Link
                    href="/chat"
                    className="inline-block bg-yellow-400 text-black px-8 py-3 rounded-full font-bold hover:bg-yellow-500 transition"
                  >
                    チャットを確認
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
