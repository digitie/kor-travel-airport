"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BackupFile, BackupRestoreResponse } from "@/lib/types";

type BackupPanelProps = {
  listBackups: () => Promise<{ items: BackupFile[] }>;
  createBackup: () => Promise<BackupFile>;
  downloadBackup: (filename: string) => Promise<Blob>;
  restoreBackup: (file: File) => Promise<BackupRestoreResponse>;
};

type BackupListState = "idle" | "loading" | "ready" | "error";

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function BackupPanel({ listBackups, createBackup, downloadBackup, restoreBackup }: BackupPanelProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BackupFile[]>([]);
  const [listState, setListState] = useState<BackupListState>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    setListState("loading");
    try {
      const response = await listBackups();
      setItems(response.items);
      setListState("ready");
    } catch (caughtError) {
      setItems([]);
      setListState("error");
      setError(caughtError instanceof Error ? caughtError.message : "백업 목록을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [listBackups]);

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createBackup();
      setMessage(`백업을 만들었습니다: ${created.filename}`);
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "백업을 만들지 못했습니다.");
      setBusy(false);
    }
  }

  async function handleDownload(filename: string) {
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadBackup(filename);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setMessage(`다운로드를 시작했습니다: ${filename}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "백업을 다운로드하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function clearRestoreInput() {
    if (restoreInputRef.current) {
      restoreInputRef.current.value = "";
    }
  }

  function handleRestoreFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    setPendingRestoreFile(file);
  }

  function cancelRestore() {
    setPendingRestoreFile(null);
    clearRestoreInput();
  }

  async function confirmRestore() {
    const file = pendingRestoreFile;
    if (!file) {
      return;
    }
    setPendingRestoreFile(null);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const restored = await restoreBackup(file);
      const rollback = restored.pre_restore_backup
        ? `복원 전 자동 백업: ${restored.pre_restore_backup.filename}. `
        : "복원 전 자동 백업이 생성되었습니다. ";
      setMessage(`${rollback}복원했습니다: ${restored.restored_from.filename}. 화면을 새로고침하면 최신 상태를 확인할 수 있습니다.`);
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "백업을 복원하지 못했습니다.");
      setBusy(false);
    } finally {
      clearRestoreInput();
    }
  }

  return (
    <section className="backup-panel" data-testid="backup-panel">
      <button
        type="button"
        className="backup-panel-trigger"
        aria-expanded={open}
        aria-controls="backup-panel-body"
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <strong>백업 / 복원</strong>
          <small>PostgreSQL 스냅샷 관리 · 내부 운영용</small>
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      <p className="backup-panel-warning" role="note">
        별도 인증 없이 제공되는 운영 도구이며 데이터 덮어쓰기가 가능합니다. 외부 공개 금지 · 신뢰된 네트워크에서만 사용하세요.
      </p>

      {open ? (
        <div className="backup-panel-body" id="backup-panel-body">
          <p className="backup-panel-note">
            복원은 현재 PostgreSQL 데이터를 덮어쓰며, 서버가 자동 백업을 먼저 만든 뒤 진행합니다.
          </p>
          <div className="backup-panel-actions">
            <Button
              type="button"
              className="button"
              onClick={() => void handleCreate()}
              disabled={busy || pendingRestoreFile !== null}
            >
              {busy ? "처리 중…" : "새 백업 만들기"}
            </Button>
            <label className={cn(buttonVariants({ variant: "secondary" }), "button secondary backup-upload-label")}>
              .dump 복원
              <input
                ref={restoreInputRef}
                type="file"
                accept=".dump,application/octet-stream"
                onChange={(event) => handleRestoreFileSelected(event.currentTarget.files?.[0])}
                disabled={busy || pendingRestoreFile !== null}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              className="button secondary"
              onClick={() => void refresh()}
              disabled={busy || pendingRestoreFile !== null}
            >
              목록 새로고침
            </Button>
          </div>
          {message ? <p className="backup-panel-message" aria-live="polite">{message}</p> : null}
          {error ? (
            <Alert className="backup-panel-error" variant="destructive">
              {error}
            </Alert>
          ) : null}
          <AlertDialog
            open={pendingRestoreFile !== null}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) {
                cancelRestore();
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>PostgreSQL 데이터를 덮어씁니다</AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingRestoreFile?.name}(으)로 복원하면 현재 데이터를 덮어씁니다. 복원 전에 자동 백업을 먼저 만든 뒤 진행합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>취소</AlertDialogCancel>
                <AlertDialogAction disabled={busy} onClick={() => void confirmRestore()}>
                  계속
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {listState === "loading" ? (
            <p className="backup-panel-empty" data-testid="backup-loading-state" role="status">백업 목록을 불러오는 중입니다.</p>
          ) : listState === "ready" && items.length > 0 ? (
            <ul className="backup-list" data-testid="backup-list">
              {items.map((item) => (
                <li key={item.filename}>
                  <span>
                    <strong>{item.filename}</strong>
                    <small>
                      {formatBytes(item.size_bytes)} · {formatBackupTimestamp(item.created_at)} KST
                    </small>
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    className="text-button hover:no-underline"
                    onClick={() => void handleDownload(item.filename)}
                    disabled={busy}
                  >
                    다운로드
                  </Button>
                </li>
              ))}
            </ul>
          ) : listState === "ready" ? (
            <p className="backup-panel-empty" data-testid="backup-empty-state">저장된 백업이 없습니다.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
