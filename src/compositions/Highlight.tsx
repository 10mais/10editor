import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { TranscriptionSegment } from '../transcribe';

interface HighlightProps {
  highlights: TranscriptionSegment[];
  segmentOutputTimes: Array<{ seg: TranscriptionSegment; outputStart: number }>;
}

export const Highlight: React.FC<HighlightProps> = ({ highlights, segmentOutputTimes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Encontra o highlight ativo baseado no frame atual de saída
  const active = segmentOutputTimes.find(({ seg, outputStart }) => {
    const isHighlight = highlights.some((h) => h.start === seg.start && h.end === seg.end);
    if (!isHighlight) return false;
    const duration = Math.floor((seg.end - seg.start) * fps);
    return frame >= outputStart && frame < outputStart + duration;
  });

  if (!active) return null;

  const localFrame = frame - active.outputStart;
  const segDuration = Math.floor((active.seg.end - active.seg.start) * fps);

  const scale = spring({ frame: localFrame, fps, config: { damping: 10, stiffness: 150 } });
  const opacity = interpolate(
    localFrame,
    [0, 6, segDuration - 6, segDuration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Barra lateral de destaque
  const barWidth = interpolate(localFrame, [0, 12], [0, 6], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '38%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        padding: '0 80px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          transform: `scale(${scale})`,
          maxWidth: '85%',
        }}
      >
        {/* Barra lateral colorida */}
        <div
          style={{
            width: barWidth,
            height: 64,
            backgroundColor: '#ff4444',
            borderRadius: 3,
            flexShrink: 0,
          }}
        />
        {/* Texto do insight */}
        <p
          style={{
            color: '#ffffff',
            fontSize: 42,
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.2,
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            letterSpacing: -0.5,
          }}
        >
          {active.seg.text}
        </p>
      </div>
    </div>
  );
};
