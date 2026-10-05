import React from 'react';
import { Composition } from 'remotion';
import { SCENES, FORMATS, FPS } from './scenes.js';
import { Film, FullFilm, TITLE_FRAMES, END_FRAMES, sceneFrames, fullFrames } from './Film.jsx';

export const Root = () => (
  <>
    {SCENES.map(scene => FORMATS.map(fmt => (
      <Composition
        key={`${scene.id}-${fmt.id}`} id={`${scene.id}-${fmt.id}`}
        component={Film} defaultProps={{ scene, fmt }}
        width={fmt.width} height={fmt.height} fps={FPS}
        durationInFrames={TITLE_FRAMES + sceneFrames(scene, fmt) + END_FRAMES}
      />
    )))}
    {FORMATS.map(fmt => (
      <Composition
        key={`full-${fmt.id}`} id={`full-${fmt.id}`}
        component={FullFilm} defaultProps={{ fmt }}
        width={fmt.width} height={fmt.height} fps={FPS}
        durationInFrames={fullFrames(fmt)}
      />
    ))}
  </>
);
