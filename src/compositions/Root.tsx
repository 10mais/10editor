import React from 'react';
import { Composition, registerRoot, CalculateMetadataFunction } from 'remotion';
import { VideoEditor, VideoEditorProps } from './VideoEditor';

const FPS = 30;

// Calcula duração real baseado nos segmentos + intro + outro
const PLAYBACK_RATE = 1.2;

const calculateMetadata: CalculateMetadataFunction<VideoEditorProps> = ({ props }) => {
  const introDuration = props.showIntro ? (props.introDurationSeconds ?? 3) * FPS : 0;
  const outroDuration = props.showOutro ? (props.outroDurationSeconds ?? 4) * FPS : 0;
  // Com 1.2x de velocidade, cada segmento ocupa menos frames
  const segmentsDuration = props.segments.reduce(
    (acc, seg) => acc + Math.floor(((seg.end - seg.start) / PLAYBACK_RATE) * FPS),
    0
  );
  const totalFrames = Math.floor(introDuration + segmentsDuration + outroDuration);
  return { durationInFrames: Math.max(totalFrames, FPS), fps: FPS };
};

const defaultProps: VideoEditorProps = {
  videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  segments: [
    { start: 0, end: 3, text: 'Bem-vindos ao canal!' },
    { start: 3, end: 6, text: 'Hoje vamos aprender algo incrível.' },
    { start: 6, end: 10, text: 'Não esqueça de curtir e se inscrever!' },
  ],
  highlights: [],
  captionStyle: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 36,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    position: 'bottom',
    animation: 'pop',
  },
  title: '10 MAIS',
  subtitle: 'O melhor conteúdo do dia',
  callToAction: 'Inscreva-se para mais!',
  channel: '@10mais',
  showIntro: true,
  showOutro: true,
  introDurationSeconds: 3,
  outroDurationSeconds: 4,
};

const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Horizontal 16:9 — YouTube */}
      <Composition
        id="VideoEditor"
        component={VideoEditor}
        calculateMetadata={calculateMetadata}
        durationInFrames={FPS * 30}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />

      {/* Vertical 9:16 — Reels / TikTok */}
      <Composition
        id="VideoEditorVertical"
        component={VideoEditor}
        calculateMetadata={calculateMetadata}
        durationInFrames={FPS * 30}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};

registerRoot(RemotionRoot);
