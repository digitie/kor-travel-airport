from __future__ import annotations

import sys
from argparse import Namespace
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[2] / "scripts"))

from observe_cutover import validate_observation_gate_args  # noqa: E402
from verify_cutover import latest_lot_history, validate_release_gate_args  # noqa: E402


def strict_args() -> Namespace:
    return Namespace(
        max_age_seconds=300,
        max_source_lag_seconds=300,
        max_run_gap_seconds=300,
        samples=7,
        sample_interval_seconds=50,
    )


def test_release_cutover_thresholds_are_fixed() -> None:
    validate_release_gate_args(strict_args())

    relaxed = strict_args()
    relaxed.max_run_gap_seconds = 301
    with pytest.raises(ValueError, match="fixed at 300"):
        validate_release_gate_args(relaxed)


def test_release_observation_shape_is_fixed() -> None:
    validate_observation_gate_args(strict_args())

    relaxed = strict_args()
    relaxed.samples = 2
    with pytest.raises(ValueError, match="fixed at 7"):
        validate_observation_gate_args(relaxed)


@pytest.mark.asyncio
async def test_lot_history_records_the_response_check_time() -> None:
    class FakeClient:
        async def get(self, *_args, **_kwargs):
            class Response:
                def raise_for_status(self) -> None:
                    return None

                def json(self) -> dict[str, object]:
                    return {"items": [{"observed_at": "2026-08-22T06:25:00Z"}]}

            return Response()

    result = await latest_lot_history(
        FakeClient(),
        "http://target",
        "ICN",
        {"id": 30, "legacy_source_lot_id": "51", "name": "T2 P1"},
        1,
    )

    assert result[0:5] == ("ICN", "51", "T2 P1", result[3], None)
    assert result[5].tzinfo is not None
