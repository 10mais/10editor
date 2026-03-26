import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { transcribeAudio, extractAudioFromVideo, segmentsToSRT } from './transcribe';
import {
  analyzeAndEdit,
  generateScript,
  suggestCaptionStyle,
  generateViralClips,
} from './ai-editor';
import { suggestMusic, downloadMusic, downloadAudio, SFX_URLS } from './music';

export interface PipelineOptions {
  videoPath: string;
  outputDir?: string;
  platform?: 'youtube' | 'instagram' | 'tiktok' | 'podcast';
  language?: string;
  generateClips?: boolean;
  context?: string;
  cutAggressiveness?: 1 | 2 | 3 | 4 | 5;
  contentTone?: 'auto' | 'profissional' | 'casual' | 'urgente' | 'inspiracional';
  videoSpeed?: number;
  musicVolume?: number;
  showHighlights?: boolean;
  captionStyleOverride?: 'auto' | 'minimalista' | 'destaque' | 'neon' | 'clean';
}

export interface PipelineResult {
  transcription: {
    text: string;
    srtPath: string;
    segments: number;
    duration: number;
  };
  editing: {
    title: string;
    description: string;
    tags: string[];
    summary: string;
    keptSegments: number;
    removedSegments: number;
  };
  remotionProps: object;
  viralClips?: Array<{ start: number; end: number; hook: string; caption: string }>;
  outputDir: string;
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const {
    videoPath,
    outputDir = './out',
    platform = 'youtube',
    language = 'pt',
    generateClips = false,
    context,
    cutAggressiveness = 3,
    contentTone = 'auto',
    videoSpeed = 1.2,
    musicVolume,
    showHighlights = true,
    captionStyleOverride = 'auto',
  } = options;

