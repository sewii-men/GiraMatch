// ギラ飲みチャット機能の型定義

export interface Restaurant {
  restaurantId: string;
  name: string;
  address: string;
  imageUrl: string;
  googleMapUrl: string;
  latitude: number;
  longitude: number;
  category: "izakaya" | "cafe" | "ramen" | "other";
  distance?: number; // 会場からの距離（メートル）
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  icon?: string;
  text: string;
  restaurant?: Restaurant;
  timestamp: string;
  isDeleted?: boolean;
}

export interface PostMatchChat {
  id: string;
  matchId: string;
  opponent: string;
  date: string;
  startTime: string;
  endTime: string;
  messages: ChatMessage[];
  participants: string[];
  isClosed: boolean;
}

export interface RestaurantShare {
  restaurantId: string;
  count: number;
  lastSharedAt: string;
}

// メッセージテンプレート
export const MESSAGE_TEMPLATES = [
  "僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！",
  "この店でギラ飲みしませんか？一緒に今日の試合を振り返りましょう！",
  "ここに向かってます！合流したい人は連絡ください！",
  "この店で乾杯！！今日の勝利を祝いましょう！",
  "今からここで飲みます。誰か来ませんか？",
];
