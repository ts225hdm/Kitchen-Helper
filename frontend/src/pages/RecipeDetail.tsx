import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recipesApi, Recipe } from '../api/recipes';
import { foodDataApi, RecipeNutrition } from '../api/foodData';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [nutrition, setNutrition] = useState<RecipeNutrition | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      recipesApi.getOne(id).then(setRecipe).finally(() => setLoading(false));
      setNutritionLoading(true);
      foodDataApi.getRecipeNutrition(id).then(setNutrition).catch(() => {}).finally(() => setNutritionLoading(false));
    }
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this recipe?')) return;
    await recipesApi.delete(id!);
    navigate('/recipes');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!recipe) return <div className="text-center py-16 text-gray-400">Recipe not found</div>;

  const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/recipes" className="text-sm text-primary-600 hover:underline">&larr; Back to Recipes</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{recipe.name}</h1>
          {recipe.is_ai_generated && (
            <span className="inline-block text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium mt-1">AI Generated</span>
          )}
          {recipe.description && <p className="text-gray-500 mt-2">{recipe.description}</p>}
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex-shrink-0"
        >
          Delete
        </button>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
        <div className="text-center">
          <p className="font-semibold text-gray-900 text-lg">{recipe.servings}</p>
          <p>Servings</p>
        </div>
        {recipe.prep_time_min && (
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-lg">{recipe.prep_time_min}m</p>
            <p>Prep</p>
          </div>
        )}
        {recipe.cook_time_min && (
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-lg">{recipe.cook_time_min}m</p>
            <p>Cook</p>
          </div>
        )}
        {totalTime > 0 && (
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-lg">{totalTime}m</p>
            <p>Total</p>
          </div>
        )}
      </div>

      {/* Nutrition Summary */}
      {nutritionLoading ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center text-sm text-green-600">
          Calculating nutrition...
        </div>
      ) : nutrition && nutrition.matched_count > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Nutrition Facts</h2>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {nutrition.matched_count}/{nutrition.total_count} ingredients matched
            </span>
          </div>

          {/* Per serving */}
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Per serving ({nutrition.servings} servings)</p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xl font-bold text-gray-900">{nutrition.per_serving_calories}</p>
              <p className="text-xs text-gray-500">kcal</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xl font-bold text-blue-600">{nutrition.per_serving_protein_g}g</p>
              <p className="text-xs text-gray-500">Protein</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xl font-bold text-amber-600">{nutrition.per_serving_carbs_g}g</p>
              <p className="text-xs text-gray-500">Carbs</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xl font-bold text-red-500">{nutrition.per_serving_fat_g}g</p>
              <p className="text-xs text-gray-500">Fat</p>
            </div>
          </div>

          {/* Total */}
          <p className="text-xs text-gray-400 mb-1">Total: {nutrition.total_calories} kcal &middot; {nutrition.total_protein_g}g protein &middot; {nutrition.total_carbs_g}g carbs &middot; {nutrition.total_fat_g}g fat</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Ingredients</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing) => {
            const ingNutrition = nutrition?.ingredients.find((n) => n.name === ing.name);
            return (
              <li key={ing.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ingNutrition?.matched ? 'bg-green-400' : 'bg-gray-300'}`} />
                <span className="font-medium text-gray-700">{ing.quantity} {ing.unit}</span>
                <span className="text-gray-900 flex-1">{ing.name}</span>
                {ingNutrition?.matched && (
                  <span className="text-xs text-gray-400">
                    {ingNutrition.calories_kcal} kcal
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h2>
        <ol className="space-y-3">
          {recipe.steps.map((step) => (
            <li key={step.id} className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <span className="flex-shrink-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {step.step_number}
              </span>
              <p className="text-gray-700 leading-relaxed">{step.instruction}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
