import { useEffect } from 'react';
import { ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ColorsProvider, useTheme } from '../theme/ThemeContext';
import { getNavigationTheme } from '../theme/colors';
import { ReplayProvider } from '../state/ReplayProvider';

void SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [loaded,error]=useFonts({
    PlexMono:require('../../assets/fonts/ibm-plex-mono-400.ttf'),
    PlexMonoSemi:require('../../assets/fonts/ibm-plex-mono-600.ttf'),
  });
  useEffect(()=>{if(loaded||error)void SplashScreen.hideAsync();},[loaded,error]);
  if(!loaded&&!error)return null;
  return <SafeAreaProvider><ColorsProvider><ReplayProvider><Navigation /></ReplayProvider></ColorsProvider></SafeAreaProvider>;
}
function Navigation() {
  const {colors,brand,dark}=useTheme();
  return <ThemeProvider value={getNavigationTheme(dark)}>
    <StatusBar style={dark?'light':'dark'} />
    <NativeTabs tintColor={brand.primary} backgroundColor={colors.background}
      labelStyle={{default:{color:colors.secondaryText,fontSize:11},selected:{color:brand.primary}}}
      iconColor={{default:colors.secondaryText,selected:brand.primary}}
      indicatorColor={colors.secondaryBackground} minimizeBehavior="never">
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Race</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flag.checkered" md="sports_motorsports" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="timing" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Timing</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.number" md="format_list_numbered" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lab" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Lab</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="waveform.path" md="monitoring" />
      </NativeTabs.Trigger>
    </NativeTabs>
  </ThemeProvider>;
}
