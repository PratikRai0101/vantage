#!/usr/bin/env python3
"""Import a bounded historical OpenF1 fixture; see ../data/SOURCES.md.

No dependencies, credentials, live-feed polling, resampling, or geometry alignment.
Run: python3 mobile/pipeline/scripts/import_openf1.py --offline
Cached successful responses are reused unless --refresh is supplied.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import json
import math
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://api.openf1.org/v1/"
DATA = Path(__file__).resolve().parents[1] / "data"
ORIGIN = datetime(2024, 4, 7, 5, 55, tzinfo=timezone.utc)
END = ORIGIN + timedelta(seconds=120)
SESSION = 9496
SPACING = 2.2  # <= 28 requests/minute, including retries; never parallel.
_last_request = 0.0


def iso(dt):
    return dt.isoformat().replace("+00:00", "Z")


def timestamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def elapsed(value):
    return round((timestamp(value) - ORIGIN).total_seconds(), 6)


def save(name, value, compact=False):
    path = DATA / name
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w") as handle:
        json.dump(value, handle, ensure_ascii=False, allow_nan=False,
                  separators=(",", ":") if compact else None,
                  indent=None if compact else 2)
        handle.write("\n")
    temporary.replace(path)


def fetch(endpoint, params, filename, manifest, refresh, offline=False):
    global _last_request
    url = BASE + endpoint + "?" + urllib.parse.urlencode(params)
    prior = manifest.get(filename)
    path = DATA / filename
    if not refresh and path.exists() and prior and prior.get("url") == url and prior.get("status") == "ok":
        with path.open() as handle:
            cached = json.load(handle)
        print(f"cache {filename}: {len(cached)} rows", flush=True)
        return cached
    if offline:
        raise RuntimeError(f"Offline cache missing or provenance mismatch: {filename}")
    error = None
    for attempt in range(3):  # initial attempt + at most two retries
        time.sleep(max(0, SPACING - (time.monotonic() - _last_request)))
        _last_request = time.monotonic()
        retry_after = None
        print(f"GET {url} (attempt {attempt + 1})", flush=True)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LocalHistoricalReplayPrototype/1.0", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=40) as response:
                result = json.load(response)
            if not isinstance(result, list):
                raise ValueError("Expected a JSON array")
            save(filename, result, compact=True)
            manifest[filename] = {"url": url, "fetchedAt": iso(datetime.now(timezone.utc)),
                                  "status": "ok", "rows": len(result), "attempts": attempt + 1}
            save("raw-provenance.json", manifest)
            print(f"saved {filename}: {len(result)} rows", flush=True)
            return result
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            error = f"{type(exc).__name__}: {exc}"
            print(error, file=sys.stderr, flush=True)
            if isinstance(exc, urllib.error.HTTPError):
                try:
                    retry_after = float(exc.headers.get("Retry-After", "0"))
                except ValueError:
                    pass
                if exc.code not in (408, 429, 500, 502, 503, 504):
                    break
            if attempt < 2:
                # Do not exceed the local time budget for long server embargoes.
                if retry_after and retry_after > 20:
                    break
                time.sleep(max(3 * (2 ** attempt), retry_after or 0))
    manifest[filename] = {"url": url, "attemptedAt": iso(datetime.now(timezone.utc)),
                          "status": "failed", "error": error}
    save("raw-provenance.json", manifest)
    return []  # An error is explicitly recorded, never fabricated as successful data.


def window_params(pad):
    # OpenF1's documented `date>=...` URL is the key `date>` plus
    # the query separator `=` (not a key named `date>=`).
    return {"session_key": SESSION, "date>": iso(ORIGIN - timedelta(seconds=pad)),
            "date<": iso(END + timedelta(seconds=pad))}


def stream_stats(samples, event=False):
    times = [row[0] for row in samples]
    assert times == sorted(times), "Unsorted stream"
    assert all(math.isfinite(t) for t in times), "Invalid timestamp"
    inside = [t for t in times if 0 <= t <= 120]
    stats = {"count": len(times), "inWindowCount": len(inside),
             "first": times[0] if times else None, "last": times[-1] if times else None}
    if not event:
        # Boundary gaps quantify uncovered time; no interpolated samples are created.
        gaps = [round(b - a, 6) for a, b in zip(inside, inside[1:])]
        stats.update({"maxSampleGapSeconds": max(gaps, default=None),
                      "gapsOver2Seconds": sum(gap > 2 for gap in gaps),
                      "leadingGapSeconds": round(inside[0], 6) if inside else 120,
                      "trailingGapSeconds": round(120 - inside[-1], 6) if inside else 120})
    return stats


def main():
    global DATA
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Refetch even successfully cached raw files")
    parser.add_argument("--offline", action="store_true", help="Require cached responses; never access the network")
    parser.add_argument("--data-dir", type=Path, default=DATA, help="Raw cache and intermediate output directory")
    args = parser.parse_args()
    if args.offline and args.refresh:
        parser.error("--offline and --refresh cannot be combined")
    DATA = args.data_dir.resolve()
    DATA.mkdir(parents=True, exist_ok=True)
    manifest_path = DATA / "raw-provenance.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    requests = [
        ("sessions", {"year": 2024, "circuit_short_name": "Suzuka", "session_name": "Race"}, "session-query.json"),
        ("drivers", {"session_key": SESSION}, "drivers.json"),
        ("location", window_params(2), "location.json"),
        ("car_data", window_params(2), "car_data.json"),
        ("position", window_params(30), "position.json"),
        ("intervals", window_params(30), "intervals.json"),
        ("laps", {"session_key": SESSION}, "laps.json"),
        ("stints", {"session_key": SESSION}, "stints.json"),
    ]
    raw = {endpoint: fetch(endpoint, params, filename, manifest, args.refresh, args.offline)
           for endpoint, params, filename in requests}
    indexed = {}
    for endpoint in raw:
        index = defaultdict(list)
        for row in raw[endpoint]:
            if row.get("driver_number") is not None:
                index[int(row["driver_number"])].append(row)
        indexed[endpoint] = index
    drivers = []
    dropped = Counter()

    def samples(endpoint, number, fields):
        values = []
        for row in indexed[endpoint][number]:
            if not row.get("date"):
                dropped[endpoint + ":missing_date"] += 1
                continue
            t = elapsed(row["date"])
            padding = 2 if endpoint in ("location", "car_data") else 30
            if not -padding <= t <= 120 + padding:
                dropped[endpoint + ":outside_requested_bounds"] += 1
                continue
            value = [row.get(key) for key in fields]
            if endpoint == "car_data" and value[2] is not None:
                value[2] = int(value[2] > 0)  # OpenF1 brake is 0/100; replay uses 0/1.
            values.append([t, *value])
        return sorted(values, key=lambda row: row[0])

    for number, records in sorted(indexed["drivers"].items()):
        driver = records[-1]
        location = samples("location", number, ("x", "y", "z"))
        telemetry = samples("car_data", number, ("speed", "throttle", "brake", "n_gear", "rpm"))
        positions = samples("position", number, ("position",))
        intervals = samples("intervals", number, ("gap_to_leader", "interval"))
        laps = [{"start": elapsed(row["date_start"]) if row.get("date_start") else None,
                 "number": row.get("lap_number"), "duration": row.get("lap_duration")}
                for row in indexed["laps"][number]]
        laps.sort(key=lambda row: (row["number"] is None, row["number"] or 0))
        stints = [{"number": row.get("stint_number"), "lapStart": row.get("lap_start"),
                   "lapEnd": row.get("lap_end"), "compound": row.get("compound"),
                   "tyreAgeAtStart": row.get("tyre_age_at_start")}
                  for row in indexed["stints"][number]]
        stints.sort(key=lambda row: row["number"] or 0)
        coverage = {"location": stream_stats(location), "telemetry": stream_stats(telemetry),
                    "positions": stream_stats(positions, event=True),
                    "intervals": stream_stats(intervals, event=True)}
        in_window_location = [row for row in location if 0 <= row[0] <= 120]
        in_window_telemetry = [row for row in telemetry if 0 <= row[0] <= 120]
        speeds = [row[1] for row in in_window_telemetry if row[1] is not None]
        coordinate_count = len({tuple(row[1:]) for row in in_window_location})
        if not in_window_location:
            motion_status = "missing_location"
            reason = "No recorded location in the replay window; no position synthesized."
        elif not speeds:
            motion_status = "missing_telemetry"
            reason = "No recorded speed in the replay window; moving-car eligibility unknown."
        elif max(speeds) <= 0 or coordinate_count <= 1:
            motion_status = "stationary_or_stale"
            reason = "No positive recorded speed or no coordinate movement in this window; not an active moving car. Samples retained; this is not an official retirement classification."
        else:
            motion_status, reason = "moving", None
        coverage["location"]["distinctCoordinatesInWindow"] = coordinate_count
        coverage["telemetry"]["speedRangeInWindow"] = [min(speeds), max(speeds)] if speeds else None
        drivers.append({"number": number, "code": driver.get("name_acronym"),
                        "name": driver.get("full_name"), "team": driver.get("team_name"),
                        "color": "#" + driver["team_colour"] if driver.get("team_colour") else None,
                        "available": motion_status == "moving", "motionStatus": motion_status,
                        "unavailableReason": reason,
                        "location": location, "telemetry": telemetry, "positions": positions,
                        "intervals": intervals, "laps": laps, "stints": stints, "coverage": coverage})
    driver_numbers = {driver["number"] for driver in drivers}
    unknown = {key: sorted(set(indexed[key]) - driver_numbers) for key in
               ("location", "car_data", "position", "intervals", "laps", "stints")}
    session = next((row for row in raw["sessions"] if row.get("session_key") == SESSION), {"session_key": SESSION})
    summary = {"driverCount": len(drivers), "availableDrivers": [d["number"] for d in drivers if d["available"]],
               "unavailableDrivers": [d["number"] for d in drivers if not d["available"]],
               "rawCounts": {key: len(value) for key, value in raw.items()},
               "sampleCounts": {key: sum(len(d[key]) for d in drivers) for key in
                                ("location", "telemetry", "positions", "intervals", "laps", "stints")},
               "driversWithNoSamples": {key: [d["number"] for d in drivers if not d[key]]
                                        for key in ("location", "telemetry", "positions", "intervals")},
               "driversWithNoInWindowSamples": {key: [d["number"] for d in drivers if not d["coverage"][key]["inWindowCount"]]
                                                for key in ("location", "telemetry", "positions", "intervals")},
               "unknownDriverNumbers": unknown, "droppedRows": dict(dropped),
               "failedFiles": [name for name, info in manifest.items() if info.get("status") != "ok"]}
    replay = {"schemaVersion": 1, "session": session,
              "window": {"start": iso(ORIGIN), "end": iso(END), "duration": 120,
                         "samplePaddingSeconds": 2, "eventPaddingSeconds": 30},
              "drivers": drivers, "summary": summary,
              "provenance": {"provider": "OpenF1", "generatedAt": iso(datetime.now(timezone.utc)),
                             "usage": "Personal/noncommercial local prototype only; commercial redistribution not cleared.",
                             "sources": manifest}}
    save("replay.json", replay, compact=True)
    save("validation.json", {**summary, "coverageByDriver": {str(d["number"]): d["coverage"] for d in drivers}})
    print(json.dumps(summary, indent=2), flush=True)
    if summary["failedFiles"] or not drivers or not summary["sampleCounts"]["location"] or not summary["sampleCounts"]["telemetry"]:
        print("Incomplete import: inspect raw-provenance.json and validation.json", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
