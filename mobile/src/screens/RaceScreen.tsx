import React, { useCallback, useState } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import { router, useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeRaceScene } from "@/scene";
import { useReplay } from "@/state/ReplayProvider";
import { useTheme } from "@/theme/ThemeContext";
import type { CameraMode } from "@/replay";
import { Button, Header, Icon, Label, Rule, Screen, ui } from "@/components/race-ui";
import { DriverChooser, ReplayTransport, selectionHaptic } from "@/components/replay-controls";
import { LiveDriver, RaceTitle } from "@/components/race-live";

export function RaceScreen() {
  const { engine, track, state } = useReplay();
  const { colors } = useTheme();
  const focused = useIsFocused();
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  // Stable callbacks keep the memoized native surface out of parent re-renders.
  const handleReady = useCallback(() => setError(null), []);
  const handleError = useCallback((cause: Error) => setError(cause.message), []);
  const sceneHeight = Math.max(
    180,
    Math.min(
      340,
      height -
        insets.top -
        insets.bottom -
        410 -
        Math.max(0, fontScale - 1) * 120,
    ),
  );
  return (
    <Screen>
      <Header />
      <RaceTitle />
      <View
        style={{ height: sceneHeight, marginHorizontal: -20, marginTop: 4 }}
      >
        <NativeRaceScene
          engine={engine}
          track={track}
          active={focused}
          backgroundColor={colors.background}
          height={sceneHeight}
          resetKey={resetKey}
          onReady={handleReady}
          onError={handleError}
        />
        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              position: "absolute",
              bottom: 8,
              left: 20,
              right: 20,
              padding: 12,
              backgroundColor: colors.secondaryBackground,
            }}
          >
            <Label size={13}>3D renderer unavailable: {error}</Label>
            <Label size={11} muted>
              Replay controls, Timing and Lab remain available.
            </Label>
          </View>
        ) : null}
      </View>
      <Label muted size={11} style={{ textAlign: "center", marginBottom: 8 }}>
        {Platform.OS === 'android'
          ? 'Drag / pinch · ×N = grouped projections'
          : 'Native 3D preview · motion presentation under investigation'}
      </Label>
      <View style={[ui.row, { gap: 6 }]}>
        {(
          [
            ["overview", "All cars"],
            ["follow", "Follow"],
            ["battle", "Battle"],
          ] as [CameraMode, string][]
        ).map(([mode, label]) => (
          <Button
            key={mode}
            selected={state.camera === mode}
            onPress={() => {
              engine.setCamera(mode);
              setResetKey(value => value + 1);
              selectionHaptic();
            }}
            style={{ flex: 1, paddingHorizontal: 8 }}
          >
            {label}
          </Button>
        ))}
        <Button accessibilityLabel="Reset camera" onPress={() => setResetKey(value => value + 1)} style={{ paddingHorizontal: 10 }}>
          <Icon name="reset" color={colors.text} />
        </Button>
      </View>
      <ReplayTransport />
      <Rule />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: warningOpen }}
        onPress={() => setWarningOpen((value) => !value)}
        style={[ui.row, { minHeight: 44, gap: 12 }]}
      >
        <Label size={13} muted style={{ flex: 1 }}>
          Reconstruction, not a digital twin
        </Label>
        <Icon
          name={warningOpen ? "minus" : "plus"}
          color={colors.secondaryText}
          size={16}
        />
      </Pressable>
      {warningOpen ? (
        <Label muted size={13}>
          Approximate recorded GPS is projected onto a centreline. Lane
          placement, pit paths, elevation and car scale are illustrative, not
          surveyed. Overlapping projected positions share one car and a ×N count,
          not invented lanes or contact. Tap the count to switch driver; every
          driver remains available in Timing and the picker. RIC, ALB and ZHO have stationary streams in this excerpt;
          they are not animated or classified here as retired.
        </Label>
      ) : null}
      <View style={ui.section}>
        <DriverChooser />
        <LiveDriver />
        <Button onPress={() => router.navigate("/lab")}>Open telemetry</Button>
        <Label muted size={11}>
          OpenF1 historical recording · 05:55–05:57 UTC. Sparse ranks and gaps
          hold their last recorded event; no live feed is claimed.
        </Label>
      </View>
    </Screen>
  );
}
export default RaceScreen;
