export type BackendStatus = "checking" | "waking" | "online" | "offline";

const LABEL: Record<BackendStatus, string> = {
  checking: "Connecting…",
  waking: "Server waking up…",
  online: "Server online",
  offline: "Server offline",
};

/**
 * docs/ui-spec.md section 2.1: checking and waking read as --run (in motion,
 * not yet real), online as --pass, offline as --fail.
 */
const STATE_CLASS: Record<BackendStatus, string> = {
  checking: "run",
  waking: "run",
  online: "pass",
  offline: "fail",
};

export function StatusPill({ status }: { status: BackendStatus }) {
  return (
    <div className={`status-pill ${STATE_CLASS[status]}`} role="status">
      <i aria-hidden="true" />
      {LABEL[status]}
    </div>
  );
}
