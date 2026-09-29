import { game } from './state';

let primed = false;

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function canSpeak(): boolean {
  return speechSupported() && !game.settings.muteSpeech;
}

export function primeSpeech(): void {
  if (!speechSupported() || primed) return;
  primed = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang.startsWith('en-US')) ||
    voices.find((v) => v.lang.startsWith('en'))
  );
}

export function stopSpeech(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

export function speak(text: string, rate = 0.72): boolean {
  if (!canSpeak() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    u.pitch = 1.05;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

if (speechSupported()) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    pickVoice();
  });
}
