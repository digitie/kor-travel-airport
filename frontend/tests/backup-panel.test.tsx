import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BackupPanel } from "@/components/backup-panel";

const emptyBackupList = { items: [] };

function renderPanel(
  listBackups: () => Promise<{ items: never[] }>,
  overrides: Partial<{
    restoreBackup: (file: File) => Promise<import("@/lib/types").BackupRestoreResponse>;
  }> = {}
) {
  return render(
    <BackupPanel
      listBackups={listBackups}
      createBackup={async () => ({ filename: "new.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" })}
      downloadBackup={async () => new Blob(["dump"])}
      restoreBackup={
        overrides.restoreBackup ??
        (async () => ({
          status: "restored" as const,
          restored_from: { filename: "uploaded.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
          pre_restore_backup: { filename: "pre.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
        }))
      }
    />
  );
}

function makeDumpFile(name = "uploaded.dump") {
  return new File(["dump-bytes"], name, { type: "application/octet-stream" });
}

describe("BackupPanel", () => {
  test("does not show an empty state until the backup list succeeds", async () => {
    let resolveList: ((value: typeof emptyBackupList) => void) | undefined;
    const listBackups = vi.fn(
      () => new Promise<typeof emptyBackupList>((resolve) => {
        resolveList = resolve;
      })
    );
    const user = userEvent.setup();

    renderPanel(listBackups);
    await user.click(screen.getByRole("button", { name: /백업 \/ 복원/ }));

    expect(screen.getByTestId("backup-loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("backup-empty-state")).not.toBeInTheDocument();

    resolveList?.(emptyBackupList);
    await waitFor(() => expect(screen.getByTestId("backup-empty-state")).toBeInTheDocument());
  });

  test("does not turn a failed list request into an empty state", async () => {
    const listBackups = vi.fn(async () => {
      throw new Error("backend unavailable");
    });
    const user = userEvent.setup();

    renderPanel(listBackups);
    await user.click(screen.getByRole("button", { name: /백업 \/ 복원/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("backend unavailable");
    expect(screen.queryByTestId("backup-loading-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("backup-empty-state")).not.toBeInTheDocument();
  });

  test("selecting a .dump file opens a confirm dialog without restoring yet", async () => {
    const restoreBackup = vi.fn(async () => ({
      status: "restored" as const,
      restored_from: { filename: "uploaded.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
      pre_restore_backup: undefined,
    }));
    const user = userEvent.setup();

    renderPanel(async () => emptyBackupList, { restoreBackup });
    await user.click(screen.getByRole("button", { name: /백업 \/ 복원/ }));
    await screen.findByTestId("backup-empty-state");

    await user.upload(screen.getByLabelText(".dump 복원"), makeDumpFile());

    expect(await screen.findByRole("alertdialog")).toHaveTextContent("uploaded.dump");
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  test("isolates the rest of the panel while the confirm dialog is open", async () => {
    const user = userEvent.setup();

    renderPanel(async () => emptyBackupList);
    await user.click(screen.getByRole("button", { name: /백업 \/ 복원/ }));
    await screen.findByTestId("backup-empty-state");

    // Before the dialog opens, the background actions are live and enabled.
    expect(screen.getByRole("button", { name: "새 백업 만들기" })).toBeEnabled();

    await user.upload(screen.getByLabelText(".dump 복원"), makeDumpFile());
    await screen.findByRole("alertdialog");

    // Base UI marks the rest of the page `inert` while the alert dialog is open,
    // so the background controls drop out of the accessibility tree entirely
    // (a stronger guarantee than a plain `disabled` attribute) - this is what
    // stands in for window.confirm()'s old thread-blocking isolation.
    expect(screen.queryByRole("button", { name: "새 백업 만들기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "목록 새로고침" })).not.toBeInTheDocument();
  });

  test("cancelling the confirm dialog does not restore and clears the file input", async () => {
    const restoreBackup = vi.fn(async () => ({
      status: "restored" as const,
      restored_from: { filename: "uploaded.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
      pre_restore_backup: undefined,
    }));
    const user = userEvent.setup();

    renderPanel(async () => emptyBackupList, { restoreBackup });
    await user.click(screen.getByRole("button", { name: /백업 \/ 복원/ }));
    await screen.findByTestId("backup-empty-state");

    const fileInput = screen.getByLabelText<HTMLInputElement>(".dump 복원");
    await user.upload(fileInput, makeDumpFile());
    await screen.findByRole("alertdialog");

    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(restoreBackup).not.toHaveBeenCalled();
    expect(fileInput.value).toBe("");
  });

  test("confirming the dialog restores exactly once and reports the result", async () => {
    const restoreBackup = vi.fn(async () => ({
      status: "restored" as const,
      restored_from: { filename: "uploaded.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
      pre_restore_backup: { filename: "pre.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
    }));
    const user = userEvent.setup();

    renderPanel(async () => emptyBackupList, { restoreBackup });
    await user.click(screen.getByRole("button", { name: /백업 \/ 복원/ }));
    await screen.findByTestId("backup-empty-state");

    await user.upload(screen.getByLabelText(".dump 복원"), makeDumpFile());
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "계속" }));

    expect(restoreBackup).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/복원했습니다: uploaded\.dump/)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
