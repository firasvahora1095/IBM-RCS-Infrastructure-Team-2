import { Dropdown } from "@carbon/react";
import { ALL_CLIENTS, useClients, useClientScope } from "../../hooks/useClientScope";

/**
 * The Manager's client selector, at the far end of the section bar so it is on every screen and always in the same
 * place. It scopes everything that belongs to a client: figures, cases, deliveries, reports and Client messages.
 * Auditors, SOS and wellbeing are about people, not clients, so they are never filtered by it (an SOS must never be
 * hidden because the wrong client is selected).
 */
export function ClientSwitcher() {
  const { clients, scope } = useClients();
  const { setClientId } = useClientScope();
  // One client: nothing to switch, but the Manager can still see which client the figures are for.
  if (clients.length <= 1) {
    return clients.length === 1 ? (
      <span className="rcs-client-static" role="region" aria-label="Client filter">
        <span className="rcs-client-label">Client</span> {clients[0].name}
      </span>
    ) : null;
  }
  const items = [{ organisation_id: ALL_CLIENTS, name: "All Clients" }, ...clients];
  return (
    <div className="rcs-client-switcher" role="region" aria-label="Client filter">
      <Dropdown
        id="client-switcher"
        titleText="Client:"
        label="Client:"
        size="sm"
        type="inline"
        items={items}
        itemToString={(c) => (c ? c.name : "")}
        selectedItem={items.find((c) => c.organisation_id === scope)}
        onChange={({ selectedItem }) => selectedItem && setClientId(selectedItem.organisation_id)}
      />
    </div>
  );
}
