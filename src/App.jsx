import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  ImageDown,
  RotateCcw,
  RefreshCw,
  FileImage,
  Gauge,
  Zap,
  Shield,
  Sparkles,
  AlertTriangle,
  User,
  Mail,
  Loader2,
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getSavingsPercent(original, compressed) {
  if (!original || !compressed) return 0
  return Math.max(0, Math.round(((original - compressed) / original) * 100))
}

// ─── Compress via Canvas ─────────────────────────────────────────
function compressImage(file, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        // Choose output type — PNG stays PNG (lossless uses quality 1.0 trick)
        const isPng = file.type === 'image/png'
        const mimeType = isPng ? 'image/png' : 'image/jpeg'
        const q = isPng ? 1 : quality / 100

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return }
            resolve(blob)
          },
          mimeType,
          q
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// ─── Main App ───────────────────────────────────────────────────
export default function App() {
  const [originalFile, setOriginalFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [compressedUrl, setCompressedUrl] = useState(null)
  const [compressedBlob, setCompressedBlob] = useState(null)
  const [quality, setQuality] = useState(80)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const debounceRef = useRef(null)

  // ── Compress whenever file or quality changes
  useEffect(() => {
    if (!originalFile) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsProcessing(true)
      setError(null)
      try {
        const blob = await compressImage(originalFile, quality)
        if (compressedUrl) URL.revokeObjectURL(compressedUrl)
        const url = URL.createObjectURL(blob)
        setCompressedBlob(blob)
        setCompressedUrl(url)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsProcessing(false)
      }
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [originalFile, quality])

  // ── Handle file selection
  const handleFile = useCallback((file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      setError('Only JPG, JPEG and PNG images are supported.')
      return
    }
    setError(null)
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    setOriginalUrl(URL.createObjectURL(file))
    setOriginalFile(file)
    setCompressedUrl(null)
    setCompressedBlob(null)
  }, [originalUrl])

  // ── Input change
  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // ── Drag & Drop
  const onDragOver = (e) => { e.preventDefault(); setIsDragOver(true) }
  const onDragLeave = () => setIsDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // ── Download
  const handleDownload = () => {
    if (!compressedBlob || !originalFile) return
    const ext = originalFile.type === 'image/png' ? 'png' : 'jpg'
    const name = originalFile.name.replace(/\.[^.]+$/, '') + `_compressed.${ext}`
    const link = document.createElement('a')
    link.href = compressedUrl
    link.download = name
    link.click()
  }

  // ── Reset
  const handleReset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (compressedUrl) URL.revokeObjectURL(compressedUrl)
    setOriginalFile(null)
    setOriginalUrl(null)
    setCompressedUrl(null)
    setCompressedBlob(null)
    setError(null)
    setQuality(80)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const savings = getSavingsPercent(originalFile?.size, compressedBlob?.size)

  // ── Slider track gradient
  const sliderPercent = ((quality - 10) / (100 - 10)) * 100
  const sliderStyle = {
    background: `linear-gradient(to right, #7c3aed ${sliderPercent}%, var(--bg-input) ${sliderPercent}%)`
  }

  return (
    <div data-theme="lofi" className="min-h-screen bg-base-100 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-base-200/80 backdrop-blur border-b border-base-300 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-base-content leading-none">ImagePress</h1>
              <p className="text-xs text-base-content/50 leading-none mt-0.5">Browser-based image compressor</p>
            </div>
          </div>
          <div className="badge badge-success gap-1.5 font-medium">
            <Shield className="w-3 h-3" />
            100% Client-side
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">

        {/* Hero */}
        <section className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-base-content mb-3 tracking-tight">
            Compress Images{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Instantly
            </span>
          </h2>
          <p className="text-base-content/60 max-w-xl mx-auto text-base">
            Drag &amp; drop your image, tune the quality, and download the
            compressed version — all inside your browser. Zero uploads.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div role="alert" className="alert alert-error mb-6 max-w-2xl mx-auto">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Upload Zone ── */}
        {!originalFile && (
          <div
            className={[
              'border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300',
              'flex flex-col items-center justify-center gap-4 py-20 px-6 text-center',
              'hover:border-primary hover:bg-primary/5',
              isDragOver
                ? 'border-secondary bg-secondary/10 drag-active scale-[1.01]'
                : 'border-base-300 bg-base-200/40',
            ].join(' ')}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            id="upload-zone"
            role="button"
            aria-label="Upload image"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              accept="image/jpeg,image/jpg,image/png"
              onChange={onInputChange}
              className="hidden"
              aria-label="Choose image file"
            />

            <div className={[
              'w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300',
              isDragOver ? 'bg-secondary/20' : 'bg-primary/10',
            ].join(' ')}>
              <Upload className={`w-9 h-9 transition-colors duration-300 ${isDragOver ? 'text-secondary' : 'text-primary'
                }`} />
            </div>

            <div>
              <p className="text-xl font-semibold text-base-content">
                {isDragOver ? 'Drop it here!' : 'Drop your image here'}
              </p>
              <p className="text-sm text-base-content/50 mt-1">
                or click anywhere to browse files
              </p>
            </div>

            <div className="flex gap-2">
              {['JPG', 'JPEG', 'PNG'].map((fmt) => (
                <span key={fmt} className="badge badge-outline badge-primary font-mono">{fmt}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Workspace ── */}
        {originalFile && (
          <div className="flex flex-col gap-6">

            {/* Quality Control Card */}
            <div className="card bg-base-200 shadow-xl border border-base-300">
              <div className="card-body gap-5">

                {/* Card title */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                    <Gauge className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h2 className="card-title text-base">Compression Quality</h2>
                    <p className="text-xs text-base-content/50">Lower = smaller file · Higher = better quality</p>
                  </div>
                  {isProcessing && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-base-content/50">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Compressing…
                    </span>
                  )}
                </div>

                {/* Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70 font-medium">Quality Level</span>
                    <span className="badge badge-primary font-mono font-bold">{quality}%</span>
                  </div>
                  <input
                    id="quality-slider"
                    type="range"
                    className="range range-primary range-xs"
                    min={10}
                    max={100}
                    step={1}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    aria-label="Compression quality"
                  />
                  <div className="flex justify-between text-xs text-base-content/40">
                    <span>10 — Max Compression</span>
                    <span>100 — Best Quality</span>
                  </div>
                </div>

                <div className="divider my-0" />

                {/* Stats */}
                <div className="stats stats-horizontal shadow-none bg-base-300/50 rounded-xl w-full">
                  <div className="stat">
                    <div className="stat-figure text-base-content/30">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <div className="stat-title text-xs">Original</div>
                    <div className="stat-value text-lg">{formatBytes(originalFile?.size)}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-figure text-green-400/60">
                      <ImageDown className="w-6 h-6" />
                    </div>
                    <div className="stat-title text-xs">Compressed</div>
                    <div className="stat-value text-lg text-green-400">
                      {isProcessing ? '…' : formatBytes(compressedBlob?.size)}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-figure text-primary/60">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="stat-title text-xs">Space Saved</div>
                    <div className="stat-value text-lg text-primary">
                      {isProcessing ? '…' : `${savings}%`}
                    </div>
                  </div>
                </div>

                <div className="divider my-0" />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    id="download-btn"
                    className="btn btn-success flex-1 min-w-36 gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-95"
                    onClick={handleDownload}
                    disabled={!compressedBlob || isProcessing}
                    aria-label="Download compressed image"
                  >
                    <ImageDown className="w-4 h-4" />
                    Download Compressed
                  </button>
                  <button
                    id="new-image-btn"
                    className="btn btn-outline btn-primary gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-95"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Choose a different image"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Change Image
                  </button>
                  <button
                    id="reset-btn"
                    className="btn btn-ghost gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-95"
                    onClick={handleReset}
                    aria-label="Reset and clear image"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={onInputChange}
                    className="hidden"
                    id="file-input-hidden"
                    aria-hidden="true"
                  />
                </div>

              </div>
            </div>

            {/* Preview Cards — side-by-side on md+, stacked on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Original */}
              <div className="card bg-base-200 border border-base-300 shadow-lg">
                <div className="card-body p-4 gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                      <span className="font-semibold text-sm">Original</span>
                    </div>
                    <span className="badge badge-ghost font-mono text-xs">
                      {formatBytes(originalFile?.size)}
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden bg-base-300 min-h-48 flex items-center justify-center">
                    {originalUrl && (
                      <img
                        src={originalUrl}
                        alt="Original uploaded image"
                        id="original-preview"
                        className="preview-img max-h-80"
                      />
                    )}
                  </div>
                  <p className="text-xs text-base-content/40 truncate">{originalFile?.name}</p>
                </div>
              </div>

              {/* Compressed */}
              <div className="card bg-base-200 border border-base-300 shadow-lg">
                <div className="card-body p-4 gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                      <span className="font-semibold text-sm">Compressed</span>
                    </div>
                    <span className="badge badge-ghost font-mono text-xs">
                      {isProcessing ? '…' : formatBytes(compressedBlob?.size)}
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden bg-base-300 min-h-48 flex items-center justify-center">
                    {isProcessing && (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    )}
                    {!isProcessing && compressedUrl && (
                      <img
                        src={compressedUrl}
                        alt="Compressed image preview"
                        id="compressed-preview"
                        className="preview-img max-h-80"
                      />
                    )}
                  </div>
                  <div className="min-h-5">
                    {!isProcessing && compressedBlob && (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-primary font-semibold">{savings}% smaller</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-base-300 bg-base-200/60 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Author Info */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-base-content/70">
              <User className="w-4 h-4" />
              <span className="font-semibold">Aditya Prasad Sharma</span>
            </div>
            <div className="hidden sm:block text-base-content/30">·</div>
            <a
              href="mailto:as0257233@gmail.com"
              id="author-email"
              className="flex items-center gap-1.5 text-base-content/50 hover:text-primary transition-colors duration-200"
            >
              <Mail className="w-4 h-4" />
              as0257233@gmail.com
            </a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <a
              href="https://digitalheroesco.com"
              target="_blank"
              rel="noopener noreferrer"
              id="digital-heroes-btn"
              className="btn btn-success btn-sm gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              Built for Digital Heroes
            </a>
            <span className="text-xs text-base-content/30">
              © {new Date().getFullYear()} ImagePress
            </span>
          </div>

        </div>
      </footer>
    </div>
  )
}
