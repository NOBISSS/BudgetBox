import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { OfflineBanner } from "@/components/common/OfflineBanner";
export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <OfflineBanner />
        <Navbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
