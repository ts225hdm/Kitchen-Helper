import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { foodItemsApi, FoodItem } from '../api/foodItems';
import { recipesApi, Recipe } from '../api/recipes';

export default function Dashboard() {
  const { t } = useTranslation();
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([foodItemsApi.getAll(), recipesApi.getAll()])
      .then(([items, recs]) => {
        setFoodItems(items);
        setRecipes(recs);
      })
      .finally(() => setLoading(false));
  }, []);

  const expiringItems = foodItems.filter((item) => {
    if (!item.expiry_date) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  });

  const expiredItems = foodItems.filter((item) => {
    if (!item.expiry_date) return false;
    return new Date(item.expiry_date) < new Date();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t('dashboard.totalItems')}
          value={foodItems.length}
          description={t('dashboard.inYourKitchen')}
          color="emerald"
          href="/kitchen"
        />
        <StatCard
          title={t('dashboard.expiringSoon')}
          value={expiringItems.length}
          description={t('dashboard.within3days')}
          color="amber"
          href="/kitchen"
        />
        <StatCard
          title={t('dashboard.recipes')}
          value={recipes.length}
          description={t('dashboard.savedRecipes')}
          color="blue"
          href="/recipes"
        />
      </div>

      {/* Alerts */}
      {expiredItems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2">{t('dashboard.expiredItems')}</h3>
          <ul className="space-y-1">
            {expiredItems.map((item) => (
              <li key={item.id} className="text-sm text-red-700 dark:text-red-300">
                {item.name} — {t('dashboard.expired')} {new Date(item.expiry_date!).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {expiringItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">{t('dashboard.expiringSoon')}</h3>
          <ul className="space-y-1">
            {expiringItems.map((item) => (
              <li key={item.id} className="text-sm text-amber-700 dark:text-amber-300">
                {item.name} — expires {new Date(item.expiry_date!).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickAction
          title={t('dashboard.manageKitchen')}
          description={t('dashboard.manageKitchenDesc')}
          href="/kitchen"
          icon="M4 7h16M4 7V5a1 1 0 011-1h14a1 1 0 011 1v2M4 7l1 12a2 2 0 002 2h10a2 2 0 002-2l1-12"
          color="emerald"
        />
        <QuickAction
          title={t('dashboard.groceryTrips')}
          description={t('dashboard.groceryTripsDesc')}
          href="/spending"
          icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({
  title, value, description, color, href,
}: {
  title: string; value: number; description: string; color: string; href: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
  };
  return (
    <Link to={href} className={`rounded-xl border p-4 sm:p-5 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-shadow active:scale-[0.98] ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
      <p className="text-sm opacity-75 mt-1">{description}</p>
    </Link>
  );
}

function QuickAction({ title, description, href, icon, color }: { title: string; description: string; href: string; icon: string; color: string }) {
  const iconColors: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
  };
  return (
    <Link
      to={href}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-shadow flex items-start gap-3 sm:gap-4 active:scale-[0.98]"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColors[color]}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </Link>
  );
}
