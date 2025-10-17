"use client";

import { useState } from "react";

export default function Home() {
  const [response, setResponse] = useState("");

  const callApi = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/`);
      const data = await res.json();
      setResponse(data.message);
    } catch (e) {
      setResponse("Failed to fetch");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Hakkutsu Front</h1>
      <button
        onClick={callApi}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Call Lambda
      </button>
      <p className="mt-6 text-gray-700">{response}</p>
    </main>
  );
}
