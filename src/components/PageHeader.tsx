import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: 'default' | 'simple';
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  variant = 'default',
  className,
}: PageHeaderProps) {
  const isStyled = variant === 'default';

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
        isStyled && 'bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-border rounded-lg p-4 sm:p-6 mb-6',
        !isStyled && 'mb-6',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h1 className={cn(
              'font-bold',
              isStyled ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'
            )}>
              {title}
            </h1>
            {description && (
              <div className={cn(
                'text-muted-foreground',
                isStyled ? 'mt-1 text-base' : 'mt-1'
              )}>
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
