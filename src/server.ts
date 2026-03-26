import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { execSync, spawn } from 'child_process';
import { runPipeline } from './pipeline';

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'web')));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.use('/out', express.static(path.join(__dirname, '..', 'out')));

// ─── Upload config ───────────────────────────────────────────
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Apenas arquivos de vídeo são aceitos'));
  },
});

// ─── Job store (in-memory) ───────────────────────────────────
interface Job {
  id: string;
  status: 'pending' | 'processing' | 'rendering' | 'done' | 'error';
  progress: number;
  step: string;
  logs: string[];
  result?: any;
  error?: string;
  videoFile?: string;
  outputFile?: string;
  platform?: string;
}

const jobs = new Map<string, Job>();
const sseClients = new Map<string, express.Response[]>();

function emit(jobId: string, data: object) {
  const clients = sseClients.get(jobId) || [];
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => res.write(msg));
  const job = jobs.get(jobId);
  if (job) {
    const entry = (data as any).log;
    if (entry) job.logs.push(entry);
    if ((data as any).progress !== undefined) job.progress = (data as any).progress;
    if ((data as any).step !== undefined) job.step = (data as any).step;
  }
}

// ─── Routes ──────────────────────────────────────────────────

// POST /api/upload — recebe vídeo e inicia pipeline
app.post('/api/upload', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum vídeo enviado' });

  const jobId = uuidv4();
  const platform = (req.body.platform as string) || 'instagram';
  const context = req.body.context as string | undefined;
  const cutAggressiveness = parseInt(req.body.cutAggressiveness) || 3;
  const contentTone = (req.body.contentTone as string) || 'auto';
  const videoSpeed = parseFloat(req.body.videoSpeed) || 1.2;
  const musicVolume = req.body.musicVolume !== undefined ? parseFloat(req.body.musicVolume) : undefined;
  const showHighlights = req.body.showHighlights !== 'false';
  const captionStyleOverride = (req.body.captionStyleOverride as string) || 'auto';

  // Renomeia arquivo para extensão correta
  const ext = path.extname(req.file.originalname) || '.mp4';
  const videoPath = req.file.path + ext;
  fs.renameSync(req.file.path, videoPath);

  const job: Job = {
    id: jobId,
    status: 'pending',
    progress: 0,
    step: 'Aguardando...',
    logs: [],
    videoFile: videoPath,
    platform,
  };
  jobs.set(jobId, job);

  res.json({ jobId });

  // Inicia pipeline em background
  runPipelineJob(jobId, videoPath, { platform, context, cutAggressiveness, contentTone, videoSpeed, musicVolume, showHighlights, captionStyleOverride });
});

// GET /api/progress/:jobId — SSE stream
app.get('/api/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClients.has(jobId)) sseClients.set(jobId, []);
  sseClients.get(jobId)!.push(res);

  // Envia estado atual imediatamente
  const job = jobs.get(jobId);
  if (job) {
    res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, step: job.step, logs: job.logs })}\n\n`);
    if (job.status === 'done') {
      res.write(`data: ${JSON.stringify({ status: 'done', result: job.result, outputFile: job.outputFile })}\n\n`);
    }
  }

  req.on('close', () => {
    const clients = sseClients.get(jobId) || [];
    sseClients.set(jobId, clients.filter((c) => c !== res));
  });
});

// GET /api/job/:jobId — status do job
app.get('/api/job/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job não encontrado' });
  res.json(job);
});

// POST /api/render/:jobId — inicia renderização Remotion
app.post('/api/render/:jobId', async (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job não encontrado' });
  if (job.status !== 'processing' && job.status !== 'done') {
    return res.status(400).json({ error: 'Pipeline ainda não concluído' });
  }

  const format = req.body.format || 'vertical'; // vertical | horizontal
  const composition = format === 'vertical' ? 'VideoEditorVertical' : 'VideoEditor';
  const outputFile = path.join(__dirname, '..', 'out', `video-${job.id}.mp4`);
  const propsFile = path.join(__dirname, '..', 'out', 'remotion-props.json');

  job.status = 'rendering';
  job.step = 'Renderizando vídeo...';
  emit(job.id, { status: 'rendering', step: 'Renderizando vídeo...', progress: 85 });

  res.json({ message: 'Renderização iniciada' });

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('npx', [
        'remotion', 'render',
        'src/compositions/Root.tsx',
        composition,
        outputFile,
        `--props=${propsFile}`,
      ], { cwd: path.join(__dirname, '..'), shell: true });

      proc.stdout.on('data', (d) => {
        const line = d.toString().trim();
        if (line) emit(job.id, { log: line });
      });
      proc.stderr.on('data', (d) => {
        const line = d.toString().trim();
        if (line && !line.includes('Version mismatch')) emit(job.id, { log: line });
      });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Remotion saiu com código ${code}`));
      });
    });

    job.status = 'done';
    job.outputFile = `/out/video-${job.id}.mp4`;
    emit(job.id, { status: 'done', progress: 100, step: 'Pronto!', outputFile: job.outputFile });
  } catch (err: any) {
    job.status = 'error';
    job.error = err.message;
    emit(job.id, { status: 'error', error: err.message });
  }
});

