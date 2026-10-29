import type { ReactNode } from "react";

export interface FormLayoutProps {
  /** The form itself. */
  children: ReactNode;
  /** Context beside the form: status, history, help. Sticks under the top bar from 80rem; stacks after the form below that. */
  aside?: ReactNode;
  className?: string;
}

/** A main column with an optional sticky side column. */
export function FormLayout({ children, aside, className = "" }: FormLayoutProps) {
  return (
    <div className={`console-form-layout ${aside ? "console-form-layout-aside" : ""} ${className}`}>
      <div className="min-w-0">{children}</div>
      {aside ? <aside className="console-form-aside">{aside}</aside> : null}
    </div>
  );
}
