// "Add to Home Screen" help. Android/Chrome: a real Install button using the
// browser's beforeinstallprompt event. iPhone: Apple does not allow websites
// to trigger this, so we show the Share → Add to Home Screen steps instead.
import { useEffect, useState } from "react";

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function InstallCard() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const ios = isIos();
  if (isStandalone()) {
    return <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm">The app is installed on this device.</div>;
  }
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm space-y-3 text-charcoal/90">
      {deferred && (
        <button
          type="button"
          className="pressable inline-flex items-center justify-center gap-2 rounded bg-navy px-4 py-2.5 font-semibold text-white min-h-11 w-full sm:w-auto"
          onClick={async () => {
            await deferred?.prompt();
            deferred = null;
            force((n) => n + 1);
          }}
        >
          Install the MasterFix app
        </button>
      )}
      <div className={ios ? "order-first" : ""}>
        <p className="font-semibold text-navy">iPhone / iPad</p>
        <ol className="list-decimal ml-5 mt-1 space-y-0.5">
          <li>Open this page in Safari.</li>
          <li>Tap the Share button (square with an arrow).</li>
          <li>Tap “Add to Home Screen”, then “Add”.</li>
        </ol>
      </div>
      <div>
        <p className="font-semibold text-navy">Android</p>
        <ol className="list-decimal ml-5 mt-1 space-y-0.5">
          <li>Open this page in Chrome.</li>
          <li>{deferred ? "Tap “Install the MasterFix app” above," : "Tap the ⋮ menu,"} then “Install app” or “Add to Home screen”.</li>
        </ol>
      </div>
    </div>
  );
}
