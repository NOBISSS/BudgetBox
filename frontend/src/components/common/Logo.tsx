import { WalletCards } from 'lucide-react';
export function Logo({ compact = false }: { compact?: boolean }) { return <span className="brand"><span className="brand-icon"><WalletCards size={19}/></span>{!compact && <span>Budget<span className="brand-box">Box</span></span>}</span>; }
