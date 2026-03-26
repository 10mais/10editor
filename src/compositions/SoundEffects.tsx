import React from 'react';
import { Sequence, Audio, staticFile } from 'remotion';

interface SoundEffectsProps {
  transitionFrames: number[];
  highlightFrames: number[];
  // Arquivos já baixados na pasta public/
  whooshSrc?: string;
  popSrc?: string;
}

export const SoundEffects: React.FC<SoundEffectsProps> = () => {
  // SFX temporariamente desativados — adicione arquivos .mp3 em public/sfx-whoosh.mp3
  // e public/sfx-pop.mp3 para ativar
  return null;
};
