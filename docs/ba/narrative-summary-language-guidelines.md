# Narrative Summary Language Guidelines - Sprint 2 Week 2

## Purpose

These guidelines define how AI-generated narrative summaries should describe detected visual content for Auditor review.

Narrative summaries should provide useful context without assigning blame, intent, guilt, or legal conclusions. The AI output supports human review; the Auditor remains responsible for the final assessment.

## Writing Guidelines

Narrative summaries should:

- Describe observable actions, people and objects rather than assumed intent.
- Use neutral terms such as "person" or "people" instead of labels such as "attacker", "victim", "criminal" or "suspect" unless those roles have been independently established.
- Use uncertainty-aware wording such as "appears to" or "an object resembling..." where visual evidence is not conclusive.
- Avoid emotionally loaded or judgmental wording such as "brutal", "vicious", "dangerous" or similar terms.
- Avoid presenting a crime, threat, assault or other interpretation as a confirmed fact based solely on AI analysis.
- Keep descriptions concise and focused on evidence relevant to the review.

## Good and Bad Examples

### Example 1

**Avoid:**  
"The attacker brutally assaults the victim."

**Preferred:**  
"One person appears to strike another person during a physical confrontation."

**Reason:**  
The preferred version describes the visible action without assigning roles, intent or emotionally loaded language.

### Example 2

**Avoid:**  
"A dangerous man threatens another person with a knife."

**Preferred:**  
"A person appears to be holding a knife-like object while facing another person."

**Reason:**  
The preferred version avoids assuming danger or intent and acknowledges uncertainty about the object.

### Example 3

**Avoid:**  
"The victim has been seriously injured by the attacker."

**Preferred:**  
"Visible marks that may indicate injury can be seen on one person."

**Reason:**  
The preferred version describes visible evidence without assigning responsibility or making an unsupported medical conclusion.

### Example 4

**Avoid:**  
"A violent gang is attacking someone."

**Preferred:**  
"Multiple people appear to be involved in a physical confrontation."

**Reason:**  
The preferred version avoids characterising the people or assuming group membership and intent.

### Example 5

**Avoid:**  
"The suspect uses a weapon to intentionally hurt the victim."

**Preferred:**  
"A person appears to make physical contact with another person while holding an object identified by the model as a possible weapon."

**Reason:**  
The preferred version describes the observable evidence without assuming identity, intent or guilt.

## Implementation Note

These guidelines should be reflected in the prompt used to generate narrative summaries. AI-generated summaries should remain descriptive and evidence-based so they support, rather than replace or influence, the Auditor's final human assessment.