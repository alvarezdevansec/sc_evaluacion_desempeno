import type { EvaluationTypeId } from '@/types';

export default function TypeIcon({ type }: { type: EvaluationTypeId }) {
  const common = { width: 42, height: 42, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  if (type === 1) return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5"/></svg>;
  if (type === 2) return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20c.7-3.2 2.9-4.8 6.5-4.8s5.8 1.6 6.5 4.8M15 15.5c3.5-.3 5.4 1.2 6 4.5"/></svg>;
  return <svg {...common}><path d="M3 21h18M5 21V8l7-4 7 4v13M8 21v-7h8v7M8 9h.01M12 9h.01M16 9h.01"/></svg>;
}
