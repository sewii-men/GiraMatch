"use client";

import { ChatMessage, Restaurant } from "@/types/postMatchChat";
import { useEffect, useRef, useState } from "react";
import MessageTemplateSelector from "./MessageTemplateSelector";

interface PostMatchChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, restaurant?: Restaurant) => Promise<void> | void;
  onUpdateMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  isClosed: boolean;
  attachedRestaurant?: Restaurant | null;
  onRemoveAttachedRestaurant?: () => void;
  isSending?: boolean;
  sendError?: string | null;
}

export default function PostMatchChat({
  messages,
  currentUserId,
  onSendMessage,
  onUpdateMessage,
  onDeleteMessage,
  isClosed,
  attachedRestaurant = null,
  onRemoveAttachedRestaurant,
  isSending = false,
  sendError = null,
}: PostMatchChatProps) {
  const [messageText, setMessageText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() && !attachedRestaurant) return;

    try {
      await onSendMessage(messageText, attachedRestaurant || undefined);
      setMessageText("");
      if (onRemoveAttachedRestaurant) {
        onRemoveAttachedRestaurant();
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleSelectTemplate = (template: string) => {
    setMessageText(template);
  };

  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !editingText.trim()) return;
    if (onUpdateMessage) {
      onUpdateMessage(editingMessageId, editingText);
    }
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleDeleteConfirm = (messageId: string) => {
    setDeletingMessageId(messageId);
  };

  const handleDeleteMessage = () => {
    if (!deletingMessageId) return;
    if (onDeleteMessage) {
      onDeleteMessage(deletingMessageId);
    }
    setDeletingMessageId(null);
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
          const isEditing = editingMessageId === message.id;
          const isDeleted = message.isDeleted;

          // 削除済みメッセージの表示
          if (isDeleted) {
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[70%] bg-gray-200 rounded-lg p-3 opacity-50">
                  <p className="text-gray-500 italic text-sm">このメッセージは削除されました</p>
                </div>
              </div>
            );
          }

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
                {isEditing ? (
                  <div className="mb-2">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit();
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      className="w-full px-2 py-1 border-2 border-yellow-400 rounded text-black"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-400 text-white rounded text-xs font-bold hover:bg-gray-500"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-black mb-1">{message.text}</p>
                )}

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

                {/* タイムスタンプと編集・削除ボタン */}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </p>
                  {isCurrentUser && !isEditing && !isClosed && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(message)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(message.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-bold"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 削除確認ダイアログ */}
      {deletingMessageId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-black mb-4">メッセージを削除しますか？</h3>
            <p className="text-sm text-gray-600 mb-6">
              この操作は取り消せません。削除されたメッセージは復元できません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingMessageId(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteMessage}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

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

      {sendError && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
          {sendError}
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
            disabled={isClosed || isSending}
          />
          <button
            onClick={handleSend}
            disabled={(!messageText.trim() && !attachedRestaurant) || isClosed || isSending}
            className={`px-6 py-2 rounded-lg font-bold transition ${
                (!messageText.trim() && !attachedRestaurant) || isClosed || isSending
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
          >
            {isSending ? "送信中..." : "送信"}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
