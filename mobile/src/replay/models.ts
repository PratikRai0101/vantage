export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };
export type LocationSample = readonly [time: number, x: number, y: number, z: number];
export type TelemetrySample = readonly [time: number, speed: number | null, throttle: number | null, brake: 0 | 1 | null, gear: number | null, rpm: number | null];
export type RouteSample = readonly [time: number, phase: number, projectionError: number];
export type PositionEvent = readonly [time: number, position: number];
export type GapValue = number | string | null;
export type IntervalEvent = readonly [time: number, gapToLeader: GapValue, interval: GapValue];
export type Lap = Readonly<{ start: number | null; number: number | null; duration: number | null }>;
export type Stint = Readonly<{ number: number | null; lapStart: number | null; lapEnd: number | null; compound: string | null; tyreAgeAtStart: number | null }>;
export type StreamCoverage = Readonly<{ count: number; inWindowCount: number; first: number | null; last: number | null; maxSampleGapSeconds?: number | null; gapsOver2Seconds?: number; leadingGapSeconds?: number; trailingGapSeconds?: number; distinctCoordinatesInWindow?: number; speedRangeInWindow?: readonly (number | null)[]; historySeeded?: boolean }>;
export type Driver = Readonly<{
  number: number; code: string | null; name: string | null; team: string | null; color: string | null;
  available: boolean; motionStatus: 'moving' | 'stationary_or_stale' | 'missing_location' | 'missing_telemetry'; unavailableReason: string | null;
  location: readonly LocationSample[]; telemetry: readonly TelemetrySample[]; route: readonly RouteSample[];
  positions: readonly PositionEvent[]; intervals: readonly IntervalEvent[]; laps: readonly Lap[]; stints: readonly Stint[];
  coverage: Readonly<{ location: StreamCoverage; telemetry: StreamCoverage; positions: StreamCoverage; intervals: StreamCoverage }>;
  routeRepresentation?: string;
}>;
export type ReplayDataset = Readonly<{
  schemaVersion: 1; session: JsonObject;
  window: Readonly<{ start: string; end: string; duration: number; samplePaddingSeconds: number; eventPaddingSeconds: number; positionSeed: string }>;
  drivers: readonly Driver[];
  summary: Readonly<{ driverCount: number; availableDrivers: readonly number[]; unavailableDrivers: readonly number[]; rawCounts: Readonly<Record<string, number>>; sampleCounts: Readonly<Record<string, number>>; [key: string]: JsonValue }>;
  provenance: JsonObject; calibration: JsonObject;
}>;
export type TrackData = Readonly<{ model: string; coordinates: string; points: readonly (readonly [number, number, number])[]; lengths: readonly number[]; length: number; source: string }>;
export type CameraMode = 'overview' | 'follow' | 'battle';
export type ReplayState = Readonly<{ time: number; playing: boolean; speed: number; selected: number; compare: number; camera: CameraMode }>;
export type RoutePosition = Readonly<{ phase: number; sampleTime: number; held: boolean }>;
export type DriverSnapshot = Readonly<{
  driver: Driver; time: number; route: RoutePosition | null; sampleTime: number | null;
  speed: number | null; throttle: number | null; brake: 0 | 1 | null; gear: number | null; rpm: number | null;
  position: number | null; gap: IntervalEvent | null; lap: Lap | null; stint: Stint | null; age: number | null; usable: boolean;
}>;
