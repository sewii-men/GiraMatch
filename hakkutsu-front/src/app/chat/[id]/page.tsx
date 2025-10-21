"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

// モックデータ
const partner = {
  id: 1,
  name: "サッカー太郎",
  icon: "⚽",
};

const initialMessages = [
  {
    id: 1,
    senderId: 1,
    text: "はじめまして!一緒に観戦できるの楽しみです!",
    timestamp: "14:30",
    isMe: false,
  },
  {
    id: 2,
    senderId: 2,
    text: "こちらこそよろしくお願いします!",
    timestamp: "14:32",
    isMe: true,
  },
  {
    id: 3,
    senderId: 1,
    text: "待ち合わせ場所はどこがいいですか?",
    timestamp: "14:35",
    isMe: false,
  },
];

const templates = [
  "小倉駅で集合どうですか?",
  "スタジアム前で待ち合わせましょう!",
  "着きました!",
  "少し遅れそうです",
  "よろしくお願いします!",
  "楽しみにしています!",
];

export default function ChatDetailPage() {
  const params = useParams();
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSend = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        senderId: 2,
        text: newMessage,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isMe: true,
      };
      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  const handleTemplateSelect = (template: string) => {
    setNewMessage(template);
    setShowTemplates(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex flex-col">
      {/* ヘッダー */}
      <header className="bg-black text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <h1 className="text-2xl font-bold cursor-pointer">
              <span className="text-yellow-400">Giravent</span>
            </h1>
          </Link>
          <nav className="flex gap-4">
            <Link href="/matches" className="hover:text-yellow-400 transition">
              試合一覧
            </Link>
            <Link href="/chat" className="text-yellow-400 font-bold">
              チャット
            </Link>
            <Link href="/check-in" className="hover:text-yellow-400 transition">
              来場チェック
            </Link>
          </nav>
        </div>
      </header>

      {/* チャット相手情報 */}
      <div className="bg-white border-b-2 border-yellow-400 py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-black mb-3"
          >
            <span>←</span> チャット一覧に戻る
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-4xl">{partner.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-black">{partner.name}</h2>
              <p className="text-sm text-gray-600">
                2025/03/15 (土) vs アビスパ福岡
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto py-6 px-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  message.isMe
                    ? "bg-yellow-400 text-black"
                    : "bg-white text-black border-2 border-gray-200"
                }`}
              >
                <p className="mb-1">{message.text}</p>
                <p
                  className={`text-xs ${
                    message.isMe ? "text-gray-700" : "text-gray-500"
                  }`}
                >
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* テンプレートメッセージ */}
      {showTemplates && (
        <div className="bg-white border-t-2 border-yellow-400 py-4 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-black">テンプレート</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-600 hover:text-black"
              >
                閉じる
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handleTemplateSelect(template)}
                  className="bg-yellow-50 border border-yellow-400 px-4 py-2 rounded-lg text-sm hover:bg-yellow-100 transition text-left"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="bg-white border-t-2 border-yellow-400 py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              📝
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="メッセージを入力..."
              className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className={`px-6 py-2 rounded-lg font-bold transition ${
                newMessage.trim()
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
