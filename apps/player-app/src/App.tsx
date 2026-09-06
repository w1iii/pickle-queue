import { useState } from "react";
import type { QueueEntry } from "@pickle-queue/shared";

function App() {
  const [entry] = useState<QueueEntry | null>(null);

  return (
    <div>
      <h1>Pickleball Queue - Player App</h1>
      <p>Check in and find your next game.</p>
      {entry && <p>Position: {entry.position}</p>}
    </div>
  );
}

export default App;
