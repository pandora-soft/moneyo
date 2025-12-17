import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
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
  try {
    const modelName = localStorage.getItem('gemini_model') || 'gemini-1.5-flash-latest';
    const customPrompt = localStorage.getItem('gemini_prompt') || structuredPrompt;
    const categories = await api<{ id: string; name: string }[]>('/api/finance/categories');
    const categoriesStr = categories.map(c => c.name).join(', ');
    const finalPrompt = customPrompt + `\n\nCategories available: ${categoriesStr}.\nSuggest a category from this list.`;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });
    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg',
      },
    };
    const result = await model.generateContent([finalPrompt, imagePart]);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    const parsedResult = JSON.parse(jsonString) as Partial<ReceiptAnalysisResult>;
    return {
      merchant: parsedResult.merchant || 'Desconocido',
      amount: typeof parsedResult.amount === 'number' ? parsedResult.amount : 0,
      date: parsedResult.date || new Date().toISOString().split('T')[0],
      category: parsedResult.category || 'Otro',
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message.includes('API key not valid')) {
      throw new Error('La clave API de Gemini no es válida o ha expirado.');
    }
    throw new Error('No se pudo procesar la imagen con la IA. Inténtalo de nuevo.');
  }
}
export async function validateApiKey(key: string): Promise<boolean> {
  if (!key) {
    toast.warning('La clave API no puede estar vacía.');
    return false;
  }
  try {
    const modelName = localStorage.getItem('gemini_model') || 'gemini-1.5-flash-latest';
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent([{text: 'test'}]);
    console.log('Model validation success -', modelName, result.response.text());
    toast.success(`Clave API de Gemini y modelo (${modelName}) válidos.`);
    return true;
  } catch (error) {
    const modelName = localStorage.getItem('gemini_model') || 'gemini-1.5-flash-latest';
    console.error('API Key Validation Error for model', modelName, error);
    toast.error(`La clave API de Gemini no es válida para el modelo ${modelName}.`);
    return false;
  }
}