import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { router } from "@/app/router";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setUser } from "@/features/auth/authSlice";
import { clearLocalSession } from "@/features/auth/authService";
import { dismissSyncConflict } from "@/features/sync/syncSlice";
import {
  setModal,
  setModalPayload,
  tickRateLimit,
} from "@/features/ui/uiSlice";
import { Button, Dialog } from "@/components/ui/primitives";

export default function App() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.settings.theme);
  const modal = useAppSelector((state) => state.ui.openModal);
  const retryAfter = useAppSelector((state) => state.ui.rateLimitSeconds);
  const conflicts = useAppSelector((state) => state.ui.modalPayload);

  useEffect(() => {
    if (modal !== "rate-limit" || retryAfter <= 0) return;
    const timer = window.setInterval(() => dispatch(tickRateLimit()), 1000);
    return () => window.clearInterval(timer);
  }, [dispatch, modal, retryAfter]);

  const signInAgain = async () => {
    await clearLocalSession();
    dispatch(setUser(null));
    window.location.assign("/login");
  };
  const closeConflict = () => {
    dispatch(setModal(""));
    dispatch(setModalPayload([]));
    dispatch(dismissSyncConflict());
  };

  return (
    <>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster position="bottom-right" theme={theme} richColors />
      <Dialog
        open={modal === "session-expired"}
        title="Your session expired"
        onClose={() => dispatch(setModal(""))}
      >
        <p>
          Please sign in again to continue. Your local budgets remain saved on
          this device.
        </p>
        <div className="ui-dialog-actions">
          <Button onClick={() => void signInAgain()}>Sign in again</Button>
        </div>
      </Dialog>
      <Dialog
        open={modal === "rate-limit"}
        title="Too many attempts"
        onClose={() => dispatch(setModal(""))}
      >
        <p>
          Try again in <b>{retryAfter}</b> seconds.
        </p>
        <div className="ui-dialog-actions">
          <Button variant="outline" onClick={() => dispatch(setModal(""))}>
            Close
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={modal === "sync-conflict"}
        title="Sync conflict"
        onClose={closeConflict}
      >
        <p>
          The server had a newer version. Kept the latest edit
          (last-write-wins).
        </p>
        {conflicts.length > 0 && (
          <ul>
            {conflicts.map((month) => (
              <li key={month}>{month}</li>
            ))}
          </ul>
        )}
        <div className="ui-dialog-actions">
          <Button onClick={closeConflict}>Got it</Button>
        </div>
      </Dialog>
    </>
  );
}
