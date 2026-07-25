import { useEffect, useState } from "react";
import {
  Download,
  RefreshCw,
  RotateCw,
  X,
  Loader2,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useUpdater } from "../lib/updater";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdateModal() {
  const {
    open,
    status,
    currentVersion,
    newVersion,
    notes,
    progress,
    downloaded,
    total,
    error,
    runCheck,
    downloadAndInstall,
    restart,
    closeWindow,
  } = useUpdater();

  // The store only knows the current version once an update is found; fetch it
  // up front so the "up to date" state can still show which version you're on.
  const [appVersion, setAppVersion] = useState<string | null>(null);
  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() => {});
  }, []);
  const installed = currentVersion ?? appVersion;

  // While actively installing, block accidental dismissal.
  const dismissable = status !== "downloading";
  const close = () => dismissable && closeWindow();

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={close}>
      <div className="modal update-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <Sparkles size={18} />
            Software Update
          </div>
          {dismissable && (
            <button className="icon-btn" onClick={close}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="modal-body">
          {status === "checking" && (
            <div className="update-center">
              <Loader2 size={28} className="spin" />
              <p className="modal-lead">Checking for updates…</p>
            </div>
          )}

          {status === "uptodate" && (
            <div className="update-center">
              <div className="update-badge ok">
                <Check size={26} />
              </div>
              <p className="modal-lead">
                You’re up to date.
                {installed && (
                  <>
                    {" "}
                    NoteX <b>{installed}</b> is the latest version.
                  </>
                )}
              </p>
              <button className="btn primary" onClick={closeWindow}>
                Done
              </button>
            </div>
          )}

          {status === "available" && (
            <>
              <p className="modal-lead">
                A new version of NoteX is available.
                {installed && newVersion && (
                  <>
                    {" "}
                    <span className="version-jump">
                      <b>{installed}</b> → <b className="v-new">{newVersion}</b>
                    </span>
                  </>
                )}
              </p>
              {notes && (
                <div className="update-notes">
                  <div className="update-notes-title">What’s new</div>
                  <pre className="update-notes-body">{notes}</pre>
                </div>
              )}
              <div className="sec-actions">
                <button className="btn" onClick={closeWindow}>
                  Later
                </button>
                <button className="btn primary" onClick={downloadAndInstall}>
                  <Download size={16} /> Download &amp; Install
                </button>
              </div>
            </>
          )}

          {status === "downloading" && (
            <div className="update-center">
              <p className="modal-lead">
                Downloading NoteX <b>{newVersion}</b>…
              </p>
              <div className="update-progress">
                <div
                  className={`update-progress-fill${total ? "" : " indeterminate"}`}
                  style={total ? { width: `${progress}%` } : undefined}
                />
              </div>
              <div className="update-progress-meta">
                {total ? (
                  <>
                    {progress}% · {formatBytes(downloaded)} / {formatBytes(total)}
                  </>
                ) : (
                  <>{formatBytes(downloaded)} downloaded…</>
                )}
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="update-center">
              <div className="update-badge ok">
                <Check size={26} />
              </div>
              <p className="modal-lead">
                NoteX <b>{newVersion}</b> has been installed. Restart to finish updating.
              </p>
              <div className="sec-actions">
                <button className="btn" onClick={closeWindow}>
                  Later
                </button>
                <button className="btn primary" onClick={restart}>
                  <RotateCw size={16} /> Restart now
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="update-center">
              <div className="update-badge err">
                <AlertTriangle size={24} />
              </div>
              <p className="modal-lead">Update failed.</p>
              {error && <div className="lock-error">{error}</div>}
              <div className="sec-actions">
                <button className="btn" onClick={closeWindow}>
                  Close
                </button>
                <button className="btn primary" onClick={() => runCheck()}>
                  <RefreshCw size={16} /> Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
