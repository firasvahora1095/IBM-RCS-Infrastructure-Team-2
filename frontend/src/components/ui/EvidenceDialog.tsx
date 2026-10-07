import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Button,
  ComposedModal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import type { MetricEvidence } from "../../services/types";
import { KeyValueList } from "./Blocks";
import { formatShortDateTime } from "../../utils/formatPeriod";
import { EVIDENCE_RULE } from "../../design-tokens/intelligenceLabels";

interface EvidenceDialogProps {
  open: boolean;
  onClose: () => void;
  evidence: MetricEvidence | null;
  /** The figure as shown on the dashboard, e.g. "142" or "13.4%". */
  value: string;
  organisation: string;
  period: string;
  /** Optional detail that belongs with this figure, e.g. the Open cases breakdown. */
  children?: ReactNode;
}

/**
 * "View evidence" for a dashboard figure (Sprint 3 extras §1.4): what it
 * counts, which stored fields it reads, how many records it included and
 * which cases they were. The same evidence model feeds the client report.
 */
export function EvidenceDialog({ open, onClose, evidence, value, organisation, period, children }: EvidenceDialogProps) {
  if (!evidence) return null;
  const included =
    evidence.records_eligible === null
      ? String(evidence.records_included)
      : `${evidence.records_included} of ${evidence.records_eligible} eligible`;
  return (
    <ComposedModal open={open} onClose={onClose} size="md" preventCloseOnClickOutside={false}>
      <ModalHeader label="Evidence" title={`${evidence.title}: ${value}`} />
      <ModalBody hasScrollingContent aria-label={`How ${evidence.title.toLowerCase()} is calculated`}>
        <div className="flex flex-col gap-6">
          <KeyValueList
            mono={["Source fields"]}
            items={[
              { label: "Organisation", value: organisation },
              { label: "Period", value: period },
              { label: "Definition", value: evidence.definition },
              {
                label: "Source fields",
                value: (
                  <ul className="rcs-evidence-fields">
                    {evidence.source_fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                ),
              },
              { label: "Records included", value: included },
              { label: "Last calculated", value: formatShortDateTime(evidence.calculated_at) },
            ]}
          />
          {children}
          {evidence.case_ids.length > 0 ? (
            <section className="flex flex-col gap-2" aria-labelledby="evidence-cases-title">
              <h3 id="evidence-cases-title" className="rcs-subheading">
                Contributing cases
              </h3>
              <Table size="sm" aria-label="Contributing cases">
                <TableHead>
                  <TableRow>
                    <TableHeader>Case ID</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {evidence.case_ids.map((id) => (
                    <TableRow key={id}>
                      <TableCell>
                        <RouterLink className="cds--link rcs-mono" to={`/manager/cases?search=${encodeURIComponent(id)}`}>
                          {id}
                        </RouterLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {evidence.case_ids_truncated && (
                <p className="rcs-helper">
                  Showing the first {evidence.case_ids.length} of {evidence.records_included}. Older cases are in
                  stored records only.
                </p>
              )}
            </section>
          ) : (
            <p className="rcs-helper">
              {evidence.title === "Auditor protection"
                ? "This figure comes from Auditor records, so no cases are listed. Auditors are never ranked or compared."
                : "No case records contributed to this figure in the period."}
            </p>
          )}
          <p className="rcs-helper">{EVIDENCE_RULE}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
