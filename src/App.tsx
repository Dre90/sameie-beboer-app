import { AuthProvider, RequireAuth } from "@/features/auth";
import { FilterDay } from "@/features/filter-day";

export function App() {
  return (
    <AuthProvider>
      <RequireAuth>
        <FilterDay />
      </RequireAuth>
    </AuthProvider>
  );
}
