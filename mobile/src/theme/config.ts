// Central theme configuration: semantic roles, never screen-specific paint.
// Pin the approved studio palette instead of letting Android wallpaper recolor it.
// "native" remains available for platform-native system roles; the scene ground
// stays an explicit hex because Three.js needs a concrete color, not a native object.
export type HexColor = `#${string}`;
export type BrandColor = HexColor | { light: HexColor; dark: HexColor };
export type SystemColorKey = 'background' | 'secondaryBackground' | 'text' | 'secondaryText' | 'separator' | 'link';
export const themeConfig: {
  system: Record<SystemColorKey, 'native' | BrandColor>;
  brand: {primary: BrandColor; onPrimary: BrandColor; accent: BrandColor; onAccent: BrandColor; useAndroidDynamic: boolean};
} = {
  system: {
    background: { light: '#F1F3EF', dark: '#101719' },
    secondaryBackground: { light: '#E1E8E5', dark: '#203039' },
    text: { light: '#17272E', dark: '#F1F3EF' },
    secondaryText: { light: '#4D6570', dark: '#A8BBC1' },
    separator: { light: '#C8D4D6', dark: '#2B3D43' },
    link: { light: '#315D74', dark: '#BCD5EC' },
  },
  brand: {
    primary: { light: '#315D74', dark: '#BCD5EC' },
    onPrimary: { light: '#F7FAFC', dark: '#152229' },
    accent: { light: '#315D74', dark: '#BCD5EC' },
    onAccent: { light: '#F7FAFC', dark: '#152229' },
    useAndroidDynamic: false,
  },
};
