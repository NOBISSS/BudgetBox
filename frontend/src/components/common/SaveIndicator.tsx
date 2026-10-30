import { Check, LoaderCircle } from "lucide-react";
export function SaveIndicator({ saving }: { saving: boolean }) {
  return (
    <span className="save-indicator">
      {saving ? (
        <>
          <LoaderCircle className="spin" size={14} /> Saving…
        </>
      ) : (
        <>
          <Check size={14} /> Saved locally
        </>
      )}
    </span>
  );
}
