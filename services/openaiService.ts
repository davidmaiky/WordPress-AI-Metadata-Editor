import { ImageMetadata } from "../types";

// Helper para limpar blocos de código markdown do JSON
const cleanJson = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  }
  return clean.trim();
};

export const generateMetadataWithOpenAI = async (
  base64Image: string,
  context: string,
  apiKey: string,
  model: string,
  mimeType: string = "image/jpeg"
): Promise<ImageMetadata> => {
  if (!apiKey) {
    throw new Error("API Key da OpenAI não fornecida.");
  }

  const systemPrompt = `
    Atue como um especialista em SEO para WordPress.
    Você receberá uma imagem e um contexto opcional.
    Sua tarefa é gerar metadados otimizados em Português do Brasil (pt-BR).
    
    Regras de Saída:
    1. Responda APENAS com um objeto JSON válido.
    2. Não use markdown formatting (ex: sem \`\`\`json).
    
    Schema JSON Obrigatório:
    {
      "title": "Título claro e conciso",
      "caption": "Legenda curta",
      "description": "Descrição detalhada",
      "altText": "Texto alternativo para acessibilidade",
      "tags": "Lista de tags separadas por vírgula",
      "author": "Nome do autor ou 'Desconhecido'"
    }
  `;

  const userPrompt = context 
    ? `Contexto adicional fornecido pelo usuário: "${context}"`
    : "Analise esta imagem e gere os metadados.";

  const payload = {
    model: model,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high"
            }
          }
        ]
      }
    ],
    temperature: 0.4,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  };

  // Função interna para realizar o fetch
  const makeRequest = async (url: string) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `Erro HTTP ${response.status}`;
      
      if (response.status === 401) throw new Error("Chave de API inválida (401). Verifique suas credenciais.");
      if (response.status === 429) throw new Error("Limite de requisições excedido ou falta de créditos (429).");
      
      throw new Error(`Erro OpenAI: ${errorMsg}`);
    }

    return await response.json();
  };

  try {
    let data;

    try {
      // 1. Tenta conexão direta (Padrão)
      // Nota: Isso geralmente falha em navegadores devido ao CORS da OpenAI
      data = await makeRequest("https://api.openai.com/v1/chat/completions");
    } catch (error: any) {
      // 2. Se falhar por erro de rede (Failed to fetch/TypeError), usa Proxy
      if (error instanceof TypeError && (error.message === "Failed to fetch" || error.message.includes("NetworkError"))) {
        console.warn("Conexão direta bloqueada por CORS. Tentando via Proxy...");
        
        // Usando corsproxy.io para contornar a restrição de navegador
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent("https://api.openai.com/v1/chat/completions");
        data = await makeRequest(proxyUrl);
      } else {
        // Se foi outro erro (ex: 401, 429), relança
        throw error;
      }
    }

    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("A OpenAI retornou uma resposta vazia.");
    }

    return JSON.parse(cleanJson(content)) as ImageMetadata;

  } catch (error: any) {
    console.error("Erro na geração OpenAI:", error);
    if (error.message === "Failed to fetch") {
      throw new Error("Falha de conexão persistente. A OpenAI bloqueia navegadores e o Proxy falhou. Tente usar o Gemini ou verifique se sua rede bloqueia proxies.");
    }
    throw error;
  }
};