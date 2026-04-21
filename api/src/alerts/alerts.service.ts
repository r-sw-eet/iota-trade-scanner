import { Injectable, Logger } from '@nestjs/common';

/**
 * Transactional email alerts for operational events that need a human in the
 * loop — starting with capture-duration threshold crossings from the
 * `EcosystemService` 2h cron. Brevo-backed (formerly Sendinblue); env-gated
 * so deploys without a configured `BREVO_API_KEY` silently no-op (emails
 * stay off by default — safe for local dev and pre-configuration staging).
 *
 * Required environment for activation:
 *   - `BREVO_API_KEY`    — secret from https://app.brevo.com
 *   - `ALERT_EMAIL_TO`   — recipient; defaults to the project owner's address
 *   - `ALERT_EMAIL_FROM` — sender; defaults to `alerts@iota-trade-scanner.net`
 *     (must be a verified domain in Brevo, or Brevo rejects the send)
 *
 * Dedup: keeps a per-level timestamp in-memory and skips sends that fire
 * again within `DEDUP_WINDOW_MS`. Prevents a persistently-slow capture from
 * pinging the inbox every 2h — first alarm wakes you up, subsequent ones
 * would just be noise until something changes. Cleared by process restart.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly lastSentAt = new Map<string, number>();

  private static readonly DEDUP_WINDOW_MS = 4 * 60 * 60 * 1000; // 4h
  private static readonly BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

  /**
   * Send a capture-duration alarm email. `level` controls subject prefix +
   * dedup bucket (each level dedups independently so the first alarm and
   * the first critical still both get through). `message` is the full log
   * line that would have gone to `logger.error` — use it verbatim in the
   * email body so the recipient can correlate with logs without context-
   * switching.
   *
   * No-op when `BREVO_API_KEY` is unset. No-op if the same level fired
   * within `DEDUP_WINDOW_MS`.
   */
  async notifyCaptureAlarm(level: 'alarm' | 'critical', message: string): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      this.logger.debug(`[${level}] alert suppressed — BREVO_API_KEY not set`);
      return;
    }

    const now = Date.now();
    const lastAt = this.lastSentAt.get(level);
    if (lastAt && now - lastAt < AlertsService.DEDUP_WINDOW_MS) {
      this.logger.debug(
        `[${level}] alert deduped — last sent ${Math.round((now - lastAt) / 60000)}min ago (window ${AlertsService.DEDUP_WINDOW_MS / 60000}min)`,
      );
      return;
    }

    const to = process.env.ALERT_EMAIL_TO ?? 'suess.ralf@posteo.de';
    const from = process.env.ALERT_EMAIL_FROM ?? 'alerts@iota-trade-scanner.net';
    const subjectPrefix = level === 'critical' ? '[CRITICAL]' : '[ALARM]';

    const payload = {
      sender: { name: 'iota-trade-scanner', email: from },
      to: [{ email: to }],
      subject: `${subjectPrefix} capture duration threshold crossed`,
      textContent: message,
      htmlContent:
        `<p><strong>${subjectPrefix} capture duration threshold crossed</strong></p>` +
        `<pre style="font-family: monospace; background: #f4f4f5; padding: 12px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(message)}</pre>` +
        `<p style="font-size: 12px; color: #71717a;">Sent by the iota-trade-scanner API. See <code>plans/plan_tx_count.md § capture wall-clock alarm</code> for threshold definitions.</p>`,
    };

    try {
      const res = await fetch(AlertsService.BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Brevo send failed (${res.status}): ${body.slice(0, 400)}`);
        return;
      }
      this.lastSentAt.set(level, now);
      this.logger.log(`[${level}] alert email sent to ${to}`);
    } catch (e) {
      this.logger.error(`Brevo send threw: ${(e as Error).message}`);
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
