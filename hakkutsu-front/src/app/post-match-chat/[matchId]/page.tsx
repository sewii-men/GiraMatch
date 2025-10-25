"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";
import RestaurantCard from "@/components/RestaurantCard";
import PostMatchChat from "@/components/PostMatchChat";
import RestaurantMap from "@/components/RestaurantMap";
import { PostMatchChatProvider, usePostMatchChat } from "@/lib/postMatchChatContext";
import { Restaurant, ChatMessage, PostMatchChat as PostMatchChatType } from "@/types/postMatchChat";

// ダミーデータ
const DUMMY_RESTAURANTS: Restaurant[] = [
  {
    id: "rest_001",
    name: "居酒屋 ギラ",
    address: "福岡県北九州市小倉北区浅野3-8-1",
    imageUrl: "https://placehold.co/300x200/yellow/black?text=Izakaya+Gira",
    googleMapUrl: "https://maps.google.com/?q=居酒屋ギラ,北九州",
    latitude: 33.8834,
    longitude: 130.8751,
    category: "izakaya",
    distance: 250,
  },
  {
    id: "rest_002",
    name: "焼き鳥 北九",
    address: "福岡県北九州市小倉北区浅野2-14-2",
    imageUrl: "https://placehold.co/300x200/red/white?text=Yakitori+Hokukyu",
    googleMapUrl: "https://maps.google.com/?q=焼き鳥北九,北九州",
    latitude: 33.8840,
    longitude: 130.8760,
    category: "izakaya",
    distance: 300,
  },
  {
    id: "rest_003",
    name: "スタジアムカフェ",
    address: "福岡県北九州市小倉北区浅野3-9-30",
    imageUrl: "https://placehold.co/300x200/blue/white?text=Stadium+Cafe",
    googleMapUrl: "https://maps.google.com/?q=スタジアムカフェ,北九州",
    latitude: 33.8828,
    longitude: 130.8748,
    category: "cafe",
    distance: 180,
  },
  {
    id: "rest_004",
    name: "ラーメン ギラ軒",
    address: "福岡県北九州市小倉北区浅野2-10-1",
    imageUrl: "https://placehold.co/300x200/orange/white?text=Ramen+Giraken",
    googleMapUrl: "https://maps.google.com/?q=ラーメンギラ軒,北九州",
    latitude: 33.8845,
    longitude: 130.8765,
    category: "ramen",
    distance: 350,
  },
  {
    id: "rest_005",
    name: "バル デ ギラヴァンツ",
    address: "福岡県北九州市小倉北区浅野3-7-1",
    imageUrl: "https://placehold.co/300x200/green/white?text=Bar+de+Giravanz",
    googleMapUrl: "https://maps.google.com/?q=バルデギラヴァンツ,北九州",
    latitude: 33.8832,
    longitude: 130.8755,
    category: "other",
    distance: 220,
  },
];

// ダミーメッセージは関数内で生成（現在のユーザーIDを使用するため）
const getDummyMessages = (currentUserId: string): ChatMessage[] => [
  {
    id: "msg_001",
    userId: "user_001",
    nickname: "太郎",
    icon: "👨",
    text: "今日の試合最高でした！！",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "msg_002",
    userId: "user_002",
    nickname: "花子",
    icon: "👩",
    text: "本当に感動しました！勝ててよかった！",
    timestamp: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: "msg_003",
    userId: "user_003",
    nickname: "次郎",
    icon: "👤",
    text: "僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！",
    restaurant: DUMMY_RESTAURANTS[0],
    timestamp: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: "msg_004",
    userId: currentUserId,
    nickname: "あなた",
    icon: "😊",
    text: "いいですね！参加したいです！",
    timestamp: new Date(Date.now() - 2500000).toISOString(),
  },
  {
    id: "msg_005",
    userId: "user_004",
    nickname: "三郎",
    icon: "👦",
    text: "このラーメン屋も美味しいですよ！",
    restaurant: DUMMY_RESTAURANTS[3],
    timestamp: new Date(Date.now() - 2000000).toISOString(),
  },
];

