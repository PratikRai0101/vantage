import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useReplay, useReplayClock } from "@/state/ReplayProvider";
import { useTheme } from "@/theme/ThemeContext";
import { formatGap, lastCompletedLap } from "@/replay";
import { Button, Header, Label, Rule, Screen, ui } from "@/components/race-ui";
import { ReplayTransport, selectionHaptic } from "@/components/replay-controls";
import { ageText, lapTime, teamColor } from "@/components/replay-format";

export function TimingScreen() {
  const { engine, state } = useReplay();
  const time = useReplayClock();
  const { colors, brand } = useTheme();
  const [interval, setInterval] = useState(false);
  // Core owns recorded rank ordering. Never derive rank from scene coordinates.
  const rows = engine.standings(time);
  return (
    <Screen>
      <Header title="Timing" />
      <ReplayTransport />
      <View style={ui.section}>
        <View style={[ui.row, { gap: 12, flexWrap: "wrap" }]}>
          <Label size={22} style={{ fontWeight: "600" }}>
            Recorded order
          </Label>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Button selected={!interval} onPress={() => setInterval(false)}>
              Gap
            </Button>
            <Button selected={interval} onPress={() => setInterval(true)}>
              Interval
            </Button>
          </View>
        </View>
        <Label muted size={13}>
          20 drivers · select an eligible driver to view on Race
        </Label>
        <View style={ui.row}>
          <Label mono size={11} muted>
            POS / DRIVER
          </Label>
          <Label mono size={11} muted>
            {interval ? "TO CAR AHEAD" : "TO LEADER"}
          </Label>
        </View>
      </View>
      <Rule />
      {rows.map((item) => {
        const driver = item.driver;
        const isSelected = driver.number === state.selected;
        const gap = item.gap;
        const completed = lastCompletedLap(driver, time);
        const intervalValue = gap?.[2];
        const gapLabel = interval
          ? item.position === 1
            ? "Leader"
            : typeof intervalValue === "number" &&
                Number.isFinite(intervalValue)
              ? `+${intervalValue.toFixed(3)}s`
              : typeof intervalValue === "string"
                ? intervalValue
                : "—"
          : formatGap(gap, item.position);
        return (
          <Pressable
            key={driver.number}
            disabled={!driver.available}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !driver.available,
              selected: isSelected,
            }}
            accessibilityLabel={`Position ${item.position ?? "unknown"}, ${driver.name}, ${gapLabel}${driver.available ? ". View on Race" : ". Stationary stream, unavailable for selection"}`}
            onPress={() => {
              engine.selectDriver(driver.number);
              selectionHaptic();
              router.navigate("/");
            }}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 8,
              marginHorizontal: -8,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.separator,
              backgroundColor: isSelected
                ? colors.secondaryBackground
                : "transparent",
              opacity: driver.available ? 1 : 0.48,
            }}
          >
            <View style={[ui.row, { gap: 10, alignItems: "flex-start" }]}>
              <Label mono muted size={15} style={{ width: 28 }}>
                {item.position ?? "—"}
              </Label>
              <View
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: teamColor(
                    driver.color,
                    colors.secondaryText,
                  ),
                  paddingLeft: 10,
                  flex: 1,
                }}
              >
                <Label
                  mono
                  size={17}
                  style={{ color: isSelected ? brand.primary : colors.text }}
                >
                  {driver.code ?? driver.number}
                </Label>
                <Label muted size={11}>
                  {driver.available
                    ? `${driver.name ?? "—"}`
                    : "Stationary / unavailable"}
                </Label>
              </View>
              <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
                <Label mono size={17}>
                  {gapLabel}
                </Label>
                <Label mono muted size={11}>
                  {gap ? ageText(time - gap[0]) : "No gap event"}
                </Label>
              </View>
            </View>
            <View
              style={[
                ui.row,
                { marginTop: 8, marginLeft: 38, gap: 8, flexWrap: "wrap" },
              ]}
            >
              <Label mono muted size={11}>
                LAST {lapTime(completed?.duration)}
              </Label>
              <Label mono muted size={11}>
                {item.stint?.compound ?? "—"} · LAP {item.lap?.number ?? "—"}
              </Label>
            </View>
          </Pressable>
        );
      })}
      <View style={ui.section}>
        <Label muted size={13}>
          Ranks and intervals are sparse recorded events, not inferred from the
          miniature. Their source ages can differ from telemetry. Last lap means
          the most recent lap completed before this cursor.
        </Label>
        <Label muted size={11}>
          RIC / ALB / ZHO retain recorded rank history but have stationary
          streams in this window. This is not a DNF classification.
        </Label>
      </View>
    </Screen>
  );
}
export default TimingScreen;
