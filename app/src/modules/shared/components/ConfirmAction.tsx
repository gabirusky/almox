import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmAction({
  title,
  description,
  confirmLabel,
  onConfirm,
  triggerLabel,
  variant = "secondary",
  disabled,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  triggerLabel: string;
  variant?: "secondary" | "destructive" | "outline";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        {triggerLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-md rounded-lg border bg-white p-4 shadow-lg">
            <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-gray-700">{description}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
              <Button
                type="button"
                variant={variant === "destructive" ? "destructive" : "default"}
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Processando..." : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
