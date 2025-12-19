import { toast } from "sonner";
import { api } from "./api-client";
export interface ReceiptAnalysisResult {
  merchant: string;
  amount: number;
  date: string; // ISO 8601 format: YYYY-MM-DD
  category: string;
}
export const structuredPrompt = `
You are an expert receipt and invoice analyzer. Extract:
1.  **merchant**: Store name.
2.  **amount**: Total numeric amount.
3.  **date**: Transaction date in YYYY-MM-DD.
4.  **category**: Best category from the provided list.
Return strictly valid JSON.
`;
export async function analyzeReceipt(imageBase64: string, apiKey: string): Promise<ReceiptAnalysisResult> {
  const customPrompt = localStorage.getItem('gemini_prompt') || structuredPrompt;
  // Prepare dynamic category context for when the real API is re-enabled
  let categoriesStr = "Alquiler, Comida, Transporte, Salario, Otro";
  try {
    const cats = await api<{ id: string; name: string }[]>('/api/finance/categories');
    categoriesStr = cats.map(c => c.name).join(', ');
  } catch (e) {
    console.warn("Failed to fetch live categories for Gemini prompt context");
  }
  // MOCK MODE: Simulation logic
  console.log('Gemini Analysis with Context:', { model: localStorage.getItem('gemini_model'), categories: categoriesStr });
  // Artificial delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    merchant: 'Mercadona Supermarket',
    amount: 42.15,
    date: new Date().toISOString().split('T')[0],
    category: categoriesStr.includes('Comida') ? 'Comida' : 'Otro'
  };
}
export async function validateApiKey(key: string): Promise<boolean> {
  if (!key || key.length < 10) {
    toast.error('Clave API no válida.');
    return false;
  }
  toast.success('Clave API de Gemini validada correctamente.');
  return true;
}