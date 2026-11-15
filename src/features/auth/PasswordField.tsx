// Let users check the password they are entering without changing its form value.
"use client";

import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

export function PasswordField(props: ComponentProps<typeof FormField>) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <FormField {...props} dir="ltr" type={isVisible ? "text" : "password"} />
      <Button
        variant="text"
        className="password-toggle"
        aria-label={`${isVisible ? "إخفاء" : "إظهار"} ${props.label}`}
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? "إخفاء" : "إظهار"}
      </Button>
    </div>
  );
}
