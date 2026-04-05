"use client";

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "habit-app-lite-v1";

const ICONS = {
  brain: "🧠",
  pen: "✍️",
  heart: "💗",
  music: "🎵",
};

const ICON_OPTIONS = [
  { value: "brain", label: "Brain" },
  { value: "pen", label: "Pen" },
  { value: "heart", label: "Heart" },
  { value: "music", label: "Music" },
];

const DEFAULT_DOMAINS = [
  {
    id: "recall",
    title: "Recall Intelligence",
    subtitle: "記憶・学習",
    iconName: "brain",
    minimum: "1問だけ思い出す",
    examples: ["英単語を1つ思い出す"],
  },
  {
    id: "creator",
    title: "Creator Intelligence",
    subtitle: "思考・言語化",
    iconName: "pen",
    minimum: "1行だけ書く",
    examples: ["1行書く"],
  },
  {
    id: "body",
    title: "Body Intelligence",
    subtitle: "食・回復",
    iconName: "heart",
    minimum: "温かい飲み物",
    examples: ["白湯"],
  },
  {
    id: "music",
    title: "Music Intelligence",
    subtitle: "音楽",
    iconName: "music",
    minimum: "1音触る",
    examples: ["1ループ"],
  },
];

const DEFAULT_REWARDS = [
  { id: "reward-1", label: "7日でご褒美", targetPoints: 14 },
  { id: "reward-2", label: "14日で少し大きなご褒美", targetPoints: 28 },
];

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeExamples(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split("\n").map((v) => v.trim()).filter(Boolean);
  return [];
}

function normalizeDomain(domain, index) {
  const iconName = ICONS[domain?.iconName] ? domain.iconName : "brain";
  return {
    id: safeString(domain?.id, `domain-${index + 1}`),
    title: safeString(domain?.title, `Domain ${index + 1}`),
    subtitle: safeString(domain?.subtitle, ""),
    iconName,
    minimum: safeString(domain?.minimum, ""),
    examples: normalizeExamples(domain?.examples),
  };
}

function normalizeRewards(rewards) {
  return safeArray(rewards, DEFAULT_REWARDS)
    .map((reward, index) => {
      if (typeof reward === "string") {
        return {
          id: `reward-legacy-${index + 1}`,
          label: reward,
          targetPoints: (index + 1) * 14,
        };
      }
      return {
        id: safeString(reward?.id, `reward-${index + 1}`),
        label: safeString(reward?.label, `ご褒美 ${index + 1}`),
        targetPoints: Math.max(1, Math.round(safeNumber(reward?.targetPoints, (index + 1) * 14))),
      };
    })
    .filter((reward) => reward.label);
}

function normalizeHistory(history, domains) {
  const safeHistory = history && typeof history === "object" ? history : {};
  const ids = domains.map((d) => d.id);
  return Object.fromEntries(
    Object.entries(safeHistory).map(([date, record]) => {
      const completed = Object.fromEntries(ids.map((id) => [id, Boolean(record?.completed?.[id])]));
      return [
        date,
        {
          completed,
          score: Object.values(completed).filter(Boolean).length,
        },
      ];
    })
  );
}

function normalizeState(raw) {
  const candidate = raw && typeof raw === "object" ? raw : {};
  const domains = safeArray(candidate.domains, DEFAULT_DOMAINS).map(normalizeDomain);
  const rewards = normalizeRewards(candidate.rewards);
  return {
    domains,
    rewards,
    history: normalizeHistory(candidate.history, domains),
  };
}

function defaultState() {
  return normalizeState({
    domains: DEFAULT_DOMAINS,
    rewards: DEFAULT_REWARDS,
    history: {},
  });
}

function getTodayRecord(history, domains, today) {
  const emptyCompleted = Object.fromEntries(domains.map((d) => [d.id, false]));
  const existing = history[today];
  if (!existing) return { completed: emptyCompleted, score: 0 };
  const completed = { ...emptyCompleted, ...(existing.completed || {}) };
  return {
    completed,
    score: Object.values(completed).filter(Boolean).length,
  };
}

