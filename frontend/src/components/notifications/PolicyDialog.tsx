import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";

export type PolicyKind = "policy" | "privacy";

interface Section {
  heading: string;
  /** A short paragraph, a list of points, or both. */
  body?: string;
  points?: string[];
}

interface PolicyDocument {
  label: string;
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
}

/**
 * The two documents behind the Trust banner, written in plain language and kept short: what a person needs before
 * they send a report, not a legal text. They open in a dialog on top of the form so nothing already entered is lost.
 */
const DOCUMENTS: Record<PolicyKind, PolicyDocument> = {
  policy: {
    label: "Content policy",
    title: "How we review reports",
    updated: "Updated 1 October 2026",
    intro:
      "We review reported content for violence, threats and other serious harm. Every report is checked against this policy before anything happens to the post.",
    sections: [
      {
        heading: "What we look for",
        points: [
          "Violence or credible threats against people",
          "Content showing injury, or a clear and immediate risk of serious harm",
          "Weapons used or shown in a threatening way",
        ],
      },
      {
        heading: "How a report is reviewed",
        body: "An automated check flags the moments that matter and suggests a severity from low to critical. A trained Reviewer then watches the flagged content and makes the decision. A person always has the final say.",
      },
      {
        heading: "What you will see",
        body: "Your case moves from Received to Being Reviewed to Complete. When it is complete you see one of two outcomes: a policy violation was found, or no violation was found.",
      },
      {
        heading: "What happens to the post",
        body: "We tell the platform the outcome. The platform decides what to do with the post. We never remove content ourselves.",
      },
    ],
  },
  privacy: {
    label: "Privacy notice",
    title: "How we handle your report",
    updated: "Updated 1 October 2026",
    intro: "You do not need an account to report. We collect only what we need to review your report.",
    sections: [
      {
        heading: "What we collect",
        points: [
          "The video, link or screenshot you send, and anything you write about it",
          "Your name and email, only if you choose to give them",
          "A case ID, so you can check progress later",
        ],
      },
      {
        heading: "How it is used",
        body: "Only to review this report and tell you how it went. We do not use it for anything else.",
      },
      {
        heading: "Who can see it",
        points: [
          "The trained Reviewer assigned to your case sees the reported content, behind a content warning",
          "Reviewers are not shown your name or email",
          "The platform you reported on receives the outcome, the severity and the case ID, not your details",
        ],
      },
      {
        heading: "Reporting anonymously",
        body: "If you choose not to share your details, your report is anonymous. Keep your case ID safe: it is the only way to check the case.",
      },
      {
        heading: "Keeping and changing information",
        body: "We keep a case while it is open and for as long as records are needed. You can add information to your case after you submit. Information that has been submitted cannot be edited or removed through this service.",
      },
    ],
  },
};

/** The policy or privacy notice, opened over the form so a half-finished report is never lost. */
export function PolicyDialog({
  kind,
  onClose,
  launcherRef,
}: {
  kind: PolicyKind;
  onClose: () => void;
  /** The control that opened it, so focus goes back there on close. */
  launcherRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const doc = DOCUMENTS[kind];
  return (
    <ComposedModal open onClose={onClose} size="md" aria-label={doc.label} launcherButtonRef={launcherRef}>
      <ModalHeader title={doc.title} label={doc.label} closeModal={onClose} />
      <ModalBody hasScrollingContent aria-label={`${doc.label} text`}>
        <div className="flex flex-col gap-6" style={{ maxWidth: 560 }}>
          <div className="flex flex-col gap-2">
            <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>{doc.updated}</p>
            <p style={{ fontSize: 16, lineHeight: "24px" }}>{doc.intro}</p>
          </div>
          {doc.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h3 style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>{section.heading}</h3>
              {section.body && (
                <p style={{ fontSize: 14, lineHeight: "22px", color: "var(--cds-text-secondary)" }}>{section.body}</p>
              )}
              {section.points && (
                <ul
                  className="flex flex-col gap-1.5"
                  style={{ paddingInlineStart: 20, listStyle: "disc", fontSize: 14, lineHeight: "22px" }}
                >
                  {section.points.map((point) => (
                    <li key={point} style={{ color: "var(--cds-text-secondary)" }}>
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
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
