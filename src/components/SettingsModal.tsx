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
  DEFAULT_ACCENT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_NOTE_FONT,
  DEFAULT_NOTE_SIZE,
  DEFAULT_AI_MODEL,
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
  const aiApiKey = useStore((s) => s.settings.aiApiKey ?? "");
  const setAiApiKey = useStore((s) => s.setAiApiKey);
  const aiModel = useStore((s) => s.settings.aiModel ?? DEFAULT_AI_MODEL);
  const setAiModel = useStore((s) => s.setAiModel);

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
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  className={`accent-swatch${accent === a.id ? " active" : ""}`}
                  style={{ ["--sw" as any]: a.color }}
                  onClick={() => setAccent(a.id)}
                  title={a.label}
                  aria-label={a.label}
                >
                  {accent === a.id && <Check size={16} />}
                </button>
              ))}
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
              AI
            </div>
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
                <small>Used for image-to-notes</small>
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
              Bring your own key — stored locally, billed to your Anthropic account. Get one at
              console.anthropic.com. Enable vault encryption (shield icon) to protect it at rest.
            </p>
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
