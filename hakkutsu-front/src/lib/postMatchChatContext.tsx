"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ChatMessage, PostMatchChat, Restaurant } from "@/types/postMatchChat";

interface PostMatchChatContextType {
  // チャット情報
  chatId: string | null;
  matchId: string | null;
  opponent: string;
  isClosed: boolean;
  participantCount: number;

  // メッセージ
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (messageId: string) => void;

  // 店舗付与
  attachedRestaurant: Restaurant | null;
  setAttachedRestaurant: (restaurant: Restaurant | null) => void;

  // 店舗共有状況
  restaurantShares: { restaurantId: string; count: number }[];

  // 初期化
  initializeChat: (chat: PostMatchChat) => void;
  clearChat: () => void;
}

const PostMatchChatContext = createContext<PostMatchChatContextType | undefined>(undefined);

interface PostMatchChatProviderProps {
  children: React.ReactNode;
}

export function PostMatchChatProvider({ children }: PostMatchChatProviderProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<string>("");
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachedRestaurant, setAttachedRestaurant] = useState<Restaurant | null>(null);

  // ローカルストレージキーの生成
  const getStorageKey = useCallback((chatId: string) => {
    return `post_match_chat_${chatId}`;
  }, []);

  // ローカルストレージからの復元
  useEffect(() => {
    if (!chatId) return;

    const storageKey = getStorageKey(chatId);
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const data = JSON.parse(stored);
        setMessages(data.messages || []);
      } catch (error) {
        console.error("Failed to restore chat from localStorage:", error);
      }
    }
  }, [chatId, getStorageKey]);

  // ローカルストレージへの保存
  useEffect(() => {
    if (!chatId || messages.length === 0) return;

    const storageKey = getStorageKey(chatId);
    const data = {
      chatId,
      matchId,
      messages,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save chat to localStorage:", error);
    }
  }, [chatId, matchId, messages, getStorageKey]);

  // メッセージ追加
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // メッセージ更新
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    );
  }, []);

  // メッセージ削除（論理削除）
  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isDeleted: true } : msg
      )
    );
  }, []);

  // 店舗共有状況の計算
  const restaurantShares = useMemo(() => {
    const shareMap = new Map<string, number>();

    messages.forEach((msg) => {
      if (msg.restaurant && !msg.isDeleted) {
        const currentCount = shareMap.get(msg.restaurant.id) || 0;
        shareMap.set(msg.restaurant.id, currentCount + 1);
      }
    });

    return Array.from(shareMap.entries())
      .map(([restaurantId, count]) => ({
        restaurantId,
        count,
      }))
      .sort((a, b) => b.count - a.count); // 共有数の多い順
  }, [messages]);

  // チャット初期化
  const initializeChat = useCallback((chat: PostMatchChat) => {
    setChatId(chat.id);
    setMatchId(chat.matchId);
    setOpponent(chat.opponent);
    setIsClosed(chat.isClosed);
    setParticipantCount(chat.participants.length);
    setMessages(chat.messages || []);
  }, []);

  // チャットクリア
  const clearChat = useCallback(() => {
    if (chatId) {
      const storageKey = getStorageKey(chatId);
      localStorage.removeItem(storageKey);
    }

    setChatId(null);
    setMatchId(null);
    setOpponent("");
    setIsClosed(false);
    setParticipantCount(0);
    setMessages([]);
    setAttachedRestaurant(null);
  }, [chatId, getStorageKey]);

  const value = useMemo(
    () => ({
      chatId,
      matchId,
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
      initializeChat,
      clearChat,
    }),
    [
      chatId,
      matchId,
      opponent,
      isClosed,
      participantCount,
      messages,
      addMessage,
      updateMessage,
      deleteMessage,
      attachedRestaurant,
      restaurantShares,
      initializeChat,
      clearChat,
    ]
  );

  return (
    <PostMatchChatContext.Provider value={value}>
      {children}
    </PostMatchChatContext.Provider>
  );
}

export function usePostMatchChat() {
  const context = useContext(PostMatchChatContext);
  if (!context) {
    throw new Error("usePostMatchChat must be used within PostMatchChatProvider");
  }
  return context;
}
