"use client";

import { BackupPanel } from "@/components/backup-panel";
import { useDashboard } from "@/lib/dashboard-context";

export function BackupView() {
  const { api } = useDashboard();

  return (
    <div className="page-shell">
      <BackupPanel
        listBackups={api.listBackups}
        createBackup={api.createBackup}
        downloadBackup={api.downloadBackup}
        restoreBackup={api.restoreBackup}
        defaultOpen
      />
    </div>
  );
}
