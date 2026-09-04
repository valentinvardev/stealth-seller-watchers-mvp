import { useEffect, useRef, useState, type RefObject } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export type ScanStatus = "idle" | "starting" | "scanning" | "denied" | "error";

export type Decoded = { text: string; format: string };

// Web-side scanner for the spike. In the Capacitor shell this hook is the
// fallback; the native path is a plugin (ML Kit on iOS and Android) with the
// camera rendered behind the WebView. Same call shape on purpose: start,
// stop, onDecode.
export function useBarcodeScanner(
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
  onDecode: (d: Decoded) => void,
): ScanStatus {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  useEffect(() => {
    if (!active) {
      setStatus("idle");
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const hints = new Map();
    // Retail barcodes only. Fewer formats = faster decode per frame.
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 1500,
    });

    setStatus("starting");
    reader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video,
        (result) => {
          if (!result) return;
          onDecodeRef.current({
            text: result.getText(),
            format: BarcodeFormat[result.getBarcodeFormat()],
          });
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus("scanning");
      })
      .catch((err: unknown) => {
        const name = (err as { name?: string })?.name;
        setStatus(name === "NotAllowedError" ? "denied" : "error");
        console.error("scanner", err);
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, videoRef]);

  return status;
}
