import type { ReactNode } from "react";
export function PreferenceRow({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="preference-row">
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
      {children}
    </div>
  );
}
