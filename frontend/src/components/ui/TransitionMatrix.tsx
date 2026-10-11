import type { CSSProperties } from "react";
import type { SeverityTier } from "../../services/types";

const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];

/**
 * AI severity (rows) against the Auditor's final severity (columns), Sprint 3
 * extras §1.2 widget 4. Every cell carries its number, so the shading is a
 * reading aid only. Agreement sits on a neutral diagonal; disagreement is
 * tinted blue, never red: it is evidence for the Manager, not an error, and
 * RCS doesn't say whether the AI or the Auditor was right.
 */
export function TransitionMatrix({ matrix }: { matrix: Record<SeverityTier, Record<SeverityTier, number>> }) {
  const offDiagonal = TIERS.flatMap((ai) => TIERS.filter((f) => f !== ai).map((f) => matrix[ai][f]));
  const max = Math.max(1, ...offDiagonal);
  return (
    <table className="rcs-matrix">
      <caption className="rcs-helper">
        AI severity (rows) against final Auditor severity (columns), decided cases
      </caption>
      <thead>
        <tr>
          <td className="rcs-matrix-corner" aria-hidden="true">
            AI ↓ Final →
          </td>
          {TIERS.map((tier) => (
            <th key={tier} scope="col">
              <span className="cds--visually-hidden">Final </span>
              {tier}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TIERS.map((ai) => (
          <tr key={ai}>
            <th scope="row">
              <span className="cds--visually-hidden">AI </span>
              {ai}
            </th>
            {TIERS.map((final) => {
              const count = matrix[ai][final];
              const agreement = ai === final;
              const style = agreement ? undefined : ({ "--rcs-share": count / max } as CSSProperties);
              return (
                <td
                  key={final}
                  className={agreement ? "rcs-matrix-cell rcs-matrix-agree" : "rcs-matrix-cell rcs-matrix-change"}
                  style={style}
                >
                  {count}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
