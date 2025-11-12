import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-500');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
  });

  it('should ignore falsy values', () => {
    const result = cn('base-class', false && 'hidden-class', null, undefined);
    expect(result).toContain('base-class');
    expect(result).not.toContain('hidden-class');
  });

  it('should handle Tailwind conflicts correctly', () => {
    // tailwind-merge should resolve conflicts
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4'); // Should keep only the last px value
  });
});
