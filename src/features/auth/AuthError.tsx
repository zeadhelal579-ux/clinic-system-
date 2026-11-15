// Announce an authentication failure that applies to the whole form.
export function AuthError({ message }: { message?: string }) {
  return message ? <p className="form-error" role="alert">{message}</p> : null;
}
