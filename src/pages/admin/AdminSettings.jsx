import { useEffect, useState } from 'react';
import { Loader2, Save, School } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import FileUpload from '@/components/FileUpload';

export default function AdminSettings() {
  const { settings, reload } = useSettings();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (settings) setForm({ ...settings }); }, [settings]);

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('rc_site_settings').update({
      school_name: form.school_name, motto: form.motto, tagline: form.tagline,
      primary_phone: form.primary_phone, whatsapp_phone: form.whatsapp_phone,
      email: form.email, address_line: form.address_line,
      google_maps_url: form.google_maps_url, facebook_url: form.facebook_url, instagram_url: form.instagram_url,
      logo_url: form.logo_url, hero_image_url: form.hero_image_url,
      hero_headline: form.hero_headline, hero_subhead: form.hero_subhead,
      founded_year: form.founded_year ? Number(form.founded_year) : null,
    }).eq('id', 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Saved'); reload();
  };

  if (!form) return <div className="grid h-64 place-items-center text-rc-400"><Loader2 className="animate-spin" size={20}/></div>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">Settings</h1>
        <p className="mt-1 text-sm text-rc-600">School identity, contact, and homepage content.</p>
      </header>

      <form onSubmit={save} className="card mb-6">
        <div className="mb-4 flex items-center gap-2"><School size={16} className="text-rc-700"/>
          <h2 className="font-display text-lg font-bold text-rc-900">School identity</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="School name *"><input className="input" value={form.school_name || ''} onChange={(e) => setForm({...form, school_name: e.target.value})}/></F>
          <F label="Motto"><input className="input" value={form.motto || ''} onChange={(e) => setForm({...form, motto: e.target.value})}/></F>
          <F label="Founded year"><input className="input" type="number" value={form.founded_year || ''} onChange={(e) => setForm({...form, founded_year: e.target.value})}/></F>
          <F label="Tagline"><input className="input" value={form.tagline || ''} onChange={(e) => setForm({...form, tagline: e.target.value})}/></F>
          <F label="Primary phone"><input className="input" value={form.primary_phone || ''} onChange={(e) => setForm({...form, primary_phone: e.target.value})}/></F>
          <F label="WhatsApp"><input className="input" value={form.whatsapp_phone || ''} onChange={(e) => setForm({...form, whatsapp_phone: e.target.value})}/></F>
          <F label="Email"><input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})}/></F>
          <F label="Address"><input className="input" value={form.address_line || ''} onChange={(e) => setForm({...form, address_line: e.target.value})}/></F>
          <F label="Google Maps URL"><input className="input" value={form.google_maps_url || ''} onChange={(e) => setForm({...form, google_maps_url: e.target.value})}/></F>
          <F label="Facebook"><input className="input" value={form.facebook_url || ''} onChange={(e) => setForm({...form, facebook_url: e.target.value})}/></F>
        </div>

        <h3 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wider text-rc-500">Hero (homepage)</h3>
        <div className="grid gap-4">
          <F label="Hero image">
            <FileUpload value={form.hero_image_url || null} onChange={(url) => setForm({...form, hero_image_url: url})} folder="hero" accept="image/*"/>
          </F>
          <F label="Hero headline"><input className="input" value={form.hero_headline || ''} onChange={(e) => setForm({...form, hero_headline: e.target.value})}/></F>
          <F label="Hero sub-headline"><textarea className="input" rows={2} value={form.hero_subhead || ''} onChange={(e) => setForm({...form, hero_subhead: e.target.value})}/></F>
          <F label="Logo">
            <FileUpload value={form.logo_url || null} onChange={(url) => setForm({...form, logo_url: url})} folder="logo" accept="image/*"/>
          </F>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save settings</button>
        </div>
      </form>
    </div>
  );
}
function F({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>{children}</div>);
}
