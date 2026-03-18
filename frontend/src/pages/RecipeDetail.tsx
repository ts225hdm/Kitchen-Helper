import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipesApi, Recipe } from '../api/recipes';
import { useToast } from '../components/Toast';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      recipesApi.getOne(id).then(setRecipe).finally(() => setLoading(false));
    }
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await toast.confirm(t('recipes.deleteConfirm'));
    if (!confirmed) return;
    await recipesApi.delete(id!);
    toast.success(t('recipes.deleted'));
    navigate('/recipes');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!recipe) return <div className="text-center py-16 text-gray-400 dark:text-gray-500">{t('common.noResults')}</div>;

  const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/recipes" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 py-1">&larr; {t('recipes.backToRecipes')}</Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{recipe.name}</h1>
          {recipe.description && <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">{recipe.description}</p>}
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg transition-colors flex-shrink-0 min-h-[40px]"
        >
          {t('common.delete')}
        </button>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white text-lg">{recipe.servings}</p>
          <p>{t('common.servings')}</p>
        </div>
        {recipe.prep_time_min && (
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-white text-lg">{recipe.prep_time_min}m</p>
            <p>{t('recipes.prep')}</p>
          </div>
        )}
        {recipe.cook_time_min && (
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-white text-lg">{recipe.cook_time_min}m</p>
            <p>{t('recipes.cook')}</p>
          </div>
        )}
        {totalTime > 0 && (
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-white text-lg">{totalTime}m</p>
            <p>{t('recipes.total')}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('recipes.ingredients')}</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{ing.quantity} {t(`units.${ing.unit}`, ing.unit)}</span>
              <span className="text-gray-900 dark:text-white flex-1">{ing.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('recipes.instructions')}</h2>
        <ol className="space-y-3">
          {recipe.steps.map((step) => (
            <li key={step.id} className="flex gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <span className="flex-shrink-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {step.step_number}
              </span>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step.instruction}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
