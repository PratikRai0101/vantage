import React from "react";
import { View } from "react-native";
import { useReplay, useReplayClock } from "@/state/ReplayProvider";
import {
  Header,
  Label,
  MetricRow,
  Rule,
  Screen,
  ui,
} from "@/components/race-ui";
import { DriverChooser, ReplayTransport } from "@/components/replay-controls";
import { SpeedChart } from "@/components/speed-chart";
import { ageText, brakeText, numberText } from "@/components/replay-format";

export function LabScreen() {
  const { engine, state, data } = useReplay();
  const time = useReplayClock();
  const selected = engine.driverSnapshot(state.selected, time);
  const compare = engine.driverSnapshot(state.compare, time);
  const firstCode = selected?.driver.code ?? "—";
  const secondCode = compare?.driver.code ?? "—";
  return (
    <Screen>
      <Header title="Telemetry" subtitle="Lab · Japanese Grand Prix" compact />
      <View style={[ui.row, { gap: 12, flexWrap: "wrap" }]}>
        <Label size={22} style={{ fontWeight: "600" }}>
          {firstCode} vs {secondCode}
        </Label>
        <Label mono muted size={11}>
          TIME ALIGNED
        </Label>
      </View>
      <ReplayTransport />
      <View style={{ marginTop: 12, gap: 8 }}>
        <DriverChooser />
        <DriverChooser compare />
      </View>
      <View style={{ marginTop: 16 }}>
        <SpeedChart
          first={selected?.driver}
          second={compare?.driver}
          duration={data.window.duration}
          time={time}
          seek={(time) => engine.seek(time)}
        />
      </View>
      <Rule />
      <Label mono muted size={11}>
        AT CURSOR · {time.toFixed(1)} SECONDS
      </Label>
      <MetricRow
        title="Speed"
        value={`${firstCode}  ${numberText(selected?.speed, " km/h")}`}
        secondary={`${secondCode}  ${numberText(compare?.speed, " km/h")}`}
      />
      <MetricRow
        title="Throttle"
        value={`${firstCode}  ${numberText(selected?.throttle, "%")}`}
        secondary={`${secondCode}  ${numberText(compare?.throttle, "%")}`}
      />
      <MetricRow
        title="Brake · binary"
        value={`${firstCode}  ${brakeText(selected?.brake ?? null)}`}
        secondary={`${secondCode}  ${brakeText(compare?.brake ?? null)}`}
      />
      <MetricRow
        title="Gear"
        value={`${firstCode}  ${numberText(selected?.gear)}`}
        secondary={`${secondCode}  ${numberText(compare?.gear)}`}
      />
      <MetricRow
        title="Engine"
        value={`${firstCode}  ${numberText(selected?.rpm, " rpm")}`}
        secondary={`${secondCode}  ${numberText(compare?.rpm, " rpm")}`}
      />
      <View style={ui.section}>
        <Label mono muted size={11}>
          {firstCode} source · {ageText(selected?.age)}
          {selected?.usable ? "" : " · unavailable"}
        </Label>
        <Label mono muted size={11}>
          {secondCode} source · {ageText(compare?.age)}
          {compare?.usable ? "" : " · unavailable"}
        </Label>
        <Label muted size={13}>
          Readouts hold the latest recorded sample at or before the shared
          replay cursor. Telemetry older than 2 seconds is unavailable. Speed
          traces show the full time window, not a distance-aligned lap
          comparison.
        </Label>
        <Label muted size={11}>
          Historical OpenF1 session 9496. Brake is On/Off, not pressure. No
          fuel, battery or connected strategy estimate is provided.
        </Label>
      </View>
    </Screen>
  );
}
export default LabScreen;
