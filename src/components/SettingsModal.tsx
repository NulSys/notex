import { useEffect, useState } from "react";
import { Settings2, X, Sun, Moon, MonitorSmartphone, RefreshCw, Check, Palette, Sparkles } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useStore } from "../store";
import { useUpdater } from "../lib/updater";
import { formatDate, formatTime } from "../lib/time";
import {
  ACCENTS,
  DATE_FORMATS,
  TIME_FORMATS,
  NOTE_FONTS,
  NOTE_SIZES,
  TEXT_COLORS,
  AI_MODELS,
  AI_PROVIDERS,
  DEFAULT_ACCENT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_NOTE_FONT,
  DEFAULT_NOTE_SIZE,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  type DateFormat,
  type TimeFormat,
  type ThemeMode,
  type NoteFont,
  type NoteSize,
} from "../types";

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: MonitorSmartphone },
];

export function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const close = useStore((s) => s.closeSettings);
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);
  const accent = useStore((s) => s.settings.accent ?? DEFAULT_ACCENT);
  const setAccent = useStore((s) => s.setAccent);
  const customAccent = useStore((s) => s.settings.customAccent);
  const setCustomAccent = useStore((s) => s.setCustomAccent);
  const dateFormat = useStore((s) => s.settings.dateFormat ?? DEFAULT_DATE_FORMAT);
  const setDateFormat = useStore((s) => s.setDateFormat);
  const timeFormat = useStore((s) => s.settings.timeFormat ?? DEFAULT_TIME_FORMAT);
  const setTimeFormat = useStore((s) => s.setTimeFormat);
  const noteFont = useStore((s) => s.settings.noteFont ?? DEFAULT_NOTE_FONT);
  const setNoteFont = useStore((s) => s.setNoteFont);
  const noteSize = useStore((s) => s.settings.noteSize ?? DEFAULT_NOTE_SIZE);
  const setNoteSize = useStore((s) => s.setNoteSize);
  const textColor = useStore((s) => s.settings.textColor);
  const setTextColor = useStore((s) => s.setTextColor);
  const isPresetColor = TEXT_COLORS.some((c) => c.color === (textColor ?? null));
  const aiProvider = useStore((s) => s.settings.aiProvider ?? DEFAULT_AI_PROVIDER);
  const setAiProvider = useStore((s) => s.setAiProvider);
  const aiApiKey = useStore((s) => s.settings.aiApiKey ?? "");
  const setAiApiKey = useStore((s) => s.setAiApiKey);
  const aiModel = useStore((s) => s.settings.aiModel ?? DEFAULT_AI_MODEL);
  const setAiModel = useStore((s) => s.setAiModel);
  const geminiApiKey = useStore((s) => s.settings.geminiApiKey ?? "");
  const setGeminiApiKey = useStore((s) => s.setGeminiApiKey);
  const geminiModel = useStore((s) => s.settings.geminiModel ?? "");
  const setGeminiModel = useStore((s) => s.setGeminiModel);
  const ollamaModel = useStore((s) => s.settings.ollamaModel ?? "");
  const setOllamaModel = useStore((s) => s.setOllamaModel);
  const ollamaUrl = useStore((s) => s.settings.ollamaUrl ?? "");
  const setOllamaUrl = useStore((s) => s.setOllamaUrl);

  const runCheck = useUpdater((s) => s.runCheck);
  const updateStatus = useUpdater((s) => s.status);

  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => {});
  }, []);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={close}>
      <div className="modal settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <Settings2 size={18} />
            Settings
          </div>
          <button className="icon-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <div className="settings-label">Theme</div>
            <div className="theme-seg">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`theme-seg-btn${theme === id ? " active" : ""}`}
                  onClick={() => setTheme(id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-label">Accent color</div>
            <div className="accent-grid">
              {ACCENTS.map((a) => {
                const active = !customAccent && accent === a.id;
                return (
                  <button
                    key={a.id}
                    className={`accent-swatch${active ? " active" : ""}`}
                    style={{ ["--sw" as any]: a.color }}
                    onClick={() => setAccent(a.id)}
                    title={a.label}
                    aria-label={a.label}
                  >
                    {active && <Check size={16} />}
                  </button>
                );
              })}
              <label
                className={`accent-swatch custom-swatch${customAccent ? " active" : ""}`}
                style={{ ["--sw" as any]: customAccent || "var(--surface-hover)" }}
                title="Custom accent color"
              >
                <Palette size={14} />
                <input
                  type="color"
                  value={customAccent || "#6d5efc"}
                  onChange={(e) => setCustomAccent(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-label">Text</div>
            <label className="row-toggle">
              <div>
                <b>Font</b>
                <small>Editor &amp; preview typeface</small>
              </div>
              <select value={noteFont} onChange={(e) => setNoteFont(e.target.value as NoteFont)}>
                {NOTE_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="row-toggle">
              <div>
                <b>Text size</b>
                <small>Size of note text</small>
              </div>
              <select value={noteSize} onChange={(e) => setNoteSize(e.target.value as NoteSize)}>
                {NOTE_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="settings-sub-label">Text color</div>
            <div className="accent-grid">
              {TEXT_COLORS.map((c) => {
                const active = (textColor ?? null) === c.color;
                return (
                  <button
                    key={c.id}
                    className={`accent-swatch${active ? " active" : ""}`}
                    style={{ ["--sw" as any]: c.color ?? "var(--text)" }}
                    onClick={() => setTextColor(c.color ?? undefined)}
                    title={c.label}
                    aria-label={c.label}
                  >
                    {active && <Check size={16} />}
                  </button>
                );
              })}
              <label
                className={`accent-swatch custom-swatch${!isPresetColor && textColor ? " active" : ""}`}
                style={{ ["--sw" as any]: textColor && !isPresetColor ? textColor : "var(--surface-hover)" }}
                title="Custom color"
              >
                <Palette size={14} />
                <input
                  type="color"
                  value={textColor && !isPresetColor ? textColor : "#3b82f6"}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-label">Date &amp; time</div>
            <label className="row-toggle">
              <div>
                <b>Date format</b>
                <small>{formatDate(new Date(), dateFormat)}</small>
              </div>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormat)}
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="row-toggle">
              <div>
                <b>Time format</b>
                <small>{formatTime(new Date(), timeFormat)}</small>
              </div>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
              >
                {TIME_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="settings-section">
            <div className="settings-label">
              <Sparkles size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
              AI · Notes from image
            </div>
            <label className="row-toggle">
              <div>
                <b>Provider</b>
                <small>Where image-to-notes runs</small>
              </div>
              <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                {AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            {aiProvider === "anthropic" && (
              <>
                <label className="field">
                  <span>Anthropic API key</span>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-ant-…"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <label className="row-toggle">
                  <div>
                    <b>Model</b>
                  </div>
                  <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                    {AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="settings-hint">
                  Paid — billed to your Anthropic account. Get a key at console.anthropic.com. Best
                  accuracy, especially on handwriting.
                </p>
              </>
            )}

            {aiProvider === "ollama" && (
              <>
                <label className="field">
                  <span>Model</span>
                  <input
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder={DEFAULT_OLLAMA_MODEL}
                    spellCheck={false}
                  />
                </label>
                <label className="field">
                  <span>Server URL</span>
                  <input
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder={DEFAULT_OLLAMA_URL}
                    spellCheck={false}
                  />
                </label>
                <p className="settings-hint">
                  Free &amp; offline. Install Ollama (ollama.com), then pull a vision model:{" "}
                  <code>ollama pull llama3.2-vision</code> (or <code>llava</code>,{" "}
                  <code>moondream</code>). No key needed. Quality is lower than Claude and needs a
                  capable machine.
                </p>
              </>
            )}

            {aiProvider === "gemini" && (
              <>
                <label className="field">
                  <span>Google Gemini API key</span>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIza…"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <label className="field">
                  <span>Model</span>
                  <input
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    placeholder={DEFAULT_GEMINI_MODEL}
                    spellCheck={false}
                  />
                </label>
                <p className="settings-hint">
                  Free tier with daily limits. Get a key at aistudio.google.com. Try{" "}
                  <code>gemini-1.5-flash</code> or <code>gemini-2.0-flash</code>. Images are sent to
                  Google.
                </p>
              </>
            )}
          </div>

          <div className="settings-section">
            <div className="settings-label">Updates</div>
            <div className="row-toggle">
              <div>
                <b>NoteX{version ? ` ${version}` : ""}</b>
                <small>Check GitHub for a newer version.</small>
              </div>
              <button
                className="btn"
                onClick={() => runCheck()}
                disabled={updateStatus === "checking"}
              >
                <RefreshCw size={15} className={updateStatus === "checking" ? "spin" : ""} />
                Check for updates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
