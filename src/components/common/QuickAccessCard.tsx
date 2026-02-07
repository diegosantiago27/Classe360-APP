import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAccessCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  variant?: 'primary' | 'gestor' | 'admin' | 'professor' | 'aluno';
  delay?: number;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  icon: Icon,
  title,
  description,
  to,
  variant = 'primary',
  delay = 0,
}) => {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary',
    gestor: 'bg-gestor-light text-gestor',
    admin: 'bg-admin-light text-admin',
    professor: 'bg-professor-light text-professor',
    aluno: 'bg-aluno-light text-aluno',
  };

  return (
    <Link
      to={to}
      className="block animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="bg-card rounded-xl p-6 card-hover border border-border/50 h-full">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
            variantStyles[variant]
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-display font-semibold text-lg text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
};

export default QuickAccessCard;
