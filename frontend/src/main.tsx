import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './app/store';
import { hydrateBudgets } from './features/budget/budgetSlice';
import { setTheme } from './features/settings/settingsSlice';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import './styles/globals.css';
import './styles/pages.css';
import './styles/marketing.css';
import './styles/ui.css';
function Bootstrap() { useOnlineStatus(); return <App />; }
void store.dispatch(hydrateBudgets());
if (store.getState().settings.theme === 'dark') store.dispatch(setTheme('dark'));
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Provider store={store}><Bootstrap /></Provider></React.StrictMode>);
