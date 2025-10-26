"use client";

import { useCallback, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Restaurant } from "@/types/postMatchChat";

interface RestaurantMapProps {
  restaurants: Restaurant[];
  restaurantShares?: { restaurantId: string; count: number }[];
  center?: { lat: number; lng: number };
  onRestaurantClick?: (restaurant: Restaurant) => void;
}

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "400px",
};

// デフォルトの中心地点（ミクニワールドスタジアム北九州）
const defaultCenter = {
  lat: 33.8834,
  lng: 130.8751,
};

export default function RestaurantMap({
  restaurants,
  restaurantShares = [],
  center = defaultCenter,
  onRestaurantClick,
}: RestaurantMapProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || "",
  });

  const onLoad = useCallback(() => {
    // Map instance available if needed in future
  }, []);

  const onUnmount = useCallback(() => {
    // Cleanup if needed in future
  }, []);

  // 共有数に基づいてマーカーのサイズを決定
  const getMarkerScale = (restaurantId: string): number => {
    const share = restaurantShares.find((s) => s.restaurantId === restaurantId);
    if (!share || share.count === 0) return 1.0;

    // 共有数に応じてスケールを調整（1.0〜2.5）
    const scale = 1.0 + Math.min(share.count * 0.3, 1.5);
    return scale;
  };

  // 共有数を取得
  const getShareCount = (restaurantId: string): number => {
    const share = restaurantShares.find((s) => s.restaurantId === restaurantId);
    return share?.count || 0;
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-6">
          <p className="text-red-600 font-bold mb-2">地図の読み込みに失敗しました</p>
          <p className="text-sm text-gray-600">
            Google Maps APIキーが正しく設定されているか確認してください。
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">地図を読み込み中...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-6 max-w-md">
          <p className="text-yellow-600 font-bold mb-2">⚠️ Map機能は現在利用できません</p>
          <p className="text-sm text-gray-600 mb-4">
            Google Maps APIキーが設定されていません。
            <br />
            Map機能を使用するには、`.env.local`ファイルに
            `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`を設定してください。
          </p>
          <p className="text-xs text-gray-500">
            詳細は`docs/GIRA-NOMI-IMPLEMENTATION.md`の Phase 2 を参照
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {/* スタジアムのマーカー（赤） */}
      <Marker
        position={center}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#DC2626",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        }}
        title="ミクニワールドスタジアム北九州"
      />

      {/* 店舗のマーカー */}
      {restaurants.map((restaurant) => {
        const shareCount = getShareCount(restaurant.restaurantId);
        const scale = getMarkerScale(restaurant.restaurantId);
        const hasShares = shareCount > 0;

        return (
          <Marker
            key={restaurant.restaurantId}
            position={{ lat: restaurant.latitude, lng: restaurant.longitude }}
            onClick={() => {
              setSelectedRestaurant(restaurant);
              if (onRestaurantClick) {
                onRestaurantClick(restaurant);
              }
            }}
            icon={
              hasShares
                ? {
                    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%23FCD34D' stroke='%23000' stroke-width='2'/%3E%3Ctext x='20' y='27' font-size='20' text-anchor='middle' fill='%23000'%3E⚽%3C/text%3E%3C/svg%3E",
                    scaledSize: new google.maps.Size(30 * scale, 30 * scale),
                  }
                : undefined
            }
            title={restaurant.name}
            animation={hasShares ? google.maps.Animation.BOUNCE : undefined}
          />
        );
      })}

      {/* 店舗情報ウィンドウ */}
      {selectedRestaurant && (
        <InfoWindow
          position={{
            lat: selectedRestaurant.latitude,
            lng: selectedRestaurant.longitude,
          }}
          onCloseClick={() => setSelectedRestaurant(null)}
        >
          <div className="p-2" style={{ maxWidth: "250px" }}>
            <h3 className="font-bold text-black mb-1">{selectedRestaurant.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{selectedRestaurant.address}</p>

            {getShareCount(selectedRestaurant.restaurantId) > 0 && (
              <div className="bg-yellow-100 px-2 py-1 rounded mb-2">
                <p className="text-xs font-bold text-yellow-800">
                  🍺 {getShareCount(selectedRestaurant.restaurantId)}人がここで飲んでいます！
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <a
                href={selectedRestaurant.googleMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
              >
                経路を見る
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
