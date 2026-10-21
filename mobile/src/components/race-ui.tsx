import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";

export function Label({
  mono = false,
  muted = false,
  size = 15,
  style,
  ...props
}: TextProps & { mono?: boolean; muted?: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        {
          color: muted ? colors.secondaryText : colors.text,
          fontSize: size,
          lineHeight: size * 1.35,
          fontFamily: mono ? "PlexMono" : undefined,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    />
  );
}
export function Icon({
  name,
  color,
  size = 20,
}: {
  name: "play" | "pause" | "chevron" | "plus" | "minus" | "close" | "reset";
  color: string;
  size?: number;
}) {
  const paths = {
    play: "M8 5L20 12L8 19Z",
    pause: "M8 5V19M16 5V19",
    chevron: "M6 9L12 15L18 9",
    plus: "M5 12H19M12 5V19",
    minus: "M5 12H19",
    close: "M6 6L18 18M18 6L6 18",
    reset: "M4 11A8 8 0 1 1 6 18M4 4V11H11",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={paths[name]}
        fill={name === "play" ? color : "none"}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function Button({
  children,
  onPress,
  selected = false,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const { colors, brand } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          minWidth: 44,
          paddingHorizontal: 14,
          paddingVertical: 10,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 22,
          backgroundColor: selected
            ? brand.primary
            : colors.secondaryBackground,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Label
          size={15}
          style={{
            color: selected ? brand.onPrimary : colors.text,
            fontWeight: "600",
          }}
        >
          {children}
        </Label>
      ) : (
        children
      )}
    </Pressable>
  );
}
export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 112 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Header({
  title = "Suzuka",
  subtitle = "Japanese Grand Prix",
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingBottom: compact ? 10 : 16, gap: compact ? 4 : 6 }}>
      <View style={[ui.row, { flexWrap: "wrap", gap: 8 }]}>
        <Label size={13} muted>
          {subtitle}
        </Label>
        <View
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.separator,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Label size={11} mono>
            2024 · HISTORICAL
          </Label>
        </View>
      </View>
      <Label
        accessibilityRole="header"
        size={compact ? 28 : 32}
        style={{ fontWeight: "600", letterSpacing: -1 }}
      >
        {title}
      </Label>
      {compact ? null : (
        <Label size={11} mono muted>
          OPENF1 9496 · 7 APR · 120-SECOND EXCERPT
        </Label>
      )}
    </View>
  );
}
export function Rule() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.separator,
        marginVertical: 12,
      }}
    />
  );
}
export function MetricRow({
  title,
  value,
  secondary,
}: {
  title: string;
  value: string;
  secondary?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        ui.row,
        {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
          paddingVertical: 14,
          gap: 12,
        },
      ]}
    >
      <Label muted style={{ flex: 1 }}>
        {title}
      </Label>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Label mono size={17}>
          {value}
        </Label>
        {secondary ? (
          <Label mono size={11} muted>
            {secondary}
          </Label>
        ) : null}
      </View>
    </View>
  );
}
export const ui = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  section: { marginTop: 24, gap: 12 },
});
