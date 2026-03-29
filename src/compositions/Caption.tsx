import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { TranscriptionSegment } from '../transcribe';
import { CaptionStyle } from '../ai-editor';

interface CaptionProps {
  segments: TranscriptionSegment[];
  segmentOutputTimes: Array<{ seg: TranscriptionSegment; outputStart: number; duration: number }>;
  style: CaptionStyle;
  highlights: TranscriptionSegment[];
  segmentIndex?: number;
}

// Paletas virais que variam por segmento
const VIRAL_PALETTES = [
  { text: '#FFFFFF', shadow: '#000000', accent: null },           // branco puro
  { text: '#FFE600', shadow: '#000000', accent: null },           // amarelo viral
  { text: '#FFFFFF', shadow: '#000000', accent: '#FF2D55' },      // branco + rosa
  { text: '#00E5FF', shadow: '#000000', accent: null },           // ciano
  { text: '#FFFFFF', shadow: '#1a1a1a', accent: '#ffc00f' },      // branco + 10mais
];

// Quebra texto em frases curtas (máx 5 palavras / 1 linha)
function splitToShortPhrase(text: string, maxWords = 5): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}

export const Caption: React.FC<CaptionProps> = ({
  segments,
  segmentOutputTimes,
  style,
  highlights,
  segmentIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeEntry = segmentOutputTimes.find(({ outputStart, duration }) => {
    return frame >= outputStart && frame < outputStart + duration;
  });

  if (!activeEntry) return null;

  const { seg: activeSegment, outputStart } = activeEntry;
  const localFrame = frame - outputStart;

  const isHighlight = highlights.some(
    (h) => h.start === activeSegment.start && h.end === activeSegment.end
  );
  if (isHighlight) return null;

  // Paleta baseada no índice do segmento (varia por clipe)
  const palette = VIRAL_PALETTES[segmentIndex % VIRAL_PALETTES.length];

  // Animação POP — igual ao estilo viral do TikTok/Reels
  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 280, mass: 0.6 },
  });

  // Texto curto — máx 1 linha
  const displayText = splitToShortPhrase(activeSegment.text, 5);

  // Posição segura do Instagram — 68% do topo
  return (
    <div
      style={{
        position: 'absolute',
        top: '68%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 60px',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          fontFamily: "'Montserrat', 'Arial Black', sans-serif",
          fontSize: 46,
          fontWeight: 900,
          color: palette.text,
          textAlign: 'center',
          maxWidth: '90%',
          lineHeight: 1.15,
          letterSpacing: -0.5,
          // Sombra grossa estilo viral — sem caixa de fundo
          textShadow: [
            `3px 3px 0px ${palette.shadow}`,
            `-3px 3px 0px ${palette.shadow}`,
            `3px -3px 0px ${palette.shadow}`,
            `-3px -3px 0px ${palette.shadow}`,
            `0px 4px 8px rgba(0,0,0,0.8)`,
          ].join(', '),
          WebkitTextStroke: palette.accent ? `1.5px ${palette.accent}` : '1px rgba(0,0,0,0.4)',
          // Fundo adaptado — leve e discreto quando necessário
          backgroundColor:
            segmentIndex % 3 === 0
              ? 'rgba(0,0,0,0.0)'   // sem fundo
              : segmentIndex % 3 === 1
              ? 'rgba(0,0,0,0.0)'   // sem fundo
              : 'rgba(0,0,0,0.0)',  // sem fundo — sombra basta
          padding: '4px 12px',
          borderRadius: 4,
          display: 'inline-block',
        }}
      >
        {displayText}
      </div>
    </div>
  );
};
