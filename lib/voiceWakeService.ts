import { PorcupineManager } from '@picovoice/porcupine-react-native';
import { Platform } from 'react-native';

let porcupineManager: any = null;
let isActive = false;

// You need to get this from https://console.picovoice.ai/
const ACCESS_KEY = 'UOOuBrvoezmOrCsl79uqoaHa4w+S6A3WY637vwIdOd59AI+vrOtJZg==';

export const initWakeWordDetection = async (
  onWakeWord: () => void,
  wakeWordModelPath?: string 
) => {
  if (porcupineManager) return; 

  try {
    // Path to your .ppn model (put in assets directory and reference with `require`)
    // For built-in keywords, you could use: [BuiltInKeyword.Porcupine] or similar.
    // But for custom: use your actual asset path.
    // You may need to use require() for asset paths (especially for iOS in RN)
    const keywordPaths = Platform.select({
      ios: [wakeWordModelPath || require('@/assets/wakeword/Hey-Aria_en_ios_v3_0_0.ppn')],
      android: [wakeWordModelPath || require('@/assets/wakeword/Hey-Aria_android_v3_0_0.ppn')],
    });

    porcupineManager = await PorcupineManager.fromKeywordPaths(
      ACCESS_KEY, 
      keywordPaths!,
      (keywordIndex: number) => {
        console.log('[🚨 Hotword detected!]', keywordIndex);
        stopWakeWordDetection();
        onWakeWord();
      },
      (error: any) => {
        console.error('[Picovoice Error]', error);
      }
    );

    await porcupineManager.start();
    isActive = true;
    console.log('🎙️ Picovoice Porcupine wake word listener started...');
  } catch (error) {
    console.error('❌ Failed to start Porcupine:', error);
  }
};

/**
 * Starts the wake word listener if not already active.
 */
export const startWakeWordDetection = async () => {
  if (porcupineManager && !isActive) {
    await porcupineManager.start();
    isActive = true;
    console.log('🎙️ Picovoice listening...');
  }
};

/**
 * Stops the wake word listener.
 */
export const stopWakeWordDetection = async () => {
  if (porcupineManager && isActive) {
    await porcupineManager.stop();
    isActive = false;
    console.log('🛑 Picovoice stopped.');
  }
};

/**
 * Optional: Cleanup listeners if needed
 */
export const destroyWakeWordDetection = async () => {
  if (porcupineManager) {
    await porcupineManager.delete();
    porcupineManager = null;
    isActive = false;
    console.log('♻️ Picovoice resources released.');
  }
};