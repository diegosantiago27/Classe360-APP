import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  variant?: 'primary' | 'success' | 'warning' | 'accent';
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  change,
  changeLabel,
  variant = 'primary',
  delay = 0,
}) => {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
  };

  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className="bg-card rounded-xl p-6 card-hover border border-border/50 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            variantStyles[variant]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              isPositive
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      {changeLabel && (
        <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
      )}
    </div>
  );
};

export default StatCard;
