"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";

interface Recruitment {
  id: string;
  matchId: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  conditions: string[];
  message: string;
  recruiter: {
    userId: string;
    nickname: string;
    gender?: string;
    icon?: string;
    trustScore?: number;
  };
  requestSent?: boolean;
}

export default function RecruitmentsPage() {
  const { token } = useAuth();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [filteredRecruitments, setFilteredRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date");
  const [genderFilter, setGenderFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [venueFilter, setVenueFilter] = useState("all");

  useEffect(() => {
    fetchRecruitments();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [recruitments, sortBy, genderFilter, searchTerm, selectedStyles, selectedSeats, venueFilter]);

  const fetchRecruitments = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/matching/recruitments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("募集一覧の取得に失敗しました");

      const data = await res.json();
      setRecruitments(data);
    } catch (err) {
      console.error(err);
      alert("募集一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...recruitments];

    // 性別フィルター
    if (genderFilter !== "all") {
      filtered = filtered.filter((r) => r.recruiter.gender === genderFilter);
    }

    // 会場フィルター
    if (venueFilter !== "all") {
      filtered = filtered.filter((r) => r.venue === venueFilter);
    }

    // 応援スタイルフィルター
    if (selectedStyles.length > 0) {
      filtered = filtered.filter((r) =>
        selectedStyles.every((style) => r.conditions.includes(style))
      );
    }

    // 席の種類フィルター
    if (selectedSeats.length > 0) {
      filtered = filtered.filter((r) =>
        selectedSeats.some((seat) => r.conditions.includes(seat))
      );
    }

    // 検索フィルター（試合名、メッセージ、条件）
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.opponent.toLowerCase().includes(term) ||
          r.message.toLowerCase().includes(term) ||
          r.conditions.some((c) => c.toLowerCase().includes(term))
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "match":
          return a.opponent.localeCompare(b.opponent);
        case "trust":
          return (b.recruiter.trustScore || 0) - (a.recruiter.trustScore || 0);
        default:
          return 0;
      }
    });

    setFilteredRecruitments(filtered);
  };

  // 応援スタイルの選択肢
  const supportStyles = [
    "声出し応援OK",
    "静かに観戦",
    "初心者歓迎",
    "ファミリー向け",
    "写真撮影メイン",
    "お酒を飲みながら",
  ];

  // 席の選択肢
  const seatTypes = ["ゴール裏希望", "メインスタンド希望"];

  // 会場のリストを動的に取得
  const venues = Array.from(new Set(recruitments.map((r) => r.venue))).filter(Boolean);

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const toggleSeat = (seat: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  };

  const handleSendRequest = async (recruitmentId: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/matching/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ recruitmentId }),
      });

      if (!res.ok) throw new Error("リクエスト送信に失敗しました");

      alert("リクエストを送信しました！");
      fetchRecruitments();
    } catch (err) {
      console.error(err);
      alert("リクエスト送信に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />

      <main className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-black mb-4"
            >
              <span>←</span> ダッシュボードに戻る
            </Link>
            <h1 className="text-4xl font-bold text-black mb-2">募集一覧</h1>
            <p className="text-gray-700">気になる募集にリクエストを送ろう</p>
          </div>

          {/* 検索・フィルター・ソート */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            {/* 検索バー */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="試合名、メッセージ、条件で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-600 focus:outline-none text-black"
              />
            </div>

            {/* 基本フィルターとソート */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* 性別フィルター */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  性別
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGenderFilter("all")}
                    className={`px-3 py-2 rounded-lg transition text-sm ${
                      genderFilter === "all"
                        ? "bg-red-600 text-white font-bold"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    全て
                  </button>
                  <button
                    onClick={() => setGenderFilter("male")}
                    className={`px-3 py-2 rounded-lg transition text-sm ${
                      genderFilter === "male"
                        ? "bg-red-600 text-white font-bold"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    男性
                  </button>
                  <button
                    onClick={() => setGenderFilter("female")}
                    className={`px-3 py-2 rounded-lg transition text-sm ${
                      genderFilter === "female"
                        ? "bg-red-600 text-white font-bold"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    女性
                  </button>
                  <button
                    onClick={() => setGenderFilter("other")}
                    className={`px-3 py-2 rounded-lg transition text-sm ${
                      genderFilter === "other"
                        ? "bg-red-600 text-white font-bold"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    その他
                  </button>
                </div>
              </div>

              {/* 会場フィルター */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  会場
                </label>
                <select
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-600 focus:outline-none text-black text-sm"
                >
                  <option value="all">全ての会場</option>
                  {venues.map((venue) => (
                    <option key={venue} value={venue}>
                      {venue}
                    </option>
                  ))}
                </select>
              </div>

              {/* ソート */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  並び替え
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-600 focus:outline-none text-black text-sm"
                >
                  <option value="date">日付順</option>
                  <option value="match">試合名順</option>
                  <option value="trust">信頼スコア順</option>
                </select>
              </div>
            </div>

            {/* 応援スタイルフィルター */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                応援スタイル（複数選択可）
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {supportStyles.map((style) => (
                  <button
                    key={style}
                    onClick={() => toggleStyle(style)}
                    className={`px-4 py-2 rounded-lg border-2 transition text-sm ${
                      selectedStyles.includes(style)
                        ? "border-red-600 bg-red-50 text-red-700 font-bold"
                        : "border-gray-300 text-gray-700 hover:border-yellow-400"
                    }`}
                  >
                    {selectedStyles.includes(style) && "✓ "}
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* 席の種類フィルター */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                席の種類（複数選択可）
              </label>
              <div className="grid grid-cols-2 gap-2">
                {seatTypes.map((seat) => (
                  <button
                    key={seat}
                    onClick={() => toggleSeat(seat)}
                    className={`px-4 py-2 rounded-lg border-2 transition text-sm ${
                      selectedSeats.includes(seat)
                        ? "border-red-600 bg-red-50 text-red-700 font-bold"
                        : "border-gray-300 text-gray-700 hover:border-yellow-400"
                    }`}
                  >
                    {selectedSeats.includes(seat) && "✓ "}
                    {seat}
                  </button>
                ))}
              </div>
            </div>

            {/* 選択中のフィルター表示 */}
            {(selectedStyles.length > 0 || selectedSeats.length > 0) && (
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {selectedStyles.length + selectedSeats.length} 個の条件で絞り込み中
                  </p>
                  <button
                    onClick={() => {
                      setSelectedStyles([]);
                      setSelectedSeats([]);
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-bold"
                  >
                    すべてクリア
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 募集一覧 */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-700">読み込み中...</p>
            </div>
          ) : (
            <>
              {/* 検索結果の件数表示 */}
              <div className="mb-4">
                <p className="text-gray-700 font-bold">
                  {filteredRecruitments.length > 0 ? (
                    <>
                      <span className="text-2xl text-red-600">{filteredRecruitments.length}</span>{" "}
                      件の募集が見つかりました
                    </>
                  ) : (
                    "条件に一致する募集が見つかりません"
                  )}
                </p>
              </div>

              {filteredRecruitments.length > 0 ? (
                <div className="space-y-6">
                  {filteredRecruitments.map((recruitment) => (
                    <div
                      key={recruitment.id}
                      className="bg-white border-2 border-yellow-400 rounded-xl p-6 shadow-lg"
                    >
                      {/* 募集者情報 */}
                      <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="text-5xl">
                            {recruitment.recruiter.icon || "👤"}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-black">
                              {recruitment.recruiter.nickname}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              {recruitment.recruiter.gender && (
                                <span className="text-sm text-gray-600">
                                  {recruitment.recruiter.gender === "male"
                                    ? "👨 男性"
                                    : recruitment.recruiter.gender === "female"
                                    ? "👩 女性"
                                    : "その他"}
                                </span>
                              )}
                              {recruitment.recruiter.trustScore !== undefined && (
                                <div className="flex items-center gap-1">
                                  <span className="text-yellow-500">⭐</span>
                                  <span className="font-bold text-sm">
                                    {recruitment.recruiter.trustScore}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 試合情報 */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">⚽</span>
                          <h4 className="text-2xl font-bold text-black">
                            {recruitment.opponent}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>📅 {recruitment.date}</span>
                          <span>🕐 {recruitment.time}</span>
                          <span>📍 {recruitment.venue}</span>
                        </div>
                      </div>

                      {/* こだわり条件 */}
                      <div className="mb-4">
                        <p className="text-sm font-bold text-gray-700 mb-2">
                          こだわり条件:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {recruitment.conditions.map((condition, idx) => (
                            <span
                              key={idx}
                              className="bg-red-600 text-white px-3 py-1 rounded-full text-sm"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* メッセージ */}
                      <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                        <p className="text-sm font-bold text-gray-700 mb-1">
                          メッセージ:
                        </p>
                        <p className="text-gray-800">{recruitment.message}</p>
                      </div>

                      {/* アクション */}
                      {recruitment.requestSent ? (
                        <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg text-center font-bold">
                          リクエスト送信済み ✓
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(recruitment.id)}
                          className="w-full bg-red-600 text-white py-3 rounded-full font-bold hover:bg-red-700 transition text-lg"
                        >
                          参加リクエストを送る
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-12 text-center">
                  <p className="text-xl text-gray-600">
                    {searchTerm ||
                    genderFilter !== "all" ||
                    venueFilter !== "all" ||
                    selectedStyles.length > 0 ||
                    selectedSeats.length > 0
                      ? "条件に一致する募集が見つかりません。フィルターを変更してみてください。"
                      : "現在募集はありません"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
