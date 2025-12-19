/* TODO: Re-enable real Gemini when vite deps optimizer supports the package */
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { toast } from "sonner";
import { api } from "./api-client";
import type { ApiResponse } from "@shared/types";
export interface ReceiptAnalysisResult {
  merchant: string;
  amount: number;
  date: string; // ISO 8601 format: YYYY-MM-DD
  category: string;
}
export const structuredPrompt = `
You are an expert receipt and invoice analyzer. Your task is to extract specific information from an image of a receipt.
The required information is:
1.  **merchant**: The name of the store or vendor.
2.  **amount**: The total amount paid. This should be a number, without currency symbols.
3.  **date**: The date of the transaction in YYYY-MM-DD format.
4.  **category**: A suggested category for the expense.
Analyze the provided image and return the extracted information in a valid JSON object format.
Example response:
{
  "merchant": "Mercadona",
  "amount": 45.67,
  "date": "2024-05-21",
  "category": "Supermercado"
}
If any piece of information is not clearly visible, use a reasonable placeholder (e.g., "Unknown Merchant", 0 for amount, today's date, or "Otro" for category).
Do not add any extra text or explanations outside of the JSON object.
`;
export async function analyzeReceipt(imageBase64: string, apiKey: string): Promise<ReceiptAnalysisResult> {
  // MOCK MODE: Preserve dynamic prompt logic and categories fetch for future real implementation
  const modelName = localStorage.getItem('gemini_model') || 'gemini-1.5-flash-latest';
  const customPrompt = localStorage.getItem('gemini_prompt') || structuredPrompt;
  // const categories = await api<{ id: string; name: string }[]>('/api/finance/categories');
  // const categoriesStr = categories.map(c => c.name).join(', ');
  // const finalPrompt = customPrompt + `\n\nCategories available: ${categoriesStr}.\nSuggest a category from this list.`;
  
  // TODO: Re-enable real Gemini implementation here
  console.log('MOCK analyzeReceipt - using hardcoded test data');
  return {
    merchant: 'Mercadona Test',
    amount: 45.67,
    date: new Date().toISOString().split('T')[0],
    category: 'Comida'
  };
}
export async function validateApiKey(key: string): Promise<boolean> {
  if (!key) {
    toast.warning('La clave API no puede estar vacía.');
    return false;
  }
  // MOCK MODE: Simple length check for demo
  console.log('MOCK validateApiKey success');
  toast.success('Mock Gemini success - API key valid');
  return key.length > 10;
}