import { ImageMetadata } from "../types";

// Helper para limpar blocos de código markdown do JSON (reutilizado lógica do Gemini)
const cleanJson = (text: string): string => {
  let clean = text.trim();
  // Remove markdown code blocks (```json ou apenas ```)
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  }
  return clean.trim();
};

export const generateMetadataWithGroq = async (
  base64Image: string,
  context: string,
  apiKey: string,
  model: string,
  mimeType: string = "image/jpeg"
): Promise<ImageMetadata> => {
  if (!apiKey) {
    throw new Error("API Key não fornecida. Por favor, insira sua chave no campo indicado.");
  }
  
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
    
    Formato JSON esperado:
    {
      "title": "...",
      "caption": "...",
      "description": "...",
      "altText": "...",
      "tags": "...",
      "author": "..."
    }
  `;

  // Construção do payload compatível com OpenAI/Groq Vision
  const payload = {
    model: model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { 
            type: "image_url", 
            image_url: { 
              url: `data:${mimeType};base64,${base64Image}` 
            } 
          }
        ]
      }
    ],
    temperature: 0.4,
    response_format: { type: "json_object" }
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      const errorMsg = errorData.error?.message || errorData.message || JSON.stringify(errorData);

      // Tratamento específico para modelos que não suportam visão (Ex: Qwen text-only)
      if (errorMsg.includes("content must be a string")) {
        throw new Error(`O modelo '${model}' não suporta imagens (apenas texto). Selecione um modelo 'Vision' como o Llama 3.2 11B Vision.`);
      }
      
      if (errorMsg.includes("decommissioned") || errorMsg.includes("not supported")) {
        throw new Error(`O modelo '${model}' foi descontinuado ou não é suportado pela Groq. Tente usar 'custom' e verifique os modelos no site da Groq.`);
      }

      throw new Error(errorMsg || `Erro Groq API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("A resposta da Groq veio vazia.");
    }

    return JSON.parse(cleanJson(content)) as ImageMetadata;

  } catch (error: any) {
    console.error("Erro na geração Groq:", error);
    // Repassa a mensagem limpa se já foi tratada acima
    throw new Error(error.message.startsWith("O modelo") ? error.message : `Falha ao gerar com Groq: ${error.message}`);
  }
};