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
import { VideoDropZone } from "../../components/forms/VideoDropZone";
import { ACCEPTED_VIDEO_EXTENSIONS } from "../../design-tokens/videoFormats";
import { TrustBanner } from "../../components/notifications/TrustBanner";
import { PublicPage } from "../../components/layout/PublicPage";
import { createReport } from "../../api/client";
import { ApiError } from "../../api/types";
import { saveCaseId } from "../../hooks/useCaseIdStorage";

type ReportingChoice = "anonymous" | "identified";

const UNSUPPORTED_FORMAT_MESSAGE = "That file format isn't supported. Try MP4, MOV, WEBM, or AVI instead.";

/**
 * Screen 1 — Video Upload (Normal User Figma node 5:2), including the
 * identity-choice section. Copy is transcribed from the Figma frame.
 *
 * Backend gap: POST /api/reports currently accepts only the `video` file.
 * The optional description and the name/email from "Include my name &
 * email" are part of the approved P0 screen but are not sent anywhere yet —
 * there is no API field to receive them (flagged in the PR for Aiden).
 */
export function UploadPage() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [reportingChoice, setReportingChoice] = useState<ReportingChoice>("anonymous");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [fileFormatError, setFileFormatError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileSelected(file: File) {
    const dotIndex = file.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
    if (!ACCEPTED_VIDEO_EXTENSIONS.includes(extension)) {
      // UR-VU-06 — inform and guide on an unsupported format immediately,
      // before any network call. The backend validates the real file
      // contents too, so this is a fast first check, not the only one.
      setFileFormatError(UNSUPPORTED_FORMAT_MESSAGE);
      setSelectedFile(null);
      return;
    }
    setFileFormatError(null);
    setSubmitError(null);
    setSelectedFile(file);
  }

  const identityComplete = reportingChoice === "anonymous" || (name.trim() !== "" && email.trim() !== "");
  const canSubmit = selectedFile !== null && consentGiven && identityComplete;

  async function handleSubmit() {
    if (!selectedFile) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createReport(selectedFile);
      saveCaseId(result.case_id);
      // Also pass the ID through navigation state, so the confirmation page
      // can still show it if this browser blocks localStorage.
      navigate("/case-confirmation", { state: { caseId: result.case_id } });
    } catch (err) {
      // UR-VU-04 — an immediate, specific error when the upload fails. The
      // backend's own message is used when it has one (e.g. "File contents
      // do not match a valid .mp4 file").
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong while submitting your report. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicPage cardWidth={720}>
      <div className="flex flex-col gap-6">
        <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Report content for review</h1>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>
          You don&apos;t need an account. Tell us what happened and we&apos;ll take it from here.
        </p>
      </div>

      {/* UR-NFR-02 — the trust/privacy banner comes before any form field. */}
      <TrustBanner />

      <div className="flex flex-col gap-3">
        <p id="report-method-label" style={{ fontSize: 12, lineHeight: "16px", color: "#525252" }}>
          How would you like to report this? (video is fastest to review)
        </p>
        {/* Video is the P0 path. The link and screenshot alternatives
            (Figma 72:28 / 72:58) are Sprint 3 polish per the build-scope
            handoff, so they're visible but disabled rather than dead ends. */}
        <ContentSwitcher
          selectedIndex={0}
          onChange={() => {}}
          aria-labelledby="report-method-label"
        >
          <Switch name="video" text="Upload video" />
          <Switch name="link" text="Paste a link instead" disabled />
          <Switch name="screenshot" text="Add a screenshot" disabled />
        </ContentSwitcher>
      </div>

      <div className="flex flex-col gap-3">
        <VideoDropZone onFileSelected={handleFileSelected} />
        {selectedFile && (
          <p style={{ fontSize: 14, color: "#161616" }}>
            Selected: <strong>{selectedFile.name}</strong>
          </p>
        )}
        <p style={{ fontSize: 12, lineHeight: "16px", color: "#525252" }}>
          Accepted formats: MP4, MOV, WEBM, AVI. Typical length: about 10–15 minutes for Sprint 2 testing (this is
          a target, not a hard maximum). Max file size: 500MB (placeholder, pending Dev pipeline validation).
        </p>
      </div>

      {fileFormatError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={fileFormatError}
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
          onChange={(value) => setReportingChoice(value as ReportingChoice)}
        >
          <RadioButton id="reporting-anonymous" labelText="Report anonymously" value="anonymous" />
          <RadioButton id="reporting-identified" labelText="Include my name & email" value="identified" />
        </RadioButtonGroup>
        {reportingChoice === "identified" && (
          <div className="flex flex-col gap-4">
            <TextInput
              id="reporter-name"
              labelText="Name"
              placeholder="e.g. Jordan Lee"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              id="reporter-email"
              type="email"
              labelText="Email"
              placeholder="e.g. jordan@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

      <div className="p-3" style={{ border: "1px solid #e0e0e0", borderRadius: 6 }}>
        <Checkbox
          id="consent-checkbox"
          labelText="I understand my video and any details I provide will be used only to review this report, in line with the privacy notice."
          checked={consentGiven}
          onChange={(_, { checked }) => setConsentGiven(checked)}
        />
      </div>

      <div>
        <Button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? "Submitting…" : "Submit report"}
        </Button>
      </div>

      <p className="flex items-center gap-2" style={{ fontSize: 12, lineHeight: "16px", color: "#525252" }}>
        <Locked size={14} aria-hidden="true" />
        Your report is encrypted and securely processed.
      </p>

      <RouterLink to="/status" className="cds--link">
        Already have a case ID? Check your case status
      </RouterLink>
    </PublicPage>
  );
}
