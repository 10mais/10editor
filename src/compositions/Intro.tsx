import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface IntroProps {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  durationInSeconds?: number;
}

export const Intro: React.FC<IntroProps> = ({
  title,
  subtitle,
  backgroundColor = '#0f0f0f',
  textColor = '#ffffff',
  durationInSeconds = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  const subtitleOpacity = interpolate(frame, [fps * 0.5, fps * 1.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(
    frame,
    [fps * (durationInSeconds - 0.5), fps * durationInSeconds],
    [1, 0],
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
        opacity: fadeOut,
        padding: 60,
      }}
    >
      {/* Linha decorativa */}
      <div
        style={{
          width: interpolate(frame, [0, fps * 0.6], [0, 120], {
            extrapolateRight: 'clamp',
          }),
          height: 4,
          backgroundColor: '#ff4444',
          marginBottom: 24,
          borderRadius: 2,
        }}
      />

      {/* Título */}
      <h1
        style={{
          color: textColor,
          fontSize: 72,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 900,
          textAlign: 'center',
          margin: 0,
          transform: `scale(${titleScale})`,
          textTransform: 'uppercase',
          letterSpacing: -2,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>

      {/* Subtítulo */}
      {subtitle && (
        <p
          style={{
            color: textColor,
            fontSize: 32,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            textAlign: 'center',
            marginTop: 20,
            opacity: subtitleOpacity * fadeOut,
            maxWidth: 800,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
