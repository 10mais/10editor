import Anthropic from '@anthropic-ai/sdk';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Biblioteca de músicas royalty-free lo-fi / profissionais
// Fonte: Pixabay Music (pixabay.com/music) - licença gratuita para uso comercial
const MUSIC_LIBRARY = [
  {
    id: 'lofi-study',
    name: 'Lo-Fi Study Beats',
    mood: ['educativo', 'tutorial', 'produtividade', 'tecnologia', 'ia'],
    bpm: 75,
    style: 'lo-fi suave, piano e beats leves',
    url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    id: 'lofi-chill',
    name: 'Chill Lo-Fi',
    mood: ['casual', 'vlog', 'lifestyle', 'cotidiano', 'relaxante'],
    bpm: 80,
    style: 'lo-fi chill, guitarra suave, ambiente descontraído',
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8cb3fcbbb3.mp3',
  },
  {
    id: 'corporate-clean',
    name: 'Corporate Clean',
    mood: ['negócios', 'empreendedorismo', 'apresentação', 'vendas', 'profissional'],
    bpm: 115,
    style: 'corporativo limpo, energético mas discreto',
    url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946b8a84f0.mp3',
  },
  {
    id: 'inspiring-journey',
    name: 'Inspiring Journey',
    mood: ['motivacional', 'storytelling', 'transformação', 'superação', 'emocional'],
    bpm: 95,
    style: 'inspiracional, orquestral leve, crescente',
    url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6ff1c23.mp3',
  },
  {
    id: 'lofi-hip-hop',
    name: 'Lo-Fi Hip Hop Trending',
    mood: ['reels', 'tiktok', 'jovem', 'viral', 'tendência', 'urbano'],
    bpm: 88,
    style: 'lo-fi hip hop em alta, beats modernos, trending',
    url: 'https://cdn.pixabay.com/audio/2023/06/12/audio_4c10782b0b.mp3',
  },
  {
    id: 'ambient-minimal',
    name: 'Ambient Minimal',
    mood: ['minimalista', 'inovação', 'tech', 'startup', 'futuro', 'ciência'],
    bpm: 70,
    style: 'ambient minimalista, synth suave, futurista',
    url: 'https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3',
  },
];

export interface MusicSuggestion {
  id: string;
  name: string;
  reason: string;
  volume: number;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Claude analisa o conteúdo e sugere a melhor música
 */
export async function suggestMusic(
  transcriptionText: string,
  platform: string
): Promise<MusicSuggestion> {
  const libraryList = MUSIC_LIBRARY.map(
    (m) => `- id: "${m.id}" | nome: "${m.name}" | estilo: "${m.style}" | mood: [${m.mood.join(', ')}]`
  ).join('\n');

  const prompt = `Você é um editor de vídeo profissional especializado em trilhas sonoras para redes sociais.

Analise o conteúdo do vídeo abaixo e escolha a música que MELHOR combina com o tema, emoção e ritmo do vídeo.

CONTEÚDO DO VÍDEO:
${transcriptionText.slice(0, 800)}

PLATAFORMA: ${platform}
ESTILO PREFERIDO: profissional, lo-fi, músicas em alta — mas sempre priorizando o que combina com o conteúdo.

BIBLIOTECA DE MÚSICAS DISPONÍVEIS:
${libraryList}

Analise o tom do vídeo (emocional, técnico, motivacional, etc.) e escolha a música ideal.
Retorne APENAS um JSON:
{
  "id": "id exato da música escolhida",
  "name": "nome da música",
  "reason": "1 frase explicando por que essa música combina com ESTE vídeo específico",
  "volume": número entre 0.12 e 0.25 (fundo suave, sem abafar a voz)
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Sem resposta do Claude');

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado');

  return JSON.parse(jsonMatch[0]) as MusicSuggestion;
}

// URLs de SFX gratuitos para download local
export const SFX_URLS = {
  whoosh: 'https://freesound.org/data/previews/468/468766_5121236-lq.mp3',
  pop:    'https://freesound.org/data/previews/456/456968_9337816-lq.mp3',
};

/**
 * Baixa um arquivo de áudio para a pasta public/
 */
export async function downloadAudio(
  url: string,
  filename: string,
  publicDir: string
): Promise<string> {
  const filePath = path.join(publicDir, filename);
  if (fs.existsSync(filePath)) return `public/${filename}`;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      // Segue redirecionamentos
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filePath);
        downloadAudio(response.headers.location!, filename, publicDir)
          .then(resolve)
          .catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(`public/${filename}`); });
    }).on('error', (err) => { fs.unlink(filePath, () => {}); reject(err); });
  });
}

/**
 * Baixa a música escolhida para a pasta public/
 */
export async function downloadMusic(
  suggestion: MusicSuggestion,
  publicDir: string
): Promise<string> {
  const track = MUSIC_LIBRARY.find((m) => m.id === suggestion.id);
  if (!track) throw new Error(`Música não encontrada: ${suggestion.id}`);

  const musicPath = path.join(publicDir, `music-${track.id}.mp3`);

  // Se já foi baixada antes, reutiliza
  if (fs.existsSync(musicPath)) {
    return `public/music-${track.id}.mp3`;
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(musicPath);
    const protocol = track.url.startsWith('https') ? https : http;

    protocol
      .get(track.url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(`public/music-${track.id}.mp3`);
        });
      })
      .on('error', (err) => {
        fs.unlink(musicPath, () => {});
        reject(err);
      });
  });
}
