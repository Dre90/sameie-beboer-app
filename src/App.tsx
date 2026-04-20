import { useState } from "react";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-4xl font-bold">Sameie beboer-app</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400">
        React + TypeScript + Tailwind + Vitest, powered by Vite+
      </p>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="rounded-lg bg-purple-600 px-5 py-2.5 font-medium text-white shadow hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        count is {count}
      </button>
    </main>
  );
}
