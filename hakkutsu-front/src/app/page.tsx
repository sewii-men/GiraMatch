'use client';

import { useState } from 'react';

export default function Home() {
  const [data, setData] = useState<string>('まだデータはありません');

  const callLambda = async () => {
    try {
      const res = await fetch('https://5xywj8jy0c.execute-api.us-east-1.amazonaws.com/');
      const text = await res.text();
      setData(text);
    } catch (error) {
      setData('エラーが発生しました: ' + (error as Error).message);
    }
  };

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-4">Lambda × Next.js 接続テスト</h1>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={callLambda}
      >
        Call Lambda
      </button>
      <pre className="mt-4">{data}</pre>
    </main>
  );
}
