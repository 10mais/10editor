# 🎬 Editor-10Mais

Editor de vídeo automatizado com IA usando **Claude API + OpenAI Whisper + Remotion**.

## Fluxo do Pipeline

```
📹 Vídeo Input
    │
    ▼
🎙️  OpenAI Whisper
    │  Transcreve o áudio → segmentos com timestamps
    │
    ▼
🤖 Claude API (claude-opus-4-6)
    │  Analisa conteúdo, decide edições, sugere estilo
    │  Gera título, descrição, tags, clipes virais
    │
    ▼
🎬 Remotion
    │  Renderiza vídeo com: intro, legendas animadas, outro
    │
    ▼
📤 Vídeo Final (.mp4)
```

## Instalação

```bash
npm install
cp .env.example .env
# Adicione suas chaves no .env
```

## Configuração (.env)

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Uso

### Edição automática completa
```bash
npm run dev -- edit meu-video.mp4
```

### Com opções
```bash
npm run dev -- edit meu-video.mp4 \
  --platform instagram \
  --language pt \
  --clips \
  --output ./resultados
```

### Abrir Remotion Studio (preview visual)
```bash
npm run remotion:studio
```

### Renderizar vídeo final
```bash
npx remotion render src/compositions/Root.tsx VideoEditor out/video-final.mp4 \
  --props=out/remotion-props.json
```

## Estrutura do Projeto

```
editor-10mais/
├── src/
│   ├── index.ts              # CLI
│   ├── pipeline.ts           # Orquestrador principal
│   ├── transcribe.ts         # OpenAI Whisper
│   ├── ai-editor.ts          # Claude API
│   └── compositions/
│       ├── Root.tsx          # Remotion root
│       ├── VideoEditor.tsx   # Composição principal
│       ├── Caption.tsx       # Legendas animadas
│       ├── Intro.tsx         # Tela de abertura
│       └── Outro.tsx         # Tela de fechamento
├── out/                      # Arquivos gerados
│   ├── legendas.srt
│   ├── remotion-props.json
│   └── report.json
└── .env
```

## Funcionalidades Claude API

| Função | Descrição |
|--------|-----------|
| `analyzeAndEdit` | Decide quais segmentos manter/remover |
| `generateScript` | Cria roteiro otimizado por plataforma |
| `suggestCaptionStyle` | Recomenda fonte, cor, animação |
| `generateViralClips` | Identifica momentos virais |

## Plataformas Suportadas

- **YouTube** — formato 16:9, legendas educativas
- **Instagram Reels** — vertical 9:16, legendas impactantes
- **TikTok** — vertical 9:16, hooks fortes
- **Podcast** — horizontal, transcrição limpa
