/** A confirmation carried to the next Manager page in router state, shown there as an inline notice. */
export interface ManagerNotice {
  title: string;
  detail?: string;
}

export function noticeFrom(state: unknown): ManagerNotice | null {
  const notice = (state as { notice?: ManagerNotice } | null)?.notice;
  return notice && typeof notice.title === "string" ? notice : null;
}
