"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Match {
  matchId: string;
  date: string;
  time: string;
  opponent: string;
  venue: string;
  status: string;
}

interface Chat {
  chatId: string;
  matchId: string;
  partner: {
    id: string;
    name: string;
    icon: string;
  };
}

interface CheckIn {
  id: string;
  date: string;
  time: string;
  opponent: string;
  myCheckIn: boolean;
  partnerCheckedIn: boolean;
}

interface Recruitment {
  id: string;
  matchId: string;
  matchName: string;
  opponent: string;
  date: string;
  time: string;
  conditions: string[];
  message: string;
  requestCount: number;
  createdAt: string;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [pendingCheckIns, setPendingCheckIns] = useState<CheckIn[]>([]);
  const [recentRecruitments, setRecentRecruitments] = useState<Recruitment[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      setIsLoggedIn(true);
      setUserName(userId);
      fetchDashboardData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async (token: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;

      // 試合一覧取得
      const matchesRes = await fetch(`${base}/matches`);
      const matchesData = await matchesRes.json();
      const upcoming = matchesData
        .filter((m: Match) => m.status === "募集中" || m.status === "scheduled")
        .slice(0, 3);
      setUpcomingMatches(upcoming);

      // チャット一覧取得
      const chatsRes = await fetch(`${base}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setActiveChats(chatsData.slice(0, 3));
      }

      // 来場チェック一覧取得
      const checkInsRes = await fetch(`${base}/check-ins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (checkInsRes.ok) {
        const checkInsData = await checkInsRes.json();
        const pending = checkInsData.filter((c: CheckIn) => !c.myCheckIn);
        setPendingCheckIns(pending.slice(0, 3));
      }

      // 最近の募集取得
      const recruitmentsRes = await fetch(`${base}/matching/my-recruitments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (recruitmentsRes.ok) {
        const recruitmentsData = await recruitmentsRes.json();
        setRecentRecruitments(recruitmentsData.slice(0, 3));
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex items-center justify-center">
        <p className="text-xl text-gray-800">読み込み中...</p>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
        {/* ダッシュボード */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* ウェルカムメッセージ */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-black mb-2">
              おかえりなさい、{userName}さん
            </h1>
            <p className="text-gray-700">今日もギラヴァンツを応援しましょう！</p>
          </div>

          {/* クイックアクション */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <Link
              href="/matches?mode=recruit"
              className="bg-red-600 text-white p-6 rounded-xl shadow-lg hover:bg-red-700 transition"
            >
              <div className="text-3xl mb-2">📢</div>
              <h3 className="text-xl font-bold mb-1">仲間を募集</h3>
              <p className="text-sm opacity-90">一緒に観戦する仲間を探す</p>
            </Link>
            <Link
              href="/recruitments"
              className="bg-yellow-400 text-black p-6 rounded-xl shadow-lg hover:bg-yellow-500 transition"
            >
              <div className="text-3xl mb-2">🙋</div>
              <h3 className="text-xl font-bold mb-1">試合に参加</h3>
              <p className="text-sm">募集に参加して観戦しよう</p>
            </Link>
            <Link
              href="/my-recruitments"
              className="bg-white text-black p-6 rounded-xl shadow-lg hover:bg-gray-50 transition border-2 border-yellow-400"
            >
              <div className="text-3xl mb-2">📋</div>
              <h3 className="text-xl font-bold mb-1">マイ募集</h3>
              <p className="text-sm text-gray-600">自分の募集を管理</p>
            </Link>
            <Link
              href="/chat"
              className="bg-white text-black p-6 rounded-xl shadow-lg hover:bg-gray-50 transition border-2 border-yellow-400"
            >
              <div className="text-3xl mb-2">💬</div>
              <h3 className="text-xl font-bold mb-1">チャット</h3>
              <p className="text-sm text-gray-600">マッチした仲間と話そう</p>
            </Link>
          </div>

          {/* 近日開催の試合 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-black">近日開催の試合</h2>
              <Link href="/matches" className="text-red-600 font-bold hover:underline">
                すべて見る
              </Link>
            </div>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <Link
                    key={match.matchId}
                    href={`/matching/${match.matchId}`}
                    className="block p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-black">{match.opponent}</p>
                        <p className="text-sm text-gray-600">
                          {match.date} {match.time}
                        </p>
                      </div>
                      <div className="text-red-600 font-bold text-sm">
                        {match.status}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">近日開催の試合はありません</p>
            )}
          </div>

          {/* 進行中のチャット */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-black">進行中のチャット</h2>
              <Link href="/chat" className="text-red-600 font-bold hover:underline">
                すべて見る
              </Link>
            </div>
            {activeChats.length > 0 ? (
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <Link
                    key={chat.chatId}
                    href={`/chat/${chat.chatId}`}
                    className="block p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{chat.partner.icon}</div>
                      <div>
                        <p className="font-bold text-black">{chat.partner.name}</p>
                        <p className="text-sm text-gray-600">クリックしてメッセージを見る</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">進行中のチャットはありません</p>
            )}
          </div>

          {/* 最近の募集 */}
          {recentRecruitments.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">最近の募集</h2>
                <Link href="/my-recruitments" className="text-red-600 font-bold hover:underline">
                  すべて見る
                </Link>
              </div>
              <div className="space-y-3">
                {recentRecruitments.map((recruitment) => (
                  <div
                    key={recruitment.id}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-black text-lg">{recruitment.opponent}</p>
                        <p className="text-sm text-gray-600">
                          {recruitment.date} {recruitment.time}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {recruitment.conditions.slice(0, 3).map((condition, idx) => (
                            <span
                              key={idx}
                              className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs"
                            >
                              {condition}
                            </span>
                          ))}
                          {recruitment.conditions.length > 3 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{recruitment.conditions.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="bg-yellow-400 text-black px-4 py-2 rounded-full font-bold mb-2">
                          {recruitment.requestCount} 件
                        </div>
                        <Link
                          href={`/my-recruitments/${recruitment.id}/requests`}
                          className="inline-block bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition"
                        >
                          リクエスト一覧
                        </Link>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {recruitment.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 来場チェックが必要な試合 */}
          {pendingCheckIns.length > 0 && (
            <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-2 border-yellow-400">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">来場チェックが必要な試合</h2>
                <Link href="/check-in" className="text-red-600 font-bold hover:underline">
                  すべて見る
                </Link>
              </div>
              <div className="space-y-3">
                {pendingCheckIns.map((checkIn) => (
                  <Link
                    key={checkIn.id}
                    href="/check-in"
                    className="block p-4 bg-white rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-black">{checkIn.opponent}</p>
                        <p className="text-sm text-gray-600">
                          {checkIn.date} {checkIn.time}
                        </p>
                      </div>
                      <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        チェックイン
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      {/* ヘッダー */}
      {/* ヘッダーは NavBar に置き換え済み */}

      {/* ヒーローセクション */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-black mb-6">
            仲間と一緒に<br />
            <span className="text-red-600">ギラヴァンツ北九州</span>を応援しよう
          </h2>
          <p className="text-xl text-gray-800 mb-8">
            サッカー観戦 × マッチング<br />
            同じ熱量で応援する仲間と出会える新しい観戦体験
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/matches" className="inline-block bg-red-600 text-white text-xl font-bold px-8 py-4 rounded-full hover:bg-red-700 transition shadow-lg">
              試合を探す
            </Link>
            <Link href="/login" className="inline-block bg-white text-black text-xl font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition shadow-lg">
              ログイン
            </Link>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-black">
            Giraventの特徴
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* 試合選択 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">⚽</div>
              <h4 className="text-xl font-bold mb-2 text-black">試合を選ぶ</h4>
              <p className="text-gray-700">
                ホーム戦から観戦したい試合を選択。同行募集か参加希望を選べます。
              </p>
            </div>

            {/* マッチング */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">🤝</div>
              <h4 className="text-xl font-bold mb-2 text-black">仲間を見つける</h4>
              <p className="text-gray-700">
                応援スタイルと席の希望が合う仲間を自動マッチング。気になる人にリクエスト送信。
              </p>
            </div>

            {/* チャット */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">💬</div>
              <h4 className="text-xl font-bold mb-2 text-black">チャットで相談</h4>
              <p className="text-gray-700">
                承認後に1対1チャット開始。待ち合わせ場所や時間をテンプレで簡単相談。
              </p>
            </div>

            {/* 来場チェック */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">📍</div>
              <h4 className="text-xl font-bold mb-2 text-black">来場チェック</h4>
              <p className="text-gray-700">
                スタジアムに到着したら手動でチェック。同行者の来場状況もリアルタイムで確認。
              </p>
            </div>

            {/* 事後評価 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">⭐</div>
              <h4 className="text-xl font-bold mb-2 text-black">感謝を伝える</h4>
              <p className="text-gray-700">
                試合後に同行者へ星評価と感謝のメッセージ。信頼スコアで安心・安全。
              </p>
            </div>

            {/* 安心・安全 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="text-xl font-bold mb-2 text-black">安心・安全</h4>
              <p className="text-gray-700">
                SMS認証と信頼スコアで安心。承認制チャットで自分のペースで交流。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-yellow-100">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-black">
            使い方はカンタン5ステップ
          </h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">試合を選ぶ</h4>
                <p className="text-gray-700">観戦したいホーム戦を選択</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">マッチング</h4>
                <p className="text-gray-700">応援スタイルと席の希望を選択して仲間を探す</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">チャットで相談</h4>
                <p className="text-gray-700">待ち合わせ場所や時間を相談</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">来場チェック</h4>
                <p className="text-gray-700">スタジアムに到着したらチェック</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">感謝を伝える</h4>
                <p className="text-gray-700">試合後に星評価とメッセージで感謝を伝える</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-black text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-6">
            さあ、一緒にギラヴァンツを応援しよう
          </h3>
          <Link
            href="/matches"
            className="inline-block bg-yellow-400 text-black text-xl font-bold px-12 py-4 rounded-full hover:bg-yellow-500 transition shadow-lg"
          >
            試合を探す
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center">
        <p>&copy; 2025 Giravent - ギラヴァンツ北九州ファン創出アプリ</p>
      </footer>
    </div>
  );
}
