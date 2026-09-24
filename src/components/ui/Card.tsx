import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-surface border border-border rounded-xl p-5", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("flex flex-col gap-1 mb-4", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps extends CardProps {
  as?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
}

export function CardTitle({ children, className, as: Component = 'h3' }: CardTitleProps) {
  return (
    <Component className={cn("text-lg font-medium text-text-main tracking-tight", className)}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn("text-sm text-text-muted font-light", className)}>
      {children}
    </p>
  );
}
