import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  const Icon = toast.type === 'error' ? XCircle : toast.type === 'info' ? Info : CheckCircle2;
  return (
    <div className={`toast toast--${toast.type || 'success'}`} key={toast.id}>
      <Icon size={20} />
      <span>{toast.message}</span>
    </div>
  );
}
