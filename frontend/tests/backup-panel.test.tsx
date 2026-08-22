import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BackupPanel } from "@/components/backup-panel";

const emptyBackupList = { items: [] };

function renderPanel(listBackups: () => Promise<{ items: never[] }>) {
  return render(
    <BackupPanel
      listBackups={listBackups}
      createBackup={async () => ({ filename: "new.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" })}
      downloadBackup={async () => new Blob(["dump"])}
      restoreBackup={async () => ({
        status: "restored" as const,
        restored_from: { filename: "uploaded.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
        pre_restore_backup: { filename: "pre.dump", size_bytes: 1, created_at: "2026-08-22T00:00:00Z" },
      })}
    />
  );
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
});
