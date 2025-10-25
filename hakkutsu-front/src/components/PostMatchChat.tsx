"use client";

import { ChatMessage, Restaurant } from "@/types/postMatchChat";
import { useEffect, useRef, useState } from "react";
import MessageTemplateSelector from "./MessageTemplateSelector";

interface PostMatchChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, restaurant?: Restaurant) => void;
  isClosed: boolean;
  attachedRestaurant?: Restaurant | null;
  onRemoveAttachedRestaurant?: () => void;
}

export default function PostMatchChat({
  messages,
  currentUserId,
  onSendMessage,
  isClosed,
  attachedRestaurant = null,
  onRemoveAttachedRestaurant,
}: PostMatchChatProps) {
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() && !attachedRestaurant) return;

    onSendMessage(messageText, attachedRestaurant || undefined);
    setMessageText("");
    if (onRemoveAttachedRestaurant) {
      onRemoveAttachedRestaurant();
    }
  };

  const handleSelectTemplate = (template: string) => {
    setMessageText(template);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* チャットメッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.userId === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] ${
                  isCurrentUser ? "bg-red-100" : "bg-gray-100"
                } rounded-lg p-3`}
              >
                {/* ユーザー情報 */}
                {!isCurrentUser && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{message.icon || "👤"}</span>
                    <span className="text-sm font-bold text-gray-700">
                      {message.nickname}
                    </span>
                  </div>
                )}

                {/* メッセージ本文 */}
                <p className="text-black mb-1">{message.text}</p>

                {/* 店舗情報（付与されている場合） */}
                {message.restaurant && (
                  <div className="mt-2 bg-white rounded-lg p-2 border-2 border-yellow-400">
                    <div className="flex items-center gap-2">
                      <img
                        src={message.restaurant.imageUrl}
                        alt={message.restaurant.name}
                        className="w-12 h-12 rounded object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23ddd' width='50' height='50'/%3E%3C/svg%3E";
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-black">
                          {message.restaurant.name}
                        </p>
                        <a
                          href={message.restaurant.googleMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-600 hover:underline"
                        >
                          地図を開く →
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* タイムスタンプ */}
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t-2 border-gray-200 p-4 bg-white">
        {/* チャット閉鎖メッセージ */}
        {isClosed && (
          <div className="mb-3 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-center text-sm">
            このチャットは終了しました
          </div>
        )}

        {/* 付与された店舗プレビュー */}
        {attachedRestaurant && (
          <div className="mb-2 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={attachedRestaurant.imageUrl}
                alt={attachedRestaurant.name}
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23ddd' width='50' height='50'/%3E%3C/svg%3E";
                }}
              />
              <p className="text-sm font-bold text-black">
                {attachedRestaurant.name}
              </p>
            </div>
            <button
              onClick={onRemoveAttachedRestaurant}
              className="text-red-600 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 入力フォーム */}
        {!isClosed && (
          <div className="flex gap-2">
            <MessageTemplateSelector onSelectTemplate={handleSelectTemplate} />
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力..."
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-600 focus:outline-none text-black"
              disabled={isClosed}
            />
            <button
              onClick={handleSend}
              disabled={(!messageText.trim() && !attachedRestaurant) || isClosed}
              className={`px-6 py-2 rounded-lg font-bold transition ${
                (!messageText.trim() && !attachedRestaurant) || isClosed
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              送信
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
