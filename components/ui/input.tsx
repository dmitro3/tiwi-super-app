import * as React from "react";
import { cn } from "@/lib/shared/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md bg-transparent px-3 py-2 text-sm text-[#ffffff] ring-offset-background",
          "border border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
          "placeholder:text-[#7c7c7c] placeholder:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };


