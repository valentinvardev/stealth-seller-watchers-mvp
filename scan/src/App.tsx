import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useBarcodeScanner, type Decoded } from "./scanner";
import { OfflineError, resolve, type Product } from "./resolve";
import { evaluate } from "./verdict";
import type { Alert, AlertContext, Camera, Lookup, Source, Tab, TripItem } from "./types";
import { FOLDERS } from "./types";
import { NotFoundSheet, PickerSheet, ResultSheet, Toast, TripView, Viewfinder, money } from "./components";
import { AccountView, AlertsView, FolderPicker, SignIn, Tabs } from "./screens";

const KEYS = {
  trip: "stealth-scan.trip.v1",
  notes: "stealth-scan.notes.v1",
  account: "stealth-scan.account.v1",
  alerts: "stealth-scan.alerts.v1",
  notif: "stealth-scan.notif.v1",
};

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
    // private mode or quota: state just does not persist this time
  }
}

// Two watcher hits so the Alerts tab and the alert banner on the card have
// something real-looking to show. The ASINs match the mock catalog.
function seedAlerts(): Alert[] {
  const now = Date.now();
  return [
    { id: "a1", asin: "B0BKJ8N5PL", title: "LEGO Icons Bonsai Tree 10281", context: { kind: "price_drop", from: 41.5, to: 34.99, checkedAgo: "12 min ago", store: "Amazon" }, at: now - 12 * 60_000, read: false },
    { id: "a2", asin: "B07QN7FZ7L", title: "Ninja Professional Blender 1000W, 72 oz", context: { kind: "back_in_stock", checkedAgo: "2 h ago", store: "Walmart" }, at: now - 2 * 3_600_000, read: false },
  ];
}

