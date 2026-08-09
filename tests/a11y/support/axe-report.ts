import type { Result } from "axe-core";

/**
 * Turns a raw axe violation list into a message a person can act on without
 * re-running anything: which rule, how bad, and exactly which element on the
 * page. Playwright prints `expect` failure messages verbatim, so this is
 * what actually shows up in a red test.
 */
export function formatViolations(routeLabel: string, violations: Result[]): string {
  const lines = violations.map((violation) => {
    const targets = violation.nodes
      .map((node) => `      - ${node.target.join(" ")}${node.failureSummary ? `\n        ${node.failureSummary.replace(/\n/g, "\n        ")}` : ""}`)
      .join("\n");
    return (
      `  [${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}\n` +
      `    ${violation.helpUrl}\n` +
      `${targets}`
    );
  });
  return `${routeLabel}\n${lines.join("\n")}`;
}
