import React from 'react';
import { AbsoluteFill, Sequence, Audio, useVideoConfig, staticFile } from 'remotion';
import { TranscriptionSegment } from '../transcribe';
import { CaptionStyle } from '../ai-editor';
import { Caption } from './Caption';
import { Highlight } from './Highlight';
import { Intro } from './Intro';
import { Outro } from './Outro';
import { SegmentVideo } from './SegmentVideo';
import { SoundEffects } from './SoundEffects';

export interface VideoEditorProps {
  videoSrc: string;
  segments: TranscriptionSegment[];
  highlights: TranscriptionSegment[];
  captionStyle: CaptionStyle;
  title: string;
  subtitle?: string;
  callToAction: string;
  channel?: string;
  showIntro?: boolean;
  showOutro?: boolean;
  introDurationSeconds?: number;
  outroDurationSeconds?: number;
  musicSrc?: string;
  musicVolume?: number;
  whooshSrc?: string;
  popSrc?: string;
  videoSpeed?: number;
  [key: string]: unknown;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  videoSrc,
  segments,
  highlights = [],
  captionStyle,
  title,
  subtitle,
  callToAction,
  channel,
  showIntro = true,
  showOutro = true,
  introDurationSeconds = 3,
  outroDurationSeconds = 4,
  musicSrc,
  musicVolume = 0.18,
  whooshSrc,
  popSrc,
  videoSpeed = 1.2,
}) => {
  const { fps } = useVideoConfig();

  const introFrames = showIntro ? Math.floor(introDurationSeconds * fps) : 0;
  const outroFrames = showOutro ? Math.floor(outroDurationSeconds * fps) : 0;

  // Duração de cada segmento ajustada pelo videoSpeed vindo das props
  let currentOutputFrame = introFrames;
  const segmentOutputTimes = segments.map((seg, index) => {
    const sourceDuration = seg.end - seg.start;
    const outputDuration = Math.floor((sourceDuration / videoSpeed) * fps);
    const entry = {
      seg,
      outputStart: currentOutputFrame,
      duration: outputDuration,
      sourceStartFrame: Math.floor(seg.start * fps),
      index,
    };
    currentOutputFrame += outputDuration;
    return entry;
  });

  const totalVideoFrames = currentOutputFrame - introFrames;

  // Frames de transição (início de cada segmento exceto o primeiro)
  const transitionFrames = segmentOutputTimes.slice(1).map((e) => e.outputStart);

  // Frames dos highlights
  const highlightFrames = segmentOutputTimes
    .filter(({ seg }) =>
      highlights.some((h) => h.start === seg.start && h.end === seg.end)
    )
    .map((e) => e.outputStart);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>

      {/* MÚSICA DE FUNDO */}
      {musicSrc && (
        <Audio
          src={staticFile(musicSrc.replace('public/', ''))}
          volume={musicVolume}
          loop
        />
      )}

      {/* EFEITOS SONOROS NAS TRANSIÇÕES */}
      <SoundEffects
        transitionFrames={transitionFrames}
        highlightFrames={highlightFrames}
        whooshSrc={whooshSrc}
        popSrc={popSrc}
      />

      {/* INTRO */}
      {showIntro && (
        <Sequence from={0} durationInFrames={introFrames}>
          <Intro title={title} subtitle={subtitle} durationInSeconds={introDurationSeconds} />
        </Sequence>
      )}

      {/* SEGMENTOS — com corte, velocidade, zoom e color grade */}
      {segmentOutputTimes.map(({ seg, outputStart, duration, sourceStartFrame, index }) => (
        <Sequence
          key={`seg-${seg.start}-${seg.end}`}
          from={outputStart}
          durationInFrames={duration}
        >
          <SegmentVideo
            src={videoSrc}
            startFrom={sourceStartFrame}
            durationInFrames={duration}
            index={index}
            playbackRate={videoSpeed}
          />
        </Sequence>
      ))}

      {/* LEGENDAS */}
      <Sequence from={introFrames} durationInFrames={totalVideoFrames}>
        <Caption
          segments={segments}
          segmentOutputTimes={segmentOutputTimes}
          style={captionStyle}
          highlights={highlights}
        />
      </Sequence>

      {/* HIGHLIGHTS */}
      <Sequence from={introFrames} durationInFrames={totalVideoFrames}>
        <Highlight
          highlights={highlights}
          segmentOutputTimes={segmentOutputTimes}
        />
      </Sequence>

      {/* OUTRO */}
      {showOutro && (
        <Sequence
          from={introFrames + totalVideoFrames}
          durationInFrames={outroFrames}
        >
          <Outro callToAction={callToAction} channel={channel} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
