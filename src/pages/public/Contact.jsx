import { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';

export default function Contact() {
  const { settings } = useSettings();
  const waNumber = (settings?.whatsapp_phone || '+263770000000').replace(/\D/g, '').replace(/^0/, '263');
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy]   = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !phone.trim()) return toast.error('Name and phone are required.');
    setBusy(true);
    const { error } = await supabase.from('rc_announcements').insert({
      title: `Enquiry from ${name.trim()}`,
      body: `Phone: ${phone.trim()}${email.trim() ? ` · Email: ${email.trim()}` : ''}${message.trim() ? `\n\n${message.trim()}` : ''}`,
      audience: 'staff',
      type: 'info',
      active: false,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Thanks — admissions will be in touch shortly.');
    setName(''); setPhone(''); setEmail(''); setMessage('');
  };

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-rc-950 py-20 text-white md:py-24">
        <img src="https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1920&auto=format&fit=crop&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-rc-950/95 via-rc-900/80 to-rc-800/40"/>
        <div className="container-page relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Contact</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
            Talk to us.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-rc-100" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.5)' }}>
            Admissions enquiries, parent meetings, alumni — we answer fast.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <div className="card">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-rc-900 text-white"><Phone size={18}/></div>
                <h3 className="font-display font-semibold text-rc-900">Phone &amp; WhatsApp</h3>
              </div>
              <a href={`tel:${(settings?.primary_phone || '').replace(/\s/g, '')}`} className="block font-display text-lg font-bold text-rc-900 hover:underline">
                {settings?.primary_phone || '+263 77 000 0000'}
              </a>
              <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi Ridgecrest — I'd like to enquire about admissions.")}`}
                 target="_blank" rel="noopener noreferrer"
                 className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline">
                <MessageCircle size={14}/> Chat on WhatsApp
              </a>
            </div>

            <div className="card">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-rc-900 text-white"><Mail size={18}/></div>
                <h3 className="font-display font-semibold text-rc-900">Email</h3>
              </div>
              <a href={`mailto:${settings?.email || 'enquiries@ridgecrest.co.zw'}`} className="text-rc-700 hover:underline">
                {settings?.email || 'enquiries@ridgecrest.co.zw'}
              </a>
            </div>

            <div className="card">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-rc-900 text-white"><MapPin size={18}/></div>
                <h3 className="font-display font-semibold text-rc-900">Visit us</h3>
              </div>
              <p className="text-rc-700">{settings?.address_line || 'Borrowdale, Harare'}</p>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-rc-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="font-display text-2xl font-bold text-rc-900">Send a message</h2>
            <p className="mt-1 text-sm text-rc-600">We&apos;ll get back to you within 24 hours.</p>
            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs font-medium text-rc-600">Name *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} required/></div>
                <div><label className="mb-1 block text-xs font-medium text-rc-600">Phone *</label>
                  <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required/></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-rc-600">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}/></div>
              <div><label className="mb-1 block text-xs font-medium text-rc-600">Message</label>
                <textarea className="input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?"/></div>
              <button type="submit" disabled={busy} className="btn-primary w-full md:w-auto">
                {busy ? <Loader2 className="animate-spin" size={14}/> : null}
                {busy ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
