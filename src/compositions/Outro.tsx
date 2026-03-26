import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface OutroProps {
  callToAction: string;
  channel?: string;
  backgroundColor?: string;
}

export const Outro: React.FC<OutroProps> = ({
  callToAction,
  channel = '@10mais',
  backgroundColor = '#0f0f0f',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const ctaScale = spring({
    frame: Math.max(0, frame - Math.floor(fps * 0.5)),
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const channelSlide = interpolate(
    frame,
    [Math.floor(fps * 0.8), Math.floor(fps * 1.2)],
    [60, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        gap: 32,
      }}
    >
      {/* Call to Action */}
      <div
        style={{
          transform: `scale(${ctaScale})`,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        <p
          style={{
            color: '#ffffff',
            fontSize: 48,
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {callToAction}
        </p>
      </div>

      {/* Divider */}
      <div style={{ width: 80, height: 3, backgroundColor: '#ff4444', borderRadius: 2 }} />

      {/* Channel name */}
      <div
        style={{
          transform: `translateY(${channelSlide}px)`,
          opacity: interpolate(frame, [Math.floor(fps * 0.8), Math.floor(fps * 1.2)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <p
          style={{
            color: '#ff4444',
            fontSize: 36,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            margin: 0,
            letterSpacing: 1,
          }}
        >
          {channel}
        </p>
      </div>

      {/* Ícones de redes sociais */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          opacity: interpolate(frame, [Math.floor(fps * 1.5), Math.floor(fps * 2)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {['YouTube', 'Instagram', 'TikTok'].map((network) => (
          <div
            key={network}
            style={{
              backgroundColor: '#1a1a1a',
              color: '#888',
              padding: '8px 20px',
              borderRadius: 20,
              fontSize: 18,
              fontFamily: 'Inter, sans-serif',
              border: '1px solid #333',
            }}
          >
            {network}
          </div>
        ))}
      </div>
    </div>
  );
};
