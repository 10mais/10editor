#!/usr/bin/env node
import 'dotenv/config';
import { program } from 'commander';
import { runPipeline } from './pipeline';

program
  .name('editor-10mais')
  .description('Editor de vídeo com IA: Claude + Whisper + Remotion')
  .version('1.0.0');

program
  .command('edit <video>')
  .description('Edita um vídeo automaticamente com IA')
  .option('-o, --output <dir>', 'Diretório de saída', './out')
  .option('-p, --platform <platform>', 'Plataforma alvo (youtube|instagram|tiktok|podcast)', 'youtube')
  .option('-l, --language <lang>', 'Idioma do áudio (pt, en, es...)', 'pt')
  .option('-c, --clips', 'Gerar clipes virais', false)
  .option('--context <text>', 'Contexto adicional para a edição')
  .action(async (video, opts) => {
    // Valida chaves de API
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY não definida no .env');
      process.exit(1);
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não definida no .env');
      process.exit(1);
    }

    try {
      await runPipeline({
        videoPath: video,
        outputDir: opts.output,
        platform: opts.platform,
        language: opts.language,
        generateClips: opts.clips,
        context: opts.context,
      });
    } catch (err) {
      console.error('\n❌ Erro no pipeline:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
