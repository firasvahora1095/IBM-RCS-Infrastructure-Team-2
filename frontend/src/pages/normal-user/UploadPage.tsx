import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  InlineNotification,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextArea,
  RadioButtonGroup,
  RadioButton,
  TextInput,
  Checkbox,
  Button,
} from "@carbon/react";
import { Close, Link as LinkIcon, Locked } from "@carbon/icons-react";
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

/** "Post 3208" from a post link; the link itself if it has no recognisable ID. */
function linkedPostLabel(url: string): string {
  const match = url.match(/post\/([\w-]+)/);
  return match ? `Post ${match[1]}` : url;
}

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
  // Arriving from a platform's report button (B2B flow stage 3): the post
  // link travels with the report, so the reporter doesn't have to copy it.
  const [searchParams] = useSearchParams();
  const fromPlatform = searchParams.get("from") === "communityhub";
  const [sourceLink, setSourceLink] = useState(() => {
    const source = searchParams.get("source") ?? "";
    return /^https?:\/\//.test(source) ? source : "";
  });
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
      // Optional source details (B2B spec S2) are only sent when given; they
      // never block a report.
      const source = sourceLink.trim() ? { url: sourceLink.trim() } : undefined;
      const result =
        evidenceType === "video"
          ? await (source ? createReport(videoFile!, source) : createReport(videoFile!))
          : evidenceType === "screenshot"
            ? await (source ? createScreenshotReport(imageFile!, source) : createScreenshotReport(imageFile!))
            : await createLinkReport(link.trim());
      saveCaseId(result.case_id);
      // Also pass the ID through navigation state, so the confirmation page
      // can still show it if this browser blocks localStorage.
      navigate("/report/confirmation", { state: { caseId: result.case_id } });
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

  const videoPanel = (
    <div className="flex flex-col gap-3" style={{ paddingBlockStart: 16 }}>
      <VideoDropZone onFileSelected={handleVideoSelected} />
      {videoFile && <SelectedFile name={videoFile.name} onRemove={() => setVideoFile(null)} />}
      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
        Accepted formats: MP4, MOV, WEBM or AVI. Maximum file size: 500 MB.
      </p>
    </div>
  );
  const linkPanel = (
    <div className="flex flex-col gap-3" style={{ paddingBlockStart: 16 }}>
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
  );
  const screenshotPanel = (
    <div className="flex flex-col gap-3" style={{ paddingBlockStart: 16 }}>
      <ScreenshotDropZone onFileSelected={handleImageSelected} />
      {imageFile && <SelectedFile name={imageFile.name} onRemove={() => setImageFile(null)} />}
      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
        Accepted formats: PNG or JPG. Maximum file size: 10 MB.
      </p>
    </div>
  );

  return (
    <PublicPage cardWidth={720}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-col gap-2">
          {/* B2B context (spec S2): the report reaches RCS from CommunityHub, without a sales surface. */}
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cds-text-secondary)" }}>
            {fromPlatform ? "Reporting content from CommunityHub · Reviewed by RCS" : "Reviewed by RCS"}
          </p>
          <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Report content for review</h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            Send us a video, link or screenshot that you think breaks the rules. It takes about two minutes. You
            don&apos;t need an account.
          </p>
        </div>
      </div>

      {/* One banner, not two: when the report comes from a platform post, that context joins the trust message. */}
      <TrustBanner
        heading={fromPlatform && sourceLink ? "Reporting a CommunityHub post" : undefined}
        body={
          fromPlatform && sourceLink
            ? "We've linked the post to this report. Reports are reviewed confidentially against our content policy and privacy notice."
            : undefined
        }
      />

      {/* Proof of the linked post, so "we've attached it" is something you can see. */}
      {sourceLink.trim() && (
        <p className="flex flex-wrap items-center gap-2" style={{ fontSize: 14 }}>
          <span style={{ color: "var(--cds-text-secondary)" }}>Linked post</span>
          <Tag type="blue" size="md" renderIcon={LinkIcon} title={sourceLink}>
            {linkedPostLabel(sourceLink)}
          </Tag>
        </p>
      )}

      <div className="flex flex-col gap-4">
        <StepHeading
          step={1}
          title="Choose what to send"
          hint="Pick one. A video is the quickest for us to review."
          labelId="report-method-label"
        />
        <Tabs
          selectedIndex={EVIDENCE_TYPES.indexOf(evidenceType)}
          onChange={({ selectedIndex }) => {
            setEvidenceType(EVIDENCE_TYPES[selectedIndex]);
            setEvidenceError(null);
            setSubmitError(null);
          }}
        >
          <TabList aria-labelledby="report-method-label">
            <Tab>Video</Tab>
            <Tab>Link</Tab>
            <Tab>Screenshot</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="rcs-tab-panel-flush">{evidenceType === "video" && videoPanel}</TabPanel>
            <TabPanel className="rcs-tab-panel-flush">{evidenceType === "link" && linkPanel}</TabPanel>
            <TabPanel className="rcs-tab-panel-flush">{evidenceType === "screenshot" && screenshotPanel}</TabPanel>
          </TabPanels>
        </Tabs>
      </div>

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

      {evidenceType !== "link" && fromPlatform && (
        <TextInput
          id="source-link"
          labelText="Link to the post on CommunityHub"
          helperText="Already filled in for you. It helps CommunityHub find the original post."
          placeholder="e.g. https://communityhub.example/post/4721"
          autoComplete="off"
          value={sourceLink}
          onChange={(e) => setSourceLink(e.target.value)}
        />
      )}

      <StepHeading
        step={2}
        title="Tell us more (optional)"
        hint="Anything that helps us understand what happened. You can skip this."
      />

      <TextArea
        id="description"
        labelText="Describe what happened"
        placeholder="For example: when it happened, or where you saw it."
        maxCount={500}
        enableCounter
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex flex-col gap-4">
        <RadioButtonGroup
          name="reporting-choice"
          legendText="Do you want us to be able to contact you?"
          helperText="You don't have to share anything about yourself. Share your name and email only if you want us to follow up with you."
          orientation="vertical"
          valueSelected={reportingChoice}
          onChange={(value) => {
            setReportingChoice(value as ReportingChoice);
            setNameError(false);
            setEmailError(false);
          }}
        >
          <RadioButton id="reporting-anonymous" labelText="No, keep my report anonymous" value="anonymous" />
          <RadioButton id="reporting-identified" labelText="Yes, include my name and email" value="identified" />
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

      <StepHeading step={3} title="Confirm and send" />

      <div className="flex flex-col gap-3">
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

      <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
        What happens next: you&apos;ll get a case ID straight away. Keep it safe. You&apos;ll use it on the Check case
        status page to see how your report is going.
      </p>

      <p
        className="flex items-center gap-2"
        style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}
      >
        <Locked size={14} aria-hidden="true" />
        Your report is encrypted and securely processed.
      </p>
    </PublicPage>
  );
}

/** The chosen file, with a clear way to take it back out: Remove, so a wrong file is never stuck. */
function SelectedFile({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2"
      style={{ border: "1px solid var(--cds-border-subtle-01)", backgroundColor: "var(--cds-layer-01)" }}
    >
      <span style={{ fontSize: 14, overflowWrap: "anywhere" }}>
        Selected: <strong>{name}</strong>
      </span>
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        renderIcon={Close}
        iconDescription={`Remove ${name}`}
        tooltipPosition="left"
        onClick={onRemove}
      />
    </div>
  );
}

/** "Step 1 of 3" and what to do in it, so a first-time reporter always knows where they are and what is expected. */
function StepHeading({ step, title, hint, labelId }: { step: number; title: string; hint?: string; labelId?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 12, lineHeight: "16px", fontWeight: 600, color: "var(--cds-text-secondary)" }}>
        Step {step} of 3
      </p>
      <h2 id={labelId} style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
        {title}
      </h2>
      {hint && <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>{hint}</p>}
    </div>
  );
}
