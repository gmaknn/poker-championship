/**
 * Avatar helper functions with DiceBear support
 *
 * Avatar storage formats:
 * - `dicebear:[style]` - DiceBear avatar with specified style (generates URL with nickname)
 * - `/avatars/...` - Uploaded image (local path)
 * - `https://...` - External URL (legacy DiceBear URLs or other)
 * - `[seed]` - Legacy format (predefined avatar seed for adventurer style)
 */

// Available DiceBear styles with display names
export const DICEBEAR_STYLES = [
  { id: 'adventurer', name: 'Aventurier', emoji: '🧙' },
  { id: 'avataaars', name: 'Avataaars', emoji: '😎' },
  { id: 'bottts', name: 'Robots', emoji: '🤖' },
  { id: 'lorelei', name: 'Artistique', emoji: '🎨' },
  { id: 'notionists', name: 'Notionists', emoji: '📝' },
  { id: 'pixel-art', name: 'Pixel Art', emoji: '👾' },
  { id: 'thumbs', name: 'Pouces', emoji: '👍' },
  { id: 'big-ears', name: 'Grandes Oreilles', emoji: '👂' },
  { id: 'croodles', name: 'Gribouillis', emoji: '✏️' },
  { id: 'fun-emoji', name: 'Emojis Fun', emoji: '😜' },
  { id: 'identicon', name: 'Identicon', emoji: '🔷' },
  { id: 'initials', name: 'Initiales', emoji: '🔤' },
] as const;

export type DiceBearStyle = typeof DICEBEAR_STYLES[number]['id'];

// Legacy predefined avatar seeds (for backwards compatibility)
export const LEGACY_AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Whiskers', 'Salem', 'Misty', 'Shadow',
  'Lucky', 'Ace', 'King', 'Queen', 'Jack', 'Joker',
  'Diamond', 'Spade', 'Heart', 'Club', 'Chip', 'Bluff',
  'River', 'Flop', 'Turn', 'Poker', 'Royal', 'Flush',
];

/**
 * Get the full avatar URL from stored avatar value
 *
 * @param avatar - The stored avatar value (can be dicebear:style, URL, path, or legacy seed)
 * @param nickname - The player's nickname (used for DiceBear seed)
 * @returns The full URL to display the avatar
 */
export function getAvatarUrl(avatar: string | null | undefined, nickname: string): string {
  // Default: generate DiceBear adventurer with nickname
  if (!avatar) {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nickname)}`;
  }

  // DiceBear style format: "dicebear:style"
  if (avatar.startsWith('dicebear:')) {
    const style = avatar.replace('dicebear:', '');
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(nickname)}`;
  }

  // Already a full URL (uploaded image or legacy DiceBear URL)
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }

  // Local path (uploaded avatar)
  if (avatar.startsWith('/')) {
    return avatar;
  }

  // Legacy format: just a seed name for adventurer style
  // This handles the old AVATAR_SEEDS like 'Felix', 'Ace', etc.
  if (LEGACY_AVATAR_SEEDS.includes(avatar)) {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
  }

  // Fallback: treat as DiceBear seed
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
}

/**
 * Check if an avatar URL is valid for display
 */
export function isValidAvatarUrl(avatar: string | null | undefined): boolean {
  return avatar !== null && avatar !== undefined && avatar !== '';
}

/**
 * Get DiceBear preview URL for a specific style
 * Used in avatar selection UI
 */
export function getDiceBearPreviewUrl(style: string, seed: string): string {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Convert avatar value to storage format
 *
 * @param type - 'dicebear' | 'upload' | 'legacy'
 * @param value - The style ID, URL, or seed
 */
export function createAvatarValue(type: 'dicebear' | 'upload' | 'legacy', value: string): string {
  switch (type) {
    case 'dicebear':
      return `dicebear:${value}`;
    case 'upload':
      return value; // Already a URL or path
    case 'legacy':
      return value; // Just the seed name
    default:
      return value;
  }
}

/**
 * Parse stored avatar value to determine its type
 */
export function parseAvatarValue(avatar: string | null | undefined): {
  type: 'dicebear' | 'upload' | 'url' | 'legacy' | 'none';
  value: string | null;
} {
  if (!avatar) {
    return { type: 'none', value: null };
  }

  if (avatar.startsWith('dicebear:')) {
    return { type: 'dicebear', value: avatar.replace('dicebear:', '') };
  }

  if (avatar.startsWith('/')) {
    return { type: 'upload', value: avatar };
  }

  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return { type: 'url', value: avatar };
  }

  if (LEGACY_AVATAR_SEEDS.includes(avatar)) {
    return { type: 'legacy', value: avatar };
  }

  // Unknown format, treat as legacy
  return { type: 'legacy', value: avatar };
}
