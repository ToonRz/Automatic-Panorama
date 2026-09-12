export type BackendStatus = "checking" | "waking" | "online" | "offline";

const LABEL: Record<BackendStatus, string> = {
  checking: "Connecting…",
  waking: "Server waking up…",
  online: "Server online",
  offline: "Server offline",
};

export function StatusPill({ status }: { status: BackendStatus }) {
  return (
    <div className={`status-pill ${status}`} role="status">
      <i aria-hidden="true" />
      {LABEL[status]}
    </div>
  );
}
