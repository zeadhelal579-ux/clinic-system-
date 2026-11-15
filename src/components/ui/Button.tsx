// Provide the clinic's submit and secondary button styles.
import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & { variant?: "primary" | "secondary" | "text" };

export function Button({ variant = "primary", type = "button", className = "", ...props }: Props) {
  return <button {...props} type={type} className={`button button--${variant} ${className}`} />;
}
