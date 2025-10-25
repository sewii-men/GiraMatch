"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";

type Message = { messageId: string; senderId: string; text: string; createdAt: string };
type Partner = { id: string; name: string; icon?: string };

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
  const chatId = String(params.id);
  const { token, userId } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const load = async () => {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/chats/${chatId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return;
      const data = await res.json();
      setPartner(data.chat?.partner || null);
      setMessages(
        (data.messages || []).map((m: { messageId: string; senderId: string; text: string; createdAt: string }): Message => ({
          messageId: m.messageId,
          senderId: m.senderId,
          text: m.text,
          createdAt: m.createdAt,
        }))
      );
    };
    load();
  }, [chatId, token]);

  const handleSend = () => {
    if (newMessage.trim()) {
      (async () => {
        const base = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${base}/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ text: newMessage, senderId: userId || "" }),
        });
        const saved = await res.json();
        setMessages([
          ...messages,
          { messageId: saved.messageId, senderId: saved.senderId, text: saved.text, createdAt: saved.createdAt },
        ]);
        setNewMessage("");
      })();
    }
  };

  const handleTemplateSelect = (template: string) => {
    setNewMessage(template);
    setShowTemplates(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white flex flex-col">
      {/* ヘッダー */}
      <AuthGuard />
      <header className="bg-black text-white py-4 px-6 shadow-lg hidden">
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
            <div className="text-4xl">{partner?.icon || "🙂"}</div>
            <div>
              <h2 className="text-xl font-bold text-black">{partner?.name}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto py-6 px-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.messageId}
              className={`flex ${message.senderId === "demo" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  message.senderId === "demo"
                    ? "bg-yellow-400 text-black"
                    : "bg-white text-black border-2 border-gray-200"
                }`}
              >
                <p className="mb-1">{message.text}</p>
                <p className={`text-xs ${message.senderId === "demo" ? "text-gray-700" : "text-gray-500"}`}>
                  {new Date(message.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
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
              <button onClick={() => setShowTemplates(false)} className="text-gray-600 hover:text-black">
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
                newMessage.trim() ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
