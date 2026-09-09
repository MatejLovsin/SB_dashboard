interface PageHeaderProps {
  title: string;
  description?: string;
  /** Small uppercase line above the title — the section or context. */
  eyebrow?: string;
  action?: React.ReactNode;
}

// Sits at depth 0, directly under the lamp. The title takes the display face
// (via the h1 element rule in globals.css); Martian Mono is wide, so the size
// steps down on phones.
export function PageHeader({ title, description, eyebrow, action }: PageHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <span className="label mb-2 block text-[10px] text-accent">{eyebrow}</span>
        ) : null}
        <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
