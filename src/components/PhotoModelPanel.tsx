import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'

import { addPhotoGlb, type GlbEntry } from '../glbLibrary'
import {
  analyzeSource,
  generateModel,
  HONEST_NOTE,
  KIND_LABEL,
  nameFromSource,
  type Analysis,
  type BuildMode,
  type Finish,
  type FurnitureKind,
} from '../imageModel'
import { fitDimensions } from '../imageModel/classify'
import { tip } from './tipAttrs'

const KINDS: FurnitureKind[] = [
  'chair',
  'round',
  'poker',
  'stool',
  'sofa',
  'table',
  'desk',
  'bed',
  'shelf',
  'cabinet',
  'lamp',
  'rug',
  'plant',
  'generic',
]

function cm(metres: number) {
  return Math.round(metres * 100)
}

export function PhotoModelPanel({ onCreated }: { onCreated: (entry: GlbEntry) => void }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [sourceThumb, setSourceThumb] = useState('')
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<FurnitureKind>('generic')
  const [mode, setMode] = useState<BuildMode>('solid')
  const [finish, setFinish] = useState<Finish>('clean')
  const [heightCm, setHeightCm] = useState('')
  const [depthCm, setDepthCm] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const auto = useMemo(() => {
    if (!analysis) return null
    const h = Number(heightCm) > 0 ? Number(heightCm) / 100 : undefined
    return fitDimensions(analysis.sil, kind, h)
  }, [analysis, kind, heightCm])

  const load = useCallback(async (src: File | Blob | string) => {
    setError('')
    setBusy('Reading the image…')
    try {
      const next = await analyzeSource(src)
      setAnalysis(next)
      setKind(next.kind)
      setMode(next.kind === 'generic' ? 'cutout' : 'solid')
      setFinish(next.kind === 'rug' ? 'photo' : 'clean')
      setName(nameFromSource(src, 'Photo model'))
      setHeightCm('')
      setDepthCm('')
      setSourceThumb(next.preview)
    } catch (e) {
      setAnalysis(null)
      setSourceThumb('')
      setError(e instanceof Error ? e.message : 'That image could not be read.')
    } finally {
      setBusy('')
    }
  }, [])

  // Paste an image straight into the panel.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!rootRef.current || !document.activeElement) return
      if (!rootRef.current.contains(document.activeElement) && document.activeElement !== document.body) return
      const file = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (file) {
        event.preventDefault()
        void load(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [load])

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = [...(event.dataTransfer.files ?? [])].find((f) => f.type.startsWith('image/'))
    if (file) {
      void load(file)
      return
    }
    const dropped = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain')
    if (dropped) {
      setUrl(dropped)
      void load(dropped)
    }
  }

  const build = async () => {
    if (!analysis) return
    setError('')
    setBusy('Building geometry…')
    try {
      const model = await generateModel(analysis, {
        kind,
        mode,
        finish,
        height: Number(heightCm) > 0 ? Number(heightCm) / 100 : undefined,
        depth: Number(depthCm) > 0 ? Number(depthCm) / 100 : undefined,
      })
      const entry = await addPhotoGlb({
        name,
        glb: model.glb,
        w: model.w,
        d: model.d,
        h: model.h,
        kind: model.kind,
        mode: model.mode,
      })
      onCreated(entry)
      setAnalysis(null)
      setSourceThumb('')
      setUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The model could not be built.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="models-pane photo-pane" ref={rootRef}>
      <p className="hint">
        Drop a photo of a chair, table, lamp, or anything else and ATRIUM cuts it out, measures it, and builds a
        placeable 3D model from the shape and colours it finds.
      </p>

      <div
        className={`dropzone ${dragging ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {sourceThumb ? (
          <img className="dropzone-img" src={sourceThumb} alt="Cut-out subject from your photo" />
        ) : (
          <span>Drop an image, paste it, or upload below</span>
        )}
      </div>

      <div className="file-row">
        <label className="file-btn" {...tip('Choose a photo from your computer')}>
          Upload image
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void load(file)
            }}
          />
        </label>
        {analysis && (
          <button
            type="button"
            className="file-btn"
            {...tip('Clear this photo and start again')}
            onClick={() => {
              setAnalysis(null)
              setSourceThumb('')
              setError('')
            }}
          >
            Clear
          </button>
        )}
      </div>

      <label className="field">
        Or paste an image URL
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/chair.jpg"
          onKeyDown={(e) => e.key === 'Enter' && void load(url)}
          {...tip('Link straight to the image file, not the product page')}
        />
      </label>
      <button
        type="button"
        className="file-btn wide"
        disabled={!url.trim() || !!busy}
        {...tip('Fetch and analyse the image at that URL')}
        onClick={() => void load(url)}
      >
        Load from URL
      </button>

      {busy && <p className="hint">{busy}</p>}
      {error && <p className="hint bad">{error}</p>}

      {analysis && (
        <>
          <p className="hint">
            Detected <strong>{KIND_LABEL[analysis.guess.kind]}</strong> ({analysis.guess.reason}).
            {!analysis.sil.segmented && ' No clear background was found, so the whole frame was used.'} Change anything
            below before adding it.
          </p>
          {analysis.cap.isElevated && (
            <p className="hint">
              The photo looks down on the top, so the footprint is taken from the top outline and the height is the
              standard for this type. Set the height below if you know it.
            </p>
          )}

          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Photo model" />
          </label>

          <label className="field">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as FurnitureKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Build
            <select value={mode} onChange={(e) => setMode(e.target.value as BuildMode)}>
              <option value="solid">Solid object (real volume, all angles)</option>
              <option value="cutout">Photo cutout (flat extruded outline)</option>
            </select>
          </label>

          <label className="field">
            Surface
            <select value={finish} onChange={(e) => setFinish(e.target.value as Finish)}>
              <option value="clean">Clean material (rebuilt from the photo's colours)</option>
              <option value="photo">Photo texture (keeps printed detail, lower resolution)</option>
            </select>
          </label>

          <div className="dim-row">
            <label className="field">
              Height (cm)
              <input
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={auto ? String(cm(auto.h)) : ''}
              />
            </label>
            <label className="field">
              Depth (cm)
              <input
                inputMode="numeric"
                value={depthCm}
                onChange={(e) => setDepthCm(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={auto ? String(cm(auto.d)) : ''}
              />
            </label>
          </div>
          <p className="hint">
            Footprint {auto ? `${cm(auto.w)} × ${cm(Number(depthCm) > 0 ? Number(depthCm) / 100 : auto.d)} cm` : '-'} ·
            height {auto ? `${cm(auto.h)} cm` : '-'}. A single photo cannot measure depth through perspective, so that
            one is a typed default you can correct.
          </p>

          <button
            type="button"
            className="file-btn wide primary"
            disabled={!!busy}
            {...tip('Build the model and add it to your library')}
            onClick={() => void build()}
          >
            {busy ? 'Working…' : 'Build 3D model'}
          </button>
        </>
      )}

      <p className="hint field-hint">{HONEST_NOTE}</p>
    </div>
  )
}
