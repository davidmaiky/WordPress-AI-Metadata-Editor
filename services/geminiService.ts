import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ImageMetadata } from "../types";

// Helper para aguardar um tempo determinado (delay)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper para limpar blocos de código markdown do JSON
const cleanJson = (text: string): string => {
  let clean = text.trim();
  // Remove markdown code blocks (```json ou apenas ```)
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  }
  return clean.trim();
};

export const generateMetadata = async (
  base64Image: string,
  context: string,
  apiKey: string,
  model: string,
  mimeType: string = "image/jpeg"
): Promise<ImageMetadata> => {
  if (!apiKey) {
    throw new Error("API Key não fornecida. Por favor, insira sua chave no campo indicado.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Um título SEO-friendly para a imagem." },
      caption: { type: Type.STRING, description: "Uma legenda curta para exibir abaixo da imagem." },
      description: { type: Type.STRING, description: "Uma descrição detalhada do conteúdo da imagem." },
      altText: { type: Type.STRING, description: "Texto alternativo (Alt Text) para acessibilidade." },
      tags: { type: Type.STRING, description: "Lista de 5 a 10 tags relevantes separadas por vírgula." },
      author: { type: Type.STRING, description: "Nome sugerido do autor ou 'Desconhecido' se não aplicável." },
    },
    required: ["title", "caption", "description", "altText", "tags"],
  };

  const prompt = `
    Atue como um especialista em SEO para WordPress.
    Analise a imagem fornecida e o contexto extra abaixo para gerar metadados otimizados.
    
    Contexto do Usuário: "${context}"
    
    Regras:
    1. O título deve ser claro e conciso.
    2. O Alt Text deve ser descritivo para acessibilidade.
    3. As tags devem ser relevantes para busca.
    4. Responda APENAS com o JSON válido, sem markdown.
    5. O idioma de saída deve ser Português (Brasil).
  `;

  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.4,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("A resposta da IA veio vazia.");
      }

      const cleanedText = cleanJson(text);
      return JSON.parse(cleanedText) as ImageMetadata;

    } catch (error: any) {
      // Extração de detalhes do erro
      const status = error.status || error.code || (error.error && error.error.code);
      let message = error.message || (error.error && error.error.message) || JSON.stringify(error);
      const errorDetails = JSON.stringify(error);

      // 1. Verificação de Cota Diária (Hard Limit)
      // Se contiver "PerDay", é limite diário. Não adianta retentar.
      const isDailyQuota = 
        (status === 429 || status === "RESOURCE_EXHAUSTED") && 
        (errorDetails.includes("PerDay") || message.includes("PerDay"));

      if (isDailyQuota) {
        console.error("Cota diária excedida:", error);
        throw new Error("Cota diária da API excedida (Limite gratuito atingido). Tente novamente amanhã.");
      }

      // 2. Verificação de Erros Temporários (Soft Limit / Server Error)
      const isRetryable = 
        status === 503 || 
        status === 429 || 
        message.includes("overloaded") || 
        message.includes("UNAVAILABLE") ||
        message.includes("Too Many Requests");

      if (isRetryable && attempt < MAX_RETRIES) {
        // Backoff exponencial: 2s, 4s, 8s, 16s...
        const delayMs = 2000 * Math.pow(2, attempt - 1);
        console.warn(`Tentativa ${attempt} falhou (${status}). Retentando em ${delayMs/1000}s...`);
        await wait(delayMs);
        continue;
      }

      console.error(`Erro fatal na tentativa ${attempt}:`, error);

      // Formatação de erro amigável para a UI
      if (status === 429) {
         throw new Error("Servidor ocupado (429). Aguarde um instante e tente novamente.");
      }
      
      // Limpa a mensagem de erro para não mostrar JSON gigante na tela
      const cleanMsg = message.length > 100 ? message.substring(0, 100) + "..." : message;
      throw new Error(`Erro na API (${status || 'Desc.'}): ${cleanMsg}`);
    }
  }

  throw new Error("Falha de conexão com a IA após múltiplas tentativas.");
};