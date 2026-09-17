/**
 * Temporary root component for the scaffold commit — replaced by the real
 * router in Task 1. Uses a Carbon Button so the scaffold check proves Carbon's
 * styles actually load, not just that Vite starts.
 */
import { Button } from "@carbon/react";

export default function App() {
  return (
    <main className="p-8">
      <Button>Carbon is loaded</Button>
    </main>
  );
}
