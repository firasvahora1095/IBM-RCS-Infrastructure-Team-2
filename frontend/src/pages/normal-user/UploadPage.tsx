import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  InlineNotification,
  ContentSwitcher,
  Switch,
  TextArea,
  RadioButtonGroup,
  RadioButton,
  TextInput,
  Checkbox,
  Button,
} from "@carbon/react";
import { Locked } from "@carbon/icons-react";
import { VideoDropZone, ScreenshotDropZone } from "../../components/forms/VideoDropZone";
import { ACCEPTED_VIDEO_EXTENSIONS } from "../../design-tokens/videoFormats";
import { TrustBanner } from "../../components/notifications/TrustBanner";
import { PublicPage } from "../../components/layout/PublicPage";
import { createReport, createLinkReport, createScreenshotReport } from "../../services";
import { ApiError } from "../../services/types";
import { saveCaseId } from "../../hooks/useCaseIdStorage";

type ReportingChoice = "anonymous" | "identified";
type EvidenceType = "video" | "link" | "screenshot";

const EVIDENCE_TYPES: EvidenceType[] = ["video", "link", "screenshot"];

const UNSUPPORTED_VIDEO_MESSAGE = "That file format isn't supported. Try MP4, MOV, WEBM, or AVI instead.";
const UNSUPPORTED_IMAGE_MESSAGE = "That image format isn't supported. Try PNG or JPG instead.";
/** What's missing when "Submit report" is pressed without evidence (errors on submit, not a disabled button). */
const MISSING_EVIDENCE_MESSAGE: Record<EvidenceType, string> = {
  video: "Choose a video to upload before submitting.",
  link: "Paste a link to the content before submitting.",
  screenshot: "Choose a screenshot to upload before submitting.",
};
const INVALID_LINK_MESSAGE =
  "That link doesn't look right. Make sure it's a public video link, not a private or password-protected page.";

/**
 * Consent wording per evidence type (Figma 5:26, 72:55, 72:86). The link
 * variant says "the linked content", not Figma's "my video": a reporter
 * pasting a link is often reporting someone else's video (UX decision, 18 Sep 2026).
 */
const CONSENT_LABEL: Record<EvidenceType, string> = {
  video:
    "I understand my video and any details I provide will be used only to review this report, in line with the privacy notice.",
  link: "I understand the linked content and any details I provide will be used only to review this report, in line with the privacy notice.",
  screenshot:
    "I understand my screenshot and any details I provide will be used only to review this report, in line with the privacy notice.",
};

function isPublicWebLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Screen 1 — Report content for review (Normal User Figma): the video upload
 * (5:2, identified-reporter variant 418:72), the Paste a link (72:28) and
 * Add a screenshot (72:58) evidence variants, the consent-required error
 * (73:29) and the processing-failed state (73:41).
 *
 * The description and identity fields stay available for all three evidence
 * types, so switching type never loses what the reporter already wrote.
 */
