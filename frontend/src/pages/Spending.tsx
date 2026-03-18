import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { spendingApi, SpendingSummary } from '../api/spending';

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function Spending() {
  const { t } = useTranslation();
  const defaults = getDefaultDates();
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [currency, setCurrency] = useState('EUR');
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoad = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await spendingApi.getSummary(start, end, currency);
      setSummary(data);
    } catch {
      setError(t('spending.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const pct = summary && summary.total > 0
    ? Math.round((summary.grocery_total / summary.total) * 100)
    : 0;

  const inputCls = 'border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-700';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('spending.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('spending.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3 sm:items-end">
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('spending.from')}</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('spending.to')}</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-2 sm:contents">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('spending.currency')}</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              {['EUR', 'USD', 'GBP', 'CHF'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={handleLoad} disabled={loading}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium self-end min-h-[42px]">
            {loading ? t('common.loading') : t('spending.load')}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>}

      {summary && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('spending.totalSpending')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{summary.total.toFixed(2)}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">{summary.currency}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-5">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('spending.groceries')}</p>
              <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{summary.grocery_total.toFixed(2)}</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{pct}% {t('spending.ofTotal')} &middot; {summary.currency}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-5">
              <p className="text-sm text-orange-700 dark:text-orange-400">{t('spending.eatingOut')}</p>
              <p className="text-3xl font-bold text-orange-800 dark:text-orange-300 mt-1">{summary.eating_out_total.toFixed(2)}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400">{100 - pct}% {t('spending.ofTotal')} &middot; {summary.currency}</p>
            </div>
          </div>

          {/* Visual bar */}
          {summary.total > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('spending.groceryVsEating')}</p>
              <div className="flex rounded-full overflow-hidden h-5">
                <div className="bg-emerald-400 dark:bg-emerald-500 transition-all" style={{ width: `${pct}%` }} title={`Groceries ${pct}%`} />
                <div className="bg-orange-400 dark:bg-orange-500 flex-1" title={`Eating out ${100 - pct}%`} />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 dark:bg-emerald-500 rounded-full inline-block" /> {t('spending.groceries')}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 dark:bg-orange-500 rounded-full inline-block" /> {t('spending.eatingOut')}</span>
              </div>
            </div>
          )}

          {/* Weekly breakdown */}
          {summary.weekly_breakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('spending.weeklyBreakdown')}</h2>
              <div className="space-y-2">
                {summary.weekly_breakdown.map((week) => (
                  <div key={week.week_start} className="text-sm">
                    <div className="flex items-center justify-between mb-1 sm:mb-0">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(week.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(week.week_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-right sm:hidden">{week.total.toFixed(2)} {week.currency}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="flex-1 flex gap-1 h-5">
                        {week.grocery_total > 0 && (
                          <div className="bg-emerald-200 dark:bg-emerald-500/30 rounded-sm flex items-center px-1 text-xs text-emerald-800 dark:text-emerald-300 whitespace-nowrap"
                            style={{ width: `${(week.grocery_total / summary.total) * 100}%`, minWidth: '2rem' }}>
                            {week.grocery_total.toFixed(0)}
                          </div>
                        )}
                        {week.eating_out_total > 0 && (
                          <div className="bg-orange-200 dark:bg-orange-500/30 rounded-sm flex items-center px-1 text-xs text-orange-800 dark:text-orange-300 whitespace-nowrap"
                            style={{ width: `${(week.eating_out_total / summary.total) * 100}%`, minWidth: '2rem' }}>
                            {week.eating_out_total.toFixed(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 w-20 text-right hidden sm:block">{week.total.toFixed(2)} {week.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.top_stores.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('spending.topStores')}</h2>
                <ul className="space-y-2">
                  {summary.top_stores.map((s) => (
                    <li key={s.store} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{s.store}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{s.total.toFixed(2)} {currency}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.top_restaurants.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('spending.topRestaurants')}</h2>
                <ul className="space-y-2">
                  {summary.top_restaurants.map((r) => (
                    <li key={r.restaurant} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{r.restaurant}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{r.total.toFixed(2)} {currency}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
