import { afterEach, expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { UnitInfo } from "./UnitInfo";
import type { Apartment, Townhouse } from "../data/units";

const unitGetMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    units: {
      get: (...args: unknown[]) => unitGetMock(...args),
    },
  },
}));

afterEach(() => vi.clearAllMocks());

function seedUnit(
  overrides: Partial<{
    is_rented: boolean;
    owner_name: string | null;
    owner_email: string | null;
    owner_phone: string | null;
    residents: Array<{
      id: number;
      unit_id: string;
      name: string;
      email: string | null;
      phone: string | null;
      created_at: string;
    }>;
  }> = {},
) {
  unitGetMock.mockResolvedValue({
    unit: {
      id: "X",
      is_rented: overrides.is_rented ?? false,
      owner_name: overrides.owner_name ?? null,
      owner_email: overrides.owner_email ?? null,
      owner_phone: overrides.owner_phone ?? null,
      updated_at: "",
      residents: overrides.residents ?? [],
    },
    residents: overrides.residents ?? [],
  });
}

test("renders apartment with building + floor", async () => {
  seedUnit();
  const unit: Apartment = { id: "A11", building: "A", floor: 1, label: "A11" };
  render(<UnitInfo unit={unit} />);
  expect(screen.getByRole("heading", { level: 2, name: "A11" })).toBeInTheDocument();
  expect(screen.getByText("Bygg A — 1. etg")).toBeInTheDocument();
  expect(await screen.findByText(/ingen beboere registrert/i)).toBeInTheDocument();
});

test("renders townhouse with rekkehus label (no floor)", async () => {
  seedUnit();
  const unit: Townhouse = { id: "C3", building: "C", label: "C3" };
  render(<UnitInfo unit={unit} />);
  expect(screen.getByRole("heading", { level: 2, name: "C3" })).toBeInTheDocument();
  expect(screen.getByText("Rekkehus C (alle etasjer)")).toBeInTheDocument();
  expect(await screen.findByText(/ingen beboere registrert/i)).toBeInTheDocument();
});

test("renders residents and rental owner info", async () => {
  seedUnit({
    is_rented: true,
    owner_name: "Kari Eier",
    owner_phone: "99999999",
    owner_email: "kari@x",
    residents: [
      {
        id: 1,
        unit_id: "A11",
        name: "Per Beboer",
        email: "per@x",
        phone: "12345678",
        created_at: "",
      },
    ],
  });
  const unit: Apartment = { id: "A11", building: "A", floor: 1, label: "A11" };
  render(<UnitInfo unit={unit} />);
  expect(await screen.findByText("Per Beboer")).toBeInTheDocument();
  expect(screen.getByText("12345678")).toBeInTheDocument();
  expect(screen.getByText("Kari Eier")).toBeInTheDocument();
  expect(screen.getByText("99999999")).toBeInTheDocument();
});
