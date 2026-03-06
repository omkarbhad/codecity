import { redirect } from 'next/navigation';

// Auth is now centralized at auth.magnova.ai
export default function LoginPage() {
  redirect('https://auth.magnova.ai/codecity');
}
