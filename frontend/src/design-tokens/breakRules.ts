/**
 * How long an approved break lasts. The Manager approves it and the break starts then; it ends by itself. While it runs
 * the Auditor is given no new cases (assignment, claiming, taking, or Manager reassignment), and a case they already
 * hold stays with them. 15 minutes matches the S3 cooldown, the shortest protective pause the product already has.
 * The same value is BREAK_MINUTES in backend/app/breaks.py; change both together.
 */
export const BREAK_MINUTES = 15;