  const tmpDir = path.join(outputDir, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('\n🎬 EDITOR-10MAIS — Pipeline de Edição com IA\n');
  console.log('━'.repeat(50));

  // ─── PASSO 1: Extrair áudio ──────────────────────────────
  console.log('\n📢 Passo 1/4: Extraindo áudio do vídeo...');
  const audioPath = await extractAudioFromVideo(videoPath, tmpDir);
  console.log(`   ✅ Áudio extraído: ${audioPath}`);

  // ─── PASSO 2: Transcrição com Whisper ───────────────────
  console.log('\n🎙️  Passo 2/4: Transcrevendo com OpenAI Whisper...');
  const transcription = await transcribeAudio(audioPath, language);
  console.log(`   ✅ ${transcription.segments.length} segmentos transcritos`);
  console.log(`   📝 Idioma detectado: ${transcription.language}`);
  console.log(`   ⏱️  Duração: ${transcription.duration.toFixed(1)}s`);

  // Salva SRT
  const srtPath = path.join(outputDir, 'legendas.srt');
  fs.writeFileSync(srtPath, segmentsToSRT(transcription.segments));
  console.log(`   💾 Legendas SRT salvas: ${srtPath}`);

  // ─── PASSO 3: Análise e edição com Claude ───────────────
  console.log('\n🤖 Passo 3/4: Analisando com Claude API...');

  const [editDecision, captionStyle, musicSuggestion] = await Promise.all([
    analyzeAndEdit(transcription, context, { cutAggressiveness, contentTone, showHighlights }),
    suggestCaptionStyle(transcription, platform === 'podcast' ? 'youtube' : platform, captionStyleOverride),
    suggestMusic(transcription.fullText, platform),
  ]);

  console.log(`   ✅ Decisão de edição: manter ${editDecision.keepSegments.length} segmentos`);
  console.log(`   🗑️  Remover: ${editDecision.removeSegments.length} segmentos`);
  console.log(`   ⭐ Highlights: ${editDecision.highlights.length} momentos`);
  console.log(`   🎨 Estilo de legenda: ${captionStyle.fontFamily}, ${captionStyle.animation}`);
  console.log(`   🎵 Música: ${musicSuggestion.name} — ${musicSuggestion.reason}`);

  // Gera clipes virais se solicitado
  let viralClips;
  if (generateClips) {
    console.log('\n🔥 Gerando clipes virais...');
    viralClips = await generateViralClips(transcription, 3);
    console.log(`   ✅ ${viralClips.length} clipes virais identificados`);
  }

  // ─── PASSO 4: Prepara props para Remotion ───────────────
  console.log('\n🎬 Passo 4/4: Preparando composição Remotion...');

  // Copia o vídeo para a pasta public/ (necessário para o Remotion acessar)
  const publicDir = path.join(process.cwd(), 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  const videoFileName = path.basename(videoPath);
  const publicVideoPath = path.join(publicDir, videoFileName);
  fs.copyFileSync(path.resolve(videoPath), publicVideoPath);
  console.log(`   📁 Vídeo copiado para: public/${videoFileName}`);

  // Baixa a música sugerida pelo Claude
  console.log(`   🎵 Baixando música: ${musicSuggestion.name}...`);
  const musicSrc = await downloadMusic(musicSuggestion, publicDir);
  console.log(`   ✅ Música pronta: ${musicSrc}`);

  // Baixa efeitos sonoros para pasta local (evita bloqueio de CDN externo)
  console.log(`   🔊 Baixando efeitos sonoros...`);
  const [whooshSrc, popSrc] = await Promise.allSettled([
    downloadAudio(SFX_URLS.whoosh, 'sfx-whoosh.mp3', publicDir),
    downloadAudio(SFX_URLS.pop, 'sfx-pop.mp3', publicDir),
  ]).then((results) =>
    results.map((r) => (r.status === 'fulfilled' ? r.value : undefined))
  );
  if (whooshSrc) console.log(`   ✅ SFX prontos`);

  const remotionProps = {
    videoSrc: `public/${videoFileName}`,
    highlights: showHighlights ? editDecision.highlights : [],
    musicSrc,
    musicVolume: musicVolume !== undefined ? musicVolume / 100 : musicSuggestion.volume,
    videoSpeed,
    whooshSrc: whooshSrc ?? undefined,
    popSrc: popSrc ?? undefined,
    segments: editDecision.keepSegments,
    captionStyle,
    title: editDecision.title,
    subtitle: editDecision.summary.slice(0, 60),
    callToAction: 'Inscreva-se para mais conteúdo!',
    channel: '@10mais',
    showIntro: true,
    showOutro: true,
    introDurationSeconds: 3,
    outroDurationSeconds: 4,
  };

  // Salva props como JSON para uso com Remotion CLI
  const propsPath = path.join(outputDir, 'remotion-props.json');
  fs.writeFileSync(propsPath, JSON.stringify(remotionProps, null, 2));
  console.log(`   ✅ Props salvas: ${propsPath}`);

  // Salva relatório completo
  const report = {
    timestamp: new Date().toISOString(),
    input: { videoPath, platform, language },
    transcription: {
      text: transcription.fullText,
      segments: transcription.segments,
      language: transcription.language,
      duration: transcription.duration,
    },
    editing: editDecision,
    captionStyle,
    remotionProps,
    viralClips,
  };

  const reportPath = path.join(outputDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '━'.repeat(50));
  console.log('\n✅ Pipeline concluído com sucesso!\n');
  console.log(`📁 Arquivos gerados em: ${path.resolve(outputDir)}`);
  console.log(`\n📋 Próximos passos:`);
  console.log(`   1. Revisar edição: cat ${reportPath}`);
  console.log(`   2. Abrir Remotion Studio: npm run remotion:studio`);
  console.log(`   3. Renderizar vídeo:`);
  console.log(`      npx remotion render src/compositions/Root.tsx VideoEditor ${path.join(outputDir, 'video-final.mp4')} --props=${propsPath}`);

  if (viralClips) {
    console.log(`\n🔥 Clipes virais sugeridos:`);
    viralClips.forEach((clip, i) => {
      console.log(`   ${i + 1}. ${clip.start.toFixed(1)}s - ${clip.end.toFixed(1)}s: "${clip.hook}"`);
    });
  }

  return {
    transcription: {
      text: transcription.fullText,
      srtPath,
      segments: transcription.segments.length,
      duration: transcription.duration,
    },
    editing: {
      title: editDecision.title,
      description: editDecision.description,
      tags: editDecision.tags,
      summary: editDecision.summary,
      keptSegments: editDecision.keepSegments.length,
      removedSegments: editDecision.removeSegments.length,
    },
    remotionProps,
    viralClips,
    outputDir: path.resolve(outputDir),
  };
}
