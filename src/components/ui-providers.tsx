"use client";

import { ToastProvider } from "./toast";
import { ConfirmProvider } from "./confirm";
import { PromptProvider } from "./prompt";

export default function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <PromptProvider>{children}</PromptProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
