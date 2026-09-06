import type { FacilityStaff } from "@pickle-queue/shared";

function App() {
  const staff: FacilityStaff[] = [];

  return (
    <div className="min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold p-4">
        Pickleball Queue - Admin Dashboard
      </h1>
      <p className="px-4">Analytics and system management.</p>
      <p className="px-4">Staff members: {staff.length}</p>
    </div>
  );
}

export default App;
