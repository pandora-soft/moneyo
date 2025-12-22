import { toast } from "sonner";
import { api } from "./api-client";
export interface ReceiptAnalysisResult {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}
export const structuredPrompt = `
Eres un experto en contabilidad. Analiza la imagen del recibo y extrae:
1. merchant: Nombre del comercio.
2. amount: Importe total (solo número).
3. date: Fecha en formato YYYY-MM-DD.
4. category: La mejor categoría que encaje del sistema.
Responde solo con un JSON v��lido.
`;
const DEFAULT_MODEL = "gemini-1.5-flash";
export async function analyzeReceipt(imageBase64: string, apiKey: string): Promise<ReceiptAnalysisResult> {
  const model = localStorage.getItem('gemini_model') || DEFAULT_MODEL;
  const customPrompt = localStorage.getItem('gemini_prompt') || '';
  let categoriesStr = "Comida, Transporte, Alquiler, Salario, Otro";
  try {
    const cats = await api<{ id: string; name: string }[]>('/api/finance/categories');
    categoriesStr = cats.map(c => c.name).join(', ');
  } catch (e) {
    console.warn("Using fallback categories for AI prompt.");
  }
  console.log(`Using AI Model: ${model}`);
  console.log(`System Prompt: ${structuredPrompt} ${customPrompt} Categorías: ${categoriesStr}`);
  // Mock implementation for demo/dev purposes
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    merchant: 'Comercio Detectado',
    amount: parseFloat((Math.random() * 100).toFixed(2)),
    date: new Date().toISOString().split('T')[0],
    category: 'Comida'
  };
}
export async function validateApiKey(key: string): Promise<boolean> {
  if (!key || key.length < 15) {
    toast.error('Clave API no válida estructuralmente.');
    return false;
  }
  // In a real app, you'd make a call to Google's listModels to verify the key
  return true;
}
export async function testPrompt(key: string, model: string, prompt: string): Promise<ReceiptAnalysisResult> {
  console.log(`Testing Prompt with key: ${key.slice(0, 5)}... Model: ${model}`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    merchant: 'Prueba Exitosa',
    amount: 12.34,
    date: '2025-01-01',
    category: 'Otro'
  };
}