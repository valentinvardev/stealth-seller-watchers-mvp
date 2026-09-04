import { useState, type FormEvent } from "react";
import type { Alert, Tab } from "./types";
import { FOLDERS } from "./types";
import { money } from "./components";
import { SETTINGS } from "./verdict";

const time = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function Tabs({ tab, onTab, unread }: { tab: Tab; onTab: (t: Tab) => void; unread: number }) {
  const items: { id: Tab; label: string }[] = [
    { id: "scan", label: "Scan" },
    { id: "trip", label: "Trip" },
    { id: "alerts", label: "Alerts" },
    { id: "account", label: "Account" },
  ];
  return (
    <nav className="tabs" aria-label="Sections">
      {items.map((i) => (
        <button key={i.id} className={`tab ${tab === i.id ? "on" : ""}`} onClick={() => onTab(i.id)} aria-current={tab === i.id ? "page" : undefined}>
          {i.label}
          {i.id === "alerts" && unread > 0 && <span className="badge">{unread}</span>}
        </button>
      ))}
    </nav>
  );
}

export function SignIn({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSignedIn(email.trim());
  };
  return (
    <div className="screen signin">
      <div className="signin-box">
        <div className="brand big">Stealth Seller</div>
        <p className="muted">Scan in the aisle, check a deal, act on an alert. Same account as the web.</p>
        <form onSubmit={submit}>
          <input type="email" inputMode="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-primary btn-block" type="submit">
            Sign in
          </button>
        </form>
        <div className="or">or</div>
        <button className="btn btn-block" onClick={() => onSignedIn("google@stealthseller.co")}>
          Continue with Google
        </button>
        <button className="btn btn-block" onClick={() => onSignedIn("apple@stealthseller.co")}>
          Continue with Apple
        </button>
        <p className="fine">
          Plans are managed at stealthseller.co. <a href="https://stealthseller.co/privacy">Privacy policy</a>
        </p>
      </div>
    </div>
  );
}

export function AlertsView({ alerts, onOpen, onMarkAll }: { alerts: Alert[]; onOpen: (a: Alert) => void; onMarkAll: () => void }) {
  return (
    <div className="screen list">
      <div className="screen-top">
        <h1>Alerts</h1>
        {alerts.some((a) => !a.read) && (
          <button className="btn btn-sm" onClick={onMarkAll}>
            Mark all read
          </button>
        )}
      </div>
      <p className="muted small-p">From your watchers. Checked every 2 to 24 hours, never live. Tap to open the card.</p>
      {alerts.length === 0 && <div className="empty">No alerts yet. Watchers you create on the web land here.</div>}
      {alerts.map((a) => (
        <button key={a.id} className={`arow ${a.read ? "" : "unread"}`} onClick={() => onOpen(a)}>
          <span className={`pill ${a.context.kind === "price_drop" ? "tone-good" : "tone-warn"}`}>{a.context.kind === "price_drop" ? "price drop" : "back in stock"}</span>
          <span className="t">{a.title}</span>
          <span className="m">
            {a.context.kind === "price_drop" && a.context.from !== undefined && a.context.to !== undefined ? `${money(a.context.from)} → ${money(a.context.to)} · ` : ""}
            {a.context.store} · checked {a.context.checkedAgo} · {time(a.at)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function AccountView({
  email,
  notifications,
  onNotifications,
  onSignOut,
  onDelete,
}: {
  email: string;
  notifications: { priceDrop: boolean; backInStock: boolean };
  onNotifications: (n: { priceDrop: boolean; backInStock: boolean }) => void;
  onSignOut: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen list">
      <div className="screen-top">
        <h1>Account</h1>
      </div>

      <section className="group">
        <div className="grow">
          <span className="k">Signed in as</span>
          <span className="v">{email}</span>
        </div>
        <div className="grow">
          <span className="k">Plan</span>
          <span className="v">Mini Ultra</span>
        </div>
        <div className="grow">
          <span className="k">Marketplace</span>
          <span className="v">amazon.com</span>
        </div>
        <p className="fine">Plan changes and billing live at stealthseller.co.</p>
      </section>

      <section className="group">
        <h2>Calculator settings</h2>
        <div className="grow">
          <span className="k">Minimum ROI</span>
          <span className="v mono">{Math.round(SETTINGS.minRoi * 100)}%</span>
        </div>
        <div className="grow">
          <span className="k">Minimum profit</span>
          <span className="v mono">{money(SETTINGS.minProfit)}</span>
        </div>
        <div className="grow">
          <span className="k">Inbound shipping</span>
          <span className="v mono">$0.45 / lb</span>
        </div>
        <div className="grow">
          <span className="k">Prep fee</span>
          <span className="v mono">$0.50 / unit</span>
        </div>
        <p className="fine">Read from your account. Edit them on the web; the card uses them here.</p>
      </section>

      <section className="group">
        <h2>Notifications</h2>
        <label className="grow">
          <span className="k">Price drops</span>
          <input type="checkbox" checked={notifications.priceDrop} onChange={(e) => onNotifications({ ...notifications, priceDrop: e.target.checked })} />
        </label>
        <label className="grow">
          <span className="k">Back in stock</span>
          <input type="checkbox" checked={notifications.backInStock} onChange={(e) => onNotifications({ ...notifications, backInStock: e.target.checked })} />
        </label>
      </section>

      <section className="group">
        <h2>Devices</h2>
        <div className="grow">
          <span className="k">This phone</span>
          <span className="v muted">signed in now</span>
        </div>
        <div className="grow">
          <span className="k">Chrome on Windows</span>
          <span className="v muted">2 d ago</span>
        </div>
      </section>

      <section className="group">
        <button className="btn btn-block" onClick={onSignOut}>
          Sign out
        </button>
        {!confirm ? (
          <button className="btn btn-ghost btn-block danger" onClick={() => setConfirm(true)}>
            Delete account
          </button>
        ) : (
          <div className="confirm">
            <p>
              This deletes your account, sellers, folders and watchers, and cancels the subscription. It cannot be undone. You can also do this at stealthseller.co/account.
            </p>
            <div className="actions" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <button className="btn danger-solid" onClick={onDelete}>
                Delete everything
              </button>
              <button className="btn" onClick={() => setConfirm(false)}>
                Keep my account
              </button>
            </div>
          </div>
        )}
        <p className="fine">
          <a href="https://stealthseller.co/privacy">Privacy policy</a> · <a href="https://stealthseller.co/terms">Terms</a> · prototype build
        </p>
      </section>
    </div>
  );
}

export function FolderPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  return (
    <label className="folder">
      <span className="k">Save to</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {FOLDERS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </label>
  );
}
