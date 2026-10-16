import { Icon } from "./Icon";

export function EmergencyNotice() {
  return (
    <aside
      role="alert"
      aria-label="Emergency safety notice"
      className="nb-surface rounded-xl2 border-alert/50 bg-alert/10 p-3 text-center"
    >
      <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-alert">
        <Icon name="alert" size={16} />
        For emergencies, call 919 / 911 — this app is not an emergency service.
      </p>
    </aside>
  );
}
