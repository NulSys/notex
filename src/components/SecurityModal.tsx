import { useEffect, useState } from "react";
import { ShieldCheck, X, Lock, Fingerprint, KeyRound, Loader2, Check } from "lucide-react";
import { useStore } from "../store";
import { helloAvailable } from "../lib/hello";

export function SecurityModal() {
  const open = useStore((s) => s.securityOpen);
  const close = useStore((s) => s.closeSecurity);
  const security = useStore((s) => s.settings.security);
  const setupPassphrase = useStore((s) => s.setupPassphrase);
  const removePassphrase = useStore((s) => s.removePassphrase);
  const setVaultEncryption = useStore((s) => s.setVaultEncryption);
  const setAutoLock = useStore((s) => s.setAutoLock);
  const enableHello = useStore((s) => s.enableHello);
  const disableHello = useStore((s) => s.disableHello);
  const lockSession = useStore((s) => s.lockSession);

  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [encryptVault, setEncryptVault] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [helloOk, setHelloOk] = useState(false);

  useEffect(() => {
    if (open) {
      setPass("");
      setConfirm("");
      setError("");
      setEncryptVault(true);
      helloAvailable().then(setHelloOk);
    }
  }, [open]);

  if (!open) return null;

  const onSetup = async () => {
    if (pass.length < 6) return setError("Use at least 6 characters.");
    if (pass !== confirm) return setError("Passphrases don't match.");
    setBusy(true);
    await setupPassphrase(pass, encryptVault);
    setBusy(false);
    setPass("");
    setConfirm("");
  };

  const onRemove = async () => {
    const p = prompt("Enter your passphrase to remove encryption:");
    if (!p) return;
    setBusy(true);
    const ok = await removePassphrase(p);
    setBusy(false);
    if (!ok) setError("Incorrect passphrase.");
  };

  const onToggleHello = async () => {
    setBusy(true);
    setError("");
    if (security?.helloBlob) {
      disableHello();
    } else {
      const ok = await enableHello();
      if (!ok) setError("Couldn't set up Windows Hello.");
    }
    setBusy(false);
  };

  return (
    <div className="overlay" onMouseDown={close}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <ShieldCheck size={18} />
            Security &amp; Encryption
          </div>
          <button className="icon-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {!security ? (
            <>
              <p className="modal-lead">
                Protect your notes with a passphrase. NoteX encrypts them with{" "}
                <b>AES-256-GCM</b>; the key is derived from your passphrase and never leaves this
                device. <b>There is no recovery if you forget it.</b>
              </p>
              <label className="field">
                <span>Passphrase</span>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="At least 6 characters"
                  spellCheck={false}
                />
              </label>
              <label className="field">
                <span>Confirm passphrase</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={encryptVault}
                  onChange={(e) => setEncryptVault(e.target.checked)}
                />
                <span>
                  Encrypt the entire vault at rest (recommended). If off, you can still lock
                  individual notes.
                </span>
              </label>
              {error && <div className="lock-error">{error}</div>}
              <button className="btn primary" onClick={onSetup} disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
                Enable encryption
              </button>
            </>
          ) : (
            <>
              <div className="sec-status">
                <Check size={16} /> Passphrase encryption is on.
              </div>

              <label className="row-toggle">
                <div>
                  <b>Encrypt entire vault at rest</b>
                  <small>Everything on disk is unreadable without your passphrase.</small>
                </div>
                <input
                  type="checkbox"
                  checked={security.vaultEncrypted}
                  onChange={(e) => setVaultEncryption(e.target.checked)}
                />
              </label>

              <label className="row-toggle">
                <div>
                  <b>
                    <Fingerprint size={14} /> Windows Hello unlock
                  </b>
                  <small>
                    {helloOk
                      ? "Unlock with fingerprint, face, or PIN instead of typing."
                      : "Not available on this device."}
                  </small>
                </div>
                <input
                  type="checkbox"
                  checked={!!security.helloBlob}
                  disabled={!helloOk || busy}
                  onChange={onToggleHello}
                />
              </label>

              <label className="row-toggle">
                <div>
                  <b>Auto-lock when idle</b>
                  <small>Clear the key from memory after inactivity.</small>
                </div>
                <select
                  value={security.autoLockMinutes}
                  onChange={(e) => setAutoLock(Number(e.target.value))}
                >
                  <option value={0}>Never</option>
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </label>

              {error && <div className="lock-error">{error}</div>}

              <div className="sec-actions">
                {security.vaultEncrypted && (
                  <button
                    className="btn"
                    onClick={() => {
                      lockSession();
                      close();
                    }}
                  >
                    <Lock size={15} /> Lock now
                  </button>
                )}
                <button className="btn danger-outline" onClick={onRemove} disabled={busy}>
                  Remove encryption
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
