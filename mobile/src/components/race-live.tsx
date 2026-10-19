import React from "react";
import { View } from "react-native";
import { useReplay, useReplayClock } from "@/state/ReplayProvider";
import { useTheme } from "@/theme/ThemeContext";
import { formatGap, lastCompletedLap } from "@/replay";
import { Label, MetricRow, ui } from "@/components/race-ui";
import { ageText, lapTime, numberText, teamColor } from "@/components/replay-format";

/**
 * Live readouts are deliberately the only parts of the Race screen subscribed to
 * the display clock. The screen, scene host and pickers stay structural, so a
 * playback tick cannot re-render (and stall behind) the whole view tree.
 */
export function RaceTitle() {
  const { engine, state } = useReplay();
  const time = useReplayClock();
  const driver = engine.driverSnapshot(state.selected, time)?.driver;
  const battle = engine.battlePartner(time, state.selected);
  const raceLap = engine
    .standings(time)
    .find((row) => row.position === 1 && row.driver.available)?.lap?.number;
  const title =
    state.camera === "overview"
      ? "The whole field"
      : state.camera === "follow"
        ? `Following ${driver?.code ?? "—"}`
        : `${driver?.code ?? "—"} / ${battle?.code ?? "—"}`;
  return (
    <View style={[ui.row, { gap: 12, flexWrap: "wrap" }]}>
      <Label size={17} style={{ fontWeight: "600" }}>
        {title}
      </Label>
      <Label mono muted size={13}>
        LAP {raceLap ?? "—"} / 53
      </Label>
    </View>
  );
}

export function LiveDriver() {
  const { engine, state } = useReplay();
  const time = useReplayClock();
  const { colors } = useTheme();
  const selected = engine.driverSnapshot(state.selected, time);
  const driver = selected?.driver;
  const completed = driver ? lastCompletedLap(driver, time) : null;
  return (
    <>
      <View
        style={[
          ui.row,
          {
            borderLeftWidth: 3,
            borderLeftColor: teamColor(driver?.color, colors.link),
            paddingLeft: 12,
            gap: 12,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Label size={22} style={{ fontWeight: "600" }}>
            {driver?.name ?? "No driver selected"}
          </Label>
          <Label size={13} muted>
            {driver?.team ?? "—"}
          </Label>
        </View>
        <Label mono size={22}>
          P{selected?.position ?? "—"}
        </Label>
      </View>
      <View
        style={[ui.row, { alignItems: "baseline", gap: 12, flexWrap: "wrap" }]}
      >
        <Label mono size={52} style={{ letterSpacing: -2, flexShrink: 1 }}>
          {numberText(selected?.speed)}
          <Label size={15} muted>
            {" "}
            km/h
          </Label>
        </Label>
        <Label mono size={17}>
          GEAR {numberText(selected?.gear)}
        </Label>
      </View>
      <Label muted mono size={11}>
        Telemetry · {ageText(selected?.age)}
        {selected && !selected.usable ? " · unavailable" : ""}
      </Label>
      <MetricRow
        title="Gap to leader"
        value={formatGap(selected?.gap, selected?.position ?? null)}
        secondary={
          selected?.gap
            ? ageText(time - selected.gap[0])
            : "No gap event"
        }
      />
      <MetricRow
        title="Current lap / compound"
        value={`${selected?.lap?.number ?? "—"} / ${selected?.stint?.compound ?? "—"}`}
      />
      <MetricRow
        title="Last completed lap"
        value={lapTime(completed?.duration)}
        secondary={
          completed?.number != null ? `Lap ${completed.number}` : undefined
        }
      />
    </>
  );
}
