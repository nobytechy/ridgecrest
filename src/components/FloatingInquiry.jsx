import { useState, useEffect } from 'react';
import { MessageCircle, X, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const HIDDEN_PATHS = [/^\/admin/, /^\/student/, /^\/parent/];

export default function FloatingInquiry() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { if (!open) setDone(false); }, [open]);

  if (HIDDEN_PATHS.some((re) => re.test(pathname))) return null;

  const submit = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !phone.trim()) return toast.error('Name and phone are required.');
    setBusy(true);
    // Public enquiries land as an announcement-style row for staff to triage.
    const { error } = await supabase.from('rc_announcements').insert({
      title: `Enquiry from ${name.trim()}`,
      body: `${phone.trim()}${message.trim() ? ` — ${message.trim()}` : ''}`,
      audience: 'staff',
      type: 'info',
      active: false,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
    setMessage('');
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-rc-800 px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-rc-900/40 ring-4 ring-rc-300/40 transition hover:bg-rc-900 sm:bottom-6 sm:right-6"
            aria-label="Ask a question"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"/>
            </span>
            <MessageCircle size={16}/> Ask us
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-rc-200 bg-white shadow-2xl sm:bottom-6 sm:right-6"
          >
            <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-rc-800 to-rc-950 px-5 py-4 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Talk to us</p>
                <p className="font-display text-lg font-bold">How can we help?</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"><X size={16}/></button>
            </div>

            {done ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={36}/>
                <p className="font-display text-lg font-bold text-rc-900">Got it.</p>
                <p className="mt-1 text-sm text-rc-600">A staff member will be in touch shortly.</p>
                <button onClick={() => setDone(false)} className="mt-4 text-xs font-medium text-rc-700 hover:underline">Ask another question →</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3 p-5">
                <div><label className="mb-1 block text-xs font-medium text-rc-600">Your name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} required/></div>
                <div><label className="mb-1 block text-xs font-medium text-rc-600">Phone or WhatsApp</label>
                  <input className="input" inputMode="tel" placeholder="+263 …" value={phone} onChange={(e) => setPhone(e.target.value)} required/></div>
                <div><label className="mb-1 block text-xs font-medium text-rc-600">Message (optional)</label>
                  <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What would you like to know?"/></div>
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? <Loader2 className="animate-spin" size={14}/> : <Send size={14}/>}
                  {busy ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
