"""Committed frontend fixtures must retain the live API's recursive shape."""

import json
from copy import deepcopy
from pathlib import Path

import pytest

from app.schemas.stitch import ErrorDetail
from scripts.export_contract_snapshots import generate_contract_snapshots

CONTRACT_DIR = Path(__file__).parents[3] / "frontend" / "src" / "fixtures" / "contract"


def _json_type(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    raise AssertionError(f"unsupported JSON value: {type(value).__name__}")


def _assert_same_shape(expected: object, actual: object, path: str = "$") -> None:
    assert _json_type(actual) == _json_type(expected), f"type changed at {path}"
    if isinstance(expected, dict) and isinstance(actual, dict):
        assert actual.keys() == expected.keys(), f"keys changed at {path}"
        for key in expected:
            _assert_same_shape(expected[key], actual[key], f"{path}.{key}")
    elif isinstance(expected, list) and isinstance(actual, list):
        assert len(actual) == len(expected), f"array length changed at {path}"
        for index, item in enumerate(expected):
            _assert_same_shape(item, actual[index], f"{path}[{index}]")


def _assert_snapshot_shape(name: str, expected: object, actual: object) -> None:
    try:
        _assert_same_shape(expected, actual)
    except AssertionError as exc:
        raise AssertionError(f"{name}: {exc}. Run make contract-snapshots") from exc


def test_error_detail_accepts_pair_lists() -> None:
    detail = ErrorDetail(code="PAIR", message="pair", context={"pair": [0, 1]})
    assert detail.context == {"pair": [0, 1]}


def test_four_contract_snapshots_are_committed() -> None:
    assert {path.name for path in CONTRACT_DIR.glob("*.json")} == {
        "config.json",
        "stitch-success.json",
        "error-too-few-images.json",
        "error-insufficient-inliers.json",
    }


def test_committed_snapshots_match_live_response_shapes() -> None:
    generated = generate_contract_snapshots()
    for name, actual in generated.items():
        expected = json.loads((CONTRACT_DIR / name).read_text(encoding="utf-8"))
        _assert_snapshot_shape(name, expected, actual)


def test_shape_failure_names_snapshot_and_regeneration_command() -> None:
    expected = json.loads((CONTRACT_DIR / "stitch-success.json").read_text(encoding="utf-8"))
    changed = deepcopy(expected)
    changed["diagnostics"]["renamed_stage_timings_ms"] = changed["diagnostics"].pop(  # type: ignore[index,union-attr]
        "stage_timings_ms"
    )
    with pytest.raises(
        AssertionError,
        match=r"(?s)stitch-success\.json: keys changed.*Run make contract-snapshots",
    ):
        _assert_snapshot_shape("stitch-success.json", expected, changed)
