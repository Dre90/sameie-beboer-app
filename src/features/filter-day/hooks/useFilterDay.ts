import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { filterApi } from "@/lib/filter-api";
import type { Overview, UnitStatus } from "@/lib/filter-types";

export function useFilterDay() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const locked = useRef(false);
  const generation = useRef(0);

  async function reload() {
    if (locked.current) return;
    const requestGeneration = ++generation.current;
    setBusy(true);
    try {
      const data = await filterApi.overview();
      if (requestGeneration !== generation.current) return;
      setOverview(data);
      setError("");
      setStale(false);
    } catch (failure) {
      if (requestGeneration !== generation.current) return;
      setError(failure instanceof Error ? failure.message : "Kunne ikke hente status");
      setStale(true);
    } finally {
      if (requestGeneration === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, []);

  async function save(operation: () => Promise<{ unit: UnitStatus }>) {
    if (locked.current || busy || stale) return;
    locked.current = true;
    generation.current++;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { unit } = await operation();
      setOverview(
        (current) =>
          current && {
            ...current,
            units: current.units.map((existing) => (existing.id === unit.id ? unit : existing)),
          },
      );
      setMessage(`${unit.id}: Lagret`);
      try {
        setOverview(await filterApi.overview());
      } catch {
        setStale(true);
        setError("Endringen er lagret, men oversikten kunne ikke oppdateres. Hent ny status.");
      }
    } catch (failure) {
      setStale(true);
      setError(
        failure instanceof ApiError && failure.status === 409
          ? "En annen har endret leiligheten. Hent ny status før du prøver igjen."
          : "Lagring kunne ikke bekreftes. Hent ny status før du prøver igjen.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return { overview, error, message, busy, stale, reload, save, setError, setMessage };
}
