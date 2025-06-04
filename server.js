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

function getArquivoNaoRepetido(pasta, usados) {
  const arquivos = fs.readdirSync(pasta);
  const disponiveis = arquivos.filter(arq => !usados.includes(arq));
  
  if (disponiveis.length === 0) {
    usados.length = 0;  // resetar se usou todos
    return getArquivoNaoRepetido(pasta, usados);
  }
  
  const escolhido = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  usados.push(escolhido);
  return escolhido;
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: message }] }
          ]
        })
      }
    );

    const data = await response.json();

    res.json({ type: 'text', answer: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta." });

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
