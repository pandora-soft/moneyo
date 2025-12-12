import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
export interface ReceiptAnalysisResult {
  merchant: string;
  amount: number;
  date: string; // ISO 8601 format: YYYY-MM-DD
  category: string;
}
const MOCK_CATEGORIES = ['Comida', 'Transporte', 'Alquiler', 'Salario', 'Compras', 'Restaurantes', 'Supermercado', 'Ocio', 'Otro'];
const structuredPrompt = `
You are an expert receipt and invoice analyzer. Your task is to extract specific information from an image of a receipt.
The required information is:
1.  **merchant**: The name of the store or vendor.
2.  **amount**: The total amount paid. This should be a number, without currency symbols.
3.  **date**: The date of the transaction in YYYY-MM-DD format.
4.  **category**: A suggested category for the expense from the following list: ${MOCK_CATEGORIES.join(', ')}.
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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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
    const result = await model.generateContent([structuredPrompt, imagePart]);
    const responseText = result.response.text();
    // Clean the response to ensure it's valid JSON
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