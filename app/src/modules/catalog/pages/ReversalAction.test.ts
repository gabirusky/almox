// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReversalAction } from "./ReversalAction";
import { reverseMovement } from "../services/catalog-api";
import type { StockMovement, ReversalResult } from "../types";

vi.mock("../services/catalog-api", () => ({ reverseMovement: vi.fn() }));
const movement = {
  id: "original", product_id: "product", kind: "SAIDA", delta: "-4.000", product_version: 2,
} as StockMovement;
const result: ReversalResult = {
  movement_id: "reversal", reversal_of: "original", product_id: "product",
  delta: "4.000", balance: "10.000", version: 3, kind: "ESTORNO",
};
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(createElement(QueryClientProvider, { client }, createElement(ReversalAction, { movement, unit: "UN" })));
  fireEvent.click(screen.getByRole("button", { name: "Estornar" }));
  fireEvent.change(screen.getByLabelText("Justificativa"), { target: { value: "Entrega incorreta" } });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("RF09 reversal confirmation and replay", () => {
  it("does not submit when the administrator cancels confirmation", () => {
    setup();
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar estorno" }));
    expect(reverseMovement).not.toHaveBeenCalled();
  });
  it("retries the same operation key after a lost response", async () => {
    vi.mocked(reverseMovement).mockRejectedValueOnce(new Error("NetworkError")).mockResolvedValueOnce(result);
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar estorno" }));
    await screen.findByText(/Falha de conexão/);
    await waitFor(() => expect((screen.getByRole("button", { name: "Confirmar estorno" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar estorno" }));
    await screen.findByText(/Estorno reversal confirmado/);
    const calls = vi.mocked(reverseMovement).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]).toEqual(calls[1]?.[0]);
    expect(calls[0]?.[0].operationKey).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Estornar" })).toBeNull();
  });
  it("suppresses a second submission while the first is pending", async () => {
    let complete!: (value: ReversalResult) => void;
    vi.mocked(reverseMovement).mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    setup();
    const form = screen.getByLabelText("Justificativa").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(reverseMovement).toHaveBeenCalledTimes(1));
    complete(result);
    await screen.findByText(/Estorno reversal confirmado/);
  });
});
