import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, InlineNotification, SkeletonText } from "@carbon/react";
import { ClientHeader } from "../../components/shell/ClientHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { PageHeader } from "../../components/ui/PageHeader";
import { ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { StatusTag } from "../../components/ui/StatusTag";
import { MessageThread } from "../../components/messages/MessageThread";
import { clientGetMessage } from "../../services";
import { useClientQuery } from "../../hooks/useClientQuery";
import { MESSAGE_STATUS_LABEL, MESSAGE_TONE } from "../../design-tokens/messageLabels";

/** One message to RCS, as the client sees it: where it is, and the reply when it comes. */
export function ClientMessagePage() {
  const { messageId = "" } = useParams<{ messageId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, error } = useClientQuery((t) => clientGetMessage(messageId, t), messageId);

  return (
    <>
      <ClientHeader />
      <StaffPage maxWidth={880}>
        <PageHeader
          breadcrumb={<ManagerBreadcrumb trail={[{ label: "Messages", to: "/client/messages" }, { label: messageId }]} />}
          title="Your message"
          meta={data && <StatusTag tone={MESSAGE_TONE[data.status]}>{MESSAGE_STATUS_LABEL[data.status]}</StatusTag>}
          actions={
            <Button onClick={() => navigate("/client/messages/new")}>New message</Button>
          }
        />
        {params.get("sent") && data && data.status === "SENT" && (
          <InlineNotification
            kind="success"
            lowContrast
            role="status"
            title="Message sent."
            subtitle="RCS has it. You'll see the reply here, usually within one working day."
            style={{ maxWidth: "100%" }}
          />
        )}
        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="We couldn't find that message."
            subtitle="It may belong to another organisation, or the link is wrong."
            style={{ maxWidth: "100%" }}
          />
        )}
        {!data && !error && <SkeletonText paragraph lineCount={5} />}
        {data && (
          <MessageThread
            message={data}
            viewer="client"
            reportHref={(id) => `/client/reports/${encodeURIComponent(id)}`}
          />
        )}
        {data && !data.reply && (
          <p className="rcs-helper">No reply yet. RCS usually answers within one working day.</p>
        )}
      </StaffPage>
    </>
  );
}
