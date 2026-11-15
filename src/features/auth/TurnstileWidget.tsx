// Manage the lifecycle of a single Cloudflare Turnstile challenge.
"use client";

import Script from "next/script";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Button } from "@/components/ui/Button";

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    language: "ar";
    theme: "light";
    action?: string;
    size: "flexible";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    "response-field": false;
  }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window { turnstile?: Turnstile }
}

export type TurnstileHandle = { reset: () => void };

type Props = { onToken: (value: string) => void; ref?: Ref<TurnstileHandle>; action?: "phone_change" };

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ onToken, ref, action }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: Turnstile; id: string }>(null);
  const [scriptState, setScriptState] = useState<"loading" | "ready" | "error">("loading");
  const [widgetFailed, setWidgetFailed] = useState(false);

  function reset() {
    onToken("");
    setWidgetFailed(false);
    if (widget.current) widget.current.api.reset(widget.current.id);
  }

  useImperativeHandle(ref, () => ({ reset }));

  useEffect(() => {
    if (!SITE_KEY || scriptState !== "ready" || !container.current) return;
    const api = window.turnstile;
    if (!api) return;

    const id = api.render(container.current, {
      sitekey: SITE_KEY,
      ...(action ? { action } : {}),
      language: "ar",
      theme: "light",
      size: "flexible",
      "response-field": false,
      callback: (token) => { setWidgetFailed(false); onToken(token); },
      "expired-callback": () => onToken(""),
      "error-callback": () => { onToken(""); setWidgetFailed(true); },
    });
    widget.current = { api, id };

    return () => {
      api.remove(id);
      widget.current = null;
    };
  }, [action, onToken, scriptState]);

  if (!SITE_KEY) return <p className="form-error" role="alert">التحقق الأمني غير متاح حاليًا.</p>;

  return (
    <div className="challenge">
      <Script
        src={SCRIPT_URL}
        strategy="afterInteractive"
        onReady={() => setScriptState(window.turnstile ? "ready" : "error")}
        onError={() => setScriptState("error")}
      />
      <div ref={container} />
      {scriptState === "loading" && <small role="status" className="muted">جاري تحميل التحقق الأمني…</small>}
      {scriptState === "error" && (
        <p className="form-error" role="alert">
          تعذّر تحميل التحقق الأمني.
          <Button variant="text" onClick={() => window.location.reload()}>إعادة تحميل الصفحة</Button>
        </p>
      )}
      {widgetFailed && (
        <p className="form-error" role="alert">
          تعذّر إكمال التحقق الأمني.
          <Button variant="text" onClick={reset}>إعادة التحقق</Button>
        </p>
      )}
    </div>
  );
}
