import { CloudOff, Wifi } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
export function OfflineBanner() { const online = useAppSelector((s) => s.ui.isOnline); return <div className={`offline-banner ${online ? 'is-online' : ''}`}><span>{online ? <Wifi size={14}/> : <CloudOff size={14}/>}</span>{online ? 'You’re back online. Your latest edits are ready to sync.' : 'You’re offline. Changes are saved on this device.'}</div>; }
