import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { runSync } from "@/features/sync/syncSlice";

export function useAutoSync(): void {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);
  const online = useAppSelector((state) => state.ui.isOnline);
  const syncing = useAppSelector((state) => state.sync.syncing);
  const pendingCount = useAppSelector(
    (state) =>
      state.budget.records.filter((record) => record.syncStatus !== "synced")
        .length,
  );

  useEffect(() => {
    if (!online || !user || !token || syncing || pendingCount === 0) return;
    const timer = window.setTimeout(() => {
      void dispatch(runSync(user.id));
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [dispatch, online, pendingCount, syncing, token, user]);
}
