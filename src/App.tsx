import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/app/router';
import { useAppSelector } from '@/app/hooks';
import { useAppDispatch, useAppSelector as useSelector } from '@/app/hooks';
import { setModal } from '@/features/ui/uiSlice';
import { Dialog } from '@/components/ui/primitives';
import { Button } from '@/components/ui/primitives';
export default function App() { const theme = useAppSelector((s) => s.settings.theme); const modal = useSelector((s) => s.ui.openModal); const dispatch = useAppDispatch(); return <><RouterProvider router={router}/><Toaster position="bottom-right" theme={theme} richColors/><Dialog open={modal === 'session-expired'} title="Your session expired" onClose={() => dispatch(setModal(''))}><p>Please sign in again to continue.</p><div className="ui-dialog-actions"><Button onClick={() => { dispatch(setModal('')); window.location.assign('/login'); }}>Sign in</Button></div></Dialog></>; }
