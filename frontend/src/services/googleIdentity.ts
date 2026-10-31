interface GoogleCodeResponse {
  code?: string;
  error?: string;
  error_description?: string;
}

interface GoogleCodeClient {
  requestCode(): void;
}

interface GoogleIdentityApi {
  accounts: {
    oauth2: {
      initCodeClient(options: {
        client_id: string;
        scope: string;
        ux_mode: "popup";
        callback(response: GoogleCodeResponse): void;
        error_callback?(error: { type: string; message?: string }): void;
      }): GoogleCodeClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
let scriptLoad: Promise<void> | undefined;

export function isGoogleSignInConfigured(): boolean {
  return clientId.length > 0;
}

export function loadGoogleIdentity(): Promise<void> {
  if (!clientId)
    return Promise.reject(new Error("Google client ID is missing"));
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (scriptLoad) return scriptLoad;

  scriptLoad = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    const script = existing ?? document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts.oauth2) resolve();
      else reject(new Error("Google sign-in could not be initialized"));
    };
    script.onerror = () => {
      scriptLoad = undefined;
      reject(new Error("Google sign-in library could not be loaded"));
    };
    if (!existing) document.head.append(script);
  });
  return scriptLoad;
}

export function requestGoogleAuthorizationCode(
  onCode: (code: string) => void,
  onError: (message: string) => void,
): void {
  if (!window.google?.accounts.oauth2 || !clientId) {
    onError("Google sign-in is not ready. Please try again.");
    return;
  }

  const client = window.google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: "openid email profile",
    ux_mode: "popup",
    callback: (response) => {
      if (response.error || !response.code) {
        onError(response.error_description ?? "Google sign-in was cancelled.");
        return;
      }
      onCode(response.code);
    },
    error_callback: (error) => {
      onError(
        error.type === "popup_closed"
          ? ""
          : (error.message ?? "Google sign-in could not be completed."),
      );
    },
  });
  client.requestCode();
}
