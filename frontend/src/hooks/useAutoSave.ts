import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';
export function useAutoSave<T>(value: T, onSave: (value: T) => void) { const [state, setState] = useState<'saved' | 'saving'>('saved'); const debounced = useDebounce(value, 400); useEffect(() => { setState('saving'); const timer = window.setTimeout(() => { onSave(debounced); setState('saved'); }, 20); return () => window.clearTimeout(timer); }, [debounced, onSave]); return state; }
