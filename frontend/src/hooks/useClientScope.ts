import { useCallback, useSyncExternalStore } from "react";
import { listClients } from "../services";
import type { ClientOrganisation } from "../services/types";
import { useStaffQuery } from "./useStaffQuery";

/** The Manager's "All clients" view. */
export const ALL_CLIENTS = "ALL";
const KEY = "rcs_client_scope";

/**
 * Which client the Manager is looking at, kept for the tab so it follows them from page to page: pick StreamNest once
 * and Overview, Cases, Deliveries, Reports, Messages and Insights all show StreamNest. One selector, one place
 * (docs/ux/multi-client-scoping.md), not a dropdown on every screen that can fall out of step.
 */
const listeners = new Set<() => void>();
let current = ALL_CLIENTS;
try {
  current = sessionStorage.getItem(KEY) ?? ALL_CLIENTS;
} catch {
  // Private mode or blocked storage: the choice just lasts until the page reloads.
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setScope(next: string) {
  current = next;
  try {
    sessionStorage.setItem(KEY, next);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/** The chosen client id, or ALL. */
export function useClientScope(): { clientId: string; setClientId: (id: string) => void } {
  const clientId = useSyncExternalStore(subscribe, () => current);
  const setClientId = useCallback((id: string) => setScope(id), []);
  return { clientId, setClientId };
}

/**
 * The clients, and the scope to ask the server for. When RCS serves only one client there is nothing to choose, so
 * "All clients" means that client.
 */
export function useClients() {
  const { clientId } = useClientScope();
  const query = useStaffQuery(listClients);
  const clients: ClientOrganisation[] = query.data ?? [];
  const only = clients.length === 1 ? clients[0] : null;
  // A stored choice for a client that no longer exists falls back to all.
  const known = clientId === ALL_CLIENTS || clients.some((c) => c.organisation_id === clientId);
  const scope = only ? only.organisation_id : known ? clientId : ALL_CLIENTS;
  const selected = clients.find((c) => c.organisation_id === scope) ?? null;
  return {
    clients,
    /** Every client (or the only one), whatever the selector says: Overview is across all clients. */
    allScope: only ? only.organisation_id : ALL_CLIENTS,
    /** What to send to the server and to filter by: a client id, or ALL. */
    scope,
    /** The client when exactly one is chosen, otherwise null. */
    selected,
    loaded: query.data !== null,
  };
}

/** Whether a record belongs to the chosen scope. Records with no client tag belong to CommunityHub. */
export function inScope(scope: string, item: { organisation_id?: string | null }): boolean {
  return scope === ALL_CLIENTS || (item.organisation_id ?? "COMMUNITYHUB") === scope;
}
