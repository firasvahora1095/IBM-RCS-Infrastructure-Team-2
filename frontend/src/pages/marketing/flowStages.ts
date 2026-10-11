import { isMockData } from "../../services";

export interface Stage {
  n: string;
  title: string;
  body: string;
  persona: string;
  to: string;
  signIn?: string;
}

/** The confirmed end-to-end flow (docs/ux/b2b-end-to-end-flow-spec.md §1), one tile per touchpoint. */
export const STAGES: Stage[] = [
  {
    n: "01",
    title: "CommunityHub chooses RCS",
    body: "The RCS product page a platform reads before deciding.",
    persona: "Organisation",
    to: "/rcs",
  },
  {
    n: "02",
    title: "Organisation set-up",
    body: "Organisation details, results endpoint and the report button.",
    persona: "Organisation",
    to: "/rcs/get-started",
  },
  {
    n: "03",
    title: "Report button on CommunityHub",
    body: "A member of the public reports a post from the platform itself.",
    persona: "Public",
    to: "/communityhub",
  },
  {
    n: "04",
    title: "Report and case ID",
    body: "Upload the video, stay anonymous, get a case ID.",
    persona: "Reporter",
    to: "/",
  },
  {
    n: "05",
    title: "Check case status",
    body: "Received, Being Reviewed, Complete, and a plain outcome.",
    persona: "Reporter",
    to: "/status",
  },
  {
    n: "06",
    title: "AI pre-screen and protected review",
    body: "Content warning, blur, exposure limits, support and SOS. The reviewer decides.",
    persona: "Auditor",
    to: "/auditor",
    signIn: isMockData ? "auditor-1" : "auditor-01",
  },
  {
    n: "07",
    title: "Result delivered to CommunityHub",
    body: "Sent automatically on completion; the Manager only handles failures.",
    persona: "Manager",
    to: "/manager/deliveries",
    signIn: isMockData ? "manager-1" : "manager-01",
  },
  {
    n: "07b",
    title: "CommunityHub acts on the result",
    body: "The result lands in CommunityHub's moderation queue; their Trust & Safety team removes or keeps the post, and RCS is told.",
    persona: "CommunityHub Trust & Safety",
    to: "/communityhub/moderation",
    signIn: "ch-mod-04",
  },
  {
    n: "08",
    title: "Manager oversight",
    body: "SOS, reassignment, failed handoffs and reviewer exposure at a glance.",
    persona: "Manager",
    to: "/manager",
    signIn: isMockData ? "manager-1" : "manager-01",
  },
  {
    n: "09",
    title: "Service report review and release",
    body: "Generate a period report from case records, review it, release it.",
    persona: "Manager",
    to: "/manager/reports",
    signIn: isMockData ? "manager-1" : "manager-01",
  },
  {
    n: "10",
    title: "CommunityHub views the report",
    body: "An authorised CommunityHub user signs in to view and download it.",
    persona: "CommunityHub client",
    to: "/client/reports",
    signIn: "ch-user-17",
  },
];