// GET /api/download/:jobId — baixar vídeo final
app.get('/api/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || !job.outputFile) return res.status(404).json({ error: 'Vídeo não encontrado' });

  const filePath = path.join(__dirname, '..', job.outputFile);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado no disco' });

  res.download(filePath, `video-editado-${job.id.slice(0, 8)}.mp4`);
});

// ─── Pipeline runner ─────────────────────────────────────────
async function runPipelineJob(jobId: string, videoPath: string, opts: {
  platform: string; context?: string; cutAggressiveness: number; contentTone: string;
  videoSpeed: number; musicVolume?: number; showHighlights: boolean; captionStyleOverride: string;
}) {
  const job = jobs.get(jobId)!;
  job.status = 'processing';

  const originalLog = console.log;
  console.log = (...args) => {
    const line = args.join(' ');
    originalLog(line);
    emit(jobId, { log: line });

    // Atualiza progresso baseado nos passos
    if (line.includes('Passo 1/4')) emit(jobId, { progress: 10, step: 'Extraindo áudio...' });
    if (line.includes('Áudio extraído')) emit(jobId, { progress: 20, step: 'Áudio extraído ✅' });
    if (line.includes('Passo 2/4')) emit(jobId, { progress: 25, step: 'Transcrevendo com Whisper...' });
    if (line.includes('segmentos transcritos')) emit(jobId, { progress: 45, step: 'Transcrição concluída ✅' });
    if (line.includes('Passo 3/4')) emit(jobId, { progress: 50, step: 'Analisando com Claude AI...' });
    if (line.includes('Decisão de edição')) emit(jobId, { progress: 70, step: 'Análise concluída ✅' });
    if (line.includes('Passo 4/4')) emit(jobId, { progress: 75, step: 'Preparando composição...' });
    if (line.includes('Props salvas')) emit(jobId, { progress: 82, step: 'Pipeline concluído ✅' });
  };

  try {
    const result = await runPipeline({
      videoPath,
      outputDir: path.join(__dirname, '..', 'out'),
      platform: opts.platform as any,
      generateClips: false,
      context: opts.context,
      cutAggressiveness: opts.cutAggressiveness as any,
      contentTone: opts.contentTone as any,
      videoSpeed: opts.videoSpeed,
      musicVolume: opts.musicVolume,
      showHighlights: opts.showHighlights,
      captionStyleOverride: opts.captionStyleOverride as any,
    });

    console.log = originalLog;
    job.result = result;
    job.status = 'processing'; // Aguarda render
    emit(jobId, {
      status: 'ready_to_render',
      progress: 82,
      step: 'Pronto para renderizar!',
      result: {
        title: result.editing.title,
        summary: result.editing.summary,
        duration: result.transcription.duration,
        segments: result.transcription.segments,
        keptSegments: result.editing.keptSegments,
        removedSegments: result.editing.removedSegments,
      },
    });
  } catch (err: any) {
    console.log = originalLog;
    job.status = 'error';
    job.error = err.message;
    emit(jobId, { status: 'error', error: err.message, step: 'Erro no pipeline' });
  }
}

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Editor-10mais rodando em http://localhost:${PORT}\n`);
});
