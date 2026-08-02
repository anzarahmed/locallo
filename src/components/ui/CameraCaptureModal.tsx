import { useEffect, useRef, useState, type JSX } from 'react';
import { X, Camera, RotateCcw, Check, Loader2, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  title?: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCaptureModal({
  isOpen, title = 'Capture Document', onCapture, onClose,
}: CameraCaptureModalProps): JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect((): (() => void) | void => {
    if (!isOpen) return;
    setError(null);
    setPreviewUrl(null);
    setIsStarting(true);

    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access requires a secure (HTTPS) connection. Please use file upload instead.');
      setIsStarting(false);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) setError('Camera access denied or unavailable. Please allow camera permissions, or use file upload instead.');
      })
      .finally(() => {
        if (!cancelled) setIsStarting(false);
      });

    return (): void => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [isOpen]);

  function handleCapture(): void {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
  }

  function handleRetake(): void {
    setPreviewUrl(null);
  }

  function handleUsePhoto(): void {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      handleClose();
    }, 'image/jpeg', 0.92);
  }

  function handleClose(): void {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
              {isStarting && <Loader2 className="w-6 h-6 text-white animate-spin absolute" />}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${previewUrl ? 'hidden' : ''}`}
              />
              {previewUrl && (
                <img src={previewUrl} alt="Captured document" className="w-full h-full object-contain" />
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {!error && (
            <div className="mt-4 flex justify-center gap-3">
              {previewUrl ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleUsePhoto}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Use Photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isStarting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Capture
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
