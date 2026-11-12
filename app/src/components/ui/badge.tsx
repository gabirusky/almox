import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        default: "border-line bg-bg text-ink",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warn/20 bg-warn/10 text-warn",
        danger: "border-danger/20 bg-danger/10 text-danger",
        muted: "border-line bg-bg text-muted",
        signal: "border-signal/20 bg-signal/10 text-signal",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
