// Associate a labeled input with its help text and validation message.
import { useId, type ComponentProps } from "react";

type Props = ComponentProps<"input"> & { label: string; hint?: string; error?: string };

export function FormField({ label, hint, error, id, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
      />
      {error ? <small id={messageId} role="alert" className="field-error">{error}</small> :
        hint && <small id={messageId} className="muted">{hint}</small>}
    </div>
  );
}
