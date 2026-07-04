import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { SEED_DATA } from './seedData';

type ContentType = 'word-category' | 'trivia' | 'identity' | 'phrase' | 'topic';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>('word-category');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({});
  
  // Try to read password from env
  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'partybox-admin';

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === expectedPassword) setAuthenticated(true);
    else alert('Incorrect password');
  }

  async function fetchEntries() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, `content_${activeTab}`));
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      alert('Failed to fetch entries. Check console and security rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) fetchEntries();
  }, [authenticated, activeTab]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const id = form.id || doc(collection(db, `content_${activeTab}`)).id;
      const data = { ...form, type: activeTab };
      delete data.id; // don't save id in document body
      await setDoc(doc(db, `content_${activeTab}`, id), data);
      setForm({});
      fetchEntries();
    } catch (e) {
      console.error(e);
      alert('Save failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, `content_${activeTab}`, id));
      fetchEntries();
    } catch (e) {
      console.error(e);
      alert('Delete failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedDefaults() {
    if (!confirm('This will add ' + SEED_DATA.length + ' default entries to your database. Continue?')) return;
    setLoading(true);
    try {
      for (const item of SEED_DATA) {
        const docRef = doc(collection(db, `content_${item.type}`));
        await setDoc(docRef, item);
      }
      alert('Seed successful!');
      fetchEntries();
    } catch (e) {
      console.error(e);
      alert('Seed failed. Check console.');
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="host-screen p-8">
        <form onSubmit={handleLogin} className="card p-8 w-full max-w-md shadow-magenta">
          <h2 className="font-bebas text-4xl mb-6 text-spray text-center">ADMIN LOGIN</h2>
          <input 
            type="password" 
            placeholder="Admin Password"
            className="input-field mb-6 text-center"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-full">LOGIN</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-concrete text-white p-8 font-grotesk">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-bebas text-5xl text-spray">CONTENT ADMIN</h1>
          <button onClick={handleSeedDefaults} className="btn-secondary text-sm px-4 py-2" disabled={loading}>
            {loading ? 'SEEDING...' : 'SEED DEFAULTS'}
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/10">
          {(['word-category', 'trivia', 'identity', 'phrase', 'topic'] as ContentType[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setForm({}); }}
              className={`px-4 py-2 font-bebas text-xl tracking-wider transition-colors whitespace-nowrap rounded-t-sm
                ${activeTab === tab ? 'bg-spray text-black' : 'text-white/50 hover:bg-white/5'}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="col-span-1">
            <div className="card p-6 shadow-cyan sticky top-8">
              <h3 className="font-bebas text-2xl mb-4 text-cyan">{form.id ? 'EDIT ENTRY' : 'NEW ENTRY'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Dynamic fields based on activeTab */}
                {activeTab === 'word-category' && (
                  <>
                    <div><label className="section-label">Category</label><input required className="input-field mt-1" value={form.category||''} onChange={e=>setForm({...form, category: e.target.value})} /></div>
                    <div><label className="section-label">Word</label><input required className="input-field mt-1" value={form.word||''} onChange={e=>setForm({...form, word: e.target.value})} /></div>
                    <div><label className="section-label">Mole Word</label><input required className="input-field mt-1" value={form.moleWord||''} onChange={e=>setForm({...form, moleWord: e.target.value})} /></div>
                    <div><label className="section-label">Difficulty (1-3)</label><input type="number" required min="1" max="3" className="input-field mt-1" value={form.difficulty||1} onChange={e=>setForm({...form, difficulty: parseInt(e.target.value)})} /></div>
                  </>
                )}

                {activeTab === 'trivia' && (
                  <>
                    <div><label className="section-label">Category</label><input required className="input-field mt-1" value={form.category||''} onChange={e=>setForm({...form, category: e.target.value})} /></div>
                    <div><label className="section-label">Question</label><textarea required className="input-field mt-1" value={form.question||''} onChange={e=>setForm({...form, question: e.target.value})} /></div>
                    <div><label className="section-label">Real Answer</label><input required className="input-field mt-1" value={form.answer||''} onChange={e=>setForm({...form, answer: e.target.value})} /></div>
                    <div><label className="section-label">Difficulty (1-3)</label><input type="number" required min="1" max="3" className="input-field mt-1" value={form.difficulty||1} onChange={e=>setForm({...form, difficulty: parseInt(e.target.value)})} /></div>
                  </>
                )}

                {activeTab === 'identity' && (
                  <>
                    <div><label className="section-label">Name</label><input required className="input-field mt-1" value={form.name||''} onChange={e=>setForm({...form, name: e.target.value})} /></div>
                    <div><label className="section-label">Category</label><input required className="input-field mt-1" value={form.category||''} onChange={e=>setForm({...form, category: e.target.value})} /></div>
                    <div><label className="section-label">Era</label><input required className="input-field mt-1" value={form.era||''} onChange={e=>setForm({...form, era: e.target.value})} /></div>
                    <div><label className="section-label">Nationality</label><input required className="input-field mt-1" value={form.nationality||''} onChange={e=>setForm({...form, nationality: e.target.value})} /></div>
                    <div>
                      <label className="section-label">Hint Tags (comma separated)</label>
                      <input required className="input-field mt-1" value={form.hintTags ? form.hintTags.join(', ') : ''} onChange={e=>setForm({...form, hintTags: e.target.value.split(',').map(s=>s.trim())})} />
                    </div>
                  </>
                )}

                {activeTab === 'phrase' && (
                  <>
                    <div><label className="section-label">Phrase</label><input required className="input-field mt-1" value={form.phrase||''} onChange={e=>setForm({...form, phrase: e.target.value})} /></div>
                    <div><label className="section-label">Difficulty (1-3)</label><input type="number" required min="1" max="3" className="input-field mt-1" value={form.difficulty||1} onChange={e=>setForm({...form, difficulty: parseInt(e.target.value)})} /></div>
                  </>
                )}

                {activeTab === 'topic' && (
                  <>
                    <div><label className="section-label">Topic</label><input required className="input-field mt-1" value={form.topic||''} onChange={e=>setForm({...form, topic: e.target.value})} /></div>
                    <div>
                      <label className="section-label">Examples (comma separated)</label>
                      <input required className="input-field mt-1" value={form.examples ? form.examples.join(', ') : ''} onChange={e=>setForm({...form, examples: e.target.value.split(',').map(s=>s.trim())})} />
                    </div>
                    <div><label className="section-label">Difficulty (1-3)</label><input type="number" required min="1" max="3" className="input-field mt-1" value={form.difficulty||1} onChange={e=>setForm({...form, difficulty: parseInt(e.target.value)})} /></div>
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-lg">SAVE</button>
                  {form.id && <button type="button" onClick={() => setForm({})} className="btn-secondary px-4">CANCEL</button>}
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            {loading && entries.length === 0 && <div className="font-bebas text-2xl text-white/40 animate-pulse">LOADING...</div>}
            {entries.length === 0 && !loading && <div className="font-bebas text-2xl text-white/20">NO ENTRIES FOUND. CLICK SEED DEFAULTS TO POPULATE.</div>}
            
            {entries.map(entry => (
              <div key={entry.id} className="card p-4 flex justify-between items-start hover:border-white/30 transition-colors">
                <div className="text-sm font-grotesk break-words pr-4">
                  <pre className="whitespace-pre-wrap text-white/70">{JSON.stringify(entry, null, 2)}</pre>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => setForm(entry)} className="font-marker text-cyan text-sm hover:text-white">EDIT</button>
                  <button onClick={() => handleDelete(entry.id)} className="font-marker text-magenta text-sm hover:text-white">DEL</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
