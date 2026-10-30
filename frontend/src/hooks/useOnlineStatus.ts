import { useEffect } from "react";
import { useAppDispatch } from "@/app/hooks";
import { setOnline } from "@/features/ui/uiSlice";
export function useOnlineStatus() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const online = () => dispatch(setOnline(true));
    const offline = () => dispatch(setOnline(false));
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [dispatch]);
}
