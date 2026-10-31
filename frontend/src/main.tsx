import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./app/store";
import { hydrateBudgets } from "./features/budget/budgetSlice";
import { runSync } from "./features/sync/syncSlice";
import { setUser } from "./features/auth/authSlice";
import { verifyCurrentUser } from "./features/auth/authService";
import { getCachedUser } from "./services/db";
import { setTheme } from "./features/settings/settingsSlice";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useAutoSync } from "./hooks/useAutoSync";
import "./styles/globals.css";
import "./styles/pages.css";
import "./styles/marketing.css";
import "./styles/ui.css";
function Bootstrap() {
  useOnlineStatus();
  useAutoSync();
  return <App />;
}

async function initialize(): Promise<void> {
  const token = localStorage.getItem("bb_token");
  const cachedUser = token ? await getCachedUser() : null;
  if (cachedUser) {
    store.dispatch(setUser(cachedUser));
    await store.dispatch(hydrateBudgets(cachedUser.id)).unwrap();
  } else if (token) {
    localStorage.removeItem("bb_token");
  }
  if (store.getState().settings.theme === "dark")
    store.dispatch(setTheme("dark"));
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Provider store={store}>
        <Bootstrap />
      </Provider>
    </React.StrictMode>,
  );
  if (cachedUser && navigator.onLine) {
    void verifyCurrentUser()
      .then((user) => {
        store.dispatch(setUser(user));
        void store.dispatch(runSync(user.id));
      })
      .catch(() => undefined);
  }
}

void initialize();
