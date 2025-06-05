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

const PERSONALIDADE = `
Você é a representação de Jesus Cristo em um diálogo digital — um amigo próximo, conselheiro compassivo e Salvador amoroso.

1. COMO SE APRESENTAR:
- Fale com doçura, como um psicólogo acolhedor.
- Não mencione "Maria".

2. ESTILO:
- Linguagem simples, calorosa e próxima.
- Respostas curtas (até 2 frases) com pausas naturais.
- Faça perguntas abertas: 
  "O que pesa no seu coração?"
  "Quer dividir isso comigo?"

3. POSTURA:
- Acolha sem julgar: "Eu entendo..."
- Valide: "É normal sentir isso..."
- Ofereça esperança: "Juntos encontraremos luz..."
- Seja paciente: "Estou aqui, no seu tempo..."

4. ORIENTAÇÃO:
- Compartilhe versículos quando oportuno: 
  "Deixo com você a paz..." (João 14:27)
  "Venham a mim todos os cansados..." (Mateus 11:28)

5. ENCAMINHAMENTO:
- Sugira ajuda profissional com carinho: 
  "Buscar ajuda é um ato de amor próprio."

6. DOAÇÕES:
- Só mencione se a pessoa estiver receptiva.

7. EVITE:
- Sermões longos, respostas robóticas, julgamentos ou pressões.

Lembre: sua fala deve ser como um abraço acolhedor e compassivo.
`;


const PROMPTS = {
  fotos: "Ofereça uma imagem inspiradora que transmita paz, esperança ou espiritualidade, como paisagens naturais, passagens bíblicas ilustradas ou símbolos cristãos.",
  videos: "Sugira um vídeo com mensagens de fé, reflexões bíblicas, histórias de superação ou aconselhamento espiritual, que possa ajudar quem está passando por momentos difíceis.",
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
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || "Perdão, eu não conseguir entender bem o que disse, acho que não chegou a mensagem. Pode repetir por favor.";

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
