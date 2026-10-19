// One palette across native UI and navigation. Scheme is an explicit dependency:
// native platform color objects do not themselves tell React when to re-render.
import { Color, DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { Appearance, Platform, useColorScheme, type ColorValue } from 'react-native';
import { type BrandColor, type SystemColorKey, themeConfig } from './config';
export type SystemColors = Record<SystemColorKey, string>;
export type ResolvedBrand = {primary: string; onPrimary: string; accent: string; onAccent: string};
export const isAndroidDynamic = Platform.OS === 'android' && themeConfig.brand.useAndroidDynamic;
export function resolveBrandColor(value: BrandColor, dark: boolean): string {
  return typeof value === 'string' ? value : dark ? value.dark : value.light;
}
function getNativeDefault(key: SystemColorKey): ColorValue {
  if (Platform.OS === 'ios') return {
    background: Color.ios.systemBackground, secondaryBackground: Color.ios.secondarySystemBackground,
    text: Color.ios.label, secondaryText: Color.ios.secondaryLabel, separator: Color.ios.separator, link: Color.ios.link,
  }[key];
  if (Platform.OS === 'android') return {
    background: Color.android.dynamic.surface, secondaryBackground: Color.android.dynamic.surfaceContainer,
    text: Color.android.dynamic.onSurface, secondaryText: Color.android.dynamic.onSurfaceVariant,
    separator: Color.android.dynamic.outlineVariant, link: Color.android.dynamic.primary,
  }[key];
  return {background:'#FFFFFF',secondaryBackground:'#F2F2F7',text:'#17272E',secondaryText:'#4D6570',separator:'#C8D4D6',link:'#315D74'}[key];
}
export function getSystemColor(key: SystemColorKey, dark = Appearance.getColorScheme() === 'dark'): ColorValue {
  const value = themeConfig.system[key];
  return value === 'native' ? getNativeDefault(key) : resolveBrandColor(value, dark);
}
export function useSystemColors(): SystemColors {
  const dark = useColorScheme() === 'dark';
  // Current approved roles are all concrete hex strings. If enabling native
  // objects later, keep the Three scene background concrete and widen UI types.
  return Object.fromEntries(Object.keys(themeConfig.system).map(key => [key, getSystemColor(key as SystemColorKey, dark)])) as SystemColors;
}
export function getBrandColors(dark: boolean): ResolvedBrand {
  if (isAndroidDynamic) return {
    primary: Color.android.dynamic.primary as unknown as string,
    onPrimary: Color.android.dynamic.onPrimary as unknown as string,
    accent: Color.android.dynamic.secondary as unknown as string,
    onAccent: Color.android.dynamic.onSecondary as unknown as string,
  };
  const b = themeConfig.brand;
  return {primary:resolveBrandColor(b.primary,dark),onPrimary:resolveBrandColor(b.onPrimary,dark),accent:resolveBrandColor(b.accent,dark),onAccent:resolveBrandColor(b.onAccent,dark)};
}
export function useBrandColors(): ResolvedBrand { return getBrandColors(useColorScheme() === 'dark'); }
export function getNavigationTheme(dark: boolean): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {...base, colors:{...base.colors,primary:getBrandColors(dark).primary,background:getSystemColor('background',dark) as string,card:getSystemColor('secondaryBackground',dark) as string,text:getSystemColor('text',dark) as string,border:getSystemColor('separator',dark) as string,notification:getBrandColors(dark).primary}};
}
