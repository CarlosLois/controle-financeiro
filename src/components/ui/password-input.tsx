import * as React from "react";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      setCapsLockOn(e.getModifierState("CapsLock"));
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      setCapsLockOn(e.getModifierState("CapsLock"));
    };

    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        {capsLockOn && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            ⚠ Caps Lock está ativado
          </p>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
