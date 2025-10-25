"use client";

import { useState } from "react";
import { Restaurant } from "@/types/postMatchChat";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onAttachToMessage: (restaurant: Restaurant) => void;
}

export default function RestaurantCard({
  restaurant,
  onAttachToMessage,
}: RestaurantCardProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  const handleOpenMap = () => {
    window.open(restaurant.googleMapUrl, "_blank");
  };

  return (
    <>
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-yellow-400 transition">
        {/* 店舗画像 */}
        <div
          className="w-full h-32 bg-gray-200 rounded-lg mb-3 overflow-hidden cursor-pointer hover:opacity-80 transition"
          onClick={() => setShowImageModal(true)}
          title="クリックで拡大"
        >
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
            }}
          />
        </div>

      {/* 店舗情報 */}
      <div className="mb-3">
        <h3 className="font-bold text-lg text-black mb-1">{restaurant.name}</h3>
        <p className="text-sm text-gray-600 mb-1">{restaurant.address}</p>
        {restaurant.distance && (
          <p className="text-xs text-gray-500">会場から約 {restaurant.distance}m</p>
        )}
      </div>

        {/* アクションボタン */}
        <div className="flex gap-2">
          <button
            onClick={handleOpenMap}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition text-sm"
          >
            GoogleMapで開く
          </button>
          <button
            onClick={() => onAttachToMessage(restaurant)}
            className="flex-1 bg-yellow-400 text-black py-2 rounded-lg font-bold hover:bg-yellow-500 transition text-sm"
          >
            メッセージに付与
          </button>
        </div>
      </div>

      {/* 画像プレビューモーダル */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* 閉じるボタン */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-yellow-400 transition text-3xl font-bold"
            >
              ✕
            </button>

            {/* 拡大画像 */}
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23ddd' width='800' height='600'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32'%3ENo Image%3C/text%3E%3C/svg%3E";
              }}
            />

            {/* 店舗名 */}
            <div className="bg-white px-4 py-2 mt-2 rounded-lg">
              <h3 className="font-bold text-black text-center">{restaurant.name}</h3>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
