import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useStore } from "../store";
import { formatDate, formatTime, timeHasSeconds } from "../lib/time";
import { DEFAULT_DATE_FORMAT, DEFAULT_TIME_FORMAT } from "../types";

/** Live current date + time shown in the editor footer, formatted per settings. */
export function FooterClock() {
  const dateFormat = useStore((s) => s.settings.dateFormat ?? DEFAULT_DATE_FORMAT);
  const timeFormat = useStore((s) => s.settings.timeFormat ?? DEFAULT_TIME_FORMAT);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Tick every second when seconds are shown, otherwise every 15s is plenty.
    const period = timeHasSeconds(timeFormat) ? 1000 : 15000;
    const id = setInterval(() => setNow(new Date()), period);
    return () => clearInterval(id);
  }, [timeFormat]);

  return (
    <span className="footer-clock" title="Current date and time">
      <CalendarClock size={13} />
      {formatDate(now, dateFormat)} · {formatTime(now, timeFormat)}
    </span>
  );
}
