import Link from 'next/link';

export function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return <section className="empty-state" aria-label={title}>
    <span className="empty-state-icon" aria-hidden="true">▤</span>
    <div className="empty-state-content"><h2>{title}</h2><p>{description}</p>
      {action && <Link href={action.href} className="empty-state-action">{action.label}</Link>}
    </div>
  </section>;
}