// The dock accepts whatever a reseller has in hand: a barcode, an ASIN, or an
// Amazon link pasted from Telegram. A link counts as "shared" in the trip.
function parseInput(raw: string): { code: string; source: Source } | null {
  const text = raw.trim();
  if (!text) return null;
  const url = text.match(/amazon\.[a-z.]+\/(?:[^\s]*?\/)?(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
  if (url) return { code: url[1].toUpperCase(), source: "shared" };
  if (/^B0[A-Z0-9]{8}$/i.test(text)) return { code: text.toUpperCase(), source: "typed" };
  const digits = text.replace(/[\s-]/g, "");
  if (/^\d{8,14}$/.test(digits)) return { code: digits, source: "typed" };
  return { code: text, source: "typed" };
}

export function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [account, setAccount] = useState<{ email: string } | null>(() => load(KEYS.account, null));
  const [tab, setTab] = useState<Tab>("scan");
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [trip, setTrip] = useState<TripItem[]>(() => load<TripItem[]>(KEYS.trip, []));
  const [notesByCode, setNotesByCode] = useState<Record<string, string>>(() => load(KEYS.notes, {}));
  const [alerts, setAlerts] = useState<Alert[]>(() => load(KEYS.alerts, seedAlerts()));
  const [notif, setNotif] = useState(() => load(KEYS.notif, { priceDrop: true, backInStock: true }));
  const [folder, setFolder] = useState<string>(FOLDERS[0]);
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [manual, setManual] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const lastDecodeRef = useRef<{ text: string; at: number } | null>(null);
  const lookupSeq = useRef(0);

  useEffect(() => store(KEYS.trip, trip), [trip]);
  useEffect(() => store(KEYS.notes, notesByCode), [notesByCode]);
  useEffect(() => store(KEYS.account, account), [account]);
  useEffect(() => store(KEYS.alerts, alerts), [alerts]);
  useEffect(() => store(KEYS.notif, notif), [notif]);

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
    (code: string, source: Source, alert?: AlertContext) => {
      const seq = ++lookupSeq.current;
      const startedAt = performance.now();
      setLookup({ code, source, startedAt, state: "resolving", alert });
      setCost("");
      setNotes(notesByCode[code] ?? "");
      resolve(code)
        .then((r) => {
          if (seq !== lookupSeq.current) return; // a newer scan replaced this one
          const resolvedMs = performance.now() - startedAt;
          if (r.kind === "found") setLookup({ code, source, startedAt, state: "found", product: r.product, resolvedMs, alert });
          else if (r.kind === "multi") setLookup({ code, source, startedAt, state: "multi", candidates: r.candidates, resolvedMs, alert });
          else setLookup({ code, source, startedAt, state: "notfound", resolvedMs, alert });
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

  const scannerActive = account !== null && cameraAllowed && isVisible && tab === "scan";
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
      { id: `${Date.now()}`, code, source, at: Date.now(), status: "kept", title: product.title, asin: product.asin, cost: hasCost ? c : undefined, roi, notes: notes.trim() || undefined, folder },
      ...t,
    ]);
    setLookup(null);
    setToast(hasCost ? `Kept at ${money(c)} in ${folder}.` : `Kept in ${folder}. Add the price later.`);
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
    const parsed = parseInput(manual);
    if (!parsed) return;
    setManual("");
    startLookup(parsed.code, parsed.source);
  };

  const openAlert = (a: Alert) => {
    setAlerts((list) => list.map((x) => (x.id === a.id ? { ...x, read: true } : x)));
    setTab("scan");
    startLookup(a.asin, "alert", a.context);
  };

  const openTripItem = (i: TripItem) => {
    setTab("scan");
    startLookup(i.asin ?? i.code, i.source);
  };

  const clearEverything = () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    setTrip([]);
    setNotesByCode({});
    setAlerts(seedAlerts());
    setAccount(null);
    setLookup(null);
    setToast("Account deleted on this device.");
  };

  if (!account) {
    return (
      <div className="app">
        <SignIn onSignedIn={(email) => setAccount({ email })} />
      </div>
    );
  }

  const kept = trip.filter((i) => i.status === "kept");
  const invested = kept.reduce((s, i) => s + (i.cost ?? 0), 0);
  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="app">
      {tab === "scan" && (
        <>
          <Viewfinder videoRef={videoRef} camera={camera} onAllow={() => setCameraAllowed(true)} />
          <header className="topbar">
            <span className="brand">
              Stealth Seller<small>prototype</small>
            </span>
            <button className="trip-pill" onClick={() => setTab("trip")}>
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
                <input placeholder="UPC, EAN, ASIN or an Amazon link" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Barcode, ASIN or Amazon link" autoCapitalize="characters" autoCorrect="off" />
                <button className="btn btn-primary" type="submit">
                  Look up
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {tab === "trip" && <TripView items={trip} onOpen={openTripItem} onRetry={(i) => { setTrip((t) => t.filter((x) => x.id !== i.id)); openTripItem(i); }} onClear={() => { setTrip([]); setToast("Trip cleared."); }} onExport={() => setToast(`${kept.length} items land in Folders once the endpoint exists.`)} />}

      {tab === "alerts" && <AlertsView alerts={alerts} onOpen={openAlert} onMarkAll={() => setAlerts((l) => l.map((a) => ({ ...a, read: true })))} />}

      {tab === "account" && <AccountView email={account.email} notifications={notif} onNotifications={setNotif} onSignOut={() => setAccount(null)} onDelete={clearEverything} />}

      {tab === "scan" && lookup?.state === "resolving" && (
        <div className="sheet">
          <div className="grab" />
          <div className="sheet-head">
            <span className="mono">{lookup.code}</span>
            <span className="mono">· looking up</span>
          </div>
          <div className="title muted">Reading Amazon data</div>
        </div>
      )}

      {tab === "scan" && lookup?.state === "found" && (
        <ResultSheet
          product={lookup.product}
          code={lookup.code}
          source={lookup.source}
          resolvedMs={lookup.resolvedMs}
          alternatives={lookup.alternatives}
          alert={lookup.alert}
          cost={cost}
          onCost={setCost}
          notes={notes}
          onNotes={setNotes}
          notesRemembered={Boolean(notesByCode[lookup.code])}
          extra={<FolderPicker value={folder} onChange={setFolder} />}
          onKeep={() => keep(lookup.product, lookup.code, lookup.source)}
          onSkip={() => skip(lookup.product, lookup.code, lookup.source)}
          onPickOther={() =>
            setLookup({ code: lookup.code, source: lookup.source, startedAt: lookup.startedAt, state: "multi", candidates: [lookup.product, ...(lookup.alternatives ?? [])], resolvedMs: lookup.resolvedMs, alert: lookup.alert })
          }
          onClose={() => setLookup(null)}
        />
      )}

      {tab === "scan" && lookup?.state === "multi" && (
        <PickerSheet
          candidates={lookup.candidates}
          code={lookup.code}
          onPick={(p) =>
            setLookup({ code: lookup.code, source: lookup.source, startedAt: lookup.startedAt, state: "found", product: p, resolvedMs: lookup.resolvedMs, alternatives: lookup.candidates.filter((c) => c.asin !== p.asin), alert: lookup.alert })
          }
          onClose={() => setLookup(null)}
        />
      )}

      {tab === "scan" && lookup?.state === "notfound" && <NotFoundSheet code={lookup.code} onKeepAnyway={() => keepNotFound(lookup.code, lookup.source)} onClose={() => setLookup(null)} />}

      <Tabs tab={tab} onTab={(t) => { setTab(t); if (t !== "scan") setLookup(null); }} unread={unread} />

      {toast && <Toast text={toast} />}
    </div>
  );
}
