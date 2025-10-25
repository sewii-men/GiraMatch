"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-300 to-white">
      {/* ヘッダー */}
      {/* ヘッダーは NavBar に置き換え済み */}

      {/* ヒーローセクション */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-black mb-6">
            仲間と一緒に<br />
            <span className="text-red-600">ギラヴァンツ北九州</span>を応援しよう
          </h2>
          <p className="text-xl text-gray-800 mb-8">
            サッカー観戦 × マッチング<br />
            同じ熱量で応援する仲間と出会える新しい観戦体験
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/matches" className="inline-block bg-red-600 text-white text-xl font-bold px-8 py-4 rounded-full hover:bg-red-700 transition shadow-lg">
              試合を探す
            </Link>
            <Link href="/login" className="inline-block bg-white text-black text-xl font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition shadow-lg">
              ログイン
            </Link>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-black">
            Giraventの特徴
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* 試合選択 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">⚽</div>
              <h4 className="text-xl font-bold mb-2 text-black">試合を選ぶ</h4>
              <p className="text-gray-700">
                ホーム戦から観戦したい試合を選択。同行募集か参加希望を選べます。
              </p>
            </div>

            {/* マッチング */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">🤝</div>
              <h4 className="text-xl font-bold mb-2 text-black">仲間を見つける</h4>
              <p className="text-gray-700">
                応援スタイルと席の希望が合う仲間を自動マッチング。気になる人にリクエスト送信。
              </p>
            </div>

            {/* チャット */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">💬</div>
              <h4 className="text-xl font-bold mb-2 text-black">チャットで相談</h4>
              <p className="text-gray-700">
                承認後に1対1チャット開始。待ち合わせ場所や時間をテンプレで簡単相談。
              </p>
            </div>

            {/* 来場チェック */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">📍</div>
              <h4 className="text-xl font-bold mb-2 text-black">来場チェック</h4>
              <p className="text-gray-700">
                スタジアムに到着したら手動でチェック。同行者の来場状況もリアルタイムで確認。
              </p>
            </div>

            {/* 事後評価 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">⭐</div>
              <h4 className="text-xl font-bold mb-2 text-black">感謝を伝える</h4>
              <p className="text-gray-700">
                試合後に同行者へ星評価と感謝のメッセージ。信頼スコアで安心・安全。
              </p>
            </div>

            {/* 安心・安全 */}
            <div className="bg-yellow-50 p-6 rounded-lg shadow-md border-2 border-yellow-400">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="text-xl font-bold mb-2 text-black">安心・安全</h4>
              <p className="text-gray-700">
                SMS認証と信頼スコアで安心。承認制チャットで自分のペースで交流。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-yellow-100">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-black">
            使い方はカンタン5ステップ
          </h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">試合を選ぶ</h4>
                <p className="text-gray-700">観戦したいホーム戦を選択</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">マッチング</h4>
                <p className="text-gray-700">応援スタイルと席の希望を選択して仲間を探す</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">チャットで相談</h4>
                <p className="text-gray-700">待ち合わせ場所や時間を相談</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">来場チェック</h4>
                <p className="text-gray-700">スタジアムに到着したらチェック</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h4 className="font-bold text-lg text-black">感謝を伝える</h4>
                <p className="text-gray-700">試合後に星評価とメッセージで感謝を伝える</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-black text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-6">
            さあ、一緒にギラヴァンツを応援しよう
          </h3>
          <Link
            href="/matches"
            className="inline-block bg-yellow-400 text-black text-xl font-bold px-12 py-4 rounded-full hover:bg-yellow-500 transition shadow-lg"
          >
            試合を探す
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center">
        <p>&copy; 2025 Giravent - ギラヴァンツ北九州ファン創出アプリ</p>
      </footer>
    </div>
  );
}
