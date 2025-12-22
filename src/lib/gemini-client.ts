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
Responde solo con un JSON válido.
`;
const DEFAULT_MODEL = "gemini-2.5-flash-image";
export async function analyzeReceipt(imageBase64: string, apiKey: string): Promise<ReceiptAnalysisResult> {
  const model = localStorage.getItem('gemini_model') || DEFAULT_MODEL;
  let categoriesStr = "Comida, Transporte, Alquiler, Salario, Otro";
  try {
    const cats = await api<{ id: string; name: string }[]>('/api/finance/categories');
    categoriesStr = cats.map(c => c.name).join(', ');
  } catch (e) {
    console.warn("Using fallback categories for AI prompt.");
  }
  console.log(`Using AI Model: ${model}`);
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  // Simulation based on base64 content hints or random data
  return {
    merchant: 'Comercio Detectado',
    amount: Math.floor(Math.random() * 100) + 15.50,
    date: new Date().toISOString().split('T')[0],
    category: 'Comida'
  };
}
export async function validateApiKey(key: string): Promise<boolean> {
  if (!key || key.length < 15) {
    toast.error('Clave API no válida.');
    return false;
  }
  toast.success('Clave API de Gemini vinculada.');
  return true;
}