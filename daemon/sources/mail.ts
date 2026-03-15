/**
 * Mail source — polls unread count per account, shows mail screen on new mail.
 * Accounts and schedule from config.yaml sources.mail.accounts.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";
import { sourceConfig, inSchedule, type AccountConfig } from "../config";

export const mailSource: EventSource = ({ show }) => {
  const cfg = sourceConfig("mail");
  const accounts: AccountConfig[] = cfg.accounts ?? [{ email: "", query: cfg.query ?? "is:unread in:inbox" }];
  const pollMs = (cfg.poll ?? 120) * 1000;
  const lastUnread = new Map<string, number>();

  function poll() {
    for (const acc of accounts) {
      if (!inSchedule(acc)) continue;
      try {
        const email = acc.email ?? "";
        const query = acc.query ?? cfg.query ?? "is:unread in:inbox";
        const accountFlag = email ? `-a ${email}` : "";
        const raw = execSync(
          `gog gmail list '${query}' --max 1 ${accountFlag} -j --results-only --no-input`,
          { timeout: 15_000 },
        ).toString();
        const threads = JSON.parse(raw);
        const unread = Array.isArray(threads) ? threads.length : 0;
        const prev = lastUnread.get(email) ?? -1;

        if (unread > 0 && unread > prev && prev >= 0) {
          show({ name: "mail", params: { arg0: email } });
        }
        lastUnread.set(email, unread);
      } catch { /* ignore */ }
    }
  }

  const timer = setInterval(poll, pollMs);
  poll();
  return () => clearInterval(timer);
};
