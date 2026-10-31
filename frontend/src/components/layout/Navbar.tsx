import { Bell, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import { ThemeToggle } from "@/components/common/ThemeToggle";
export function Navbar() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const pendingCount = useAppSelector(
    (state) =>
      state.budget.records.filter((record) => record.syncStatus !== "synced")
        .length,
  );
  const isOnline = useAppSelector((state) => state.ui.isOnline);
  const initials = (user?.name ?? "P")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="crumb">
        <span>Workspace</span>
        <span>/</span>
        <strong>Personal finances</strong>
      </div>
      <div className="topbar-actions">
        <button
          className="search-trigger"
          type="button"
          aria-label="Search budget history"
          onClick={() => navigate("/history")}
        >
          <Search size={15} /> Search <kbd>⌘ K</kbd>
        </button>
        <button
          className="icon-button notification"
          type="button"
          aria-label="Sync notifications"
          onClick={() => {
            if (!isOnline) {
              toast.info(
                "You’re offline. Your edits are saved on this device.",
              );
            } else if (pendingCount > 0) {
              toast.info(
                `${pendingCount} change${pendingCount === 1 ? "" : "s"} waiting to sync.`,
              );
            } else {
              toast.success("All changes are synced.");
            }
          }}
        >
          <Bell size={18} />
          {pendingCount > 0 && <i />}
        </button>
        <ThemeToggle />
        <Link
          className="avatar top-avatar"
          to="/settings"
          aria-label="Open account settings"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
