import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { recipesApi, RecipeSuggestion, CreateRecipe } from '../api/recipes';
import { foodItemsApi, FoodItem } from '../api/foodItems';
import { useToast } from '../components/Toast';
import { useUser } from '../hooks/useUser';

export default function AIRecommendations() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { isPremium, loading: userLoading } = useUser();
  const [kitchenItems, setKitchenItems] = useState<FoodItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());

  useEffect(() => {
    foodItemsApi.getAll().then((items) => {
      setKitchenItems(items);
      setSelectedIds(new Set(items.map((i) => i.id)));
    }).catch(() => {
      toast.error(t('common.loading'));
    }).finally(() => setLoadingItems(false));
  }, []);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === kitchenItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(kitchenItems.map((i) => i.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setSuggestions([]);
    setSavedIdx(new Set());
    try {
      const ids = Array.from(selectedIds);
      const recipes = await recipesApi.getRecommendations(i18n.language, ids);
      setSuggestions(recipes);
    } catch {
      toast.error(t('aiChef.failedToGet'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (recipe: RecipeSuggestion, idx: number) => {
    try {
      const data: CreateRecipe = {
        ...recipe,
        is_ai_generated: true,
      };
      await recipesApi.create(data);
      setSavedIdx((prev) => new Set(prev).add(idx));
      toast.success(t('aiChef.saved'));
    } catch {
      toast.error(t('aiChef.failedToSave'));
    }
  };

  const isExpiringSoon = (item: FoodItem) => {
    if (!item.expiry_date) return false;
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    return new Date(item.expiry_date) <= soon;
  };

  if (!userLoading && !isPremium) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('aiChef.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('aiChef.subtitle')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('premium.locked')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">{t('premium.testPhase')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('premium.contactUs')}{' '}
            <a href="mailto:schoenfelddev@gmail.com" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
              schoenfelddev@gmail.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('aiChef.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('aiChef.subtitle')}</p>
      </div>

      {/* Ingredient selection */}
      {!loadingItems && kitchenItems.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('aiChef.selectIngredients')}</h2>
            <button
              onClick={toggleAll}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              {selectedIds.size === kitchenItems.length ? t('aiChef.deselectAll') : t('aiChef.selectAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {kitchenItems.map((item) => {
              const selected = selectedIds.has(item.id);
              const expiring = isExpiringSoon(item);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    selected
                      ? expiring
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {selected && <span className="mr-1">&#10003;</span>}
                  {expiring && <span className="mr-0.5">&#9888;</span>}
                  {item.name}
                  <span className="ml-1 text-xs opacity-60">{item.quantity} {t(`units.${item.unit}`, item.unit)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('aiChef.selectedCount', { count: selectedIds.size, total: kitchenItems.length })}
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading || selectedIds.size === 0}
              className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            >
              {loading ? t('aiChef.thinking') : t('aiChef.getSuggestions')}
            </button>
          </div>
        </div>
      )}

      {/* Empty kitchen */}
      {!loadingItems && kitchenItems.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('aiChef.emptyKitchen')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('aiChef.emptyKitchenHint')}</p>
        </div>
      )}

      {/* Loading items */}
      {loadingItems && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      )}

      {/* Loading suggestions */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('aiChef.thinking')}</p>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('aiChef.suggestedRecipes')}</h2>
          </div>
          {suggestions.map((recipe, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{recipe.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{recipe.description}</p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full font-medium flex-shrink-0">AI</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span>{recipe.servings} {t('common.servings')}</span>
                <span>{t('recipes.prep')}: {recipe.prep_time_min}m</span>
                <span>{t('recipes.cook')}: {recipe.cook_time_min}m</span>
                <span>{recipe.ingredients.length} {t('recipes.ingredients')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">{t('recipes.ingredients')}</h4>
                  <ul className="space-y-0.5">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        {ing.quantity} {t(`units.${ing.unit}`, ing.unit)} {ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">{t('recipes.instructions')}</h4>
                  <ol className="space-y-1">
                    {recipe.steps.map((step) => (
                      <li key={step.step_number} className="text-gray-500 dark:text-gray-400 text-xs">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{step.step_number}.</span> {step.instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <button
                onClick={() => handleSave(recipe, idx)}
                disabled={savedIdx.has(idx)}
                className={`w-full text-sm font-medium py-3 rounded-lg transition-colors min-h-[48px] ${
                  savedIdx.has(idx)
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                }`}
              >
                {savedIdx.has(idx) ? t('aiChef.saved') : t('aiChef.saveToRecipes')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