function syncHistoryWithDomains(history, domains) {
  const ids = domains.map((d) => d.id);
  return Object.fromEntries(
    Object.entries(history).map(([date, record]) => {
      const completed = Object.fromEntries(ids.map((id) => [id, Boolean(record?.completed?.[id])]));
      return [
        date,
        {
          completed,
          score: Object.values(completed).filter(Boolean).length,
        },
      ];
    })
  );
}

function totalPoints(history) {
  return Object.values(history).reduce((sum, record) => sum + safeNumber(record?.score, 0), 0);
}

function runDataTests() {
  const state = normalizeState({
    domains: [{ id: "a", title: "A", examples: "x\ny" }],
    rewards: [
      "旧形式のご褒美",
      { id: "r2", label: "新形式", targetPoints: "20" },
    ],
    history: { "2026-04-05": { completed: { a: true } } },
  });

  if (state.domains[0].examples.length !== 2) throw new Error("example normalization failed");
  if (state.rewards[0].targetPoints !== 14) throw new Error("legacy reward normalization failed");
  if (state.rewards[1].targetPoints !== 20) throw new Error("reward point normalization failed");
  if (state.history["2026-04-05"].score !== 1) throw new Error("history normalization failed");

  const synced = syncHistoryWithDomains(
    { "2026-04-05": { completed: { a: true, b: true } } },
    [{ id: "a" }]
  );
  if (synced["2026-04-05"].score !== 1) throw new Error("history sync failed");

  if (totalPoints({ a: { score: 2 }, b: { score: 3 } }) !== 5) throw new Error("total points failed");
}

runDataTests();

