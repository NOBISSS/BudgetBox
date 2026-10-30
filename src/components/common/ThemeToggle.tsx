import { Moon, Sun } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme } from '@/features/settings/settingsSlice';
export function ThemeToggle() { const theme = useAppSelector((s) => s.settings.theme); const dispatch = useAppDispatch(); return <button className="icon-button" aria-label="Toggle colour theme" onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>; }
