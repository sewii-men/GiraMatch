"use client";

import { MESSAGE_TEMPLATES } from "@/types/postMatchChat";
import { useState } from "react";

interface MessageTemplateSelectorProps {
  onSelectTemplate: (template: string) => void;
}

export default function MessageTemplateSelector({
  onSelectTemplate,
}: MessageTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectTemplate = (template: string) => {
    onSelectTemplate(template);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* テンプレート選択ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-bold"
      >
        テンプレート
      </button>

      {/* テンプレート選択メニュー */}
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* メニュー */}
          <div className="absolute bottom-full mb-2 left-0 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-20 w-80 max-h-96 overflow-y-auto">
            <div className="p-2">
              <p className="text-xs text-gray-600 mb-2 px-2">
                テンプレートを選択してください
              </p>
              {MESSAGE_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-yellow-50 transition text-sm text-black mb-1"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
