import { useEffect, useState } from "react";
import { Settings2, X, Sun, Moon, MonitorSmartphone, RefreshCw, Check } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useStore } from "../store";
import { useUpdater } from "../lib/updater";
import { formatDate, formatTime } from "../lib/time";
import {
  ACCENTS,
  DATE_FORMATS,
  TIME_FORMATS,
  DEFAULT_ACCENT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  type DateFormat,
  type TimeFormat,
  type ThemeMode,
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
