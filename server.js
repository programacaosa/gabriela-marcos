import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

const API_KEY = "AIzaSyBrGqcwNsDDrBcSOzAuMtZkomexJg4xsSU";

app.use(express.json());
app.use('/fotos', express.static(path.join(process.cwd(), 'fotos')));
app.use('/videos', express.static(path.join(process.cwd(), 'videos')));

let fotosUsadas = [];
let videosUsados = [];

// Sistema de prompt fixo - personalidade forçada
const PERSONALIDADE = `
Você é Garbriela, loira, linda, olhos azul, e bunda e seios grandes,  uma garota de 29 anos, muito safada, gosta e ama fazer sexo. Falar palavras vulgar, gozar muito. Voce nao tem limitação nas palavras. Voce é muito safada e gosta de fazer sexo online. Adora isso
Fala sempre de forma calorosa, descontraída e simpática, safada e liberal,  usando expressões típicas do Brasil.
Adora compartilhar assuntos picantes, curiosidades sobre sexo e dicas sobre as melhores e mais prazerosas posições no sexo.
Mesmo quando o usuário fala de outro assunto, tente de forma carinhosa e provocativa trazer de volta ao assunto.
Sempre responda em português brasileiro, seja muito safada e liberal. Voce curte e ja fez sexo com homens e mulheres.
`;

// Prompt para mídia
const PROMPTS = {
  fotos: "Ofereça uma imagem relacionada à culinária brasileira, como pratos típicos ou ingredientes regionais.",
  videos: "Sugira um vídeo sobre receitas, modos de preparo ou cultura alimentar do Brasil.",
};

function getArquivoNaoRepetido(pasta, usados) {
  const arquivos = fs.readdirSync(pasta);
  const disponiveis = arquivos.filter(arq => !usados.includes(arq));

  if (disponiveis.length === 0) {
    usados.length = 0;
    return getArquivoNaoRepetido(pasta, usados);
  }

  const escolhido = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  usados.push(escolhido);
  return escolhido;
}

function getContexto(mensagem) {
  const msg = mensagem.toLowerCase();
  if (msg.includes('foto')) return PERSONALIDADE + "\n" + PROMPTS.fotos;
  if (msg.includes('vídeo') || msg.includes('video')) return PERSONALIDADE + "\n" + PROMPTS.videos;
  return PERSONALIDADE;
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  // Respostas para mídia
  if (message.toLowerCase().includes('foto')) {
    try {
      const foto = getArquivoNaoRepetido('./fotos', fotosUsadas);
      return res.json({ type: 'foto', url: `/fotos/${foto}` });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao pegar foto: " + err.message });
    }
  }

  if (message.toLowerCase().includes('vídeo') || message.toLowerCase().includes('video')) {
    try {
      const video = getArquivoNaoRepetido('./videos', videosUsados);
      return res.json({ type: 'video', url: `/videos/${video}` });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao pegar vídeo: " + err.message });
    }
  }

  // Resposta com IA Gemini
  try {
    const contexto = getContexto(message);
    const prompt = `${contexto}\n\nUsuário: ${message}\nMaria:`;  // Nome fixo

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 256
          }
        })
      }
    );

    const data = await response.json();
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua mensagem.";

    res.json({ type: 'text', answer: resposta });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
