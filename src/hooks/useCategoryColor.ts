import { useMemo } from 'react';
const palette = [
  'bg-emerald-500', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500',
  'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-indigo-500', 'bg-rose-500'
];
const seededMap: Record<string, string> = {
  'Comida': 'bg-emerald-500',
  'Alquiler': 'bg-red-500',
  'Salario': 'bg-blue-500',
  'Transporte': 'bg-yellow-500',
  'Compras': 'bg-purple-500',
  'Restaurantes': 'bg-orange-500',
  'Regalo': 'bg-rose-500',
  'Supermercado': 'bg-green-500',
  'Transferencia': 'bg-slate-500',
  'Otro': 'bg-gray-500',
};
const hashCategory = (category: string): number => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    const char = category.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/* Export a pure helper that implements the exact same logic as the hook previously used */
export const getCategoryColor = (category?: string): string => {
  if (!category) {
    return 'bg-gray-500';
  }
  const lowerCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  if (seededMap[lowerCategory]) {
    return seededMap[lowerCategory];
  }
  const hash = hashCategory(category);
  return palette[hash % palette.length];
};
export const useCategoryColor = (category?: string): string => {
  return useMemo(() => getCategoryColor(category), [category]);
};