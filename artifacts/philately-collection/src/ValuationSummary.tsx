import { useEffect, useMemo, useState } from 'react';
import { sumEstimates, type ValuationInput } from './valuation';

type ExchangeRate = { value: number; date: string };
const PROVIDER = 'https://www.cbr-xml-daily.ru';
const rub = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const moscowDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export default function ValuationSummary({ records }: { records: ValuationInput[] }) {
  const totals = useMemo(() => sumEstimates(records), [records]);
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let active = true;
    setError(false);
    setRate(null);
    async function load() {
      async function get(path: string) {
        const response = await fetch(`${PROVIDER}${path}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Exchange rate unavailable');
        return response.json();
      }
      try {
        let data = await get('/daily_json.js');
        const today = moscowDate();
        // The next business day's rate is sometimes published the evening before.
        // Use today's effective rate, not tomorrow's announcement.
        if (typeof data.Date === 'string' && data.Date.slice(0, 10) > today) {
          data = await get(`/archive/${today.replace(/-/g, '/')}/daily_json.js`);
        }
        const date = typeof data.Date === 'string' ? data.Date.slice(0, 10) : '';
        const value = Number(data.Valute?.USD?.Value) / Number(data.Valute?.USD?.Nominal);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || !Number.isFinite(value) || value <= 0) {
          throw new Error('Invalid exchange rate');
        }
        if (active) setRate({ value, date });
      } catch {
        if (active) setError(true);
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    const refresh = window.setInterval(() => setAttempt(value => value + 1), 60 * 60 * 1000);
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); window.clearInterval(refresh); };
  }, [attempt]);
  const needsRate = totals.usd[0] !== 0 || totals.usd[1] !== 0;
  const canCalculate = totals.included > 0 && (!needsRate || rate !== null);
  const minimum = totals.rub[0] + totals.usd[0] * (rate?.value ?? 0);
  const maximum = totals.rub[1] + totals.usd[1] * (rate?.value ?? 0);
  return <section className="valuation-panel" aria-label="Оценочная стоимость коллекции">
    <div className="metric-label">Оценочная стоимость всей коллекции</div>
    <div className="valuation-range" aria-live="polite" data-testid="collection-value-range">
      {canCalculate ? <><span><small>от</small> {rub.format(minimum)}</span><span className="valuation-separator">—</span><span><small>до</small> {rub.format(maximum)}</span></>
        : <span className="valuation-pending">{!totals.included ? 'Нет оценок для расчёта' : error ? 'Не удалось загрузить курс' : 'Загружаем курс USD/RUB…'}</span>}
    </div>
    <div className="valuation-details">
      <span>Учтено {totals.included} из {records.length} карточек{totals.excluded > 0 ? `; без подходящей оценки: ${totals.excluded}` : ''}.</span>
      {rate && <span>1 USD = {rate.value.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ₽ · курс ЦБ на {rate.date.split('-').reverse().join('.')} · <a href={`${PROVIDER}/`} target="_blank" rel="noopener noreferrer">источник данных</a></span>}
      {error && <span>Курс недоступен. {needsRate && `Сумма оценок в USD: ${usd.format(totals.usd[0])} — ${usd.format(totals.usd[1])}. `}<button className="text-link" onClick={() => setAttempt(value => value + 1)}>Повторить загрузку</button></span>}
      {totals.excluded > 0 && <span>В расчёт входят только корректные суммы и диапазоны в USD и RUB; остальные карточки не считаются нулевыми.</span>}
    </div>
    <p className="valuation-disclaimer">Сумма нижних и верхних оценок карточек по курсу, а не подтверждённая цена продажи коллекции. Ориентир для обычных экземпляров в подборке.</p>
  </section>;
}
