"use client";

import { ChatMessage, PostMatchChat, Restaurant } from "@/types/postMatchChat";

interface FetchRestaurantOptions {
  category?: Restaurant["category"];
  limit?: number;
}

interface SendMockMessageInput {
  chatId: string;
  userId: string;
  nickname: string;
  icon?: string;
  text: string;
  restaurant?: Restaurant;
}

interface RestaurantShareCount {
  restaurantId: string;
  count: number;
  lastSharedAt: string;
}

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: "rest_001",
    name: "居酒屋 ギラ",
    address: "福岡県北九州市小倉北区浅野3-8-1",
    imageUrl: "https://placehold.co/300x200/yellow/black?text=Izakaya+Gira",
    googleMapUrl: "https://maps.google.com/?q=33.8834,130.8751",
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
    googleMapUrl: "https://maps.google.com/?q=33.8840,130.8760",
    latitude: 33.884,
    longitude: 130.876,
    category: "izakaya",
    distance: 300,
  },
  {
    id: "rest_003",
    name: "スタジアムカフェ",
    address: "福岡県北九州市小倉北区浅野3-9-30",
    imageUrl: "https://placehold.co/300x200/blue/white?text=Stadium+Cafe",
    googleMapUrl: "https://maps.google.com/?q=33.8828,130.8748",
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
    googleMapUrl: "https://maps.google.com/?q=33.8845,130.8765",
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
    googleMapUrl: "https://maps.google.com/?q=33.8832,130.8755",
    latitude: 33.8832,
    longitude: 130.8755,
    category: "other",
    distance: 220,
  },
];

let mockChat: PostMatchChat | null = null;
let mockMessages: ChatMessage[] = [];

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const createInitialMessages = (currentUserId: string): ChatMessage[] => {
  const baseTime = Date.now();
  return [
    {
      id: "msg_001",
      userId: "user_001",
      nickname: "太郎",
      icon: "👨",
      text: "今日の試合最高でした！！",
      timestamp: new Date(baseTime - 3600000).toISOString(),
    },
    {
      id: "msg_002",
      userId: "user_002",
      nickname: "花子",
      icon: "👩",
      text: "本当に感動しました！勝ててよかった！",
      timestamp: new Date(baseTime - 3500000).toISOString(),
    },
    {
      id: "msg_003",
      userId: "user_003",
      nickname: "次郎",
      icon: "👤",
      text: "僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！",
      restaurant: MOCK_RESTAURANTS[0],
      timestamp: new Date(baseTime - 3000000).toISOString(),
    },
    {
      id: "msg_004",
      userId: currentUserId,
      nickname: "あなた",
      icon: "😊",
      text: "いいですね！参加したいです！",
      timestamp: new Date(baseTime - 2500000).toISOString(),
    },
    {
      id: "msg_005",
      userId: "user_004",
      nickname: "三郎",
      icon: "👦",
      text: "このラーメン屋も美味しいですよ！",
      restaurant: MOCK_RESTAURANTS[3],
      timestamp: new Date(baseTime - 2000000).toISOString(),
    },
  ];
};

const ensureMockChat = (matchId: string, currentUserId: string): void => {
  if (mockChat && mockChat.matchId === matchId) return;

  mockMessages = createInitialMessages(currentUserId);
  mockChat = {
    id: `chat_${matchId}`,
    matchId,
    opponent: "vs 鹿児島ユナイテッドFC",
    date: new Date().toISOString().split("T")[0],
    startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endTime: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
    isClosed: false,
    participants: ["user_001", "user_002", "user_003", currentUserId, "user_004"],
    messages: mockMessages,
  };
};

export async function fetchMockRestaurants(
  matchId: string,
  options: FetchRestaurantOptions = {}
): Promise<Restaurant[]> {
  await delay();
  const base = [...MOCK_RESTAURANTS];
  const filtered = options.category ? base.filter((r) => r.category === options.category) : base;
  return options.limit ? filtered.slice(0, options.limit) : filtered;
}

export async function fetchMockPostMatchChat(
  matchId: string,
  currentUserId: string
): Promise<PostMatchChat> {
  ensureMockChat(matchId, currentUserId);
  await delay();
  if (!mockChat) {
    throw new Error("Mock chat could not be initialized");
  }
  return { ...mockChat, messages: [...mockMessages] };
}

export async function sendMockChatMessage(input: SendMockMessageInput): Promise<ChatMessage> {
  ensureMockChat(input.chatId.replace("chat_", ""), input.userId);
  if (!mockChat) {
    throw new Error("Chat is not initialized");
  }

  await delay(250);

  const message: ChatMessage = {
    id: `msg_${Date.now()}`,
    userId: input.userId,
    nickname: input.nickname,
    icon: input.icon,
    text: input.text,
    restaurant: input.restaurant,
    timestamp: new Date().toISOString(),
  };

  mockMessages = [...mockMessages, message];
  mockChat = { ...mockChat, messages: mockMessages };
  return message;
}

export async function fetchMockRestaurantShares(): Promise<RestaurantShareCount[]> {
  await delay(200);
  const map = new Map<string, RestaurantShareCount>();

  mockMessages.forEach((message) => {
    if (!message.restaurant) return;
    const existing = map.get(message.restaurant.id);
    if (!existing) {
      map.set(message.restaurant.id, {
        restaurantId: message.restaurant.id,
        count: 1,
        lastSharedAt: message.timestamp,
      });
      return;
    }
    map.set(message.restaurant.id, {
      ...existing,
      count: existing.count + 1,
      lastSharedAt: message.timestamp,
    });
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function resetMockChatState() {
  mockChat = null;
  mockMessages = [];
}
