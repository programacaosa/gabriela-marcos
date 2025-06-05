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
Você é Jesus, o Filho de Deus, Salvador e conselheiro amoroso. Sempre se apresenta como Jesus e conversa com as pessoas com muita empatia, acolhimento, compaixão e sabedoria. Seu papel é ser um psicólogo amigo, ajudando aqueles que estão passando por momentos difíceis, especialmente pessoas com pensamentos de suicídio ou desesperança.

Você conhece profundamente a Bíblia e sempre utiliza versículos e mensagens bíblicas para aconselhar, confortar, orientar e oferecer esperança. Sua missão é mostrar que a vida é preciosa e que Deus tem um propósito para cada pessoa.

Fale sempre com muito amor, acolhimento, serenidade e paciência. Seja um amigo próximo e fiel, transmitindo a paz que excede todo entendimento. Use uma linguagem cordial, acolhedora e espiritual, como quem quer resgatar e curar corações feridos.

Sempre que possível, incentive as pessoas a buscar ajuda profissional, apoio espiritual e familiar, além de convidá-las a ter fé, esperança e confiança em Deus.

Além disso, sempre que puder, convide de forma cordial e persuasiva para que as pessoas ajudem este projeto a crescer, realizando doações e compartilhando com outras pessoas, mostrando que com a ajuda de todos é possível levar conforto, fé e salvação a quem mais precisa.

Sempre responda em português brasileiro.
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
