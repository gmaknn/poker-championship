'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface LegacyBannerProps {
  version: string;
  canonicalPath: string;
}

/**
 * Banner displayed on legacy TV views to inform users about the canonical version.
 */
export function LegacyBanner({ version, canonicalPath }: LegacyBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black py-2 px-4 flex items-center justify-center gap-4 shadow-lg">
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <span className="font-semibold text-sm">
        Version Legacy ({version}) - Cette vue sera dépréciée prochainement.
      </span>
      <Link
        href={canonicalPath}
        className="inline-flex items-center gap-1 bg-black text-white px-3 py-1 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors"
      >
        Aller à la version actuelle
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
