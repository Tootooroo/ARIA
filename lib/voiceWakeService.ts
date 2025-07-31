import { PorcupineManager } from '@picovoice/porcupine-react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

let porcupineManager: PorcupineManager | null = null;
let isActive = false;

// You need to get this from https://console.picovoice.ai/
//(ios) const ACCESS_KEY = 'UOOuBrvoezmOrCsl79uqoaHa4w+S6A3WY637vwIdOd59AI+vrOtJZg==';
const ACCESS_KEY = 'x/0syzP9WIFeLM+gOm00tcIduTevo2k7h+uzr11xp5ZdBuuUs7Rw3g==';

/**
 * Initialize and start wake-word detection.
 */
export const initWakeWordDetection = async (onWakeWord: () => void) => {
  if (porcupineManager) return;

  try {
    console.log('🔍 Starting wake-word init...');

    // STEP 1: Bundle the correct PPn for the platform
    const modelModule = Platform.OS === 'android'
      ? require('../assets/wakeword/Hey-Aria_en_android_v3_0_0.ppn')
      : require('../assets/wakeword/Hey-Aria_en_ios_v3_0_0.ppn');

    // STEP 2: Download via Expo Asset
    const asset = Asset.fromModule(modelModule);
    console.log('📥 Downloading model asset...', asset.uri);
    await asset.downloadAsync();

    // STEP 3: Strip file:// prefix and copy into a stable cache path
    const srcUri = asset.localUri!;  
    const fileName = `${asset.name}.ppn`;  
    const destUri = FileSystem.cacheDirectory + fileName;  // file:///…/cache/Hey-Aria_en_android_v3_0_0.ppn

    // 4) Copy in if missing
    const info = await FileSystem.getInfoAsync(destUri);
    if (!info.exists) {
      console.log('📂 Copying model to:', destUri);
      await FileSystem.copyAsync({ from: srcUri, to: destUri });
    }
    // (Optional) verify
    const ok = (await FileSystem.getInfoAsync(destUri)).exists;
    console.log('✅ Model exists at destUri?', ok);

    // 5) Strip file:// for Porcupine
    const plainPath = destUri.replace(/^file:\/\//, '');
    console.log('📂 Plain path for Porcupine:', plainPath);

    // 6) Init Porcupine
    porcupineManager = await PorcupineManager.fromKeywordPaths(
      ACCESS_KEY,
      [plainPath],
      () => {
        console.log('🚨 Hotword detected!');
        onWakeWord();
      },
      (err) => console.error('🛑 Porcupine error', err)
    );

    // 7) Start listening
    await porcupineManager.start();
    isActive = true;
    console.log('🎙️ Porcupine listening');
  } catch (err) {
    console.error('❌ Porcupine init failed:', err);
  }
};

/**
 * Resume listening if previously stopped.
 */
export const startWakeWordDetection = async () => {
  if (porcupineManager && !isActive) {
    try {
      await porcupineManager.start();
      isActive = true;
      console.log('▶️ Porcupine resumed');
    } catch (err) {
      console.error('❌ Failed to resume Porcupine:', err);
    }
  }
};

/**
 * Stop wake-word listening.
 */
export const stopWakeWordDetection = async () => {
  if (porcupineManager && isActive) {
    try {
      await porcupineManager.stop();
      console.log('⏸️ Porcupine stopped');
    } catch (err) {
      console.error('❌ Failed to stop Porcupine:', err);
    } finally {
      isActive = false;
    }
  }
};

/**
 * Clean up Porcupine resources when leaving the Chat screen.
 */
export const destroyWakeWordDetection = async () => {
  if (porcupineManager) {
    try {
      await porcupineManager.delete();
      console.log('♻️ Porcupine destroyed');
    } catch (err) {
      console.error('❌ Failed to destroy Porcupine:', err);
    } finally {
      porcupineManager = null;
      isActive = false;
    }
  }
};
