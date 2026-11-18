import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { ToastProvider } from "./components/ui";

/** Application complète (admin, espace créateur, signature) : client Supabase + session. */
export function FullApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  );
}