// 内部コンポーネント（Context内で動作）
function PostMatchChatPageContent() {
  const { userId } = useAuth();
  const {
    opponent,
    isClosed,
    participantCount,
    messages,
    addMessage,
    attachedRestaurant,
    setAttachedRestaurant,
    restaurantShares,
  } = usePostMatchChat();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleSendMessage = (text: string, restaurant?: Restaurant) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      userId: userId || "current_user",
      nickname: "あなた",
      icon: "😊",
      text,
      restaurant: restaurant || attachedRestaurant || undefined,
      timestamp: new Date().toISOString(),
    };

    addMessage(newMessage);
  };

  const handleAttachRestaurant = (restaurant: Restaurant) => {
    setAttachedRestaurant(restaurant);
    // モバイルの場合はメニューを閉じる
    setIsMobileMenuOpen(false);
  };

  const handleRemoveAttachedRestaurant = () => {
    setAttachedRestaurant(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      <AuthGuard />

      {/* ヘッダー */}
      <header className="bg-black text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-yellow-400">ギラ飲みチャット</span>
            </h1>
            <p className="text-sm text-gray-300">{opponent}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm text-gray-300">参加者</p>
              <p className="text-xl font-bold text-yellow-400">
                {participantCount}人
              </p>
            </div>
            <button
              onClick={() => setShowMap(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
            >
              🗺️ Map
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-bold hover:bg-yellow-500 transition"
            >
              ダッシュボード
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* モバイル用: 店舗リスト切り替えボタン */}
          <div className="md:hidden bg-gray-100 p-3 border-b-2 border-gray-200">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
            >
              {isMobileMenuOpen ? "チャットに戻る" : "近くの店舗を見る"}
            </button>
          </div>

          {/* 2カラムレイアウト */}
          <div className="flex flex-col md:flex-row" style={{ height: "calc(100vh - 200px)" }}>
            {/* 左カラム: 店舗リスト */}
            <div
              className={`${
                isMobileMenuOpen ? "block" : "hidden"
              } md:block md:w-80 border-r-2 border-gray-200 overflow-y-auto p-4 space-y-4`}
            >
              <h2 className="text-xl font-bold text-black mb-4">
                近くの店舗
              </h2>
              {DUMMY_RESTAURANTS.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onAttachToMessage={handleAttachRestaurant}
                />
              ))}
            </div>

            {/* 右カラム: チャット */}
            <div className={`${isMobileMenuOpen ? "hidden" : "flex"} md:flex flex-1 flex-col`}>
              <PostMatchChat
                messages={messages}
                currentUserId={userId || "current_user"}
                onSendMessage={handleSendMessage}
                isClosed={isClosed}
                attachedRestaurant={attachedRestaurant}
                onRemoveAttachedRestaurant={handleRemoveAttachedRestaurant}
              />
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-bold">⚠ 注意:</span> このチャットは23:59に自動的に閉鎖されます。
            閉鎖後はメッセージの閲覧のみ可能です。
          </p>
        </div>
      </main>

      {/* Map モーダル */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
            {/* モーダルヘッダー */}
            <div className="bg-black text-white py-4 px-6 rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  <span className="text-yellow-400">🗺️ ギラ飲みマップ</span>
                </h2>
                <p className="text-sm text-gray-300">
                  ギラヴァンツロゴがあるお店で誰かが飲んでいます！
                </p>
              </div>
              <button
                onClick={() => setShowMap(false)}
                className="text-white hover:text-yellow-400 transition text-3xl"
              >
                ✕
              </button>
            </div>

            {/* Map本体 */}
            <div className="flex-1">
              <RestaurantMap
                restaurants={DUMMY_RESTAURANTS}
                restaurantShares={restaurantShares}
                center={{
                  lat: 33.8834,
                  lng: 130.8751,
                }}
              />
            </div>

            {/* 凡例 */}
            <div className="bg-gray-50 p-4 rounded-b-xl border-t-2 border-gray-200">
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white"></div>
                  <span className="text-gray-700">スタジアム</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-700">店舗</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚽</span>
                  <span className="text-gray-700">ギラ飲み中の店舗</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 外部コンポーネント（Providerでラップ）
export default function PostMatchChatPage() {
  const params = useParams();
  const matchId = params?.matchId as string;
  const { userId } = useAuth();

  return (
    <PostMatchChatProvider>
      <PostMatchChatInitializer matchId={matchId} userId={userId || "current_user"} />
    </PostMatchChatProvider>
  );
}

// 初期化コンポーネント（Context内でinitializeChatを呼び出す）
function PostMatchChatInitializer({ matchId, userId }: { matchId: string; userId: string }) {
  const { initializeChat, chatId } = usePostMatchChat();

  useEffect(() => {
    // 初回のみ初期化（chatIdが未設定の場合）
    if (!chatId) {
      const dummyChat: PostMatchChatType = {
        id: `chat_${matchId}`,
        matchId: matchId,
        opponent: "vs 鹿児島ユナイテッドFC",
        date: new Date().toISOString().split("T")[0],
        startTime: new Date().toISOString(),
        endTime: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
        isClosed: false,
        participants: ["user_001", "user_002", "user_003", userId, "user_004"],
        messages: getDummyMessages(userId),
      };

      initializeChat(dummyChat);
    }
  }, [chatId, matchId, userId, initializeChat]);

  // 初期化が完了するまで待つ
  if (!chatId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex items-center justify-center">
        <p className="text-xl text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return <PostMatchChatPageContent />;
}
