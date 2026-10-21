"""Validate the cached historical fixture and prepared outputs without network access."""
import argparse
from datetime import datetime
import json
from pathlib import Path

PIPELINE = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--data-dir', type=Path, default=PIPELINE/'data')
parser.add_argument('--replay-dir', type=Path, default=PIPELINE.parent/'assets/replay')
args = parser.parse_args()

def load(directory, name):
    return json.loads((directory/name).read_text())

data = load(args.replay_dir, 'playback.json')
track = load(args.replay_dir, 'track.json')
history = load(args.data_dir, 'position-history.json')
base = load(args.data_dir, 'replay.json')
origin = datetime.fromisoformat(data['window']['start'].replace('Z', '+00:00'))
assert data['window']['duration'] == 120
assert len(history) == data['summary']['rawCounts']['positionHistory'] == 443
assert data['provenance']['positionHistory'] == load(args.data_dir, 'position-history-provenance.json')
assert data['provenance']['sources'] == load(args.data_dir, 'raw-provenance.json')
assert len(data['drivers']) == 20
assert sum(d['available'] for d in data['drivers']) == 17
assert sorted(d['code'] for d in data['drivers'] if not d['available']) == ['ALB', 'RIC', 'ZHO']
assert len(track['points']) == 1026
assert len(track['lengths']) == len(track['points'])+1
assert track['lengths'][0] == 0 and track['lengths'][-1] == track['length']
assert all(a < b for a, b in zip(track['lengths'], track['lengths'][1:]))
assert data['summary']['sampleCounts']['positions'] == sum(len(d['positions']) for d in data['drivers']) == 26
assert sum(len(d['route']) for d in data['drivers']) == 8075
original = {d['number']: d for d in base['drivers']}
for d in data['drivers']:
    number = d['number']
    for stream in ('location', 'telemetry', 'intervals', 'laps', 'stints'):
        assert d[stream] == original[number][stream], (number, stream)
    for stream in ('location', 'telemetry', 'positions', 'intervals'):
        rows = d[stream]
        times = [r[0] for r in rows]
        assert times == sorted(times), (number, stream, 'order')
        coverage = d['coverage'][stream]
        assert coverage['count'] == len(rows), (number, stream, 'count')
        assert coverage['inWindowCount'] == sum(0 <= t <= 120 for t in times), (number, stream, 'window count')
        assert coverage['first'] == (times[0] if times else None)
        assert coverage['last'] == (times[-1] if times else None)
    events = sorted([round((datetime.fromisoformat(r['date'].replace('Z', '+00:00'))-origin).total_seconds(), 6), r.get('position')]
                    for r in history if r['driver_number'] == number)
    seeds = [r for r in events if r[0] <= 0]
    assert seeds and d['coverage']['positions']['historySeeded']
    assert d['positions'] == [seeds[-1]]+[r for r in events if 0 < r[0] <= 120], number
    if d['available']:
        assert [r[0] for r in d['route']] == [r[0] for r in d['location']], number
        assert all(0 <= r[1] < 1 and r[2] >= 0 for r in d['route'])
        assert all(abs((b[1]-a[1]+.5) % 1-.5) < .025 for a, b in zip(d['route'], d['route'][1:])), number
    else:
        assert d['route'] == []
print('Validated: 20 drivers, 17 moving streams, 443 historical ranks, 26 prepared ranks, 8075 route samples.')
