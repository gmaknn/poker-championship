import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
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
        'flex items-center justify-between',
        isStyled && 'bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-border rounded-lg p-6 mb-6',
        !isStyled && 'mb-6',
        className
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div>
            <h1 className={cn(
              'font-bold',
              isStyled ? 'text-4xl' : 'text-3xl'
            )}>
              {title}
            </h1>
            {description && (
              <p className={cn(
                'text-muted-foreground',
                isStyled ? 'mt-1 text-base' : 'mt-1'
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
    </div>
  );
}
