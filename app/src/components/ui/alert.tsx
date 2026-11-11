import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva("w-full rounded-md border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-line bg-surface text-ink",
      success: "border-success/20 bg-success/10 text-success",
      warning: "border-warn/20 bg-warn/10 text-warn",
      danger: "border-danger/20 bg-danger/10 text-danger",
    },
  },
  defaultVariants: { variant: "default" },
})

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role={variant === "danger" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert, alertVariants }
