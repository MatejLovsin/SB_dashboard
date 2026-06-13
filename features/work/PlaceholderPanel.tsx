import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  futureNote?: string;
}

export function PlaceholderPanel({ icon: Icon, title, description, futureNote }: Props) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-border/60">
        <Icon className="h-5 w-5 text-muted" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
      {futureNote && (
        <p className="mt-3 text-xs text-muted/70 italic">{futureNote}</p>
      )}
    </div>
  );
}
