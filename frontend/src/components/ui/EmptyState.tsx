import { Mail } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-[var(--bg-input)] flex items-center justify-center mb-4">
        {icon || <Mail className="w-8 h-8 text-[var(--text-muted)]" />}
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] text-center max-w-sm">{description}</p>
    </div>
  );
}