export function UploadPage() {
  const navigate = useNavigate();

  const [evidenceType, setEvidenceType] = useState<EvidenceType>("video");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [reportingChoice, setReportingChoice] = useState<ReportingChoice>("anonymous");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [processingFailed, setProcessingFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleVideoSelected(file: File) {
    const dotIndex = file.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
    if (!ACCEPTED_VIDEO_EXTENSIONS.includes(extension)) {
      // UR-VU-06 — inform and guide on an unsupported format immediately,
      // before any network call. The backend validates the real file
      // contents too, so this is a fast first check, not the only one.
      setEvidenceError(UNSUPPORTED_VIDEO_MESSAGE);
      setVideoFile(null);
      return;
    }
    setEvidenceError(null);
    setSubmitError(null);
    setVideoFile(file);
  }

  function handleImageSelected(file: File) {
    if (!/\.(png|jpe?g)$/i.test(file.name)) {
      setEvidenceError(UNSUPPORTED_IMAGE_MESSAGE);
      setImageFile(null);
      return;
    }
    setEvidenceError(null);
    setSubmitError(null);
    setImageFile(file);
  }

  const evidenceReady =
    (evidenceType === "video" && videoFile !== null) ||
    (evidenceType === "screenshot" && imageFile !== null) ||
    (evidenceType === "link" && link.trim() !== "");
  const identified = reportingChoice === "identified";

  async function handleSubmit() {
    // "Submit report" is never disabled (Figma 5:2). Everything missing is
    // explained at once, the way the consent error (73:29) already works, and
    // focus goes to the first problem (WCAG 3.3.1). A disabled button can't
    // be focused and never says what's missing.
    const linkInvalid = evidenceType === "link" && evidenceReady && !isPublicWebLink(link);
    const evidenceProblem = !evidenceReady
      ? MISSING_EVIDENCE_MESSAGE[evidenceType]
      : linkInvalid
        ? INVALID_LINK_MESSAGE
        : null;
    const nameMissing = identified && name.trim() === "";
    const emailMissing = identified && email.trim() === "";
    if (evidenceProblem || nameMissing || emailMissing || !consentGiven) {
      if (evidenceProblem) setEvidenceError(evidenceProblem);
      setNameError(nameMissing);
      setEmailError(emailMissing);
      setConsentError(!consentGiven);
      const firstInvalid =
        evidenceProblem && evidenceType === "link"
          ? "report-link"
          : evidenceProblem
            ? null
            : nameMissing
              ? "reporter-name"
              : emailMissing
                ? "reporter-email"
                : "consent-checkbox";
      // The evidence alert is announced on its own; fields get focus.
      if (firstInvalid) requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result =
        evidenceType === "video"
          ? await createReport(videoFile!)
          : evidenceType === "screenshot"
            ? await createScreenshotReport(imageFile!)
            : await createLinkReport(link.trim());
      saveCaseId(result.case_id);
      // Also pass the ID through navigation state, so the confirmation page
      // can still show it if this browser blocks localStorage.
      navigate("/case-confirmation", { state: { caseId: result.case_id } });
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // UR-VU-04 — a specific, fixable problem with what was submitted
        // (e.g. "File contents do not match a valid .mp4 file").
        setSubmitError(err.message);
      } else {
        // Figma 73:41 — the report was received but couldn't be processed,
        // or never arrived. No case exists, so the reporter must try again.
        setProcessingFailed(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (processingFailed) {
    return (
      <PublicPage cardWidth={720}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="We received your video, but something went wrong while processing it. Try uploading again, or use a different file."
          style={{ maxWidth: "100%" }}
        />
        <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
          Your case was not created — no case ID has been issued for this attempt.
        </p>
        <div>
          {/* Returns to the form with everything the reporter entered still filled in. */}
          <Button onClick={() => setProcessingFailed(false)}>Try again</Button>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage cardWidth={720}>
      <div className="flex flex-col gap-6">
        <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Report content for review</h1>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          You don&apos;t need an account. Tell us what happened and we&apos;ll take it from here.
        </p>
      </div>

      {/* UR-NFR-02 — the trust/privacy banner comes before any form field. */}
      <TrustBanner />

      <div className="flex flex-col gap-3">
        <p id="report-method-label" style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
          How would you like to report this? (video is fastest to review)
        </p>
        <ContentSwitcher
          selectedIndex={EVIDENCE_TYPES.indexOf(evidenceType)}
          onChange={({ name: selected }) => {
            setEvidenceType(selected as EvidenceType);
            setEvidenceError(null);
            setSubmitError(null);
          }}
          aria-labelledby="report-method-label"
        >
          <Switch name="video" text="Upload video" />
          <Switch name="link" text="Paste a link instead" />
          <Switch name="screenshot" text="Add a screenshot" />
        </ContentSwitcher>
      </div>

      {evidenceType === "video" && (
        <div className="flex flex-col gap-3">
          <VideoDropZone onFileSelected={handleVideoSelected} />
          {videoFile && (
            <p style={{ fontSize: 14, color: "var(--cds-text-primary)" }}>
              Selected: <strong>{videoFile.name}</strong>
            </p>
          )}
          <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
            Accepted formats: MP4, MOV, WEBM, AVI. Typical length: about 10–15 minutes for Sprint 2 testing (this is a
            target, not a hard maximum). Max file size: 500MB (placeholder, pending Dev pipeline validation).
          </p>
        </div>
      )}

      {evidenceType === "link" && (
        <div className="flex flex-col gap-3">
          <TextInput
            id="report-link"
            type="url"
            labelText="Link to the content"
            placeholder="https://..."
            autoComplete="off"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setEvidenceError(null);
            }}
          />
          <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
            Paste a public link to the video (not a private or password-protected page). We&apos;ll review the linked
            content the same way as an uploaded video.
          </p>
        </div>
      )}

      {evidenceType === "screenshot" && (
        <div className="flex flex-col gap-3">
          <ScreenshotDropZone onFileSelected={handleImageSelected} />
          {imageFile && (
            <p style={{ fontSize: 14, color: "var(--cds-text-primary)" }}>
              Selected: <strong>{imageFile.name}</strong>
            </p>
          )}
          <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
            Accepted formats: PNG, JPG. Max size: 10MB (placeholder) — to be confirmed with Dev.
          </p>
        </div>
      )}

      {evidenceError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={evidenceError}
          role="alert"
          style={{ maxWidth: "100%" }}
        />
      )}

      <TextArea
        id="description"
        labelText="Add more detail (optional)"
        placeholder="Please add any detail that may help with review. For example, when this happened or where you saw it."
        maxCount={500}
        enableCounter
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex flex-col gap-4">
        <RadioButtonGroup
          name="reporting-choice"
          legendText="How would you like to submit this report?"
          helperText="You don't need to share your identity to report — but you can if you'd like us to be able to follow up with you directly."
          orientation="vertical"
          valueSelected={reportingChoice}
          onChange={(value) => {
            setReportingChoice(value as ReportingChoice);
            setNameError(false);
            setEmailError(false);
          }}
        >
          <RadioButton id="reporting-anonymous" labelText="Report anonymously" value="anonymous" />
          <RadioButton id="reporting-identified" labelText="Include my name & email" value="identified" />
        </RadioButtonGroup>
        {reportingChoice === "identified" && (
          // Figma 418:72 sizes the name and email fields to about half the card.
          <div className="flex flex-col gap-4" style={{ maxWidth: 320 }}>
            <TextInput
              id="reporter-name"
              labelText="Name"
              placeholder="e.g. Jordan Lee"
              autoComplete="name"
              value={name}
              invalid={nameError}
              invalidText="Enter your name, or choose to report anonymously."
              onChange={(e) => {
                setName(e.target.value);
                setNameError(false);
              }}
            />
            <TextInput
              id="reporter-email"
              type="email"
              labelText="Email"
              placeholder="e.g. jordan@example.com"
              autoComplete="email"
              value={email}
              invalid={emailError}
              invalidText="Enter your email, or choose to report anonymously."
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(false);
              }}
            />
          </div>
        )}
      </div>

      {submitError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Your report wasn't submitted"
          subtitle={submitError}
          role="alert"
          style={{ maxWidth: "100%" }}
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="p-3" style={{ border: "1px solid var(--cds-border-subtle-00)" }}>
          <Checkbox
            id="consent-checkbox"
            labelText={CONSENT_LABEL[evidenceType]}
            checked={consentGiven}
            invalid={consentError}
            onChange={(_, { checked }) => {
              setConsentGiven(checked);
              if (checked) setConsentError(false);
            }}
          />
        </div>
        {consentError && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Please confirm you understand how your report will be used before submitting."
            style={{ maxWidth: "100%" }}
          />
        )}
      </div>

      <div>
        <Button disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? "Submitting…" : "Submit report"}
        </Button>
      </div>

      <p
        className="flex items-center gap-2"
        style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}
      >
        <Locked size={14} aria-hidden="true" />
        Your report is encrypted and securely processed.
      </p>

      <RouterLink to="/status" className="cds--link">
        Already have a case ID? Check your case status
      </RouterLink>
    </PublicPage>
  );
}
