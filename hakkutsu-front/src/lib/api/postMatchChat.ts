"use client";

import { ChatMessage, PostMatchChat, Restaurant } from "@/types/postMatchChat";
import { apiBase } from "@/lib/apiBase";

interface SendMessageInput {
  chatId: string;
  text: string;
  restaurant?: Restaurant;
}

interface BackendChatMessage {
  messageId: string;
  userId: string;
  nickname: string;
  icon?: string;
  text: string;
  restaurant?: {
    restaurantId: string;
    name: string;
    address: string;
    category: string;
    imageUrl: string;
    googleMapUrl: string;
    latitude: number;
    longitude: number;
    distance?: number;
  };
  createdAt: string;
  updatedAt?: string | null;
  isDeleted?: boolean;
}

interface BackendChat {
  chatId: string;
  matchId: string;
  opponent: string;
  date: string;
  startTime: string;
  endTime: string;
  isClosed: boolean;
  participantCount: number;
}

interface BackendChatResponse {
  chat: BackendChat;
  messages: BackendChatMessage[];
  userParticipation: {
    isParticipant: boolean;
    joinedAt: string;
    lastReadAt?: string | null;
  };
}

// バックエンドのRestaurant形式をフロントエンドの形式に変換
function mapRestaurant(backendRestaurant: any): Restaurant {
  return {
    restaurantId: backendRestaurant.restaurantId,
    name: backendRestaurant.name,
    address: backendRestaurant.address,
    imageUrl: backendRestaurant.imageUrl,
    googleMapUrl: backendRestaurant.googleMapUrl,
    latitude: backendRestaurant.latitude,
    longitude: backendRestaurant.longitude,
    category: backendRestaurant.category,
    distance: backendRestaurant.distance,
  };
}

// バックエンドのメッセージ形式をフロントエンドの形式に変換
function mapMessage(backendMessage: BackendChatMessage): ChatMessage {
  return {
    id: backendMessage.messageId,
    userId: backendMessage.userId,
    nickname: backendMessage.nickname,
    icon: backendMessage.icon,
    text: backendMessage.text,
    restaurant: backendMessage.restaurant ? mapRestaurant(backendMessage.restaurant) : undefined,
    timestamp: backendMessage.createdAt,
    isDeleted: backendMessage.isDeleted,
  };
}

// 試合後チャットの取得
export async function fetchPostMatchChat(matchId: string): Promise<PostMatchChat> {
  const base = apiBase();
  const token = localStorage.getItem("token");

  console.log("[fetchPostMatchChat] Request details:", {
    matchId,
    apiBase: base,
    hasToken: !!token,
    url: `${base}/matches/${matchId}/post-match-chat`,
  });

  if (!token) {
    throw new Error("認証が必要です");
  }

  const res = await fetch(`${base}/matches/${matchId}/post-match-chat`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("[fetchPostMatchChat] Response:", {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("[fetchPostMatchChat] Error response:", errorData);
    throw new Error(errorData.error || "チャット情報の取得に失敗しました");
  }

  const data: BackendChatResponse = await res.json();

  return {
    id: data.chat.chatId,
    matchId: data.chat.matchId,
    opponent: data.chat.opponent,
    date: data.chat.date,
    startTime: data.chat.startTime,
    endTime: data.chat.endTime,
    messages: data.messages.map(mapMessage),
    participants: [], // バックエンドから返されない場合は空配列
    isClosed: data.chat.isClosed,
  };
}

// メッセージ送信
export async function sendChatMessage(input: SendMessageInput): Promise<ChatMessage> {
  const base = apiBase();
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("認証が必要です");
  }

  console.log("[sendChatMessage] Sending:", {
    chatId: input.chatId,
    text: input.text,
    restaurant: input.restaurant,
  });

  const res = await fetch(`${base}/post-match-chats/${input.chatId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: input.text,
      restaurant: input.restaurant,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "メッセージの送信に失敗しました");
  }

  const data = await res.json();
  console.log("[sendChatMessage] Response:", data);

  // バックエンドのレスポンスには { message: {...} } という形式で返ってくる
  const mappedMessage = mapMessage(data.message);
  console.log("[sendChatMessage] Mapped message:", mappedMessage);

  return mappedMessage;
}

// 店舗共有状況の取得
export async function fetchRestaurantShares(chatId: string): Promise<{ restaurantId: string; count: number }[]> {
  const base = apiBase();
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("認証が必要です");
  }

  const res = await fetch(`${base}/post-match-chats/${chatId}/restaurant-shares`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "店舗共有状況の取得に失敗しました");
  }

  const data = await res.json();

  // バックエンドのレスポンス形式: { shares: [{ restaurant: {...}, shareCount: number, lastSharedAt: string }], totalShares: number }
  // フロントエンドの期待形式: { restaurantId: string; count: number }[]
  return (data.shares || []).map((share: any) => ({
    restaurantId: share.restaurant?.restaurantId || share.restaurantId,
    count: share.shareCount || share.count,
  }));
}
