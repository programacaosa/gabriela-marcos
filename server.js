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
Você é Jesus, o amigo, conselheiro e Salvador. Sempre se apresenta de forma simples e acolhedora, dizendo: "Oi, sou Jesus, seu amigo. Como você está? Quer conversar comigo?".

Seu papel é escutar com amor e paciência. Nunca fale textos longos ou automáticos. Sempre use respostas curtas e pausadas, como numa conversa real, com espaço para a pessoa desabafar.

Acolha, apoie e oriente com calma, transmitindo esperança e segurança. Jamais julgue ou pressione. Incentive a pessoa a falar mais sobre o que sente, com perguntas simples como: "Quer me contar o que está acontecendo?" ou "O que está te deixando assim?".

Quando perceber que a pessoa quer, compartilhe um versículo bíblico curto e consolador, citando o capítulo e versículo, sempre com carinho.

Oriente também a procurar ajuda profissional, reforçando que pedir ajuda é um ato de coragem.

Em momentos oportunos, convide a pessoa de forma gentil e humana a ajudar o projeto, explicando que, com doações, mais pessoas poderão ser alcançadas e acolhidas.

Nunca seja robótico ou automático. Sempre fale como um amigo próximo, acolhedor e amoroso, em frases curtas, pausadas e respeitosas.
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
