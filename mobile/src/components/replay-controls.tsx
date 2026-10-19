import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Slider } from "@expo/ui/community/slider";
import * as Haptics from "expo-haptics";
import { useReplay, useReplayClock } from "@/state/ReplayProvider";
import { useTheme } from "@/theme/ThemeContext";
import { formatClock, type Driver } from "@/replay";
import { Button, Icon, Label, Rule, ui } from "./race-ui";

export function selectionHaptic() {
  void Haptics.selectionAsync().catch(() => {});
}
function Sheet({
  title,
  visible,
  close,
  children,
}: {
  title: string;
  visible: boolean;
  close: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReducedMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View
        style={{ flex: 1, backgroundColor: colors.background, paddingTop: 24 }}
      >
        <View
          style={[
            ui.row,
            { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
          ]}
        >
          <Label
            accessibilityRole="header"
            size={22}
            style={{ flex: 1, fontWeight: "600" }}
          >
            {title}
          </Label>
          <Button onPress={close} accessibilityLabel="Close">
            <Icon name="close" color={colors.text} />
          </Button>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
// Only this readout subscribes to the playback cursor, so transport ticks never
// re-render the screen, scene host or driver list above it.
function TransportClock() {
  const { engine, data } = useReplay();
  const time = useReplayClock();
  return (
    <View style={{ flex: 1 }}>
      <View style={[ui.row, { flexWrap: "wrap", gap: 4 }]}>
        <Label mono size={13}>
          {formatClock(time)}
        </Label>
        <Label mono muted size={11}>
          {formatClock(data.window.duration)}
        </Label>
      </View>
      <Slider
        accessibilityLabel="Replay time in seconds. Adjusting pauses replay"
        minimumValue={0}
        maximumValue={data.window.duration}
        step={0.1}
        value={time}
        onValueChange={(value) => engine.seek(value)}
        style={{ width: "100%", height: 44 }}
      />
    </View>
  );
}
function TransportStatus() {
  const { data, state } = useReplay();
  const time = useReplayClock();
  const cursorDate = new Date(Date.parse(data.window.start) + time * 1000);
  const utc = Number.isFinite(cursorDate.getTime())
    ? cursorDate.toISOString().slice(11, 19)
    : "—";
  return (
    <View style={[ui.row, { gap: 8, flexWrap: "wrap" }]}>
      <Label mono size={11} muted>
        {utc} UTC
      </Label>
      <Label mono size={11} muted>
        17 moving · {state.playing ? "PLAYING" : "PAUSED"}
      </Label>
    </View>
  );
}
export function ReplayTransport() {
  const { engine, state } = useReplay();
  const { brand } = useTheme();
  const [speedOpen, setSpeedOpen] = useState(false);
  return (
    <View>
      <Rule />
      <View style={[ui.row, { gap: 12 }]}>
        <Button
          selected
          onPress={() => engine.playPause()}
          accessibilityLabel={state.playing ? "Pause replay" : "Play replay"}
          style={{ width: 48, height: 48, paddingHorizontal: 0 }}
        >
          <Icon
            name={state.playing ? "pause" : "play"}
            color={brand.onPrimary}
          />
        </Button>
        <TransportClock />
        <Button
          onPress={() => setSpeedOpen(true)}
          accessibilityLabel={`Playback speed ${state.speed} times. Change speed`}
        >{`${state.speed}×`}</Button>
      </View>
      <TransportStatus />
      <Sheet
        title="Replay speed"
        visible={speedOpen}
        close={() => setSpeedOpen(false)}
      >
        {[0.25, 0.5, 1, 2, 4].map((speed) => (
          <Button
            key={speed}
            selected={state.speed === speed}
            onPress={() => {
              engine.setSpeed(speed);
              setSpeedOpen(false);
            }}
            style={{ marginBottom: 8 }}
          >{`${speed}×`}</Button>
        ))}
      </Sheet>
    </View>
  );
}
export function DriverChooser({ compare = false }: { compare?: boolean }) {
  const { data, state, engine } = useReplay();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = data.drivers.find(
    (d) => d.number === (compare ? state.compare : state.selected),
  );
  const choose = (driver: Driver) => {
    if (compare) engine.setCompare(driver.number);
    else engine.selectDriver(driver.number);
    selectionHaptic();
    setOpen(false);
  };
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${compare ? "Comparison" : "Selected"} driver ${current?.name ?? "unavailable"}. Choose driver`}
        onPress={() => setOpen(true)}
        style={[
          ui.row,
          {
            gap: 12,
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: colors.secondaryBackground,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Label muted size={11}>
            {compare ? "COMPARE WITH" : "SELECTED DRIVER"}
          </Label>
          <Label mono size={15}>
            {current?.code ?? "—"} · {current?.name ?? "Choose driver"}
          </Label>
        </View>
        <Icon name="chevron" color={colors.secondaryText} />
      </Pressable>
      <Sheet
        title={compare ? "Compare driver" : "Choose driver"}
        visible={open}
        close={() => setOpen(false)}
      >
        <Label muted size={13} style={{ marginBottom: 16 }}>
          20 recorded streams · 17 eligible for movement. Stationary streams are
          not retirement classifications.
        </Label>
        {data.drivers.map((driver) => {
          const self = compare && driver.number === state.selected;
          const disabled = !driver.available || self;
          return (
            <Pressable
              key={driver.number}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{
                disabled,
                selected: driver.number === current?.number,
              }}
              accessibilityLabel={`${driver.name}, ${self ? "already selected" : driver.available ? "available" : "stationary stream, unavailable"}`}
              onPress={() => choose(driver)}
              style={{
                minHeight: 64,
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.separator,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Label
                mono
                style={{
                  color:
                    driver.number === current?.number
                      ? colors.link
                      : colors.text,
                }}
              >
                {driver.code} · {driver.name}
              </Label>
              <Label muted size={11}>
                {self
                  ? "Already selected"
                  : driver.available
                    ? driver.team
                    : "Stationary / unavailable for movement"}
              </Label>
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}
