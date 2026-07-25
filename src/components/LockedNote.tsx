import { useEffect, useState, type FormEvent } from "react";
import { Lock, Fingerprint, Loader2 } from "lucide-react";
import { useStore } from "../store";
import { hasMasterKey } from "../lib/crypto";
import { helloAvailable } from "../lib/hello";

export function LockedNote({ noteId }: { noteId: string }) {
  const unlockNote = useStore((s) => s.unlockNote);
  const unlockWithHello = useStore((s) => s.unlockWithHello);
  const hasHello = useStore((s) => !!s.settings.security?.helloBlob);

  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [helloOk, setHelloOk] = useState(false);
  const keyReady = hasMasterKey();

  useEffect(() => {
    if (hasHello) helloAvailable().then(setHelloOk);
  }, [hasHello]);

  const doUnlock = async (passphrase?: string) => {
    setBusy(true);
    setError("");
    const ok = await unlockNote(noteId, passphrase);
    setBusy(false);
    if (!ok) setError("Couldn't unlock. Check your passphrase.");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (keyReady) doUnlock();
    else if (pass) doUnlock(pass);
  };

  const onHello = async () => {
    setBusy(true);
    setError("");
    const ok = await unlockWithHello();
    if (ok) await unlockNote(noteId);
    else setError("Windows Hello unlock failed or was cancelled.");
    setBusy(false);
  };

  return (
    <div className="editor-main">
      <div className="locked-note">
        <div className="lock-badge">
          <Lock size={26} />
        </div>
        <h2>This note is locked</h2>
        <p>{keyReady ? "Unlock to read and edit it." : "Enter your passphrase to unlock it."}</p>
        <form onSubmit={onSubmit}>
          {!keyReady && (
            <input
              type="password"
              className="lock-input"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Passphrase"
              autoFocus
              spellCheck={false}
            />
          )}
          {error && <div className="lock-error">{error}</div>}
          <button type="submit" className="btn primary lock-submit" disabled={busy || (!keyReady && !pass)}>
            {busy ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
            Unlock note
          </button>
        </form>
        {helloOk && !keyReady && (
          <button className="btn lock-hello" onClick={onHello} disabled={busy}>
            <Fingerprint size={16} />
            Use Windows Hello
          </button>
        )}
      </div>
    </div>
  );
}
