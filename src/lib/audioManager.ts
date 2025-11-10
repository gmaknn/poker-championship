/**
 * Audio Manager
 * Gestion des sons et annonces vocales pour le timer du tournoi
 */

// Liste de phrases humoristiques pour les annonces de changement de niveau
const LEVEL_CHANGE_PHRASES = [
  'Niveau {level} ! Les blinds montent, les tapis descendent...',
  'Attention, nouveau niveau ! Vos jetons tremblent déjà !',
  "C'est parti pour le niveau {level} ! Que le meilleur survive !",
  'Les blinds augmentent ! Préparez-vous à défendre vos tapis !',
  'Niveau {level} ! Le moment de vérité approche...',
  'Changement de niveau ! Les petites blinds sont maintenant de {sb}.',
  "Nouveau round ! Les requins sentent l'odeur du sang...",
  "Niveau {level} ! C'est le moment de montrer qui est le patron !",
  'Les blinds montent ! Vous allez devoir jouer serré...',
  'Attention les amis, on passe au niveau {level} !',
  'Les cartes se redistribuent ! Niveau {level} en cours !',
  "On monte d'un cran ! Niveau {level} !",
  'Accrochez vos ceintures, les blinds décollent !',
  'Niveau {level} ! Même vos jetons ont peur maintenant !',
  'Les blinds augmentent et les tapis fondent comme neige au soleil !',
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
   * Announce level change with TTS (Text-to-Speech)
   */
  announceLevelChange(
    level: number,
    smallBlind: number,
    bigBlind: number,
    ante?: number
  ): void {
    if (!this.speechSynthesis) {
      console.warn('SpeechSynthesis not available');
      return;
    }

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    // Get random phrase
    const phrase = this.getRandomPhrase(level, smallBlind);

    // Add blind information
    let announcement = phrase;
    if (ante && ante > 0) {
      announcement += ` Blinds : ${smallBlind} - ${bigBlind}, ante ${ante}.`;
    } else {
      announcement += ` Blinds : ${smallBlind} - ${bigBlind}.`;
    }

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
   * Announce break
   */
  announceBreak(duration: number): void {
    if (!this.speechSynthesis) return;

    this.speechSynthesis.cancel();

    const announcement = `C'est l'heure de la pause ! ${duration} minutes pour recharger les batteries.`;

    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = this.speechSynthesis.getVoices();
    const frenchVoice = voices.find((voice) => voice.lang.startsWith('fr'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    this.speechSynthesis.speak(utterance);
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
