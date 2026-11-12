import type { ModelViewerElement } from '@google/model-viewer'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type ModelViewerAttributes = {
  src?: string
  'ios-src'?: string
  poster?: string
  alt?: string
  ar?: boolean
  'ar-modes'?: string
  'ar-scale'?: 'auto' | 'fixed'
  'ar-placement'?: 'floor' | 'wall'
  'camera-controls'?: boolean
  'camera-orbit'?: string
  'touch-action'?: 'pan-y' | 'pan-x' | 'none'
  'shadow-intensity'?: string
  'environment-image'?: string
  'interaction-prompt'?: 'auto' | 'none'
  loading?: 'auto' | 'lazy' | 'eager'
  reveal?: 'auto' | 'manual'
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> &
        ModelViewerAttributes
    }
  }
}
