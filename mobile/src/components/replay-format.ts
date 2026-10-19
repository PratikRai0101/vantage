import type { DriverSnapshot } from "@/replay";
export function numberText(
  value: number | null | undefined,
  suffix = "",
): string {
  return value == null || !Number.isFinite(value)
    ? "—"
    : `${Math.round(value)}${suffix}`;
}
export function ageText(age: number | null | undefined): string {
  return age == null || !Number.isFinite(age)
    ? "No source sample"
    : `${Math.max(0, age).toFixed(1)}s old`;
}
export function lapTime(duration: number | null | undefined): string {
  if (duration == null || !Number.isFinite(duration) || duration < 0)
    return "—";
  const ms = Math.round(duration * 1000);
  return `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, "0")}`;
}
export function brakeText(value: DriverSnapshot["brake"]): string {
  return value === 1 ? "On" : value === 0 ? "Off" : "—";
}
export function teamColor(
  color: string | null | undefined,
  fallback: string,
): string {
  return color && /^#?[0-9a-f]{6}$/i.test(color)
    ? `#${color.replace("#", "")}`
    : fallback;
}
