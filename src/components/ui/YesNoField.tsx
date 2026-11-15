// Group the required yes-or-no choices under their question.
import { useId } from "react";

type Props = { name: string; label: string; value: boolean | null; onChange: (value: boolean) => void };

export function YesNoField({ name, label, value, onChange }: Props) {
  const id = useId();
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="choice-row">
        <label htmlFor={`${id}-yes`}>
          <input id={`${id}-yes`} type="radio" name={name} value="yes" required checked={value === true} onChange={() => onChange(true)} /> نعم
        </label>
        <label htmlFor={`${id}-no`}>
          <input id={`${id}-no`} type="radio" name={name} value="no" checked={value === false} onChange={() => onChange(false)} /> لا
        </label>
      </div>
    </fieldset>
  );
}
