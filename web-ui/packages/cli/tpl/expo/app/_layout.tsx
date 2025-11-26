import Config, { HOST } from '@/utils/config';
import {DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {useFonts} from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import {Stack} from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import {StatusBar} from 'expo-status-bar';
import {useEffect, useRef} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import 'react-native-reanimated';
import OTAUpdater, { OTAProvider, adapter } from 'rn-ota-client/expo';
import NewVersion from '@/components/NewVersion';
import { APP_NAME, CURRENT_VERSION } from '@/utils/version';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

NavigationBar.setVisibilityAsync('hidden');

export function App() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const otaUpdaterRef = useRef<OTAUpdater | null>(null);

  useEffect(() => {
    otaUpdaterRef.current = new OTAUpdater({
      serverUrl: Config.VITE_OTA_BASE_API,
      appName: APP_NAME,
      version: CURRENT_VERSION,
      devServerHost: HOST,
    }, adapter);
    otaUpdaterRef.current?.checkForUpdates();
    console.log('[OTA] OTAUpdater 初始化完成');
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{headerShown: false}} />
        </Stack>
        <StatusBar hidden={true} style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <OTAProvider customModalComponent={NewVersion}>
      <App />
    </OTAProvider>
  );
}
