import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
export function Navbar() {
  return (
    <header className="topbar">
      <div className="crumb">
        <span>Workspace</span>
        <span>/</span>
        <strong>Personal finances</strong>
      </div>
      <div className="topbar-actions">
        <button className="search-trigger">
          <Search size={15} /> Search <kbd>⌘ K</kbd>
        </button>
        <button className="icon-button notification" aria-label="Notifications">
          <Bell size={18} />
          <i />
        </button>
        <ThemeToggle />
        <div className="avatar top-avatar">PC</div>
      </div>
    </header>
  );
}