function Panel({ children, className = "" }) {
  return (
    <div className={`rounded-3xl bg-white border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SmallButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

function MainButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

export default function Page() {
  const [appState, setAppState] = useState(defaultState());
  const [editingId, setEditingId] = useState(null);
  const [newRewardLabel, setNewRewardLabel] = useState("");
  const [newRewardTarget, setNewRewardTarget] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setAppState(normalizeState(JSON.parse(raw)));
      }
    } catch {
      setAppState(defaultState());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  const today = todayKey();
  const todayRecord = useMemo(() => getTodayRecord(appState.history, appState.domains, today), [appState.history, appState.domains, today]);
  const score = Object.values(todayRecord.completed).filter(Boolean).length;
  const cumulativePoints = useMemo(() => totalPoints(appState.history), [appState.history]);

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date(`${today}T00:00:00`);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      const record = appState.history[key];
      if (!record || record.score <= 0) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [appState.history, today]);

  const nextReward = useMemo(() => {
    const sorted = [...appState.rewards].sort((a, b) => a.targetPoints - b.targetPoints);
    return sorted.find((reward) => reward.targetPoints > cumulativePoints) || null;
  }, [appState.rewards, cumulativePoints]);

  function toggleDomain(id) {
    setAppState((prev) => {
      const record = getTodayRecord(prev.history, prev.domains, today);
      const completed = { ...record.completed, [id]: !record.completed[id] };
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

  function updateDomain(id, field, value) {
    setAppState((prev) => {
      const domains = prev.domains.map((domain) => {
        if (domain.id !== id) return domain;
        if (field === "examples") return { ...domain, examples: normalizeExamples(value) };
        if (field === "iconName") return { ...domain, iconName: ICONS[value] ? value : domain.iconName };
        return { ...domain, [field]: value };
      });
      return { ...prev, domains, history: syncHistoryWithDomains(prev.history, domains) };
    });
  }

  function addDomain() {
    const newId = `domain-${Date.now()}`;
    setAppState((prev) => {
      const domains = [
        ...prev.domains,
        {
          id: newId,
          title: `New Domain ${prev.domains.length + 1}`,
          subtitle: "自由に編集",
          iconName: "brain",
          minimum: "小さく始める",
          examples: ["例を書く"],
        },
      ];
      return { ...prev, domains, history: syncHistoryWithDomains(prev.history, domains) };
    });
    setEditingId(newId);
  }

  function moveDomain(index, direction) {
    setAppState((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.domains.length) return prev;
      const domains = [...prev.domains];
      const temp = domains[index];
      domains[index] = domains[nextIndex];
      domains[nextIndex] = temp;
      return { ...prev, domains, history: syncHistoryWithDomains(prev.history, domains) };
    });
  }

  function deleteDomain(id) {
    setAppState((prev) => {
      if (prev.domains.length <= 1) return prev;
      const domains = prev.domains.filter((domain) => domain.id !== id);
      return { ...prev, domains, history: syncHistoryWithDomains(prev.history, domains) };
    });
    if (editingId === id) setEditingId(null);
  }

  function resetToday() {
    setAppState((prev) => ({
      ...prev,
      history: {
        ...prev.history,
        [today]: getTodayRecord({}, prev.domains, today),
      },
    }));
  }

  function addReward() {
    const label = newRewardLabel.trim();
    const targetPoints = Math.max(1, Math.round(safeNumber(newRewardTarget, 0)));
    if (!label || !targetPoints) return;
    setAppState((prev) => ({
      ...prev,
      rewards: [
        ...prev.rewards,
        {
          id: `reward-${Date.now()}`,
          label,
          targetPoints,
        },
      ],
    }));
    setNewRewardLabel("");
    setNewRewardTarget("");
  }

  function updateReward(index, field, value) {
    setAppState((prev) => ({
      ...prev,
      rewards: prev.rewards.map((reward, i) => {
        if (i !== index) return reward;
        if (field === "targetPoints") {
          return { ...reward, targetPoints: Math.max(1, Math.round(safeNumber(value, reward.targetPoints))) };
        }
        return { ...reward, label: value };
      }),
    }));
  }

  function removeReward(index) {
    setAppState((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((_, i) => i !== index),
    }));
  }

  const sortedRewards = [...appState.rewards].sort((a, b) => a.targetPoints - b.targetPoints);
  const unlockedRewards = sortedRewards.filter((r) => cumulativePoints >= r.targetPoints);
  const lockedRewards = sortedRewards.filter((r) => cumulativePoints < r.targetPoints);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Panel>
          <div className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-slate-500">Gamification App Lite</p>
                <h1 className="text-3xl font-semibold">軽量版の習慣アプリ</h1>
                <p className="mt-2 text-sm text-slate-500">目標達成でご褒美が解放される形です。</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm">今日のスコア: {score}</div>
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm">今日あと {Math.max(0, appState.domains.length - score)} 個で最大達成</div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm">累計ポイント: {cumulativePoints}</div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm">連続記録: {streak}日</div>
                <MainButton onClick={resetToday}>今日をリセット</MainButton>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="p-5">
            {nextReward ? (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">次に解放されるご褒美: {nextReward.label}</div>
                  <div className="text-sm text-slate-500">目標 {nextReward.targetPoints} pt</div>
                </div>
                <div className="text-lg font-semibold">解放まであと {Math.max(0, nextReward.targetPoints - cumulativePoints)} ポイント</div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">設定されているご褒美はすべて達成しています。</div>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="p-5 space-y-3">
            <h2 className="text-lg font-semibold">領域</h2>
            <MainButton onClick={addDomain}>項目を追加</MainButton>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">並び替えは上下ボタン方式です。とても軽く動きます。</div>
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {appState.domains.map((domain, index) => {
            const done = Boolean(todayRecord.completed[domain.id]);
            const isEditing = editingId === domain.id;
            const icon = ICONS[domain.iconName] || "🧠";

            return (
              <Panel key={domain.id}>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">{icon}</div>
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input value={domain.title} onChange={(e) => updateDomain(domain.id, "title", e.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="タイトル" />
                            <input value={domain.subtitle} onChange={(e) => updateDomain(domain.id, "subtitle", e.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="サブタイトル" />
                            <select value={domain.iconName} onChange={(e) => updateDomain(domain.id, "iconName", e.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                              {ICON_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <>
                            <div className="font-semibold">{domain.title}</div>
                            <div className="text-sm text-slate-500">{domain.subtitle}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <SmallButton onClick={() => moveDomain(index, -1)} disabled={index === 0}>↑</SmallButton>
                      <SmallButton onClick={() => moveDomain(index, 1)} disabled={index === appState.domains.length - 1}>↓</SmallButton>
                      <SmallButton onClick={() => setEditingId(isEditing ? null : domain.id)}>編集</SmallButton>
                      <SmallButton onClick={() => deleteDomain(domain.id)}>削除</SmallButton>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <input value={domain.minimum} onChange={(e) => updateDomain(domain.id, "minimum", e.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="最小行動" />
                      <input value={domain.examples.join("\n")} onChange={(e) => updateDomain(domain.id, "examples", e.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="例（改行区切り）" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Minimum</div>
                        <div className="text-sm">{domain.minimum}</div>
                      </div>
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Examples</div>
                        <div className="flex flex-wrap gap-2">
                          {domain.examples.length > 0 ? domain.examples.map((example) => (
                            <span key={`${domain.id}-${example}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{example}</span>
                          )) : <span className="text-xs text-slate-400">例はまだありません</span>}
                        </div>
                      </div>
                    </>
                  )}

                  <MainButton onClick={() => toggleDomain(domain.id)} className="w-full">
                    {done ? "達成済み" : "今日の達成を記録"}
                  </MainButton>
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel>
          <div className="p-5 space-y-3">
            <h2 className="text-lg font-semibold">ご褒美リスト</h2>
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <input value={newRewardLabel} onChange={(e) => setNewRewardLabel(e.target.value)} placeholder="ご褒美名" className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
              <input value={newRewardTarget} onChange={(e) => setNewRewardTarget(e.target.value)} placeholder="目標pt" className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
              <MainButton onClick={addReward}>追加</MainButton>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs text-slate-400">解放済み</div>
                <div className="space-y-2">
                  {unlockedRewards.length === 0 && <div className="text-xs text-slate-400">まだありません</div>}
                  {unlockedRewards.map((reward) => {
                    const index = appState.rewards.findIndex((r) => r.id === reward.id);
                    return (
                      <div key={reward.id} className="rounded-2xl bg-green-100 px-3 py-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{reward.label}</div>
                          <div className="text-xs">解放済み</div>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                          <input value={reward.label} onChange={(e) => updateReward(index, "label", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                          <input value={String(reward.targetPoints)} onChange={(e) => updateReward(index, "targetPoints", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                          <SmallButton onClick={() => removeReward(index)}>削除</SmallButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs text-slate-400">これから解放</div>
                <div className="space-y-2">
                  {lockedRewards.map((reward, i) => {
                    const index = appState.rewards.findIndex((r) => r.id === reward.id);
                    const remaining = reward.targetPoints - cumulativePoints;
                    const isNext = i === 0;
                    return (
                      <div key={reward.id} className={`rounded-2xl px-3 py-3 ${isNext ? "bg-blue-100" : "bg-slate-100"}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{reward.label}</div>
                          <div className="text-xs">あと {remaining}pt</div>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                          <input value={reward.label} onChange={(e) => updateReward(index, "label", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                          <input value={String(reward.targetPoints)} onChange={(e) => updateReward(index, "targetPoints", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                          <SmallButton onClick={() => removeReward(index)}>削除</SmallButton>
                        </div>
                        {isNext && <div className="mt-1 text-xs text-blue-700">次に解放されるご褒美</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
