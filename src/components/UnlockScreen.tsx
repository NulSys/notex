import { useEffect, useState, type FormEvent } from "react";
import { Lock, Fingerprint, Loader2 } from "lucide-react";
import { useStore } from "../store";
import { helloAvailable } from "../lib/hello";

export function UnlockScreen() {
  const unlockVault = useStore((s) => s.unlockVault);
  const unlockWithHello = useStore((s) => s.unlockWithHello);
  const header = useStore((s) => s.securityHeader);

  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [helloOk, setHelloOk] = useState(false);

  useEffect(() => {
    if (header?.hello) helloAvailable().then(setHelloOk);
  }, [header]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pass || busy) return;
    setBusy(true);
    setError("");
    const ok = await unlockVault(pass);
    setBusy(false);
    if (!ok) {
      setError("Incorrect passphrase. Try again.");
      setPass("");
    }
  };

  const tryHello = async () => {
    setBusy(true);
    setError("");
    const ok = await unlockWithHello();
    setBusy(false);
    if (!ok) setError("Windows Hello unlock failed or was cancelled.");
  };

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <div className="lock-badge">
          <Lock size={26} />
        </div>
        <h1>NoteX is locked</h1>
        <p>Enter your passphrase to decrypt your notes.</p>
        <form onSubmit={submit}>
          <input
            type="password"
            className="lock-input"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Passphrase"
            autoFocus
            spellCheck={false}
          />
          {error && <div className="lock-error">{error}</div>}
          <button type="submit" className="btn primary lock-submit" disabled={busy || !pass}>
            {busy ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
            Unlock
          </button>
        </form>
        {helloOk && (
          <button className="btn lock-hello" onClick={tryHello} disabled={busy}>
            <Fingerprint size={16} />
            Use Windows Hello
          </button>
        )}
      </div>
    </div>
  );
}
