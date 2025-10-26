"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";
import RestaurantCard from "@/components/RestaurantCard";
import PostMatchChat from "@/components/PostMatchChat";
import RestaurantMap from "@/components/RestaurantMap";
import { PostMatchChatProvider, usePostMatchChat } from "@/lib/postMatchChatContext";
import { Restaurant } from "@/types/postMatchChat";
import { requestNotificationPermission, showChatNotification } from "@/lib/notifications";
import {
  fetchMockPostMatchChat,
  sendMockChatMessage,
} from "@/lib/mockApi/postMatchChat";

const MAP_FALLBACK_CENTER = {
  lat: 33.8834,
  lng: 130.8751,
};

interface PostMatchChatPageContentProps {
  restaurants: Restaurant[];
  restaurantsLoading: boolean;
  restaurantsError: string | null;
  onReloadRestaurants: () => void;
}

function PostMatchChatPageContent({
  restaurants,
  restaurantsLoading,
  restaurantsError,
  onReloadRestaurants,
}: PostMatchChatPageContentProps) {
  const { userId } = useAuth();
  const {
    chatId,
    opponent,
    isClosed,
    participantCount,
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    attachedRestaurant,
    setAttachedRestaurant,
    restaurantShares,
    unreadCount,
    markAsRead,
  } = usePostMatchChat();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [timeUntilClose, setTimeUntilClose] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // ページを開いたら既読にする
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // チャット終了までの時間を計算
  useEffect(() => {
    const updateTimeUntilClose = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const diff = endOfDay.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeUntilClose("終了");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilClose(`${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };

    updateTimeUntilClose();
    const interval = setInterval(updateTimeUntilClose, 1000);

    return () => clearInterval(interval);
  }, []);

  // 通知権限のリクエスト
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // 新しいメッセージの監視と通知
  useEffect(() => {
    if (messages.length === 0) return;
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.userId === (userId || "current_user") || latestMessage.isDeleted) {
      return;
    }
    if (document.hidden) {
      showChatNotification(latestMessage.nickname, latestMessage.text, () => {
        window.focus();
      });
    }
  }, [messages, userId]);

  const handleSendMessage = async (text: string, restaurant?: Restaurant) => {
    if (!chatId) {
      setSendError("チャットの初期化中です。少し待ってから再送信してください。");
      const error = new Error("Chat is not initialized");
      throw error;
    }

    setIsSending(true);
    setSendError(null);
    try {
      const newMessage = await sendMockChatMessage({
        chatId,
        userId: userId || "current_user",
        nickname: "あなた",
        icon: "😊",
        text,
        restaurant: restaurant || attachedRestaurant || undefined,
      });
      addMessage(newMessage);
    } catch (error) {
      console.error(error);
      setSendError("メッセージの送信に失敗しました。時間を置いて再度お試しください。");
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachRestaurant = (restaurant: Restaurant) => {
    setAttachedRestaurant(restaurant);
    setIsMobileMenuOpen(false);
  };

  const handleRemoveAttachedRestaurant = () => {
    setAttachedRestaurant(null);
  };

  const mapCenter = useMemo(() => {
    if (restaurants.length === 0) return MAP_FALLBACK_CENTER;
    return {
      lat: restaurants[0].latitude,
      lng: restaurants[0].longitude,
    };
  }, [restaurants]);

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
            {!isClosed && timeUntilClose !== "終了" && (
              <div className="text-right hidden md:block">
                <p className="text-xs text-gray-400">チャット終了まで</p>
                <p className="text-lg font-bold text-yellow-400 font-mono">{timeUntilClose}</p>
              </div>
            )}
            <div className="text-right hidden md:block">
              <p className="text-sm text-gray-300">参加者</p>
              <p className="text-xl font-bold text-yellow-400">{participantCount}人</p>
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

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {isClosed && (
          <div className="bg-gradient-to-r from-red-600 to-yellow-600 text-white rounded-xl shadow-lg p-6 mb-4 text-center">
            <h2 className="text-2xl font-bold mb-2">🍺 本日のギラ飲みチャットは終了しました 🍺</h2>
            <p className="text-lg">ご参加ありがとうございました！またのご参加をお待ちしています。</p>
            <p className="text-sm mt-2 opacity-90">メッセージは閲覧できますが、新しい投稿はできません。</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="md:hidden bg-gray-100 p-3 border-b-2 border-gray-200">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
            >
              {isMobileMenuOpen ? "チャットに戻る" : "近くの店舗を見る"}
            </button>
          </div>

          <div className="flex flex-col md:flex-row" style={{ height: "calc(100vh - 200px)" }}>
            <div
              className={`${isMobileMenuOpen ? "block" : "hidden"} md:block md:w-80 border-r-2 border-gray-200 overflow-y-auto p-4 space-y-4`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">近くの店舗</h2>
                <span className="text-xs text-gray-500">未読 {unreadCount}件</span>
              </div>

              {restaurantsLoading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="bg-gray-200 h-32 rounded-lg mb-3" />
                      <div className="h-4 bg-gray-200 rounded mb-2" />
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              )}

              {!restaurantsLoading && restaurantsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <p className="mb-2">{restaurantsError}</p>
                  <button
                    onClick={onReloadRestaurants}
                    className="w-full py-1.5 bg-red-600 text-white rounded font-bold hover:bg-red-700"
                  >
                    再読み込み
                  </button>
                </div>
              )}

              {!restaurantsLoading && !restaurantsError && restaurants.length === 0 && (
                <div className="text-sm text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
                  試合会場の近くに表示できる店舗が見つかりませんでした。
                </div>
              )}

              {!restaurantsLoading && !restaurantsError &&
                restaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    onAttachToMessage={handleAttachRestaurant}
                  />
                ))}
            </div>

            <div className={`${isMobileMenuOpen ? "hidden" : "flex"} md:flex flex-1 flex-col`}>
              <PostMatchChat
                messages={messages}
                currentUserId={userId || "current_user"}
                onSendMessage={handleSendMessage}
                onUpdateMessage={(messageId, newText) => updateMessage(messageId, { text: newText })}
                onDeleteMessage={deleteMessage}
                isClosed={isClosed}
                attachedRestaurant={attachedRestaurant}
                onRemoveAttachedRestaurant={handleRemoveAttachedRestaurant}
                isSending={isSending}
                sendError={sendError}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-bold">⚠ 注意:</span> このチャットは23:59に自動的に閉鎖されます。閉鎖後はメッセージの閲覧のみ可能です。
          </p>
        </div>
      </main>

      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
            <div className="bg-black text-white py-4 px-6 rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  <span className="text-yellow-400">🗺️ ギラ飲みマップ</span>
                </h2>
                <p className="text-sm text-gray-300">ギラヴァンツロゴがあるお店で誰かが飲んでいます！</p>
              </div>
              <button
                onClick={() => setShowMap(false)}
                className="text-white hover:text-yellow-400 transition text-3xl"
              >
                ✕
              </button>
            </div>

            <div className="flex-1">
              {restaurantsLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <p className="text-gray-600">店舗情報を読み込み中...</p>
                </div>
              ) : (
                <RestaurantMap
                  restaurants={restaurants}
                  restaurantShares={restaurantShares}
                  center={mapCenter}
                />
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-b-xl border-t-2 border-gray-200">
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white" />
                  <span className="text-gray-700">スタジアム</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded-full" />
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

function PostMatchChatInitializer({ matchId, userId }: { matchId: string; userId: string }) {
  const { initializeChat, chatId, clearChat } = usePostMatchChat();
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatReloadKey, setChatReloadKey] = useState(0);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [restaurantsError, setRestaurantsError] = useState<string | null>(null);
  const [restaurantsReloadKey, setRestaurantsReloadKey] = useState(0);

  useEffect(() => {
    let canceled = false;
    setChatLoading(true);
    (async () => {
      try {
        const chat = await fetchMockPostMatchChat(matchId, userId);
        console.log("[PostMatchChat] fetched chat", { chat });
        if (canceled) return;
        initializeChat(chat);
        setChatError(null);
      } catch (error) {
        console.error(error);
        if (!canceled) {
          setChatError("チャット情報の取得に失敗しました。再読み込みしてください。");
        }
      } finally {
        if (!canceled) {
          setChatLoading(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [matchId, userId, initializeChat, chatReloadKey]);

  useEffect(() => {
    let canceled = false;
    setRestaurantsLoading(true);
    const base = process.env.NEXT_PUBLIC_API_URL;

    (async () => {
      try {
        // First, fetch the initial list of restaurants
        const initialRes = await fetch(`${base}/restaurants`);
        if (!initialRes.ok) {
          throw new Error("店舗リストの取得に失敗しました。");
        }
        const initialList = await initialRes.json();

        if (canceled) return;

        // Now, enrich the list with details from Google Places API via our backend
        const enrichedRes = await fetch(`${base}/restaurants/details`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ restaurants: initialList }),
        });

        if (!enrichedRes.ok) {
          // If enrichment fails, still show the basic list
          console.warn("Google Placesでの店舗情報の詳細化に失敗しました。");
          setRestaurants(initialList);
          setRestaurantsError(null);
          return;
        }

        const enrichedList = await enrichedRes.json();
        if (canceled) return;

        setRestaurants(enrichedList);
        setRestaurantsError(null);

      } catch (error) {
        console.error("店舗情報の取得中に詳細なエラーが発生しました:", error);
        if (error instanceof Response) {
          console.error("レスポンスステータス:", error.status);
          error.json().then(body => {
            console.error("エラーレスポンスBody:", body);
          });
        }
        if (!canceled) {
          setRestaurantsError("店舗情報の取得に失敗しました。再読み込みしてください。");
        }
      } finally {
        if (!canceled) {
          setRestaurantsLoading(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [matchId, restaurantsReloadKey]);

  useEffect(() => {
    console.log("[PostMatchChat] state snapshot", {
      chatId,
      chatLoading,
      chatError,
      restaurantsLoading,
      restaurantsError,
      restaurantsCount: restaurants.length,
    });
  }, [chatId, chatLoading, chatError, restaurantsLoading, restaurantsError, restaurants]);

  useEffect(() => {
    return () => {
      clearChat();
    };
  }, [matchId, clearChat]);

  if (chatLoading && !chatId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex items-center justify-center">
        <p className="text-xl text-gray-600">ギラ飲みチャットを読み込み中...</p>
      </div>
    );
  }

  if (chatError && !chatId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg text-red-700 font-bold">{chatError}</p>
        <button
          onClick={() => setChatReloadKey((value) => value + 1)}
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (!chatId) {
    return null;
  }

  return (
    <PostMatchChatPageContent
      restaurants={restaurants}
      restaurantsLoading={restaurantsLoading}
      restaurantsError={restaurantsError}
      onReloadRestaurants={() => setRestaurantsReloadKey((value) => value + 1)}
    />
  );
}
