import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';

describe('normalizeAvatarSrc', () => {
  it('returns null for null input', () => {
    expect(normalizeAvatarSrc(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeAvatarSrc(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeAvatarSrc('')).toBeNull();
    expect(normalizeAvatarSrc('   ')).toBeNull();
  });

  it('returns unchanged for paths starting with /', () => {
    expect(normalizeAvatarSrc('/avatars/player-123.png')).toBe('/avatars/player-123.png');
    expect(normalizeAvatarSrc('/images/test.jpg')).toBe('/images/test.jpg');
  });

  it('adds leading slash to paths starting with avatars/', () => {
    expect(normalizeAvatarSrc('avatars/player-123.png')).toBe('/avatars/player-123.png');
    expect(normalizeAvatarSrc('avatars/test.jpg')).toBe('/avatars/test.jpg');
  });

  it('returns unchanged for http URLs', () => {
    expect(normalizeAvatarSrc('http://example.com/avatar.png')).toBe('http://example.com/avatar.png');
  });

  it('returns unchanged for https URLs', () => {
    expect(normalizeAvatarSrc('https://example.com/avatar.png')).toBe('https://example.com/avatar.png');
  });

  it('returns null for unknown formats', () => {
    expect(normalizeAvatarSrc('random-string')).toBeNull();
    expect(normalizeAvatarSrc('some/other/path.png')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(normalizeAvatarSrc('  /avatars/test.png  ')).toBe('/avatars/test.png');
    expect(normalizeAvatarSrc('  avatars/test.png  ')).toBe('/avatars/test.png');
  });
});

describe('isValidAvatarUrl', () => {
  it('returns true for valid paths', () => {
    expect(isValidAvatarUrl('/avatars/player-123.png')).toBe(true);
    expect(isValidAvatarUrl('avatars/player-123.png')).toBe(true);
    expect(isValidAvatarUrl('https://example.com/avatar.png')).toBe(true);
  });

  it('returns false for invalid inputs', () => {
    expect(isValidAvatarUrl(null)).toBe(false);
    expect(isValidAvatarUrl(undefined)).toBe(false);
    expect(isValidAvatarUrl('')).toBe(false);
    expect(isValidAvatarUrl('random-string')).toBe(false);
  });
});
