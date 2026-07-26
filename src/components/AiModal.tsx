import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { Sparkles, X, ImagePlus, Loader2, AlertTriangle, Settings2 } from "lucide-react";
import { useStore } from "../store";
import { notesFromImage, imageMediaType } from "../lib/ai";
import { DEFAULT_AI_MODEL } from "../types";

type Img = { bytes: Uint8Array; mediaType: string; url: string; name: string };

export function AiModal() {
  const open = useStore((s) => s.aiOpen);
  const close = useStore((s) => s.closeAi);
  const apiKey = useStore((s) => s.settings.aiApiKey ?? "");
  const model = useStore((s) => s.settings.aiModel ?? DEFAULT_AI_MODEL);
  const createNote = useStore((s) => s.createNote);
  const openSettings = useStore((s) => s.openSettings);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [img, setImg] = useState<Img | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError("");
      setInstruction("");
      setImg(null);
    }
  }, [open]);

  // Revoke the object URL when the image changes or the modal unmounts.
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.url); }, [img]);

  if (!open) return null;

  const acceptFile = async (file: File | null | undefined) => {
    if (!file) return;
    const mt = imageMediaType(file.type);
    if (!mt) {
      setError("Unsupported image type — use PNG, JPEG, GIF, or WebP.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    setError("");
    setImg({ bytes, mediaType: mt, url: URL.createObjectURL(file), name: file.name || "pasted image" });
  };

  const onPaste = (e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      e.preventDefault();
      acceptFile(item.getAsFile());
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const generate = async () => {
    if (!img) return;
    setBusy(true);
    setError("");
    try {
      const md = await notesFromImage({
        apiKey,
        model,
        bytes: img.bytes,
        mediaType: img.mediaType,
        instruction: instruction.trim() || "Turn this image into clean, well-structured Markdown notes.",
      });
      createNote({ content: md, select: true });
      close();
    } catch (e) {
      setError(typeof e === "string" ? e : (e as Error)?.message ?? "Something went wrong.");
      setBusy(false);
    }
  };

  const goSettings = () => {
    close();
    openSettings();
  };

  return (
    <div className="overlay" onMouseDown={busy ? undefined : close}>
      <div className="modal ai-modal" onMouseDown={(e) => e.stopPropagation()} onPaste={onPaste}>
        <div className="modal-head">
          <div className="modal-title">
            <Sparkles size={18} />
            Notes from image
          </div>
          {!busy && (
            <button className="icon-btn" onClick={close}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="modal-body">
          {!apiKey ? (
            <div className="ai-center">
              <div className="update-badge err">
                <AlertTriangle size={22} />
              </div>
              <p className="modal-lead">
                Add your Anthropic API key to use AI features. Your key is stored locally and used
                only for your own requests.
              </p>
              <button className="btn primary" onClick={goSettings}>
                <Settings2 size={15} /> Open Settings
              </button>
            </div>
          ) : (
            <>
              <div
                className={`ai-drop${img ? " has" : ""}`}
                onClick={() => !img && fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                {img ? (
                  <img src={img.url} alt="preview" className="ai-preview" />
                ) : (
                  <div className="ai-drop-inner">
                    <ImagePlus size={26} />
                    <div>Click to choose, drop, or paste an image</div>
                    <small>PNG, JPEG, GIF, or WebP · a whiteboard, note, slide, or document</small>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                />
              </div>
              {img && (
                <button className="ai-change" onClick={() => fileRef.current?.click()}>
                  Choose a different image
                </button>
              )}

              <label className="field">
                <span>Focus / instructions (optional)</span>
                <input
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g. summarize the key points, or transcribe exactly"
                  spellCheck={false}
                />
              </label>

              {error && <div className="lock-error">{error}</div>}

              <div className="sec-actions">
                <button className="btn" onClick={close} disabled={busy}>
                  Cancel
                </button>
                <button className="btn primary" onClick={generate} disabled={!img || busy}>
                  {busy ? (
                    <>
                      <Loader2 size={16} className="spin" /> Reading image…
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Generate notes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
