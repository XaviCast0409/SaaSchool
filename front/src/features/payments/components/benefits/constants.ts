import { formatMoney } from '@/lib/format';
import { type Scholarship } from '../../api/useFinance';
import { CONCEPTS } from '../../constants';

export { CONCEPTS };

export const valueLabel = (s: Pick<Scholarship, 'kind' | 'value'>) =>
  s.kind === 'PERCENT' ? `${Number(s.value)} %` : `${formatMoney(s.value)} por cuota`;
