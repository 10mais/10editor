import React from 'react';
import { useCurrentFrame, useVideoConfig, Video, interpolate, staticFile } from 'remotion';

interface SegmentVideoProps {
  src: string;
  startFrom: number;       // frame de início no vídeo original
  durationInFrames: number;
  index: number;           // índice do segmento (par = zoom in, ímpar = zoom out)
  playbackRate?: number;
}

export const SegmentVideo: React.FC<SegmentVideoProps> = ({
  src,
  startFrom,
  durationInFrames,
  index,
  playbackRate = 1.2,
}) => {
  const frame = useCurrentFrame();

  // ── Zoom Ken Burns ──────────────────────────────────────
  // Segmentos pares: zoom in suave (1.0 → 1.06)
  // Segmentos ímpares: zoom out suave (1.06 → 1.0)
  const zoomIn = index % 2 === 0;
  const scaleStart = zoomIn ? 1.0 : 1.06;
  const scaleEnd = zoomIn ? 1.06 : 1.0;
  const scale = interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Blur na transição ────────────────────────────────────
  // Primeiros 5 frames: blur entra (6px → 0px)
  // Últimos 5 frames: blur sai (0px → 5px)
  const BLUR_FRAMES = 5;
  const blurIn = interpolate(frame, [0, BLUR_FRAMES], [5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blurOut = interpolate(
    frame,
    [durationInFrames - BLUR_FRAMES, durationInFrames],
    [0, 5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const blur = Math.max(blurIn, blurOut);

  // ── Fade nas transições ──────────────────────────────────
  const opacity = interpolate(frame, [0, 4, durationInFrames - 4, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        opacity,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          filter: [
            // ── Color grading profissional ──────────────────
            'brightness(1.04)',
            'contrast(1.09)',
            'saturate(1.14)',
            'hue-rotate(-2deg)',   // leve quente
            blur > 0 ? `blur(${blur.toFixed(1)}px)` : '',
          ]
            .filter(Boolean)
            .join(' '),
        }}
      >
        <Video
          src={staticFile(src.replace('public/', ''))}
          startFrom={startFrom}
          playbackRate={playbackRate}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    </div>
  );
};
