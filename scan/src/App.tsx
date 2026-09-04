import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useBarcodeScanner, type Decoded } from "./scanner";
import { OfflineError, resolve, type Product } from "./resolve";
import { evaluate } from "./verdict";
import type { Camera, Lookup, Source, TripItem } from "./types";
import { NotFoundSheet, PickerSheet, ResultSheet, Toast, TripView, Viewfinder, money } from "./components";

const TRIP_KEY = "stealth-scan.trip.v1";
const NOTES_KEY = "stealth-scan.notes.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or quota: the trip just does not persist this time
  }
}

export function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [view, setView] = useState<"scan" | "trip">("scan");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [trip, setTrip] = useState<TripItem[]>(() => load<TripItem[]>(TRIP_KEY, []));
  const [notesByCode, setNotesByCode] = useState<Record<string, string>>(() => load(NOTES_KEY, {}));
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [manual, setManual] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const lastDecodeRef = useRef<{ text: string; at: number } | null>(null);
  const lookupSeq = useRef(0);

  useEffect(() => store(TRIP_KEY, trip), [trip]);
  useEffect(() => store(NOTES_KEY, notesByCode), [notesByCode]);

  // Stop the camera when the app goes to the background (battery, and iOS
  // drops the stream anyway) and bring it back on return.
  useEffect(() => {
    const onVis = () => setIsVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const startLookup = useCallback(
    (code: string, source: Source) => {
      const seq = ++lookupSeq.current;
      const startedAt = performance.now();
      setLookup({ code, source, startedAt, state: "resolving" });
      setCost("");
      setNotes(notesByCode[code] ?? "");
      resolve(code)
        .then((r) => {
          if (seq !== lookupSeq.current) return; // a newer scan replaced this one
          const resolvedMs = performance.now() - startedAt;
          if (r.kind === "found") setLookup({ code, source, startedAt, state: "found", product: r.product, resolvedMs });
          else if (r.kind === "multi") setLookup({ code, source, startedAt, state: "multi", candidates: r.candidates, resolvedMs });
          else setLookup({ code, source, startedAt, state: "notfound", resolvedMs });
        })
        .catch((err: unknown) => {
          if (seq !== lookupSeq.current) return;
          setLookup(null);
          if (err instanceof OfflineError) {
            setTrip((t) => [{ id: `${Date.now()}`, code, source, at: Date.now(), status: "pending" }, ...t]);
            setToast("No signal. Kept in your trip to check later.");
          } else {
            setToast("Lookup failed. Try again.");
          }
        });
    },
    [notesByCode],
  );

  const onDecode = useCallback(
    (d: Decoded) => {
      const now = Date.now();
      const last = lastDecodeRef.current;
      // Same code inside 2.5 s is the same product still in frame, not a rescan.
      if (last && last.text === d.text && now - last.at < 2500) return;
      lastDecodeRef.current = { text: d.text, at: now };
      navigator.vibrate?.(60); // Android only; iOS haptics come with the native shell
      startLookup(d.text, "scan");
    },
    [startLookup],
  );

  const scannerActive = cameraAllowed && isVisible && view === "scan";
  const status = useBarcodeScanner(videoRef, scannerActive, onDecode);

  const camera: Camera = !cameraAllowed
    ? "prompt"
    : !isVisible
      ? "paused"
      : status === "denied"
        ? "denied"
        : status === "error"
          ? "error"
          : status === "scanning"
            ? "scanning"
            : "starting";

  const rememberNotes = (code: string, text: string) => {
    setNotesByCode((m) => {
      const next = { ...m };
      if (text.trim()) next[code] = text.trim();
      else delete next[code];
      return next;
    });
  };

  const keep = (product: Product, code: string, source: Source) => {
    const c = Number.parseFloat(cost);
    const hasCost = Number.isFinite(c) && c > 0;
    const roi = hasCost ? evaluate(product, c).roi : undefined;
    rememberNotes(code, notes);
    setTrip((t) => [
      { id: `${Date.now()}`, code, source, at: Date.now(), status: "kept", title: product.title, asin: product.asin, cost: hasCost ? c : undefined, roi, notes: notes.trim() || undefined },
      ...t,
    ]);
    setLookup(null);
    setToast(hasCost ? `Kept at ${money(c)}. Scan the next one.` : "Kept. Add the price later in the trip.");
  };

  const skip = (product: Product, code: string, source: Source) => {
    rememberNotes(code, notes);
    setTrip((t) => [{ id: `${Date.now()}`, code, source, at: Date.now(), status: "skipped", title: product.title, asin: product.asin, notes: notes.trim() || undefined }, ...t]);
    setLookup(null);
    setToast("Skipped.");
  };

  const keepNotFound = (code: string, source: Source) => {
    setTrip((t) => [{ id: `${Date.now()}`, code, source, at: Date.now(), status: "notfound" }, ...t]);
    setLookup(null);
    setToast("Kept the barcode. Look it up by name later.");
  };

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    const text = manual.trim();
    if (!text) return;
    setManual("");
    startLookup(text, "typed");
  };

  const kept = trip.filter((i) => i.status === "kept");
  const invested = kept.reduce((s, i) => s + (i.cost ?? 0), 0);

  if (view === "trip") {
    return (
      <div className="app">
        <TripView
          items={trip}
          onBack={() => setView("scan")}
          onOpen={(i) => {
            setView("scan");
            startLookup(i.code, i.source);
          }}
          onRetry={(i) => {
            setTrip((t) => t.filter((x) => x.id !== i.id));
            setView("scan");
            startLookup(i.code, i.source);
          }}
          onClear={() => {
            setTrip([]);
            setToast("Trip cleared.");
          }}
          onExport={() => setToast("Lands in Folders once the endpoint exists.")}
        />
        {toast && <Toast text={toast} />}
      </div>
    );
  }

  return (
    <div className="app">
      <Viewfinder videoRef={videoRef} camera={camera} onAllow={() => setCameraAllowed(true)} />

      <header className="topbar">
        <span className="brand">
          Stealth Scan<small>prototype</small>
        </span>
        <button className="trip-pill" onClick={() => setView("trip")}>
          Trip <b>{kept.length}</b> kept <b>{money(invested)}</b>
        </button>
      </header>

      {!lookup && (
        <div className="dock">
          <div className="status">
            {camera === "scanning" && "camera live"}
            {camera === "starting" && "starting camera"}
            {camera === "prompt" && "camera off"}
            {(camera === "denied" || camera === "error") && "camera unavailable, type a code"}
            {camera === "paused" && "paused"}
          </div>
          <form onSubmit={submitManual}>
            <input inputMode="numeric" placeholder="Type a UPC, EAN or ASIN" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Barcode or ASIN" />
            <button className="btn btn-primary" type="submit">
              Look up
            </button>
          </form>
        </div>
      )}

      {lookup?.state === "resolving" && (
        <div className="sheet">
          <div className="grab" />
          <div className="sheet-head">
            <span className="mono">{lookup.code}</span>
            <span className="mono">· looking up</span>
          </div>
          <div className="title muted">Reading Amazon data</div>
        </div>
      )}

      {lookup?.state === "found" && (
        <ResultSheet
          product={lookup.product}
          code={lookup.code}
          source={lookup.source}
          resolvedMs={lookup.resolvedMs}
          alternatives={lookup.alternatives}
          cost={cost}
          onCost={setCost}
          notes={notes}
          onNotes={setNotes}
          notesRemembered={Boolean(notesByCode[lookup.code])}
          onKeep={() => keep(lookup.product, lookup.code, lookup.source)}
          onSkip={() => skip(lookup.product, lookup.code, lookup.source)}
          onPickOther={() =>
            setLookup({ code: lookup.code, source: lookup.source, startedAt: lookup.startedAt, state: "multi", candidates: [lookup.product, ...(lookup.alternatives ?? [])], resolvedMs: lookup.resolvedMs })
          }
          onClose={() => setLookup(null)}
        />
      )}

      {lookup?.state === "multi" && (
        <PickerSheet
          candidates={lookup.candidates}
          code={lookup.code}
          onPick={(p) =>
            setLookup({ code: lookup.code, source: lookup.source, startedAt: lookup.startedAt, state: "found", product: p, resolvedMs: lookup.resolvedMs, alternatives: lookup.candidates.filter((c) => c.asin !== p.asin) })
          }
          onClose={() => setLookup(null)}
        />
      )}

      {lookup?.state === "notfound" && <NotFoundSheet code={lookup.code} onKeepAnyway={() => keepNotFound(lookup.code, lookup.source)} onClose={() => setLookup(null)} />}

      {toast && <Toast text={toast} />}
    </div>
  );
}
