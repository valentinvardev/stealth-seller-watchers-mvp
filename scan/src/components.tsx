import { useState, type ReactNode, type RefObject } from "react";
import type { Product } from "./resolve";
import type { Camera, TripItem } from "./types";
import { SETTINGS, caveats, evaluate, perSeller, priceRead, sellPriceUsed, verdictFor } from "./verdict";

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (n: number) => `${Math.round(n * 100)}%`;
const time = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function Viewfinder({
  videoRef,
  camera,
  onAllow,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  camera: Camera;
  onAllow: () => void;
}) {
  return (
    <div className="vf">
      <video ref={videoRef} playsInline muted autoPlay />
      {camera === "scanning" && (
        <>
          <div className="frame" />
          <div className="hint">Point at a UPC or EAN. Keep scanning, the card follows.</div>
        </>
      )}
      {camera === "prompt" && (
        <div className="overlay">
          <div className="box">
            <h2>Scan in the aisle</h2>
            <p>Stealth Scan reads barcodes with the camera. Nothing is recorded or uploaded.</p>
            <button className="btn btn-primary btn-block" onClick={onAllow}>
              Allow camera
            </button>
          </div>
        </div>
      )}
      {camera === "starting" && (
        <div className="overlay">
          <div className="box">
            <p>Starting camera</p>
          </div>
        </div>
      )}
      {camera === "denied" && (
        <div className="overlay">
          <div className="box">
            <h2>Camera is off</h2>
            <p>Allow it in Settings, Safari, Camera, then come back. You can still type a code below.</p>
            <button className="btn btn-block" onClick={onAllow}>
              Try again
            </button>
          </div>
        </div>
      )}
      {camera === "error" && (
        <div className="overlay">
          <div className="box">
            <h2>Camera did not start</h2>
            <p>This page needs https. Reload, or type the code below.</p>
            <button className="btn btn-block" onClick={onAllow}>
              Try again
            </button>
          </div>
        </div>
      )}
      {camera === "paused" && (
        <div className="overlay">
          <div className="box">
            <p>Paused while the app is in the background</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sheet({ children, onClose, head }: { children: ReactNode; onClose: () => void; head: ReactNode }) {
  return (
    <div className="sheet" role="dialog">
      <div className="grab" />
      <div className="sheet-head">
        {head}
        <button className="x" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

function EligibilityPill({ p }: { p: Product }) {
  const e = p.eligibility;
  if (e.status === "approved") return <span className="pill tone-good">approved · {e.checkedAgo}</span>;
  if (e.status === "gated") return <span className="pill tone-warn">gated · {e.checkedAgo}</span>;
  return <span className="pill tone-neutral">unknown</span>;
}

export function ResultSheet({
  product,
  code,
  source,
  resolvedMs,
  alternatives,
  cost,
  onCost,
  notes,
  onNotes,
  notesRemembered,
  onKeep,
  onSkip,
  onPickOther,
  onClose,
}: {
  product: Product;
  code: string;
  source: "scan" | "typed";
  resolvedMs: number;
  alternatives?: Product[];
  cost: string;
  onCost: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
  notesRemembered: boolean;
  onKeep: () => void;
  onSkip: () => void;
  onPickOther: () => void;
  onClose: () => void;
}) {
  const [showNotes, setShowNotes] = useState(notes.length > 0);
  const c = Number.parseFloat(cost);
  const hasCost = Number.isFinite(c) && c > 0;
  const v = verdictFor(product, hasCost ? c : null);
  const read = priceRead(product);
  const used = sellPriceUsed(product);
  const ps = perSeller(product);
  const res = hasCost ? evaluate(product, c) : null;
  const chips = caveats(product);

  return (
    <Sheet
      onClose={onClose}
      head={
        <>
          <span className="pill tone-neutral">{source === "scan" ? "scanned" : "typed"}</span>
          <span className="mono">{code}</span>
          <span className="mono">· {Math.round(resolvedMs)} ms</span>
        </>
      }
    >
      <div className="title">{product.title}</div>
      <div className="meta">
        {product.brand} · {product.category} · {product.rating} stars ({product.reviews.toLocaleString("en-US")})
      </div>

      <div className={`verdict tone-${v.tone}`}>
        <span className="h">{v.headline}</span>
        <span className="d">{v.detail}</span>
      </div>

      {chips.length > 0 && (
        <div className="chips">
          {chips.map((ch) => (
            <span key={ch.text} className={`chip tone-${ch.tone}`}>
              {ch.text}
            </span>
          ))}
        </div>
      )}

      <div className="kv">
        <span className="k">Avg price, 90 days</span>
        <span className="v big">{money(product.avg90)}</span>
        <span className="k">Buy box today</span>
        <span className="v mono">{money(product.buyBox)}</span>
        <span className="sub">
          {read.kind === "stable" && `Today is within ${Math.abs(read.pct)}% of the average: not a spike.`}
          {read.kind === "under" && `Today is ${Math.abs(read.pct)}% under the average: price is falling, sellers came in.`}
          {read.kind === "spike" && `Today is ${read.pct}% over the average. Numbers below use ${money(used.price)}.`}
        </span>
        <span className="k">Offers</span>
        <span className="v mono">
          {product.offersFba} FBA · {product.offersFbm} FBM
        </span>
        <span className="k">Sold per month, per seller</span>
        <span className="v mono">{ps === null ? "under 50 total" : `${product.soldMonthly} → ${ps} each`}</span>
        <span className="k">Rank</span>
        <span className="v mono">
          #{product.rank.toLocaleString("en-US")} · top {product.rankPct}%
        </span>
        <span className="k">Fees (referral + FBA)</span>
        <span className="v mono">{money(product.fees)}</span>
        <span className="k">Eligibility</span>
        <span className="v">
          <EligibilityPill p={product} />
        </span>
        {product.eligibility.status !== "unknown" && <span className="sub">Last checked {product.eligibility.checkedAgo} via {product.eligibility.source}.</span>}
        {product.eligibility.status === "unknown" && <span className="sub">{product.eligibility.reason}.</span>}
      </div>

      <label className="cost">
        <span className="k">Shelf price, per unit</span>
        <input inputMode="decimal" placeholder="0.00" value={cost} onChange={(e) => onCost(e.target.value)} autoFocus />
      </label>

      {res && (
        <div className="result">
          <span>
            Profit <b className={res.profit > 0 ? "" : "muted"}>{money(res.profit)}</b>
          </span>
          <span>
            ROI <b>{pct(res.roi)}</b>
            <span className="muted"> · floor {pct(SETTINGS.minRoi)}</span>
          </span>
        </div>
      )}

      <div className="notes">
        {!showNotes ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowNotes(true)}>
            Add a note or link
          </button>
        ) : (
          <>
            <div className="lbl">
              <span>Note and link, kept with the product</span>
              {notesRemembered && <span className="pill tone-neutral">remembered</span>}
            </div>
            <textarea value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="Coupon, aisle, source link" />
          </>
        )}
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={onKeep}>
          {hasCost ? "Keep" : "Keep without price"}
        </button>
        <button className="btn" onClick={onSkip}>
          Skip
        </button>
      </div>
      {alternatives && alternatives.length > 0 && (
        <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={onPickOther}>
          Wrong product? {alternatives.length} other match this barcode
        </button>
      )}
    </Sheet>
  );
}

export function PickerSheet({ candidates, code, onPick, onClose }: { candidates: Product[]; code: string; onPick: (p: Product) => void; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} head={<span className="mono">{code}</span>}>
      <div className="title">{candidates.length} products share this barcode</div>
      <div className="meta">Multipacks and variations do this. Pick the one on the shelf.</div>
      {candidates.map((p) => (
        <button key={p.asin} className="cand" onClick={() => onPick(p)}>
          <span className="t">{p.title}</span>
          <span className="m">
            {p.brand} · {p.offersFba} FBA · {p.offersFbm} FBM · <EligibilityPill p={p} />
          </span>
          <span className="p">{money(p.avg90)}</span>
        </button>
      ))}
    </Sheet>
  );
}

export function NotFoundSheet({ code, onKeepAnyway, onClose }: { code: string; onKeepAnyway: () => void; onClose: () => void }) {
  const isIssn = code.startsWith("977");
  return (
    <Sheet onClose={onClose} head={<span className="mono">{code}</span>}>
      <div className="title">Not on Amazon</div>
      <div className="meta">
        {isIssn ? "That is a magazine or newspaper barcode. They are not listed by code." : "No listing carries this barcode. Store brands and new releases often lack one."}
      </div>
      <div className="actions" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <a className="btn" href={`https://www.amazon.com/s?k=${encodeURIComponent(code)}`} target="_blank" rel="noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>
          Search by name
        </a>
        <button className="btn" onClick={onKeepAnyway}>
          Keep in trip anyway
        </button>
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={onClose}>
        Scan the next one
      </button>
    </Sheet>
  );
}

const STATUS_LABEL: Record<TripItem["status"], { text: string; tone: string }> = {
  kept: { text: "kept", tone: "good" },
  skipped: { text: "skipped", tone: "neutral" },
  pending: { text: "no signal", tone: "warn" },
  notfound: { text: "not found", tone: "warn" },
};

export function TripView({
  items,
  onBack,
  onOpen,
  onRetry,
  onClear,
  onExport,
}: {
  items: TripItem[];
  onBack: () => void;
  onOpen: (item: TripItem) => void;
  onRetry: (item: TripItem) => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const kept = items.filter((i) => i.status === "kept");
  const skipped = items.filter((i) => i.status === "skipped").length;
  const invested = kept.reduce((s, i) => s + (i.cost ?? 0), 0);
  return (
    <div className="trip">
      <div className="trip-top">
        <button className="btn btn-sm" onClick={onBack}>
          Back to scan
        </button>
        <h1>Today's trip</h1>
      </div>
      <div className="trip-stats">
        <div className="stat">
          <div className="n">{kept.length}</div>
          <div className="l">kept</div>
        </div>
        <div className="stat">
          <div className="n">{skipped}</div>
          <div className="l">skipped</div>
        </div>
        <div className="stat">
          <div className="n">{money(invested)}</div>
          <div className="l">to buy</div>
        </div>
      </div>
      {items.length === 0 && <div className="empty">Nothing scanned yet.</div>}
      {items.map((i) => {
        const s = STATUS_LABEL[i.status];
        return (
          <div className="trow" key={i.id} onClick={() => onOpen(i)} role="button">
            <span className={`pill tone-${s.tone}`}>{s.text}</span>
            <span className="t">{i.title ?? i.code}</span>
            <span className="r">
              {i.cost !== undefined ? money(i.cost) : ""}
              <small>{i.roi !== undefined ? `${Math.round(i.roi * 100)}% ROI` : time(i.at)}</small>
            </span>
            <span className="m">
              {i.source === "scan" ? "scanned" : "typed"} · {i.code} · {time(i.at)}
              {i.notes ? ` · ${i.notes}` : ""}
            </span>
            {i.status === "pending" && (
              <button
                className="btn btn-sm"
                style={{ gridColumn: 3 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(i);
                }}
              >
                Retry
              </button>
            )}
          </div>
        );
      })}
      {items.length > 0 && (
        <div className="trip-actions">
          <button className="btn btn-primary" onClick={onExport}>
            Send kept to a folder
          </button>
          <button className="btn" onClick={onClear}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}
