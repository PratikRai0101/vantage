import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import type { Driver } from "@/replay";
import { useTheme } from "@/theme/ThemeContext";
import { Label, ui } from "./race-ui";
import { teamColor } from "./replay-format";

// A causal step trace: hold a recorded sample, then jump at the next timestamp.
// Gaps beyond the core's two-second telemetry freshness limit remain blank.
export function speedPath(
  driver: Driver | undefined,
  duration: number,
): string {
  if (!driver?.available || duration <= 0) return "";
  const x = (time: number) =>
    ((Math.max(0, Math.min(duration, time)) / duration) * 320).toFixed(2);
  const y = (speed: number) => (174 - (speed / 400) * 160).toFixed(2);
  let path = "";
  let previousEnd = -Infinity;
  for (let index = 0; index < driver.telemetry.length; index++) {
    const [time, speed] = driver.telemetry[index];
    const next = driver.telemetry[index + 1]?.[0] ?? duration;
    const start = Math.max(0, time);
    const end = Math.min(duration, next, time + 2);
    if (
      speed == null ||
      !Number.isFinite(speed) ||
      speed < 0 ||
      speed > 400 ||
      end <= start
    ) {
      previousEnd = -Infinity;
      continue;
    }
    path += `${previousEnd === start ? "L" : "M"}${x(start)},${y(speed)}H${x(end)}`;
    previousEnd = end;
  }
  return path;
}
export function SpeedChart({
  first,
  second,
  duration,
  time,
  seek,
}: {
  first?: Driver;
  second?: Driver;
  duration: number;
  time: number;
  seek: (time: number) => void;
}) {
  const { colors, brand } = useTheme();
  const [width, setWidth] = useState(0);
  const pathA = useMemo(() => speedPath(first, duration), [first, duration]);
  const pathB = useMemo(() => speedPath(second, duration), [second, duration]);
  const firstColor = teamColor(first?.color, brand.primary);
  const secondColor = brand.primary;
  return (
    <View style={{ gap: 12 }}>
      <View style={[ui.row, { flexWrap: "wrap", gap: 12 }]}>
        <Label mono size={13} style={{ color: firstColor }}>
          ━ {first?.code ?? "—"}
        </Label>
        <Label mono size={13} style={{ color: secondColor }}>
          ┄ {second?.code ?? "—"}
        </Label>
        <Label mono muted size={11}>
          SPEED · KM/H
        </Label>
      </View>
      <Pressable
        accessibilityRole="image"
        accessibilityLabel={`Recorded speed comparison for ${first?.name} and ${second?.name}. Cursor ${time.toFixed(1)} seconds. Use replay slider to adjust time.`}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onPress={(event) => {
          if (width > 0)
            seek(
              Math.max(
                0,
                Math.min(
                  duration,
                  (event.nativeEvent.locationX / width) * duration,
                ),
              ),
            );
        }}
        style={{ height: 222 }}
      >
        <Svg
          width="100%"
          height={222}
          viewBox="0 0 320 222"
          preserveAspectRatio="none"
          accessible={false}
        >
          {[14, 94, 174].map((y, index) => (
            <React.Fragment key={y}>
              <Line
                x1={0}
                y1={y}
                x2={320}
                y2={y}
                stroke={colors.separator}
                strokeWidth={0.7}
              />
              <SvgText
                x={2}
                y={y - 3}
                fill={colors.secondaryText}
                fontSize={11}
                fontFamily="PlexMono"
              >
                {400 - index * 200}
              </SvgText>
            </React.Fragment>
          ))}
          <Path
            d={pathB}
            fill="none"
            stroke={secondColor}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          <Path d={pathA} fill="none" stroke={firstColor} strokeWidth={2} />
          <Line
            x1={(time / duration) * 320}
            x2={(time / duration) * 320}
            y1={8}
            y2={182}
            stroke={colors.text}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <SvgText
            x={0}
            y={208}
            fill={colors.secondaryText}
            fontSize={11}
            fontFamily="PlexMono"
          >
            00:00
          </SvgText>
          <SvgText
            x={160}
            y={208}
            textAnchor="middle"
            fill={colors.secondaryText}
            fontSize={11}
            fontFamily="PlexMono"
          >
            01:00
          </SvgText>
          <SvgText
            x={320}
            y={208}
            textAnchor="end"
            fill={colors.secondaryText}
            fontSize={11}
            fontFamily="PlexMono"
          >
            02:00
          </SvgText>
        </Svg>
      </Pressable>
      <Label muted size={11}>
        Full 120-second recording · tap to seek, or use the accessible replay
        slider. Dashed trace is the comparison driver.
      </Label>
    </View>
  );
}
