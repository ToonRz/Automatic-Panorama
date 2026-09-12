export type BackendStatus = "checking" | "waking" | "online" | "offline";

const LABEL: Record<BackendStatus, string> = {
  checking: "Checking backend…",
  waking: "Backend waking · Render free tier",
  online: "Backend online · Render",
  offline: "Backend offline",
};

export function StatusPill({ status }: { status: BackendStatus }) {
  return (
    <div className={`status-pill ${status}`} role="status">
      <i aria-hidden="true" />
      {LABEL[status]}
    </div>
  );
}
