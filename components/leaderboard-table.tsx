import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { LeaderboardRow } from "@/types/database";
import type { Locale } from "@/i18n";

function medalForRank(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function rowClasses(rank: number) {
  if (rank === 1) return "bg-petra-50/60";
  if (rank === 2) return "bg-stone-100/60";
  if (rank === 3) return "bg-ieee-50/60";
  return "";
}

export function LeaderboardTable({
  rows,
  anonymous,
  locale,
  labels,
}: {
  rows: LeaderboardRow[];
  anonymous: boolean;
  locale: string;
  labels: { rank: string; team: string; finalScore: string; judgesScored: string };
}) {
  const sorted = [...rows].sort((a, b) => b.final_score - a.final_score);
  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-16">{labels.rank}</TH>
          <TH>{labels.team}</TH>
          <TH className="w-32 text-end">{labels.finalScore}</TH>
          <TH className="w-32 text-end">{labels.judgesScored}</TH>
        </TR>
      </THead>
      <TBody>
        {sorted.map((row, idx) => {
          const rank = idx + 1;
          return (
            <TR key={row.team_id} className={rowClasses(rank)}>
              <TD className="font-bold text-stone-900">
                {medalForRank(rank)} {rank}
              </TD>
              <TD>
                <p className="font-medium">
                  {anonymous ? row.display_code : row.name}
                </p>
                {!anonymous && (
                  <p className="text-xs text-stone-500">{row.display_code}</p>
                )}
              </TD>
              <TD className="text-end font-mono tabular-nums text-stone-900">
                {row.final_score.toFixed(3)}
              </TD>
              <TD className="text-end text-stone-500">{row.judges_scored}</TD>
            </TR>
          );
        })}
        {sorted.length === 0 && (
          <TR>
            <TD colSpan={4} className="py-10 text-center text-stone-500">
              —
            </TD>
          </TR>
        )}
      </TBody>
    </Table>
  );
}
