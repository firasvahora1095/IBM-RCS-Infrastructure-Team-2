/**
 * RMIT Team 6: one record per person, used by the landing page's team section and the full team page.
 *
 * `sprints` is the team's official contribution table, word for word. The resume highlights are written from the work
 * each person committed to this repository, so they can name work the table leaves out (Hyuna's AI Buddy and
 * deployment, for example); every highlight is traceable to that person's commits. `photo` is
 * looked for in public/team; until a file exists the person's initials show on their own brand-gradient tile, and
 * both gradient stops carry white text at 5:1 or better.
 */
export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  /** One sentence for the landing page card. */
  did: string;
  photo: string;
  tile: string;
  /** The official contribution table, one row per sprint. */
  sprints: [string, string, string];
  /** Resume-ready bullets: action first, specific, true to the table. */
  highlights: string[];
  skills: string[];
}

export const REPO_URL = "https://github.com/firasvahora1095/IBM-RCS-Infrastructure-Team-2";

export const TEAM: TeamMember[] = [
  {
    slug: "hyuna-bae",
    name: "Hyuna Bae",
    role: "Project Manager",
    did: "Ran planning and Client sessions, built the AI Buddy and the exposure and cooldown logic, set up deployment and led end-to-end testing.",
    photo: "/team/hyuna-bae.jpg",
    tile: "linear-gradient(135deg, #5b45d6, #0f62fe)",
    sprints: [
      "Planning, Client sessions, merged flow diagrams, tech stack",
      "Backend and API wiring, end-to-end testing, UAT checklist, live demo preparation",
      "Exposure and cooldown logic, edge-case QA, end-to-end testing, final presentation",
    ],
    highlights: [
      "Led planning, Client sessions and delivery for a five-person IBM × RMIT team across three sprints, from flow diagrams and tech-stack choice to the final presentation.",
      "Built the first end-to-end slice (database, API and frontend), then wired the FastAPI backend to the AI pipeline, including Manager, wellbeing and SOS endpoints covered by contract tests.",
      "Built the Reviewer protection logic: severity-triggered cooldowns, a scheduled daily exposure reset, and case assignment that skips Reviewers in cooldown or at their limit.",
      "Built the AI Buddy assistant on watsonx.ai (Llama 3.3 70B), answering from live, role-scoped RCS data.",
      "Set up deployment to IBM Cloud Code Engine: Docker images with a bundled PostgreSQL, a demo seed and GitHub Actions auto-deploy; added Watson Speech to Text with speaker diarization and the internal endpoints the watsonx Orchestrate agent calls.",
      "Owned end-to-end testing and UAT: wrote the UAT checklist, ran edge-case QA and prepared the live Client demo.",
    ],
    skills: ["Agile delivery", "Stakeholder management", "Python", "FastAPI", "PostgreSQL", "watsonx.ai", "Docker", "GitHub Actions", "UAT"],
  },
  {
    slug: "janataarah-begum",
    name: "Janataarah Begum",
    role: "Business Analyst / QA",
    did: "Wrote the use cases, requirements and S1–S4 severity scale, then validated every flow through acceptance and edge-case testing.",
    photo: "/team/janataarah-begum.jpg",
    tile: "linear-gradient(135deg, #0b7a75, #005d5d)",
    sprints: [
      "Use cases, requirements for three personas, severity scale S1 to S4",
      "Status taxonomy, end-to-end acceptance scenarios, AI and assignment validation",
      "Audit-log requirements, extra feature research, edge-case testing, traceability",
    ],
    highlights: [
      "Wrote the use cases and requirements for three user roles, the baseline every screen and API was built against.",
      "Designed the S1–S4 severity scale and the status taxonomy that turns internal case states into plain public outcomes.",
      "Wrote end-to-end acceptance scenarios and used them to validate the AI output schema and weighted case assignment.",
      "Specified the audit-log requirements and proved them through requirements traceability and screenshot-evidenced UAT and edge-case testing.",
    ],
    skills: ["Requirements engineering", "Use cases", "Acceptance criteria", "Taxonomy design", "UAT", "Traceability", "QA"],
  },
  {
    slug: "aleeya-ahmad",
    name: "Aleeya Ahmad",
    role: "UX / Research",
    did: "Researched personas through an expert interview, designed all three roles in Figma and built the production interface with accessibility QA.",
    photo: "/team/aleeya-ahmad.jpg",
    tile: "linear-gradient(135deg, #6929c4, #5b45d6)",
    sprints: [
      "Personas, expert interview, Figma prototypes for all three roles",
      "Production JSX and Tailwind views, UI and accessibility QA",
      "Validation and Audit page, B2B flow screens, extra feature UI, final accessibility pass",
    ],
    highlights: [
      "Researched three user roles through personas and an expert interview on ethical design, which shaped the consent and decline flows.",
      "Designed click-through Figma prototypes for the Reviewer, Manager and public Reporter on the IBM Carbon Design System.",
      "Built production React and TypeScript views with Carbon and Tailwind, including the Validation and Audit screen and the B2B flow screens.",
      "Ran UI and accessibility QA towards WCAG 2.1 AA, with automated axe checks, keyboard walkthroughs and a final accessibility pass.",
    ],
    skills: ["UX research", "Personas", "Figma", "IBM Carbon", "React", "TypeScript", "Accessibility (WCAG 2.1)"],
  },
  {
    slug: "firas-vahora",
    name: "Firas Vahora",
    role: "Developer",
    did: "Set up watsonx.ai, the repository and Code Engine, built weighted case assignment and the real-AI wiring, and delivered the live watsonx Orchestrate integration.",
    photo: "/team/firas-vahora.jpg",
    tile: "linear-gradient(135deg, #1d3f91, #0b7a75)",
    sprints: [
      "watsonx.ai project, GitHub repository and environment set-up, Code Engine backend skeleton, Orchestrate workflow",
      "React frontend, weighted assignment, real-AI wiring, Code Engine deploy",
      "Live Orchestrate integration, extra feature backend, bug fixes, final deploy",
    ],
    highlights: [
      "Set up the watsonx.ai project, the GitHub repository and environments, and the backend skeleton on IBM Cloud Code Engine.",
      "Designed the watsonx Orchestrate workflow and delivered the live Orchestrate integration.",
      "Built weighted case assignment and wired the real AI pipeline into the product, validated with schema cross-tests.",
      "Built the backend for the extra features, fixed bugs across the stack and ran the deployments to Code Engine.",
    ],
    skills: ["watsonx.ai", "watsonx Orchestrate", "IBM Cloud Code Engine", "Python", "FastAPI", "React", "GitHub"],
  },
  {
    slug: "aiden-brundell",
    name: "Aiden Brundell",
    role: "Developer",
    did: "Built the Cloud Object Storage and Speech to Text connections, the core database and API, the watsonx vision call and the audit log.",
    photo: "/team/aiden-brundell.jpg",
    tile: "linear-gradient(135deg, #0d1633, #5b45d6)",
    sprints: [
      "Cloud Object Storage bucket and folders, watsonx.ai and Speech to Text connection code, JSON schema",
      "Core database and API, real watsonx vision call, aggregation logic",
      "Audit-log database and API, bug fixes, final audit-log and demo data check",
    ],
    highlights: [
      "Set up IBM Cloud Object Storage and wrote the connection code for Watson Speech to Text and watsonx.ai, with a shared JSON schema.",
      "Built the core PostgreSQL database and API, including case ID generation and tests.",
      "Implemented the watsonx vision call that analyses video frames, and aggregated the frame results into a case score and summary.",
      "Built the audit-log database and API, fixed bugs and ran the final audit-log and demo-data check.",
    ],
    skills: ["Python", "IBM Cloud Object Storage", "Watson Speech to Text", "watsonx.ai", "PostgreSQL", "REST APIs", "pytest"],
  },
];

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}
