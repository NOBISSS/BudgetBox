import type { BudgetRecord } from '@/types';
import { anomalyRules } from '@/utils/anomalyRules';
export function InsightsSummary({ record }: { record: BudgetRecord }) { const alerts = anomalyRules(record); return <section className="card"><h2>{alerts.length ? 'A note for you' : 'Healthy spending'}</h2><p>{alerts[0]?.message ?? 'Everything looks balanced this month.'}</p></section>; }
