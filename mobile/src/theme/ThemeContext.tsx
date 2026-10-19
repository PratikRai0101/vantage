// Root appearance signal: both the app palette and navigation chrome re-render.
// No persisted setting is needed for the first slice; follow the device scheme.
import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getBrandColors, useSystemColors, type ResolvedBrand, type SystemColors } from './colors';
type ThemeValue = {colors:SystemColors;brand:ResolvedBrand;dark:boolean};
const ThemeContext = createContext<ThemeValue | null>(null);
export function ColorsProvider({children}:{children:ReactNode}) {
  const dark = useColorScheme() === 'dark';
  const colors = useSystemColors();
  return <ThemeContext value={{colors,brand:getBrandColors(dark),dark}}>{children}</ThemeContext>;
}
export function useTheme():ThemeValue {
  const value=use(ThemeContext);
  if(!value)throw new Error('useTheme requires ColorsProvider');
  return value;
}
export function useColors():SystemColors{return useTheme().colors;}
export function useBrand():ResolvedBrand{return useTheme().brand;}
