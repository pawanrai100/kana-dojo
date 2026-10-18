import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// chunky buttons that sit on a solid shadow and sink when pressed
const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_5px_0_var(--primary-deep)] hover:brightness-110 active:shadow-[0_2px_0_var(--primary-deep)]",
        secondary:
          "bg-primary-soft text-primary shadow-[0_4px_0_var(--border)] hover:brightness-[0.98] active:shadow-[0_1px_0_var(--border)]",
        outline:
          "bg-surface text-foreground shadow-[0_4px_0_var(--border)] ring-2 ring-inset ring-border hover:bg-surface-2/40 active:shadow-[0_1px_0_var(--border)]",
        ghost: "text-foreground hover:bg-surface-2 active:translate-y-0",
        sun: "bg-sun text-sun-ink shadow-[0_5px_0_var(--sun-deep)] hover:brightness-105 active:shadow-[0_2px_0_var(--sun-deep)]",
        danger: "bg-bad text-white shadow-[0_5px_0_var(--bad-deep)] hover:brightness-110 active:shadow-[0_2px_0_var(--bad-deep)]",
      },
      size: {
        default: "h-11 rounded-2xl px-5 text-[15px]",
        sm: "h-9 rounded-xl px-3.5 text-sm",
        lg: "h-14 rounded-[1.1rem] px-7 text-lg",
        icon: "size-11 rounded-2xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
