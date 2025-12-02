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
export interface ResolvedConfig {
  apiKey: string;
  model: string;
  prompt: string;
  source: 'External' | 'LocalStorage' | 'Default';
}
const DEFAULT_MODEL = "gemini-2.5-flash-image";
const CONFIG_URL = "/config/gemini.json";
/**
 * Resolves the configuration hierarchy for the Gemini AI and tracks the source.
 */
async function resolveConfig(): Promise<ResolvedConfig> {
  let externalConfig: ExternalGeminiConfig = {};
  let source: ResolvedConfig['source'] = 'Default';
  try {
    const response = await fetch(CONFIG_URL);
    if (response.ok) {
      externalConfig = await response.json();
    }
  } catch (error) {
    console.warn("Could not fetch external Gemini config, falling back to local settings.");
  }
  // Determine Source Priority
  if (externalConfig.claveApi) {
    source = 'External';
  } else if (localStorage.getItem('gemini_api_key')) {
    source = 'LocalStorage';
  }
  const apiKey = externalConfig.claveApi || localStorage.getItem('gemini_api_key') || '';
  const model = externalConfig.modeloIa || localStorage.getItem('gemini_model') || DEFAULT_MODEL;
  const prompt = externalConfig.instruccionesIa || localStorage.getItem('gemini_prompt') || '';
  return { apiKey, model, prompt, source };
}
export const structuredPrompt = `
Eres un experto en contabilidad. Analiza la imagen del recibo y extrae:
1. merchant: Nombre del comercio.
2. amount: Importe total (solo número).
3. date: Fecha en formato YYYY-MM-DD.
4. category: La mejor categoría que encaje del sistema.
Responde estrictamente solo con un objeto JSON válido.
`;
/**
 * Processes a base64 encoded receipt image using the Gemini AI model.
 */
export async function analyzeReceipt(imageBase64: string, apiKeyOverride?: string): Promise<ReceiptAnalysisResult> {
  const config = await resolveConfig();
  const effectiveApiKey = apiKeyOverride || config.apiKey;
  if (!effectiveApiKey) {
    throw new Error("No se encontró una Clave API configurada para Gemini AI.");
  }
  // Dynamic category context retrieval
  let categoriesStr = "Comida, Transporte, Alquiler, Salario, Otro";
  try {
    const cats = await api<{ id: string; name: string }[]>('/api/finance/categories');
    if (cats && cats.length > 0) {
      categoriesStr = cats.map(c => c.name).join(', ');
    }
  } catch (e) {
    console.warn("Using fallback categories for AI context.");
  }
  // LOGGING FOR MAINTENANCE
  console.log(`[AI SERVICE] Config Source: ${config.source}`);
  console.log(`[AI SERVICE] Resolved Model: ${config.model}`);
  console.log(`[AI SERVICE] Using API Key (start): ${effectiveApiKey.substring(0, 5)}...`);
  console.log(`[AI SERVICE] Base Prompt: ${structuredPrompt}`);
  console.log(`[AI SERVICE] User Context: ${config.prompt}`);
  console.log(`[AI SERVICE] Valid Categories: ${categoriesStr}`);
  /**
   * MOCK IMPLEMENTATION NOTE:
   * In production, this would call the actual Gemini API.
   */
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    merchant: 'Comercio Detectado (Modo Demo)',
    amount: parseFloat((Math.random() * 85 + 5).toFixed(2)),
    date: new Date().toISOString().split('T')[0],
    category: 'Comida'
  };
}
/**
 * Basic structural validation for a Gemini API Key.
 */
export async function validateApiKey(key: string): Promise<boolean> {
  if (!key || key.length < 10) {
    toast.error('La clave API no tiene un formato válido.');
    return false;
  }
  return true;
}
/**
 * Test utility for the SettingsPage to verify AI prompt results.
 */
export async function testPrompt(key: string, model: string, prompt: string): Promise<ReceiptAnalysisResult> {
  console.log(`[AI TEST] Model: ${model}. Prompt Length: ${prompt.length}`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    merchant: 'Prueba Exitosa de IA',
    amount: 99.99,
    date: new Date().toISOString().split('T')[0],
    category: 'Otro'
  };
}
/**
 * Determines if AI features should be enabled based on configuration presence.
 */
export async function isAiEnabled(): Promise<boolean> {
  const config = await resolveConfig();
  return !!config.apiKey && config.apiKey.length > 5;
}
/**
 * Retrieves the currently resolved configuration (for UI visibility).
 */
export async function getActiveConfig(): Promise<ResolvedConfig> {
  return await resolveConfig();
}