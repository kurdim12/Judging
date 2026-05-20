"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LeaderboardTable } from "@/components/leaderboard-table";
import type { Criterion, LeaderboardRow, Score } from "@/types/database";
import type { Locale } from "@/i18n";

interface JudgeProfile {
  id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string;
}

const POLL_MS = 3000;

export function LiveLeaderboard({
  eventId,
  initial,
  anonymous,
  locale,
  criteria,
  scores,
  judges,
  labels,
}: {
  eventId: string;
  initial: LeaderboardRow[];
  anonymous: boolean;
  locale: string;
  criteria: Criterion[];
  scores: Score[];
  judges: JudgeProfile[];
  labels: {
    rank: string;
    team: string;
    finalScore: string;
    judgesScored: string;
    raw: string;
    variance: string;
  };
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/leaderboard/${eventId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { rows: LeaderboardRow[] };
        if (!cancelled && Array.isArray(data.rows)) setRows(data.rows);
      } catch {
        // network blip — ignore
      }
    };
    const interval = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [eventId]);

  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 10)
        .map((r) => ({
          name: anonymous ? r.display_code : r.name.slice(0, 18),
          score: Number(r.final_score.toFixed(3)),
        })),
    [rows, anonymous],
  );

  const variance = useMemo(() => {
    const byTeam = new Map<string, number[]>();
    for (const s of scores) {
      if (!byTeam.has(s.team_id)) byTeam.set(s.team_id, []);
      byTeam.get(s.team_id)!.push(s.score);
    }
    const out = new Map<string, number>();
    for (const [team, arr] of byTeam) {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const v = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
      out.set(team, v);
    }
    return out;
  }, [scores]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-stone-500">Top 10</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#E3E3E1" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#7C7C77" fontSize={11} angle={-15} height={50} />
              <YAxis stroke="#7C7C77" fontSize={11} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E3E3E1",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="score" fill="#035B98" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <LeaderboardTable
        rows={rows}
        anonymous={anonymous}
        locale={locale}
        labels={labels}
      />

      <details className="rounded-md border border-stone-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700">
          {labels.raw} · {labels.variance}
        </summary>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-xs">
            <thead className="text-stone-500">
              <tr>
                <th className="py-2 text-start">{labels.team}</th>
                {criteria.map((c) => (
                  <th key={c.id} className="py-2 text-start">
                    {locale === "ar" ? c.name_ar : c.name_en}
                  </th>
                ))}
                <th className="py-2 text-end">{labels.variance}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.team_id} className="border-t border-stone-100">
                  <td className="py-2 font-medium">
                    {anonymous ? r.display_code : r.name}
                  </td>
                  {criteria.map((c) => {
                    const matched = scores.filter(
                      (s) => s.team_id === r.team_id && s.criterion_id === c.id,
                    );
                    return (
                      <td key={c.id} className="py-2 text-stone-700">
                        {matched.length === 0
                          ? "—"
                          : matched.map((s) => s.score.toFixed(1)).join(", ")}
                      </td>
                    );
                  })}
                  <td className="py-2 text-end font-mono">
                    {variance.get(r.team_id)?.toFixed(2) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[10px] text-stone-400">
            {judges.length} {locale === "ar" ? "محكّمون مسجّلون" : "registered judges"}
          </p>
        </div>
      </details>
    </div>
  );
}
