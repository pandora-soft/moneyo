import { toast } from "sonner";
import { api } from "./api-client";
export interface ReceiptAnalysisResult {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}
interface ExternalGeminiConfig {
  claveApi?: string;
  modeloIa?: string;
  instruccionesIa?: string;
}
const DEFAULT_MODEL = "gemini-2.5-flash-image";
const CONFIG_URL = "/config/gemini.json";
/**
 * Resolves the configuration hierarchy for the Gemini AI.
 * Priority: 1. External JSON file, 2. Local Browser Settings, 3. Hardcoded Defaults.
 */
async function resolveConfig(): Promise<{ apiKey: string; model: string; prompt: string }> {
  let externalConfig: ExternalGeminiConfig = {};
  try {
    const response = await fetch(CONFIG_URL);
    if (response.ok) {
      externalConfig = await response.json();
    }
  } catch (error) {
    console.warn("Could not fetch external Gemini config, falling back to local settings.");
  }
  // Hierarchical resolution
  const apiKey = externalConfig.claveApi || localStorage.getItem('gemini_api_key') || '';
  const model = externalConfig.modeloIa || localStorage.getItem('gemini_model') || DEFAULT_MODEL;
  const prompt = externalConfig.instruccionesIa || localStorage.getItem('gemini_prompt') || '';
  return { apiKey, model, prompt };
}
export const structuredPrompt = `
Eres un experto en contabilidad. Analiza la imagen del recibo y extrae:
1. merchant: Nombre del comercio.
2. amount: Importe total (solo número).
3. date: Fecha en formato YYYY-MM-DD.
4. category: La mejor categoría que encaje del sistema.
Responde solo con un JSON válido.
`;
export async function analyzeReceipt(imageBase64: string, apiKeyOverride?: string): Promise<ReceiptAnalysisResult> {
  const config = await resolveConfig();
  const effectiveApiKey = apiKeyOverride || config.apiKey;
  if (!effectiveApiKey) {
    throw new Error("No API Key found for Gemini AI.");
  }
  let categoriesStr = "Comida, Transporte, Alquiler, Salario, Otro";
  try {
    const cats = await api<{ id: string; name: string }[]>('/api/finance/categories');
    categoriesStr = cats.map(c => c.name).join(', ');
  } catch (e) {
    console.warn("Using fallback categories for AI prompt.");
  }
  console.log(`Using AI Model: ${config.model}`);
  console.log(`Resolved Prompt: ${structuredPrompt} ${config.prompt} Categorías: ${categoriesStr}`);
  // This is a placeholder for actual Gemini API call logic using fetch
  // In a real environment, you would use:
  // const genAI = new GoogleGenerativeAI(effectiveApiKey);
  // const model = genAI.getGenerativeModel({ model: config.model });
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
/**
 * Checks if a valid API key is available anywhere in the configuration chain.
 */
export async function isAiEnabled(): Promise<boolean> {
  const config = await resolveConfig();
  return !!config.apiKey;
}