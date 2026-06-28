import { useCallback, useEffect, useRef, useState } from 'react';

import { normalizeIndustrialCode } from '@/industrial/operador/normalizeIndustrialCode';

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export type UseOperatorQrScannerOptions = {
  enabled?: boolean;
  continuous?: boolean;
  onScan: (code: string) => void | Promise<void>;
};

export function useOperatorQrScanner(options: UseOperatorQrScannerOptions) {
  const { enabled = false, continuous = true, onScan } = options;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [cameraActive, setCameraActive] = useState(false);
  const [usbCaptureActive, setUsbCaptureActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const usbBufferRef = useRef('');
  const usbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);

  const supportsBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const commitScan = useCallback(
    async (raw: string) => {
      const code = normalizeIndustrialCode(raw);
      if (!code || processingRef.current) return;

      processingRef.current = true;
      setLastScan(code);
      try {
        await onScanRef.current(code);
      } finally {
        processingRef.current = false;
      }
    },
    [],
  );

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    if (!supportsBarcodeDetector) {
      setError('Câmara QR não disponível neste browser. Use leitor USB ou input manual.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();
      setCameraActive(true);

      const detector = new window.BarcodeDetector!({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'],
      });

      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(() => void tick());
          return;
        }

        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) {
            await commitScan(value);
            if (!continuous) {
              stopCamera();
              return;
            }
          }
        } catch {
          // Ignorar frames sem detecção.
        }

        rafRef.current = requestAnimationFrame(() => void tick());
      };

      rafRef.current = requestAnimationFrame(() => void tick());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao activar câmara.');
      stopCamera();
    }
  }, [commitScan, continuous, stopCamera, supportsBarcodeDetector]);

  const startUsbCapture = useCallback(() => {
    setUsbCaptureActive(true);
    setError(null);
    usbBufferRef.current = '';
  }, []);

  const stopUsbCapture = useCallback(() => {
    setUsbCaptureActive(false);
    usbBufferRef.current = '';
    if (usbTimerRef.current) clearTimeout(usbTimerRef.current);
  }, []);

  useEffect(() => {
    if (!enabled || !usbCaptureActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        !target.dataset.operatorUsbCapture
      ) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const buffered = usbBufferRef.current;
        usbBufferRef.current = '';
        if (buffered) void commitScan(buffered);
        return;
      }

      if (event.key.length === 1) {
        usbBufferRef.current += event.key;
        if (usbTimerRef.current) clearTimeout(usbTimerRef.current);
        usbTimerRef.current = setTimeout(() => {
          const buffered = usbBufferRef.current;
          usbBufferRef.current = '';
          if (buffered.length >= 4) void commitScan(buffered);
        }, 120);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commitScan, enabled, usbCaptureActive]);

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      stopUsbCapture();
    }
  }, [enabled, stopCamera, stopUsbCapture]);

  useEffect(
    () => () => {
      stopCamera();
      stopUsbCapture();
    },
    [stopCamera, stopUsbCapture],
  );

  return {
    videoRef,
    cameraActive,
    usbCaptureActive,
    supportsBarcodeDetector,
    error,
    lastScan,
    startCamera,
    stopCamera,
    startUsbCapture,
    stopUsbCapture,
    commitScan,
  };
}
