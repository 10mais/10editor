import Anthropic from '@anthropic-ai/sdk';
import { TranscriptionResult, TranscriptionSegment } from './transcribe';

export interface EditDecision {
  keepSegments: TranscriptionSegment[];
  removeSegments: TranscriptionSegment[];
  highlights: TranscriptionSegment[];
  summary: string;
  title: string;
  description: string;
  tags: string[];
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: 'top' | 'center' | 'bottom';
  animation: 'fade' | 'slide' | 'pop' | 'none';
}

export interface VideoScript {
  intro: string;
  sections: Array<{
    title: string;
    content: string;
    startTime: number;
    endTime: number;
  }>;
  outro: string;
  callToAction: string;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analisa a transcrição e decide quais partes manter/remover
 */
export interface EditOptions {
  cutAggressiveness?: 1 | 2 | 3 | 4 | 5; // 1=suave, 5=agressivo
  contentTone?: 'auto' | 'profissional' | 'casual' | 'urgente' | 'inspiracional';
  showHighlights?: boolean;
}

export async function analyzeAndEdit(
  transcription: TranscriptionResult,
  context?: string,
  options: EditOptions = {}
): Promise<EditDecision> {
  const { cutAggressiveness = 3, contentTone = 'auto', showHighlights = true } = options;

  const aggressivenessGuide = [
    '', // índice 0 não usado
    'Seja muito conservador: remova APENAS silêncios acima de 3 segundos e erros graves óbvios. Preserve quase tudo.',
    'Seja suave: remova silêncios acima de 2s, hesitações longas e repetições claras.',
    'Seja moderado: remova silêncios acima de 1s, hesitações ("é...", "hmm", "né"), repetições e divagações.',
    'Seja agressivo: remova silêncios, hesitações, qualquer repetição e trechos de baixo valor. Mantenha o ritmo rápido.',
    'Seja muito agressivo: mantenha APENAS os momentos de maior impacto e valor. Corte sem piedade tudo que não for essencial.',
  ][cutAggressiveness];

  const toneGuide = contentTone === 'auto' ? '' : `TOM DO CONTEÚDO: ${contentTone.toUpperCase()} — adapte o título, descrição e seleção de highlights para este tom.`;

  const segmentsText = transcription.segments
    .map((s, i) => `[${i}] ${s.start.toFixed(1)}s-${s.end.toFixed(1)}s: "${s.text}"`)
    .join('\n');

  const prompt = `Você é um editor de vídeo profissional especializado em conteúdo para redes sociais.

Analise esta transcrição de vídeo e tome decisões de edição inteligentes:

TRANSCRIÇÃO COMPLETA:
${transcription.fullText}

SEGMENTOS COM TIMESTAMPS:
${segmentsText}

${context ? `CONTEXTO ADICIONAL: ${context}` : ''}
${toneGuide}

INSTRUÇÃO DE CORTE (nível ${cutAggressiveness}/5): ${aggressivenessGuide}

Retorne um JSON com a seguinte estrutura:
{
  "keepSegments": [índices dos segmentos para manter],
  "removeSegments": [índices dos segmentos para remover],
  "highlights": ${showHighlights ? '[índices dos momentos mais importantes/impactantes]' : '[]'},
  "summary": "resumo do conteúdo em 2-3 frases",
  "title": "título chamativo para o vídeo",
  "description": "descrição para YouTube/Instagram (150-200 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "editingNotes": "observações gerais sobre a edição"
}

Mantenha: conteúdo relevante, momentos emocionais, informações importantes.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extrai o JSON da resposta
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude não retornou resposta de texto');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    keepSegments: parsed.keepSegments.map((i: number) => transcription.segments[i]).filter(Boolean),
    removeSegments: parsed.removeSegments.map((i: number) => transcription.segments[i]).filter(Boolean),
    highlights: parsed.highlights.map((i: number) => transcription.segments[i]).filter(Boolean),
    summary: parsed.summary,
    title: parsed.title,
    description: parsed.description,
    tags: parsed.tags,
  };
}

/**
 * Gera um roteiro estruturado a partir da transcrição
 */
export async function generateScript(
  transcription: TranscriptionResult,
  style: 'youtube' | 'instagram' | 'tiktok' | 'podcast'
): Promise<VideoScript> {
  const prompt = `Você é um roteirista especializado em ${style}.

Com base nesta transcrição, crie um roteiro otimizado para ${style}:

TRANSCRIÇÃO:
${transcription.fullText}

Retorne um JSON:
{
  "intro": "texto de abertura impactante (max 15 segundos)",
  "sections": [
    {
      "title": "título da seção",
      "content": "conteúdo reformulado e otimizado",
      "startTime": 0,
      "endTime": 30
    }
  ],
  "outro": "fechamento com call-to-action",
  "callToAction": "ação específica que o espectador deve tomar"
}

Adapte o tom para ${style}:
- youtube: educativo, detalhado, engaging
- instagram: rápido, visual, emocional
- tiktok: muito curto, viral, hooks fortes
- podcast: conversacional, profundo, reflexivo`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude não retornou resposta');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado');

  return JSON.parse(jsonMatch[0]) as VideoScript;
}

/**
 * Sugere estilo visual para as legendas baseado no conteúdo
 */
const CAPTION_PRESETS: Record<string, Partial<CaptionStyle>> = {
  minimalista: { fontFamily: 'Inter', fontSize: 28, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0)', animation: 'fade' },
  destaque:    { fontFamily: 'Montserrat', fontSize: 38, color: '#ffc00f', backgroundColor: 'rgba(0,0,0,0.5)', animation: 'pop' },
  neon:        { fontFamily: 'Oswald', fontSize: 36, color: '#00ffcc', backgroundColor: 'rgba(0,0,0,0.3)', animation: 'slide' },
  clean:       { fontFamily: 'Inter', fontSize: 30, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.55)', animation: 'fade' },
};

export async function suggestCaptionStyle(
  transcription: TranscriptionResult,
  platform: 'youtube' | 'instagram' | 'tiktok',
  styleOverride: string = 'auto'
): Promise<CaptionStyle> {
  if (styleOverride !== 'auto' && CAPTION_PRESETS[styleOverride]) {
    return {
      fontFamily: 'Inter', fontSize: 30, color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.5)', position: 'bottom', animation: 'fade',
      ...CAPTION_PRESETS[styleOverride],
    } as CaptionStyle;
  }

  const prompt = `Você é um designer de vídeo. Com base neste conteúdo e plataforma, sugira o estilo ideal de legendas.

PLATAFORMA: ${platform}
CONTEÚDO: ${transcription.fullText.slice(0, 500)}...

Retorne um JSON:
{
  "fontFamily": "nome da fonte (Inter, Montserrat, Oswald, etc)",
  "fontSize": número entre 24 e 40,
  "color": "cor em hex (#FFFFFF)",
  "backgroundColor": "cor de fundo em hex com opacidade (rgba)",
  "position": "top | center | bottom",
  "animation": "fade | slide | pop | none",
  "reasoning": "por que esse estilo"
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude não retornou resposta');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado');

  return JSON.parse(jsonMatch[0]) as CaptionStyle;
}

/**
 * Gera clipes virais a partir dos highlights
 */
export async function generateViralClips(
  transcription: TranscriptionResult,
  maxClips: number = 3
): Promise<Array<{ start: number; end: number; hook: string; caption: string }>> {
  const prompt = `Você é um especialista em conteúdo viral para redes sociais.

Analise esta transcrição e identifique os ${maxClips} melhores momentos para clipes virais (15-60 segundos):

TRANSCRIÇÃO COM TIMESTAMPS:
${transcription.segments.map((s) => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n')}

Retorne um JSON:
{
  "clips": [
    {
      "start": timestamp_inicio,
      "end": timestamp_fim,
      "hook": "frase de gancho para o clipe",
      "caption": "legenda/caption para redes sociais",
      "viralScore": 1-10,
      "reason": "por que esse momento é viral"
    }
  ]
}

Priorize: revelações surpresa, momentos emocionais, dicas valiosas, humor, contradições interessantes.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude não retornou resposta');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.clips;
}
