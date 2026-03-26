import React from 'react';
import { useCurrentFrame, useVideoConfig, Video, interpolate, staticFile } from 'remotion';

interface SegmentVideoProps {
  src: string;
  startFrom: number;
  durationInFrames: number;
  index: number;
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

  // ── Zoom Ken Burns dinâmico ──────────────────────────────
  // Alterna entre zoom in e zoom out suave por segmento
  const zoomIn = index % 2 === 0;
  const scaleStart = zoomIn ? 1.0 : 1.07;
  const scaleEnd   = zoomIn ? 1.07 : 1.0;
  const scale = interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Leve pan horizontal em segmentos alternados ──────────
  const panStart = index % 3 === 0 ? -1.5 : index % 3 === 1 ? 1.5 : 0;
  const panEnd   = index % 3 === 0 ?  1.5 : index % 3 === 1 ? -1.5 : 0;
  const panX = interpolate(frame, [0, durationInFrames], [panStart, panEnd], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── CORTE SECO — sem fade, sem blur ─────────────────────
  // Transição direta, estilo viral TikTok/Reels

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale}) translateX(${panX}px)`,
          transformOrigin: 'center center',
          filter: [
            'brightness(1.05)',   // levemente mais brilhante
            'contrast(1.10)',     // mais contrastado — viral
            'saturate(1.18)',     // cores mais vivas
            'hue-rotate(-3deg)',  // tom quente
          ].join(' '),
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
