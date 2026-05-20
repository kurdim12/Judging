"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  removeAttachmentAction,
  uploadAttachmentAction,
} from "@/lib/actions/submissions";
import type { Locale } from "@/i18n";
import type { SubmissionAttachment } from "@/types/database";

const MAX_FILES = 5;
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = /\.(pdf|zip|pptx|png|jpe?g|mp4)$/i;

export function FileUploader({
  locale,
  submissionId,
  attachments,
  locked,
}: {
  locale: string;
  submissionId: string;
  attachments: SubmissionAttachment[];
  locked: boolean;
}) {
  const t = useTranslations("submission");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || locked) return;
    const remaining = MAX_FILES - attachments.length;
    if (remaining <= 0) return toast.error("Max 5 files");

    for (const file of Array.from(files).slice(0, remaining)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: > 50 MB`);
        continue;
      }
      if (!ALLOWED.test(file.name)) {
        toast.error(`${file.name}: unsupported type`);
        continue;
      }
      const fd = new FormData();
      fd.append("submission_id", submissionId);
      fd.append("file", file);
      const result = await uploadAttachmentAction(fd);
      if (!result.ok) {
        toast.error(result.error ?? tErr("uploadFailed"));
        continue;
      }
      toast.success(file.name);
    }
    router.refresh();
  }

  function remove(path: string) {
    start(async () => {
      const result = await removeAttachmentAction(submissionId, path);
      if (!result.ok) {
        toast.error(result.error ?? tErr("generic"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <p className="text-sm font-medium text-stone-700 mb-2">{t("attachments")}</p>
      {attachments.length > 0 && (
        <ul className="space-y-2 mb-3">
          {attachments.map((a) => (
            <li
              key={a.path}
              className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            >
              <a
                href={`/${locale}/files/${encodeURIComponent(a.path)}`}
                target="_blank"
                rel="noreferrer"
                className="text-ieee-600 hover:underline truncate"
              >
                {a.name}
              </a>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>{(a.size / 1024 / 1024).toFixed(1)} MB</span>
                {!locked && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(a.path)}
                    disabled={pending}
                  >
                    ×
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!locked && attachments.length < MAX_FILES && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-md border-2 border-dashed px-4 py-6 text-center text-sm ${
            dragging
              ? "border-ieee-500 bg-ieee-50 text-ieee-700"
              : "border-stone-300 text-stone-500 hover:border-ieee-400 hover:bg-ieee-50/40"
          }`}
        >
          {t("uploadHint")}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.zip,.pptx,.png,.jpg,.jpeg,.mp4"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}
