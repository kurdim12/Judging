"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { upsertScoreAction } from "@/lib/actions/scores";
import type { Criterion, Score } from "@/types/database";
import type { Locale } from "@/i18n";

interface DraftScore {
  score: number | null;
  comment: string;
  saved: boolean;
  saving: boolean;
}

export function ScoringPanel({
  locale,
  teamId,
  criteria,
  initialScores,
}: {
  locale: string;
  teamId: string;
  criteria: Criterion[];
  initialScores: Score[];
}) {
  const t = useTranslations("scoring");
  const tErr = useTranslations("errors");
  const [, start] = useTransition();

  const initial: Record<string, DraftScore> = {};
  for (const c of criteria) {
    const existing = initialScores.find((s) => s.criterion_id === c.id);
    initial[c.id] = {
      score: existing?.score ?? null,
      comment: existing?.comment ?? "",
      saved: !!existing,
      saving: false,
    };
  }
  const [drafts, setDrafts] = useState<Record<string, DraftScore>>(initial);

  function update(id: string, patch: Partial<DraftScore>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function persist(criterion: Criterion) {
    const draft = drafts[criterion.id];
    if (draft.score == null) return;
    update(criterion.id, { saving: true });
    start(async () => {
      const result = await upsertScoreAction({
        team_id: teamId,
        criterion_id: criterion.id,
        score: draft.score!,
        comment: draft.comment,
      });
      if (!result.ok) {
        toast.error(result.error ?? tErr("generic"));
        update(criterion.id, { saving: false });
        return;
      }
      update(criterion.id, { saving: false, saved: true });
    });
  }

  const allScored = criteria.every((c) => drafts[c.id]?.score != null);

  return (
    <div className="space-y-4 lg:sticky lg:top-20">
      {criteria.map((c) => {
        const draft = drafts[c.id];
        const label = locale === "ar" ? c.name_ar : c.name_en;
        const description = locale === "ar" ? c.description_ar : c.description_en;
        return (
          <Card key={c.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">{label}</h3>
                  {description && (
                    <p className="text-xs text-stone-500 mt-0.5">{description}</p>
                  )}
                  <p className="text-[10px] text-stone-400 mt-1">
                    {t("criterionScore")}: 0 – {c.max_score} · ×{c.weight}
                  </p>
                </div>
                <Badge
                  variant={
                    draft.saving ? "muted" : draft.saved ? "success" : "warning"
                  }
                  className="shrink-0"
                >
                  {draft.score == null
                    ? "—"
                    : `${draft.score} / ${c.max_score}`}
                </Badge>
              </div>

              <div>
                <input
                  type="range"
                  min={0}
                  max={c.max_score}
                  step={c.max_score >= 10 ? 1 : 0.5}
                  value={draft.score ?? 0}
                  onChange={(e) => update(c.id, { score: Number(e.target.value), saved: false })}
                  onMouseUp={() => persist(c)}
                  onTouchEnd={() => persist(c)}
                  className="w-full accent-ieee-500"
                />
              </div>

              <div>
                <Label htmlFor={`comment-${c.id}`} className="text-xs">
                  {t("comment")}
                </Label>
                <Textarea
                  id={`comment-${c.id}`}
                  rows={2}
                  value={draft.comment}
                  onChange={(e) => update(c.id, { comment: e.target.value, saved: false })}
                  onBlur={() => persist(c)}
                  className="mt-1 text-sm"
                />
              </div>

              <p className="text-[10px] text-stone-400">
                {draft.saving ? t("saving") : draft.saved ? `✓ ${t("saved")}` : "—"}
              </p>
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-ieee-200 bg-ieee-50/40">
        <CardContent className="pt-5">
          {!allScored && (
            <p className="mb-2 text-xs text-stone-500">{t("allScoredHint")}</p>
          )}
          <Button className="w-full" disabled={!allScored}>
            ✓ {t("markComplete")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
