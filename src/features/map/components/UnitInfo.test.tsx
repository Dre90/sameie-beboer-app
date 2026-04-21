import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { UnitInfo } from "./UnitInfo";
import type { Apartment, Townhouse } from "../data/units";

test("renders apartment with building + floor", () => {
  const unit: Apartment = { id: "A11", building: "A", floor: 1, label: "A11" };
  render(<UnitInfo unit={unit} />);
  expect(screen.getByRole("heading", { level: 2, name: "A11" })).toBeInTheDocument();
  expect(screen.getByText("Bygg A — 1. etg")).toBeInTheDocument();
});

test("renders townhouse with rekkehus label (no floor)", () => {
  const unit: Townhouse = { id: "C3", building: "C", label: "C3" };
  render(<UnitInfo unit={unit} />);
  expect(screen.getByRole("heading", { level: 2, name: "C3" })).toBeInTheDocument();
  expect(screen.getByText("Rekkehus C (alle etasjer)")).toBeInTheDocument();
});
