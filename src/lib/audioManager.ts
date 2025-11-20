/**
 * Audio Manager
 * Gestion des sons et annonces vocales pour le timer du tournoi
 */

// Liste de templates de phrases humoristiques pour les annonces de changement de niveau
const LEVEL_CHANGE_PHRASE_TEMPLATES = [
  "{player}, niveau {level} ! T'es sûr que tes cartes sont pas truquées ?",
  "Niveau {level} ! {player}, c'est le moment de montrer si t'es un requin ou un poisson !",
  "{player}, niveau {level} ! Tes jetons tremblent déjà de peur !",
  "Niveau {level} arrive ! {player}, t'as pensé à recharger ta chance ?",
  "{player}, niveau {level} ! On parie que tu vas encore bluffer avec rien ?",
  "Niveau {level} ! {player}, même les cartes ont pitié de toi !",
  "{player}, niveau {level} ! T'es le pro ou le pigeon ce soir ?",
  "Niveau {level} ! {player}, ta cave va pas tenir longtemps à ce rythme !",
  "{player}, niveau {level} ! T'as déjà vu un flop aujourd'hui ou pas ?",
  "Niveau {level} ! {player}, arrête de prier, joue tes cartes !",
  "{player}, niveau {level} ! Ton tapis fond plus vite que neige au soleil !",
  "Niveau {level} ! {player}, c'est du poker pas de la belote !",
  "{player}, niveau {level} ! T'attends quoi pour montrer ton jeu ?",
  "Niveau {level} ! {player}, même un débutant jouerait mieux !",
  "{player}, niveau {level} ! Allez, fais-nous rêver pour une fois !",
];

/**
 * Audio context for generating beep sounds
 */
class AudioManager {
  private audioContext: AudioContext | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private volume: number = 1.0; // 0.0 to 1.0
  private speed: number = 1.0; // 0.5 to 2.0
  private currentAudio: HTMLAudioElement | null = null; // Track current playing audio
  private isSpeaking: boolean = false; // Track if TTS is currently active

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize Audio Context for beep sounds
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Initialize Speech Synthesis for TTS
      this.speechSynthesis = window.speechSynthesis;

