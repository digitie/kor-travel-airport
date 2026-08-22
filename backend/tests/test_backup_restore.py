from __future__ import annotations

from pathlib import Path

import pytest

from app.services import backup_restore
from app.services.backup_restore import (
    BACKUP_NAME_PATTERN,
    _postgres_command_database,
    list_backups,
    remove_backup,
    save_uploaded_backup,
)


class FakeUpload:
    filename = "operator export.dump"

    def __init__(self, chunks: list[bytes]) -> None:
        self.chunks = iter(chunks)

    async def read(self, _size: int) -> bytes:
        return next(self.chunks, b"")


@pytest.mark.asyncio
async def test_uploaded_backup_is_safely_named_and_listed(tmp_path: Path) -> None:
    uploaded = await save_uploaded_backup(FakeUpload([b"dump", b"data"]), str(tmp_path))

    assert BACKUP_NAME_PATTERN.fullmatch(uploaded.filename)
    assert uploaded.size_bytes == 8
    items = await list_backups(str(tmp_path))
    assert [item.filename for item in items] == [uploaded.filename]


def test_pg_dump_url_does_not_expose_password_in_argv() -> None:
    safe_url, environment = _postgres_command_database("postgresql+asyncpg://operator:secret@postgres:5432/parking_radar")

    assert "secret" not in safe_url
    assert environment["PGPASSWORD"] == "secret"


@pytest.mark.asyncio
async def test_uploaded_backup_enforces_aggregate_storage_limit(tmp_path: Path) -> None:
    old_path = tmp_path / "parking-radar-20260101T000000Z.dump"
    old_path.write_bytes(b"old")

    uploaded = await save_uploaded_backup(
        FakeUpload([b"new"]),
        str(tmp_path),
        storage_limit_bytes=3,
    )

    assert old_path.exists() is False
    assert (tmp_path / uploaded.filename).exists()

    await remove_backup(str(tmp_path), uploaded.filename)
    assert (tmp_path / uploaded.filename).exists() is False


@pytest.mark.asyncio
async def test_upload_rejects_a_chunk_larger_than_aggregate_quota_before_deleting_backups(tmp_path: Path) -> None:
    old_path = tmp_path / "parking-radar-20260101T000000Z.dump"
    old_path.write_bytes(b"old")

    with pytest.raises(ValueError, match="aggregate"):
        await save_uploaded_backup(FakeUpload([b"too-large"]), str(tmp_path), storage_limit_bytes=3)

    assert old_path.exists()
    assert [item.filename for item in await list_backups(str(tmp_path))] == [old_path.name]


@pytest.mark.asyncio
async def test_upload_preserves_pre_restore_backup_when_quota_prunes_old_files(tmp_path: Path) -> None:
    pre_restore_path = tmp_path / "parking-radar-20260101T000000Z.dump"
    old_path = tmp_path / "parking-radar-20260102T000000Z.dump"
    pre_restore_path.write_bytes(b"pre")
    old_path.write_bytes(b"old")

    uploaded = await save_uploaded_backup(
        FakeUpload([b"new"]),
        str(tmp_path),
        storage_limit_bytes=6,
        protected_filenames={pre_restore_path.name},
    )

    assert pre_restore_path.exists()
    assert old_path.exists() is False
    assert (tmp_path / uploaded.filename).exists()


@pytest.mark.asyncio
async def test_create_backup_checks_dump_size_before_moving_into_backup_dir(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    old_path = tmp_path / "parking-radar-20260101T000000Z.dump"
    old_path.write_bytes(b"old")

    def fake_run(command: list[str], _timeout_seconds: int, _env: dict[str, str]) -> None:
        dump_path = Path(command[command.index("--file") + 1])
        dump_path.write_bytes(b"dump")

    monkeypatch.setattr(backup_restore, "_run_command", fake_run)

    created = await backup_restore.create_backup(
        str(tmp_path),
        "postgresql+asyncpg://operator:secret@postgres:5432/parking_radar",
        retention_count=14,
        timeout_seconds=30,
        storage_limit_bytes=4,
    )

    assert created.size_bytes == 4
    assert (tmp_path / created.filename).read_bytes() == b"dump"
    assert old_path.exists() is False
