import Form from "next/form";
import type { ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";

export interface ToolbarProps {
  /** Usually a `SearchField`. */
  search?: ReactNode;
  /** `FilterChips`, selects, anything that narrows the list. */
  filters?: ReactNode;
  /** Buttons pushed to the end of the row. */
  actions?: ReactNode;
  className?: string;
}

/** The row above a list: search, filters and actions, wrapping on a narrow screen. */
export function Toolbar({ search, filters, actions, className = "" }: ToolbarProps) {
  return (
    <div className={`console-toolbar ${className}`}>
      {search ? <div className="console-toolbar-search">{search}</div> : null}
      {filters ? <div className="console-toolbar-filters">{filters}</div> : null}
      {actions ? <div className="console-toolbar-actions">{actions}</div> : null}
    </div>
  );
}

export interface SearchFieldProps {
  /** Accessible name of the field and landmark, e.g. "Search news". */
  label: string;
  /** Text of the submit button, e.g. "Search". */
  submitLabel: string;
  /** Query-string name. Defaults to `q`. */
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  /** Other query parameters to keep when searching (a status filter, say). */
  hidden?: Record<string, string>;
  /** Where the form goes. Defaults to the current page. */
  action?: string;
}

/** A GET search form, so it works without JavaScript and the result is a shareable URL. */
export function SearchField({ label, submitLabel, name = "q", defaultValue, placeholder, hidden, action }: SearchFieldProps) {
  return (
    <Form role="search" action={action ?? ""} aria-label={label} className="console-search-field">
      {Object.entries(hidden ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <ConsoleIcon name="search" className="console-search-field-icon" />
      <input type="search" name={name} defaultValue={defaultValue} placeholder={placeholder} aria-label={label} autoComplete="off" className="console-search-field-input" />
      <button type="submit" className="console-search-field-button">
        {submitLabel}
      </button>
    </Form>
  );
}
