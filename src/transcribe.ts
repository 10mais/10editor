import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

export async function transcribeAudio(
  audioPath: string,
  language?: string
): Promise<TranscriptionResult> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const audioFile = fs.createReadStream(audioPath);

  // Solicita transcrição com timestamps por segmento
  const response = await client.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
    language: language ?? 'pt', // padrão: português
  });

  const segments: TranscriptionSegment[] = (response.segments ?? []).map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  // Calcula duração total a partir do último segmento
  const duration =
    segments.length > 0 ? segments[segments.length - 1].end : 0;

  return {
    fullText: response.text,
    segments,
    language: response.language ?? 'pt',
    duration,
  };
}

export async function extractAudioFromVideo(
  videoPath: string,
  outputDir: string
): Promise<string> {
  const ffmpeg = await import('fluent-ffmpeg');
  const audioPath = path.join(outputDir, 'audio.mp3');

  return new Promise((resolve, reject) => {
    ffmpeg
      .default(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(audioPath)
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .run();
  });
}

export function segmentsToSRT(segments: TranscriptionSegment[]): string {
  return segments
    .map((seg, i) => {
      const start = secondsToSRTTime(seg.start);
      const end = secondsToSRTTime(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
}

function secondsToSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
