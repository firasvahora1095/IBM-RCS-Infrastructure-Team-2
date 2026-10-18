import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Accordion, AccordionItem, Link } from "@carbon/react";
import { Email, Time } from "@carbon/icons-react";
import { PublicPage } from "../../components/layout/PublicPage";

/** Frequently asked questions, grouped by where the reporter is in the journey. */
const FAQ_GROUPS: { title: string; questions: { question: string; answer: string }[] }[] = [
  {
    title: "Before you report",
    questions: [
      {
        question: "Do I need an account?",
        answer: "No. You can report without an account and stay anonymous. Adding your name and email is optional.",
      },
      {
        question: "What can I send?",
        answer:
          "A video (MP4, MOV, WEBM or AVI, up to 500 MB), a public link to the content, or a screenshot (PNG or JPG, up to 10 MB). A video is the fastest to review.",
      },
      {
        question: "What is a case ID?",
        answer:
          "A short code you get as soon as you send a report. It is the only way to check your case later, so keep it somewhere safe. We also save it in the browser you used.",
      },
    ],
  },
  {
    title: "After you report",
    questions: [
      {
        question: "What happens next?",
        answer:
          "Your case moves from Received to Being Reviewed to Complete. A trained reviewer looks at the content and decides whether it breaks the content policy. When it is complete, you see the outcome.",
      },
      {
        question: "How long does a review take?",
        answer: "Most reviews take 3 to 5 business days.",
      },
      {
        question: "How do I check progress?",
        answer: "Open Check case status and enter your case ID. You do not need to sign in.",
      },
      {
        question: "Can I add more information later?",
        answer:
          "Yes. Open your case on the status page and choose Add more information. You can attach files too. Anything already submitted cannot be edited or removed.",
      },
      {
        question: "I lost my case ID. What can I do?",
        answer:
          "If you gave an email when you reported, contact us with that address and the date you reported and we will help. Without one, we cannot find a case, to protect your privacy.",
      },
    ],
  },
  {
    title: "Your privacy",
    questions: [
      {
        question: "Who can see my report?",
        answer:
          "Only the trained reviewer assigned to your case, behind a content warning. Reviewers are not shown your name or email. The platform you reported on only receives the outcome.",
      },
    ],
  },
];

/**
 * Contact us for the public reporting flow: how to reach a person first, with the frequently asked questions below it. The ? button
 * in the header opens this page at the questions, and the Contact us tab opens it from the top.
 */
export function ContactPage() {
  const { hash } = useLocation();
  // The ? button in the header lands here at #faq: scroll straight to the answers.
  useEffect(() => {
    if (hash !== "#faq") return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById("faq");
      if (typeof section?.scrollIntoView === "function") section.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  return (
    <PublicPage cardWidth={720}>
      <div className="flex flex-col gap-2">
        <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Contact us</h1>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          Reach a person here. Answers to the most common questions are below.
        </p>
      </div>

      <section
        aria-labelledby="contact-title"
        className="flex flex-col gap-4 p-6"
        style={{ backgroundColor: "var(--cds-layer-01)" }}
      >
        <h2 id="contact-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
          Contact us
        </h2>
        <div className="flex items-start gap-3">
          <Email size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <Link href="mailto:support@rcs.example" style={{ fontSize: 14 }}>
              support@rcs.example
            </Link>
            <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
              Include your case ID if you have one. Please don&apos;t send the reported content by email.
            </span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Time size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <span style={{ fontSize: 14, lineHeight: "20px" }}>We reply within one working day.</span>
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: "20px",
            borderTop: "1px solid var(--cds-border-subtle-01)",
            paddingTop: 16,
          }}
        >
          <strong>If someone is in immediate danger, call 000.</strong> RCS is not an emergency service.
        </p>
      </section>
      <section id="faq" aria-labelledby="faq-title" className="flex scroll-mt-24 flex-col gap-6">
        <h2 id="faq-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
          Frequently asked questions
        </h2>
        {FAQ_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <h3 style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600, color: "var(--cds-text-secondary)" }}>
              {group.title}
            </h3>
            <Accordion>
              {group.questions.map((q) => (
                <AccordionItem key={q.question} title={q.question}>
                  <p style={{ fontSize: 14, lineHeight: "22px", color: "var(--cds-text-secondary)", maxWidth: 560 }}>
                    {q.answer}
                  </p>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </section>
    </PublicPage>
  );
}
