/**
 * Audio Manager
 * Gestion des sons et annonces vocales pour le timer du tournoi
 */

// Liste d'alexandrins poétiques sur Karine pour les annonces de changement de niveau
const LEVEL_CHANGE_PHRASES = [
  "Ô Karine, astre brillant qui guide nos destins, niveau {level}",
  "Karine, ton noble cœur fait battre le tapis, niveau {level}",
  "Sublime est ta grandeur au royaume des jetons, niveau {level}",
  "Karine, poète du bluff, ta gloire nous émeut, niveau {level}",
  "Telle une reine des cartes tu règnes sur nos âmes, niveau {level}",
  "Karine, ange gardien des joueurs émerveillés, niveau {level}",
  "Ton élégance éclaire la table de sa grâce, niveau {level}",
  "Karine, étoile filante au firmament du jeu, niveau {level}",
  "Comme un phare en la nuit tu nous montres la voie, niveau {level}",
  "Karine, chevalière d'honneur au tournoi glorieux, niveau {level}",
  "Ta sagesse infinie illumine nos esprits, niveau {level}",
  "Karine, maîtresse du bluff et dame des enchères, niveau {level}",
  "Ton charme ensorcelle les tapis de velours, niveau {level}",
  "Karine, barde légendaire aux mains d'or et d'espoir, niveau {level}",
  "Comme une déesse olympienne tu honores le poker, niveau {level}",
];

/**
 * Audio context for generating beep sounds
 */
class AudioManager {
  private audioContext: AudioContext | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize Audio Context for beep sounds
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Initialize Speech Synthesis for TTS
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Generate a beep sound
   */
  private playBeep(frequency: number, duration: number, when: number = 0): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + when);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + when + duration);

    oscillator.start(this.audioContext.currentTime + when);
    oscillator.stop(this.audioContext.currentTime + when + duration);
  }

  /**
   * Play countdown sequence: "bip, bip, bip, bip, bip... toooo"
   * 5 short beeps followed by a longer tone
   */
  playCountdownSequence(): void {
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    // 5 short beeps (880Hz, 0.15s each, 0.2s interval)
    for (let i = 0; i < 5; i++) {
      this.playBeep(880, 0.15, i * 0.3);
    }

    // Final long tone "toooo" (440Hz, 1s, after 5 beeps)
    this.playBeep(440, 1, 5 * 0.3);
  }

  /**
   * Get a random humorous phrase for level change
   */
  private getRandomPhrase(level: number, smallBlind?: number): string {
    const phrase = LEVEL_CHANGE_PHRASES[Math.floor(Math.random() * LEVEL_CHANGE_PHRASES.length)];
    return phrase
      .replace('{level}', level.toString())
      .replace('{sb}', smallBlind ? smallBlind.toString() : '');
  }

  /**
   * Play audio from base64-encoded MP3
   */
  private playAudioFromBase64(base64Audio: string): void {
    try {
      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      // Create and play audio element
      const audio = new Audio(url);
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
      });

      // Clean up blob URL after playing
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error playing base64 audio:', error);
    }
  }

  /**
   * Announce using native speech synthesis (fallback)
   */
  private announceWithNativeSpeech(announcement: string): void {
    if (!this.speechSynthesis) {
      console.warn('SpeechSynthesis not available');
      return;
    }

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a French voice if available
    const voices = this.speechSynthesis.getVoices();
    const frenchVoice = voices.find(
      (voice) => voice.lang.startsWith('fr')
    );
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    // Speak
    this.speechSynthesis.speak(utterance);
  }

  /**
   * Announce level change with TTS (Text-to-Speech)
   * Uses Google Cloud TTS for high-quality voice, falls back to native if unavailable
   */
  async announceLevelChange(
    level: number,
    smallBlind: number,
    bigBlind: number,
    ante?: number
  ): Promise<void> {
    // Get random phrase
    const phrase = this.getRandomPhrase(level, smallBlind);

    // Add blind information
    let announcement = phrase;
    if (ante && ante > 0) {
      announcement += ` Blinds : ${smallBlind} - ${bigBlind}, ante ${ante}.`;
    } else {
      announcement += ` Blinds : ${smallBlind} - ${bigBlind}.`;
    }

    try {
      // Try Google TTS first
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: announcement }),
      });

      if (response.ok) {
        const data = await response.json();
        this.playAudioFromBase64(data.audioContent);
        return;
      }

      // If Google TTS fails, fall back to native speech
      const errorData = await response.json();
      if (errorData.fallbackToNative) {
        console.log('Google TTS unavailable, using native speech synthesis');
        this.announceWithNativeSpeech(announcement);
      }
    } catch (error) {
      // On any error, fall back to native speech
      console.log('Error with Google TTS, falling back to native speech:', error);
      this.announceWithNativeSpeech(announcement);
    }
  }

  /**
   * Announce break
   * Uses Google Cloud TTS for high-quality voice, falls back to native if unavailable
   */
  async announceBreak(duration: number): Promise<void> {
    const announcement = `C'est l'heure de la pause ! ${duration} minutes pour recharger les batteries.`;

    try {
      // Try Google TTS first
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: announcement }),
      });

      if (response.ok) {
        const data = await response.json();
        this.playAudioFromBase64(data.audioContent);
        return;
      }

      // If Google TTS fails, fall back to native speech
      const errorData = await response.json();
      if (errorData.fallbackToNative) {
        console.log('Google TTS unavailable, using native speech synthesis');
        this.announceWithNativeSpeech(announcement);
      }
    } catch (error) {
      // On any error, fall back to native speech
      console.log('Error with Google TTS, falling back to native speech:', error);
      this.announceWithNativeSpeech(announcement);
    }
  }

  /**
   * Stop all sounds and speech
   */
  stopAll(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    // Audio context oscillators stop automatically
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

/**
 * Get or create the audio manager instance
 */
export const getAudioManager = (): AudioManager => {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
};

/**
 * Play countdown sequence (5 beeps + long tone)
 */
export const playCountdown = (): void => {
  const manager = getAudioManager();
  manager.playCountdownSequence();
};

/**
 * Announce level change with TTS
 */
export const announceLevelChange = (
  level: number,
  smallBlind: number,
  bigBlind: number,
  ante?: number
): void => {
  const manager = getAudioManager();
  manager.announceLevelChange(level, smallBlind, bigBlind, ante);
};

/**
 * Announce break
 */
export const announceBreak = (duration: number): void => {
  const manager = getAudioManager();
  manager.announceBreak(duration);
};

/**
 * Stop all audio
 */
export const stopAllAudio = (): void => {
  const manager = getAudioManager();
  manager.stopAll();
};
