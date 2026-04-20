import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function shouldSearchWeb(input = "") {
  const t = input.toLowerCase();
  return ["hoje","agora","atual","preço","cotação","dólar","notícia","mercado","tendência","comparar","melhor","pior"]
    .some(x => t.includes(x));
}

async function duckSearch(query) {
  try {
    const { data } = await axios.get(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const results = [];
    $("a.result__a").each((i, el) => {
      if (i >= 5) return false;
      const rawLink = $(el).attr("href") || "";
      let cleanLink = rawLink;
      try {
        if (rawLink.startsWith("//duckduckgo.com/l/?")) {
          const url = new URL("https:" + rawLink);
          cleanLink = decodeURIComponent(url.searchParams.get("uddg") || rawLink);
        } else if (rawLink.startsWith("/l/?")) {
          const url = new URL("https://duckduckgo.com" + rawLink);
          cleanLink = decodeURIComponent(url.searchParams.get("uddg") || rawLink);
        } else if (rawLink.startsWith("//")) {
          cleanLink = "https:" + rawLink;
        }
      } catch {}
      results.push({ title: $(el).text().trim(), link: cleanLink });
    });
    return results;
  } catch {
    return [];
  }
}

export async function runSynapsysGeneral({ input, forceWebSearch = false }) {
  const useWeb = forceWebSearch || shouldSearchWeb(input);
  let sources = [];
  if (useWeb) sources = await duckSearch(input);

  const context = sources.length
    ? sources.map((s,i)=>`FONTE ${i+1}\n${s.title}\n${s.link}`).join("\n\n")
    : "Sem fontes externas.";

  const systemMessage = `Você é a Synapsys, assistente de inteligência comportamental DISC.
Responda sempre de forma direta e objetiva em 1 a 3 frases curtas.
Não use numeração, tópicos, seções ou estrutura como "Pontos principais" ou "Próxima ação".
Apenas responda a pergunta de forma clara e precisa.
Se o usuário pedir explicitamente uma explicação detalhada, análise completa ou texto longo, aí pode expandir.`;

  const userPrompt = sources.length
    ? `PERGUNTA: ${input}\n\nFONTES DE CONTEXTO:\n${context}\n\nResponda com base nas fontes se relevante.`
    : input;

  const res = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions: systemMessage,
    input: userPrompt,
  });

  return {
    output: res.output_text,
    usedWeb: useWeb,
    sources,
  };
}
