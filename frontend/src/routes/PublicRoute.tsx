import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
export function PublicRoute() {
  const user = useAppSelector((s) => s.auth.user);
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
