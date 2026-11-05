import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Format a timestamp into local 12-hour time (e.g., "10:30 AM")
 * If referenceDate is provided and the calendar days differ, includes date hint (e.g. "12:15 PM (05 Nov)")
 */
export const formatTicketTime = (dateValue, referenceDate = null) => {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '—';

  const timeStr = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (referenceDate) {
    const ref = new Date(referenceDate);
    if (!isNaN(ref.getTime()) && d.toDateString() !== ref.toDateString()) {
      const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${timeStr} (${datePart})`;
    }
  }

  return timeStr;
};

/**
 * Format seconds into readable duration:
 * e.g., "1h 45m", "45m", or "25s"
 */
export const formatDurationText = (seconds) => {
  const totalSecs = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return `${s}s`;
};

/**
 * Live duration for in-progress tickets
 * e.g., "01h 20m" or "01h 20m 15s"
 */
export const formatLiveDurationText = (startMs, currentMs, includeSeconds = true) => {
  const diffSecs = Math.max(0, Math.floor((currentMs - startMs) / 1000));
  const h = Math.floor(diffSecs / 3600);
  const m = Math.floor((diffSecs % 3600) / 60);
  const s = diffSecs % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (includeSeconds) {
    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  }
  return `${pad(h)}h ${pad(m)}m`;
};

/**
 * Shared TicketWorkingDuration Component
 * Renders Start Time, Stop Time, and Total Working Duration.
 * Supports active live ticking, completed tickets, and pending tickets.
 */
const TicketWorkingDuration = ({
  ticket,
  currentTime = Date.now(),
  compact = false,
  showSecondsInLive = true,
}) => {
  if (!ticket) {
    return <span className="text-muted small">—</span>;
  }

  const isRunning = ticket.status === 'In Progress' || ticket.status === 'IN_PROGRESS';
  const isCompleted =
    ticket.status === 'Completed' ||
    ticket.status === 'Resolved' ||
    ticket.status === 'RESOLVED';

  const startTime = ticket.startTime || ticket.startedAt;
  const stopTime = ticket.stopTime || ticket.stoppedAt;

  // 1. Pending / Unstarted ticket: NEVER show fabricated times
  if (!isRunning && !isCompleted && !startTime) {
    return (
      <span
        className="badge bg-light text-muted border fw-normal py-1 px-2 font-monospace"
        style={{ fontSize: '0.72rem' }}
        title="Service has not been started yet"
      >
        Not Started
      </span>
    );
  }

  const startLabel = compact ? 'Start:' : 'Started:';
  const stopLabel = compact ? 'Stop:' : 'Stopped:';

  // 2. Active / In-Progress ticket: live running timer
  if (isRunning && startTime) {
    const startMs = new Date(startTime).getTime();
    const liveText = formatLiveDurationText(startMs, currentTime, showSecondsInLive);

    return (
      <div
        className="working-duration-card d-flex flex-column gap-0.5"
        style={{ minWidth: compact ? '128px' : '142px', fontSize: '0.74rem' }}
      >
        {/* Start Time */}
        <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.71rem' }}>
          <span className="text-secondary fw-semibold">{startLabel}</span>
          <span className="font-monospace fw-bold text-dark">{formatTicketTime(startTime)}</span>
        </div>

        {/* Stop Time (Running / Not stopped) */}
        <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.71rem' }}>
          <span className="text-secondary fw-semibold">{stopLabel}</span>
          <span className="font-monospace fw-bold text-warning d-inline-flex align-items-center gap-1">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#F59E0B',
                display: 'inline-block',
                boxShadow: '0 0 5px #F59E0B',
              }}
            />
            {compact ? 'Running' : 'Not stopped'}
          </span>
        </div>

        {/* Live Total Duration */}
        <div className="d-flex align-items-center justify-content-between pt-1 mt-0.5 border-top" style={{ fontSize: '0.71rem' }}>
          <span className="text-secondary fw-semibold">Total:</span>
          <span className="badge bg-warning-subtle text-warning border border-warning font-monospace px-1.5 py-0.5">
            <Clock size={10} className="erp-spin me-1 text-warning" />
            {liveText}
          </span>
        </div>
      </div>
    );
  }

  // 3. Completed ticket: finalized timestamps and total duration
  if (isCompleted || stopTime) {
    let totalSecs = 0;
    if (ticket.totalWorkingSeconds) {
      totalSecs = ticket.totalWorkingSeconds;
    } else if (ticket.workingDuration?.durationMs) {
      totalSecs = Math.floor(ticket.workingDuration.durationMs / 1000);
    } else if (
      ticket.workingDuration?.totalHours !== undefined ||
      ticket.workingDuration?.totalMinutes !== undefined
    ) {
      totalSecs =
        (ticket.workingDuration.totalHours || 0) * 3600 +
        (ticket.workingDuration.totalMinutes || 0) * 60 +
        (ticket.workingDuration.totalSeconds || 0);
    } else if (startTime && stopTime) {
      totalSecs = Math.max(
        0,
        Math.floor((new Date(stopTime).getTime() - new Date(startTime).getTime()) / 1000)
      );
    }

    const durationText = formatDurationText(totalSecs);

    return (
      <div
        className="working-duration-card d-flex flex-column gap-0.5"
        style={{ minWidth: compact ? '128px' : '142px', fontSize: '0.74rem' }}
      >
        {/* Start Time */}
        <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.71rem' }}>
          <span className="text-secondary fw-semibold">{startLabel}</span>
          <span className="font-monospace fw-bold text-dark">{formatTicketTime(startTime)}</span>
        </div>

        {/* Stop Time */}
        <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.71rem' }}>
          <span className="text-secondary fw-semibold">{stopLabel}</span>
          <span className="font-monospace fw-bold text-dark">{formatTicketTime(stopTime, startTime)}</span>
        </div>

        {/* Total Working Duration */}
        <div className="d-flex align-items-center justify-content-between pt-1 mt-0.5 border-top" style={{ fontSize: '0.71rem' }}>
          <span className="text-secondary fw-semibold">Total:</span>
          <span className="badge bg-success-subtle text-success border border-success font-monospace px-1.5 py-0.5">
            {durationText}
          </span>
        </div>
      </div>
    );
  }

  // Fallback for safety
  return (
    <span className="badge bg-light text-muted border fw-normal py-1 px-2 font-monospace" style={{ fontSize: '0.72rem' }}>
      Not Started
    </span>
  );
};

export default TicketWorkingDuration;
