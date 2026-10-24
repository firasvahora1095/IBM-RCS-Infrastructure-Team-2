import type { MockDb, MockOrganisation } from "./store";

/** CommunityHub is the original customer; anything without a client tag belongs to it. */
export const DEFAULT_CLIENT_ID = "COMMUNITYHUB";
/** The Manager's "All clients" view. */
export const ALL_CLIENTS = "ALL";

export function clientOf(item: { organisation_id?: string | null }): string {
  return item.organisation_id ?? DEFAULT_CLIENT_ID;
}

/** Items belonging to one client, or all of them for "All clients". */
export function inClient<T extends { organisation_id?: string | null }>(items: T[], clientId: string): T[] {
  const wanted = clientId.toUpperCase();
  return wanted === ALL_CLIENTS ? items : items.filter((i) => clientOf(i).toUpperCase() === wanted);
}

export function allOrganisations(db: MockDb): MockOrganisation[] {
  return [db.organisation, ...(db.extraOrganisations ?? [])];
}

export function findOrganisation(db: MockDb, clientId: string): MockOrganisation | undefined {
  return allOrganisations(db).find((o) => o.organisation_id === clientId.toUpperCase());
}
