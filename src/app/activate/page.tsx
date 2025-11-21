'use client';

import { Suspense } from 'react';
import ActivateContent from './ActivateContent';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Chargement...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}
