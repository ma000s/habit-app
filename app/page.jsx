"use client";

import { useEffect, useMemo, useState } from "react";

const KEY = "habit-lite-v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT = {
  domains: [
    { id: "recall", title: "Recall", minimum: "1つ思い出す" },
    { id: "write", title: "Write", minimum: "1行書く" },
    { id: "body", title: "Body", minimum: "温かい飲み物" },
  ],
  history: {},
};

function getToday(state, date) {
  const base = Object.fromEntries(state.domains.map((d) => [d.id, false]));
  const rec = state.history[date];
  if (!rec) return { completed: base, score: 0 };
  const completed = { ...base, ...(rec.completed || {}) };
  const score = Object.values(completed).filter(Boolean).length;
  return { completed, score };
}

export default function Page() {
  const [state, setState] = useState(DEFAULT);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setState(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const today = todayKey();
  const todayRec = useMemo(() => getToday(state, today), [state, today]);
  const score = todayRec.score;

  function toggle(id) {
    setState((prev) => {
      const t = getToday(prev, today);
      const completed = { ...t.completed, [id]: !t.completed[id] };
      return {
        ...prev,
        history: {
          ...prev.history,
          [today]: {
            completed,
            score: Object.values(completed).filter(Boolean).length,
          },
        },
      };
    });
  }

  function addDomain() {
    const id = `d-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      domains: [...prev.domains, { id, title: "New", minimum: "小さく始める" }],
    }));
  }

  return (
    <main style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Habit App</h1>
      <p>今日のスコア: {score}</p>

      <button onClick={addDomain}>項目を追加</button>

      <div style={{ marginTop: 20 }}>
        {state.domains.map((d) => (
          <div key={d.id} style={{ marginBottom: 10 }}>
            <strong>{d.title}</strong>（{d.minimum}）
            <br />
            <button onClick={() => toggle(d.id)}>
              {todayRec.completed[d.id] ? "達成済み" : "達成する"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
