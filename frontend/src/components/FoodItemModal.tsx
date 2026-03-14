import { useState, useEffect, useRef } from 'react';
import { CreateFoodItem, FoodItem } from '../api/foodItems';
import { foodDataApi, FoodDataItem } from '../api/foodData';

const UNITS = ['g', 'kg', 'ml', 'l', 'pieces', 'tbsp', 'tsp', 'cup', 'oz', 'lb'];
const CATEGORIES = ['dairy', 'meat', 'vegetables', 'fruits', 'grains', 'beverages', 'condiments', 'snacks', 'frozen', 'other'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

export default function FoodItemModal({
  item,
  onSave,
  onClose,
}: {
  item?: FoodItem;
  onSave: (data: CreateFoodItem) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateFoodItem>({
    name: item?.name ?? '',
    quantity: item?.quantity ?? 1,
    unit: item?.unit ?? 'g',
    category: item?.category ?? '',
    expiry_date: item?.expiry_date ?? undefined,
    notes: item?.notes ?? '',
    price_per_unit: item?.price_per_unit ?? undefined,
    price_currency: item?.price_currency ?? 'EUR',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<FoodDataItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFoodData, setSelectedFoodData] = useState<FoodDataItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNameChange = (value: string) => {
    setForm({ ...form, name: value });
    setSelectedFoodData(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await foodDataApi.search(value, 8);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const handleSelectSuggestion = (fd: FoodDataItem) => {
    const bestName = fd.canonical_food_name || fd.display_name || fd.canonical_name;
    const bestCategory = fd.taxonomy_category || fd.category;
    setForm({
      ...form,
      name: bestName,
      category: bestCategory && CATEGORIES.includes(bestCategory) ? bestCategory : form.category,
      food_data_id: fd.api_food_id,
    });
    setSelectedFoodData(fd);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{item ? 'Edit Food Item' : 'Add Food Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text" required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Start typing to search foods..."
              autoComplete="off"
            />
            {showSuggestions && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {suggestions.map((fd) => (
                  <li
                    key={fd.api_food_id}
                    onClick={() => handleSelectSuggestion(fd)}
                    className="px-3 py-2 hover:bg-primary-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {fd.canonical_food_name || fd.display_name}
                    </p>
                    <p className="text-xs text-gray-400 flex gap-3 mt-0.5">
                      {(fd.taxonomy_category || fd.category) && (
                        <span>{fd.taxonomy_category || fd.category}</span>
                      )}
                      {fd.calories_kcal != null && <span>{fd.calories_kcal} kcal</span>}
                      {fd.protein_g != null && <span>{fd.protein_g}g protein</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Nutrition preview when a food data item is selected */}
          {selectedFoodData && selectedFoodData.calories_kcal != null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">Nutrition will be added automatically (per 100g)</p>
              <div className="grid grid-cols-4 gap-2 text-xs text-green-800">
                <div className="text-center">
                  <p className="font-bold">{selectedFoodData.calories_kcal}</p>
                  <p>kcal</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{selectedFoodData.protein_g ?? 0}</p>
                  <p>protein</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{selectedFoodData.carbs_g ?? 0}</p>
                  <p>carbs</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{selectedFoodData.fat_g ?? 0}</p>
                  <p>fat</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number" required min="0" step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category ?? ''}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per unit</label>
              <input
                type="number" min="0" step="0.01"
                value={form.price_per_unit ?? ''}
                onChange={(e) => setForm({ ...form, price_per_unit: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={form.price_currency}
                onChange={(e) => setForm({ ...form, price_currency: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input
              type="date"
              value={form.expiry_date ?? ''}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
