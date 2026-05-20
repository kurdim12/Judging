"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { changeUserRoleAction } from "@/lib/actions/admin";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Profile, UserRole } from "@/types/database";
import type { Locale } from "@/i18n";

const roles: UserRole[] = ["admin", "judge", "team_leader", "team_member"];

export function UsersManager({ users, locale }: { users: Profile[]; locale: Locale }) {
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("");

  const filtered = users.filter((u) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name_en ?? "").toLowerCase().includes(q) ||
      (u.full_name_ar ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder={locale === "ar" ? "ابحث…" : "Search…"}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <Table>
        <THead>
          <TR>
            <TH>{locale === "ar" ? "الاسم" : "Name"}</TH>
            <TH>{locale === "ar" ? "البريد" : "Email"}</TH>
            <TH>{locale === "ar" ? "الدور" : "Role"}</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((u) => (
            <TR key={u.id}>
              <TD>{locale === "ar" ? u.full_name_ar || u.full_name_en : u.full_name_en}</TD>
              <TD className="text-stone-600">{u.email}</TD>
              <TD>
                <Select
                  defaultValue={u.role}
                  disabled={pending}
                  onChange={(e) =>
                    start(async () => {
                      const r = await changeUserRoleAction(u.id, e.target.value as UserRole);
                      if (!r.ok) toast.error(r.error ?? tErr("generic"));
                      else router.refresh();
                    })
                  }
                  className="h-8 text-xs"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
