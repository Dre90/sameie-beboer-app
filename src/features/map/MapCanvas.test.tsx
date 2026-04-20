import { expect, test } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapCanvas } from "./MapCanvas";
import { floor1Geometry } from "./data/geometry";

function noop() {}

test("renders zoom controls at 100%", () => {
  render(<MapCanvas geometry={floor1Geometry} floor={1} selectedId={null} onSelect={noop} />);
  expect(screen.getByRole("button", { name: "Zoom inn" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Zoom ut" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tilbakestill zoom" })).toBeInTheDocument();
  expect(screen.getByLabelText("Zoom-kontroller")).toHaveTextContent("100%");
});

test("clicking zoom-in button steps to 125%", async () => {
  const user = userEvent.setup();
  render(<MapCanvas geometry={floor1Geometry} floor={1} selectedId={null} onSelect={noop} />);
  await user.click(screen.getByRole("button", { name: "Zoom inn" }));
  await waitFor(() => expect(screen.getByLabelText("Zoom-kontroller")).toHaveTextContent("125%"), {
    timeout: 2000,
  });
});

test("clicking zoom-out button from 100% steps to 75%", async () => {
  const user = userEvent.setup();
  render(<MapCanvas geometry={floor1Geometry} floor={1} selectedId={null} onSelect={noop} />);
  await user.click(screen.getByRole("button", { name: "Zoom ut" }));
  await waitFor(() => expect(screen.getByLabelText("Zoom-kontroller")).toHaveTextContent("75%"), {
    timeout: 2000,
  });
});

test("reset returns to 100% after zooming", async () => {
  const user = userEvent.setup();
  render(<MapCanvas geometry={floor1Geometry} floor={1} selectedId={null} onSelect={noop} />);
  await user.click(screen.getByRole("button", { name: "Zoom inn" }));
  await waitFor(() => expect(screen.getByLabelText("Zoom-kontroller")).toHaveTextContent("125%"), {
    timeout: 2000,
  });
  await user.click(screen.getByRole("button", { name: "Tilbakestill zoom" }));
  await waitFor(() => expect(screen.getByLabelText("Zoom-kontroller")).toHaveTextContent("100%"), {
    timeout: 2000,
  });
});
