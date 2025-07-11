"use client";

import { useState, useEffect } from "react";

export default function ApiTestPage() {
  const [getResponse, setGetResponse] = useState<string | null>(null);
  const [postResponse, setPostResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test GET request
    fetch("/api/test")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GET request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setGetResponse(JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        setError(`GET Error: ${err.message}`);
      });
  }, []);

  const handlePostTest = async () => {
    try {
      const response = await fetch("/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: true }),
      });

      if (!response.ok) {
        throw new Error(`POST request failed with status ${response.status}`);
      }

      const data = await response.json();
      setPostResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      if (err instanceof Error) {
        setError(`POST Error: ${err.message}`);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Route Test</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">GET Test</h2>
          {getResponse ? (
            <pre className="bg-gray-100 p-4 rounded">{getResponse}</pre>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">POST Test</h2>
          <button
            onClick={handlePostTest}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-4"
          >
            Test POST Request
          </button>
          {postResponse && (
            <pre className="bg-gray-100 p-4 rounded">{postResponse}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
