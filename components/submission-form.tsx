"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { submissionSchema } from "@/lib/validators";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveSubmissionAction } from "@/lib/actions/submissions";
import { FileUploader } from "@/components/file-uploader";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n";
import type { Submission, SubmissionAttachment } from "@/types/database";

type FormValues = z.infer<typeof submissionSchema>;

export function SubmissionForm({
  locale,
  teamId,
  eventId,
  submission,
  locked,
  isLeader,
}: {
  locale: Locale;
  teamId: string;
  eventId: string;
  submission: Submission | null;
  locked: boolean;
  isLeader: boolean;
}) {
  const t = useTranslations("submission");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tech, setTech] = useState<string[]>(submission?.tech_stack ?? []);
  const [techInput, setTechInput] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(
    submission?.updated_at ? new Date(submission.updated_at) : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      title: submission?.title ?? "",
      description: submission?.description ?? "",
      problem_statement: submission?.problem_statement ?? "",
      solution_summary: submission?.solution_summary ?? "",
      tech_stack: submission?.tech_stack ?? [],
      github_url: submission?.github_url ?? "",
      demo_url: submission?.demo_url ?? "",
      video_url: submission?.video_url ?? "",
      slides_url: submission?.slides_url ?? "",
    },
  });

  function save(values: FormValues, finalize: boolean) {
    if (locked) return;
    start(async () => {
      const result = await saveSubmissionAction({
        team_id: teamId,
        event_id: eventId,
        ...values,
        tech_stack: tech,
        finalize,
      });
      if (!result.ok) {
        toast.error(result.error ?? tErr("generic"));
        return;
      }
      setLastSaved(new Date());
      toast.success(finalize ? t("submitted") : t("saveDraft"));
      router.refresh();
    });
  }

  function addTech(value: string) {
    const v = value.trim();
    if (!v) return;
    if (tech.includes(v)) return;
    if (tech.length >= 20) return;
    setTech([...tech, v]);
    setTechInput("");
  }

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <div>
        <Label htmlFor="title">{t("projectTitle")}</Label>
        <Input id="title" {...register("title")} disabled={locked} className="mt-1.5" />
        {errors.title && <p className="mt-1 text-xs text-petra-600">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          rows={4}
          {...register("description")}
          disabled={locked}
          className="mt-1.5"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-petra-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="problem">{t("problemStatement")}</Label>
          <Textarea
            id="problem"
            rows={3}
            {...register("problem_statement")}
            disabled={locked}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="solution">{t("solutionSummary")}</Label>
          <Textarea
            id="solution"
            rows={3}
            {...register("solution_summary")}
            disabled={locked}
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label>{t("techStack")}</Label>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-stone-300 bg-white p-2">
          {tech.map((tag) => (
            <Badge key={tag} variant="primary" className="gap-1">
              {tag}
              {!locked && (
                <button
                  type="button"
                  onClick={() => setTech(tech.filter((t) => t !== tag))}
                  className="ms-1 text-ieee-500 hover:text-ieee-700"
                  aria-label={`remove ${tag}`}
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
          {!locked && (
            <input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTech(techInput);
                }
                if (e.key === "Backspace" && !techInput && tech.length > 0) {
                  setTech(tech.slice(0, -1));
                }
              }}
              placeholder={t("techStackHint")}
              className="flex-1 min-w-32 border-0 bg-transparent text-sm outline-none"
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="github_url">{t("githubUrl")}</Label>
          <Input
            id="github_url"
            type="url"
            {...register("github_url")}
            disabled={locked}
            placeholder="https://github.com/…"
            className="mt-1.5"
            dir="ltr"
          />
        </div>
        <div>
          <Label htmlFor="demo_url">{t("demoUrl")}</Label>
          <Input
            id="demo_url"
            type="url"
            {...register("demo_url")}
            disabled={locked}
            placeholder="https://…"
            className="mt-1.5"
            dir="ltr"
          />
        </div>
        <div>
          <Label htmlFor="video_url">{t("videoUrl")}</Label>
          <Input
            id="video_url"
            type="url"
            {...register("video_url")}
            disabled={locked}
            placeholder="https://…"
            className="mt-1.5"
            dir="ltr"
          />
        </div>
        <div>
          <Label htmlFor="slides_url">{t("slidesUrl")}</Label>
          <Input
            id="slides_url"
            type="url"
            {...register("slides_url")}
            disabled={locked}
            placeholder="https://…"
            className="mt-1.5"
            dir="ltr"
          />
        </div>
      </div>

      {submission && (
        <FileUploader
          locale={locale}
          submissionId={submission.id}
          teamId={teamId}
          eventId={eventId}
          attachments={(submission.attachments ?? []) as SubmissionAttachment[]}
          locked={locked}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={pending || locked}
          onClick={handleSubmit((v) => save(v, false))}
        >
          {t("saveDraft")}
        </Button>
        {isLeader && (
          <Button
            type="button"
            variant="secondary"
            disabled={pending || locked}
            onClick={handleSubmit((v) => {
              if (confirm(t("confirmSubmit"))) save(v, true);
            })}
          >
            {t("submitFinal")}
          </Button>
        )}
        {lastSaved && (
          <span className="text-xs text-stone-500">
            {t("lastSaved", { when: lastSaved.toLocaleTimeString(locale) })}
          </span>
        )}
      </div>
    </form>
  );
}