      // Load saved settings from localStorage
      const savedVolume = localStorage.getItem('tts-volume');
      const savedSpeed = localStorage.getItem('tts-speed');
      if (savedVolume) this.volume = parseFloat(savedVolume);
      if (savedSpeed) this.speed = parseFloat(savedSpeed);
    }
  }

  /**
   * Set TTS volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts-volume', this.volume.toString());
    }
  }

  /**
   * Set TTS speed (0.5 to 2.0)
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(2, speed));
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts-speed', this.speed.toString());
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Get current speed
   */
  getSpeed(): number {
    return this.speed;
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
   * Get a random humorous phrase for level change with a random active player
   */
  private getRandomPhrase(level: number, playerNicknames: string[]): string {
    const template = LEVEL_CHANGE_PHRASE_TEMPLATES[Math.floor(Math.random() * LEVEL_CHANGE_PHRASE_TEMPLATES.length)];

    // Pick a random player from active players
    const randomPlayer = playerNicknames.length > 0
      ? playerNicknames[Math.floor(Math.random() * playerNicknames.length)]
      : 'le joueur mystère';

    return template
      .replace('{level}', level.toString())
      .replace('{player}', randomPlayer);
  }

  /**
   * Format number for speech (1000 -> "mille" instead of "un zéro zéro zéro")
   */
  private formatNumberForSpeech(num: number): string {
    if (num >= 1000000) {
      const millions = num / 1000000;
      if (millions === Math.floor(millions)) {
        return `${millions} ${millions > 1 ? 'millions' : 'million'}`;
      }
      return `${millions.toFixed(1).replace('.', ' virgule ')} million${millions > 1 ? 's' : ''}`;
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      if (thousands === Math.floor(thousands)) {
        return thousands === 1 ? 'mille' : `${thousands} mille`;
      }
      // For numbers like 1500 -> "mille cinq cents"
      const k = Math.floor(thousands);
      const remainder = num % 1000;
      if (remainder === 0) {
        return k === 1 ? 'mille' : `${k} mille`;
      }
      return `${k === 1 ? 'mille' : `${k} mille`} ${remainder}`;
    }
    return num.toString();
  }

  /**
   * Play audio from base64-encoded MP3
   */
  private playAudioFromBase64(base64Audio: string): void {
    try {
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }

      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      // Create and play audio element with volume control
      const audio = new Audio(url);
      audio.volume = this.volume;
      audio.playbackRate = this.speed;
      this.currentAudio = audio;
      this.isSpeaking = true;

      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        this.isSpeaking = false;
      });

      // Clean up blob URL after playing
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        this.isSpeaking = false;
        this.currentAudio = null;
      });
    } catch (error) {
      console.error('Error playing base64 audio:', error);
      this.isSpeaking = false;
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

    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();
    this.isSpeaking = true;

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9 * this.speed; // Apply speed setting
    utterance.pitch = 1.0;
    utterance.volume = this.volume; // Apply volume setting

    // Try to use a French voice if available
    const voices = this.speechSynthesis.getVoices();
    const frenchVoice = voices.find(
      (voice) => voice.lang.startsWith('fr')
    );
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    // Track when speech ends
    utterance.onend = () => {
      this.isSpeaking = false;
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

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
    ante?: number,
    playerNicknames: string[] = []
  ): Promise<void> {
    // Get random phrase with a random active player
    const phrase = this.getRandomPhrase(level, playerNicknames);

    // Format blinds for better speech
    const sbText = this.formatNumberForSpeech(smallBlind);
    const bbText = this.formatNumberForSpeech(bigBlind);

    // Add blind information
    let announcement = phrase;
    if (ante && ante > 0) {
      const anteText = this.formatNumberForSpeech(ante);
      announcement += ` Blinds : ${sbText} - ${bbText}, ante ${anteText}.`;
    } else {
      announcement += ` Blinds : ${sbText} - ${bbText}.`;
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
   * Play alert sound (for 30s and 10s warnings)
   */
  playAlertSound(type: 'warning' | 'urgent'): void {
    if (!this.audioContext) return;

    if (type === 'warning') {
      // 30s warning: 2 beeps
      this.playBeep(660, 0.2, 0);
      this.playBeep(660, 0.2, 0.4);
    } else {
      // 10s warning: 3 faster beeps
      this.playBeep(880, 0.15, 0);
      this.playBeep(880, 0.15, 0.25);
      this.playBeep(880, 0.15, 0.5);
    }
  }

  /**
   * Play jingle before important announcement
   */
  playJingle(): void {
    if (!this.audioContext) return;

    // Short musical jingle: ascending notes
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, i) => {
      this.playBeep(freq, 0.15, i * 0.15);
    });
  }

  /**
   * Announce player elimination
   */
  async announceElimination(eliminatedPlayer: string, eliminatorPlayer?: string): Promise<void> {
    this.playJingle(); // Play jingle first

    await new Promise(resolve => setTimeout(resolve, 700)); // Wait for jingle to finish

    const announcement = eliminatorPlayer
      ? `Élimination ! ${eliminatedPlayer} éliminé par ${eliminatorPlayer} !`
      : `Élimination ! ${eliminatedPlayer} est éliminé !`;

    try {
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

      const errorData = await response.json();
      if (errorData.fallbackToNative) {
        this.announceWithNativeSpeech(announcement);
      }
    } catch (error) {
      this.announceWithNativeSpeech(announcement);
    }
  }

  /**
   * Announce players remaining milestone
   */
  async announcePlayersRemaining(count: number): Promise<void> {
    let announcement = '';

    if (count === 3) {
      announcement = 'Plus que 3 joueurs ! On approche de la table finale !';
    } else if (count === 6) {
      announcement = 'Il reste 6 joueurs en course pour la victoire !';
    } else if (count === 9) {
      announcement = 'Table finale ! 9 joueurs toujours en lice !';
    } else if (count === 1) {
      announcement = 'Et nous avons un vainqueur !';
    } else {
      announcement = `Plus que ${count} joueurs en jeu !`;
    }

    try {
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

      const errorData = await response.json();
      if (errorData.fallbackToNative) {
        this.announceWithNativeSpeech(announcement);
      }
    } catch (error) {
      this.announceWithNativeSpeech(announcement);
    }
  }

  /**
   * Announce break coming soon
   */
  async announceBreakComingSoon(minutes: number): Promise<void> {
    const announcement = `Pause dans ${minutes} minute${minutes > 1 ? 's' : ''} ! Préparez-vous !`;

    try {
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

      const errorData = await response.json();
      if (errorData.fallbackToNative) {
        this.announceWithNativeSpeech(announcement);
      }
    } catch (error) {
      this.announceWithNativeSpeech(announcement);
    }
  }

  /**
   * Stop all sounds and speech
   */
  stopAll(): void {
    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Cancel any ongoing speech
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }

    this.isSpeaking = false;
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
  ante?: number,
  playerNicknames: string[] = []
): void => {
  const manager = getAudioManager();
  manager.announceLevelChange(level, smallBlind, bigBlind, ante, playerNicknames);
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

/**
 * Play alert sound
 */
export const playAlertSound = (type: 'warning' | 'urgent'): void => {
  const manager = getAudioManager();
  manager.playAlertSound(type);
};

/**
 * Announce elimination
 */
export const announceElimination = (eliminatedPlayer: string, eliminatorPlayer?: string): void => {
  const manager = getAudioManager();
  manager.announceElimination(eliminatedPlayer, eliminatorPlayer);
};

/**
 * Announce players remaining
 */
export const announcePlayersRemaining = (count: number): void => {
  const manager = getAudioManager();
  manager.announcePlayersRemaining(count);
};

/**
 * Announce break coming soon
 */
export const announceBreakComingSoon = (minutes: number): void => {
  const manager = getAudioManager();
  manager.announceBreakComingSoon(minutes);
};

/**
 * Set TTS volume
 */
export const setTTSVolume = (volume: number): void => {
  const manager = getAudioManager();
  manager.setVolume(volume);
};

/**
 * Set TTS speed
 */
export const setTTSSpeed = (speed: number): void => {
  const manager = getAudioManager();
  manager.setSpeed(speed);
};

/**
 * Get TTS volume
 */
export const getTTSVolume = (): number => {
  const manager = getAudioManager();
  return manager.getVolume();
};

/**
 * Get TTS speed
 */
export const getTTSSpeed = (): number => {
  const manager = getAudioManager();
  return manager.getSpeed();
};
