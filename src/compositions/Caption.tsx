import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { TranscriptionSegment } from '../transcribe';
import { CaptionStyle } from '../ai-editor';

interface CaptionProps {
  segments: TranscriptionSegment[];
  segmentOutputTimes: Array<{ seg: TranscriptionSegment; outputStart: number }>;
  style: CaptionStyle;
  highlights: TranscriptionSegment[];
}

export const Caption: React.FC<CaptionProps> = ({
  segments,
  segmentOutputTimes,
  style,
  highlights,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Encontra o segmento ativo pelo frame de saída
  const activeEntry = segmentOutputTimes.find(({ seg, outputStart }) => {
    const duration = Math.floor((seg.end - seg.start) * fps);
    return frame >= outputStart && frame < outputStart + duration;
  });

  if (!activeEntry) return null;

  const { seg: activeSegment, outputStart } = activeEntry;
  const localFrame = frame - outputStart;
  const segDuration = Math.floor((activeSegment.end - activeSegment.start) * fps);

  // Não mostra legenda se este segmento é um highlight (o Highlight.tsx já exibe)
  const isHighlight = highlights.some(
    (h) => h.start === activeSegment.start && h.end === activeSegment.end
  );
  if (isHighlight) return null;

  // Animações
  let opacity = 1;
  let translateY = 0;
  let scale = 1;

  if (style.animation === 'fade') {
    opacity = interpolate(localFrame, [0, 4, segDuration - 4, segDuration], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  } else if (style.animation === 'slide') {
    translateY = interpolate(localFrame, [0, 8], [14, 0], { extrapolateRight: 'clamp' });
    opacity = interpolate(localFrame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  } else if (style.animation === 'pop') {
    scale = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 220 } });
    opacity = interpolate(localFrame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
  }

  // Posição no "último terço" da área segura do Instagram
  // ~68% do topo — acima da barra de likes/comentários
  const positionStyle: React.CSSProperties = { top: '68%' };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 72px',
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        ...positionStyle,
      }}
    >
      <div
        style={{
          fontFamily: style.fontFamily,
          fontSize: Math.min(style.fontSize, 38), // máx 38px — discreta
          color: style.color,
          backgroundColor: 'rgba(0,0,0,0.52)',
          padding: '8px 18px',
          borderRadius: 6,
          textAlign: 'center',
          maxWidth: '88%',
          lineHeight: 1.35,
          fontWeight: 600,
          letterSpacing: 0.2,
          backdropFilter: 'blur(2px)',
        }}
      >
        {activeSegment.text}
      </div>
    </div>
  );
};
