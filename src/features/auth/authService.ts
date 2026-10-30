import type { User } from '@/types';
const delay = () => new Promise((resolve) => window.setTimeout(resolve, 650));
// TODO: connect to real backend
export async function login(email: string, _password: string): Promise<User> { await delay(); return { id: 'demo', name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), email }; }
// TODO: connect to real backend
export async function register(name: string, email: string, _password: string): Promise<User> { await delay(); return { id: crypto.randomUUID(), name, email }; }
