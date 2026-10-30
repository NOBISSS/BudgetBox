import { WifiOff } from 'lucide-react';
export function AuthNotice({ online }: { online: boolean }) { return online ? null : <div className="inline-alert amber"><WifiOff size={16}/> You’re offline. Sign-in needs an internet connection.</div>; }
