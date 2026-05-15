import { useState } from 'react';
import { Upload, FileText, X, Loader2, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function FileUpload({
  value, onChange,
  bucket = 'rc-public', folder = 'misc',
  accept = 'image/*', label = 'Click or drop file to upload',
  variant = 'image', maxMB = 10, className = '',
}) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) return toast.error(`File too large — max ${maxMB} MB.`);
    setBusy(true);
    const safe = file.name.replace(/[^\w.-]+/g, '_').slice(0, 60);
    const path = `${folder}/${crypto.randomUUID()}-${safe}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setBusy(false); return toast.error(error.message || 'Upload failed'); }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
    toast.success('Uploaded');
  };

  if (variant === 'image') {
    if (value) {
      return (
        <div className={`relative aspect-video overflow-hidden rounded-lg border border-rc-200 bg-rc-50 ${className}`}>
          <img src={value} alt="" className="h-full w-full object-cover"/>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-rc-900/80 to-transparent p-2 text-xs text-white">
            <span className="inline-flex items-center gap-1"><ImageIcon size={11}/> Uploaded</span>
            <div className="flex gap-1">
              <label className="cursor-pointer rounded-md bg-white/15 px-2 py-1 hover:bg-white/30">
                Replace
                <input type="file" accept={accept} className="sr-only" onChange={(e) => upload(e.target.files?.[0])}/>
              </label>
              <button type="button" onClick={() => onChange(null)} className="rounded-md bg-rose-500/80 px-2 py-1 hover:bg-rose-500"><X size={12}/></button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
        className={`flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition ${drag ? 'border-rc-700 bg-rc-100' : 'border-rc-300 bg-rc-50 hover:border-rc-500 hover:bg-rc-100'} ${className}`}
      >
        <input type="file" accept={accept} className="sr-only" onChange={(e) => upload(e.target.files?.[0])}/>
        {busy ? <Loader2 className="animate-spin text-rc-700" size={28}/> : <Upload className="text-rc-500" size={28}/>}
        <p className="text-sm font-medium text-rc-700">{busy ? 'Uploading…' : label}</p>
        <p className="text-[10px] text-rc-400">JPG, PNG, WebP · up to {maxMB} MB</p>
      </label>
    );
  }

  // Document variant
  if (value) {
    const filename = decodeURIComponent(value.split('/').pop() || 'document');
    return (
      <div className={`flex items-center justify-between gap-3 rounded-lg border border-rc-200 bg-rc-50 p-3 text-sm ${className}`}>
        <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-2 truncate text-rc-700 hover:underline">
          <FileText size={16} className="shrink-0"/>
          <span className="truncate">{filename.replace(/^[\w-]+-/, '')}</span>
        </a>
        <button type="button" onClick={() => onChange(null)} className="rounded-md p-1 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><X size={14}/></button>
      </div>
    );
  }
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 text-sm transition ${drag ? 'border-rc-700 bg-rc-100' : 'border-rc-300 bg-rc-50 hover:border-rc-500 hover:bg-rc-100'} ${className}`}
    >
      <input type="file" accept={accept} className="sr-only" onChange={(e) => upload(e.target.files?.[0])}/>
      {busy ? <Loader2 className="animate-spin text-rc-700" size={18}/> : <Upload className="text-rc-500" size={18}/>}
      <span className="font-medium text-rc-700">{busy ? 'Uploading…' : label}</span>
    </label>
  );
}
