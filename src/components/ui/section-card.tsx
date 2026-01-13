import * as React from 'react';
import { cn } from '@/lib/utils';

type SectionCardVariant = 'primary' | 'secondary' | 'callout' | 'ink';

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  variant?: SectionCardVariant;
  icon?: React.ReactNode;
  noPadding?: boolean;
}

const variantStyles: Record<SectionCardVariant, string> = {
  primary: 'bg-card border-2 border-border shadow-sm',
  secondary: 'bg-muted/20 border border-border/50',
  callout: 'bg-muted/30 border border-border/50',
  ink: 'bg-ink text-ink-foreground border border-border shadow-md',
};

const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  (
    {
      className,
      title,
      description,
      actions,
      variant = 'primary',
      icon,
      noPadding = false,
      children,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn('rounded-lg', variantStyles[variant], className)}
      {...props}
    >
      {(title || actions) && (
        <div
          className={cn(
            'flex items-center justify-between gap-4',
            noPadding ? 'px-4 py-3' : 'p-4 pb-0'
          )}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <div className={cn(
                'flex-shrink-0',
                variant === 'ink' ? 'text-ink-foreground/70' : 'text-muted-foreground'
              )}>{icon}</div>
            )}
            <div>
              {title && (
                <h3
                  className={cn(
                    'font-semibold',
                    variant === 'primary'
                      ? 'text-lg text-foreground'
                      : variant === 'ink'
                      ? 'text-lg text-ink-foreground'
                      : 'text-base text-muted-foreground'
                  )}
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className={cn(
                  'text-sm mt-0.5',
                  variant === 'ink' ? 'text-ink-foreground/70' : 'text-muted-foreground'
                )}>
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-4')}>{children}</div>
    </div>
  )
);
SectionCard.displayName = 'SectionCard';

export { SectionCard };
export type { SectionCardProps, SectionCardVariant };
