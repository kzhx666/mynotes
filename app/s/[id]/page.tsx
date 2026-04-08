"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { marked } from 'marked';

const transformer = new Transformer();

export default function StudentPage() {
  const params = useParams();
  const [note, setNote] = useState<any>(null);
  const [tab, setTab] = useState<'doc' | 'map'>('doc');
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/notes`).then(res => res.json()).then(data => {
      const found = data.find((n: any) => n.id === params.id);
      setNote(found);
    });
  }, [params.id]);

  const renderHTML = (text: string) => {
    if (!text) return '';
    try {
      let html = marked.parse(text) as string;
      return html.replace(/==([^=]+)==/g, '<mark class="premium-highlight">$1</mark>');
    } catch (e) { return text; }
  };

  const transformForMarkmap = (md: string) => {
    if (!md) return '';
    const lines = md.split('\n');
    let processed = [];
    let tableHeaders: string[] = [];

    for (let line of lines) {
      let t = line.trim();
      if (!t) continue;
      if (t.startsWith('|')) {
        if (t.includes('---')) continue;
        const cells = t.split('|').map(c => c.trim()).filter(c => c !== "");
        if (cells.length > 0) {
          if (tableHeaders.length === 0) { tableHeaders = cells; processed.push(`- 📊 数据表格`); } 
          else {
            processed.push(`  - ${cells[0]}`);
            cells.slice(1).forEach((cell, idx) => { if (cell) processed.push(`    - ${tableHeaders[idx + 1] || '属性'}：${cell}`); });
          }
        }
        continue;
      } else { if (t !== "") tableHeaders = []; }
      if (t.startsWith('>')) { processed.push(`- 💡 ${t.replace(/^>\s*/, '').replace(/\[!.*?\]/, '')}`); continue; }
      // 忽略图片，防止破坏导图
      if (t.startsWith('![')) continue; 
      if (!t.startsWith('#') && !t.startsWith('-') && !t.startsWith('*') && t.length > 30 && t.includes('。')) {
        const parts = t.split('。').filter(p => p.trim());
        processed.push(`- ${parts[0]}。`); parts.slice(1).forEach(p => processed.push(`  - ${p}。`));
        continue;
      }
      processed.push(t.startsWith('#') || t.startsWith('-') ? t : `- ${t}`);
    }
    return processed.join('\n').replace(/==([^=]+)==/g, '<span style="color:#dc2626; background:#fee2e2; padding:0 4px; border-radius:4px; font-weight:bold;">$1</span>');
  };

  useEffect(() => {
    if (tab === 'map' && note && svgRef.current) {
      const cleanContent = transformForMarkmap(note.content);
      const { root } = transformer.transform(cleanContent);
      if (mmRef.current) mmRef.current.destroy();
      mmRef.current = Markmap.create(svgRef.current, { autoFit: true, duration: 400, paddingX: 40 }, root);
    }
  }, [tab, note]);

  if (!note) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', background:'#f8fafc', fontSize:'18px', fontWeight:'bold'}}>读取课件中...</div>;

  const premiumCSS = `
    body { background-color: #f8fafc; background-image: radial-gradient(at 0% 0%, hsla(213, 100%, 85%, 0.5) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(253, 100%, 85%, 0.5) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(200, 100%, 85%, 0.5) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(220, 100%, 85%, 0.5) 0px, transparent 50%); background-attachment: fixed; }
    .glass-nav { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03); }
    .glass-container { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); border-radius: 24px; padding: 50px 60px; margin: 40px auto; width: 95%; max-width: 1400px; }
    
    .preview-content img { max-width: 100%; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin: 32px auto; display: block; }
    .preview-content h1 { background: linear-gradient(135deg, #0f172a, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 40px; font-weight: 900; text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.05); letter-spacing: 2px; }
    .preview-content h2 { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 48px; margin-bottom: 24px; display: flex; alignItems: center; }
    .preview-content h2::before { content: ''; display: inline-block; width: 6px; height: 24px; background: linear-gradient(to bottom, #3b82f6, #60a5fa); margin-right: 14px; border-radius: 4px; }
    .preview-content p { font-size: 17px; line-height: 1.9; color: #334155; margin-bottom: 24px; }
    .preview-content blockquote { background: linear-gradient(to right, rgba(59,130,246,0.1), rgba(59,130,246,0.02)); border-left: 4px solid #3b82f6; padding: 20px 24px; border-radius: 0 16px 16px 0; margin: 32px 0; font-size: 16px; color: #1e293b; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
    .preview-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 32px 0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); }
    .preview-content th, .preview-content td { padding: 16px 24px; text-align: left; }
    .preview-content th { background: #f8fafc; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;}
    .preview-content td { background: #ffffff; border-bottom: 1px solid #f1f5f9; color: #475569; }
    .preview-content tr:last-child td { border-bottom: none; }
    .preview-content tr:hover td { background: #f8fafc; transition: 0.2s; }
    .preview-content ul, .preview-content ol { padding-left: 28px; margin-bottom: 24px; color: #475569; line-height: 1.9; font-size: 17px; }
    .preview-content li { margin-bottom: 12px; }
    .preview-content li::marker { color: #3b82f6; font-weight: bold; }
    
    .premium-highlight { background: linear-gradient(120deg, #fee2e2 0%, #fecaca 100%); color: #dc2626; padding: 2px 8px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.1); }
    
    .nav-btn { padding: 8px 24px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .nav-btn.active { background: #ffffff; color: #2563eb; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
    .nav-btn.inactive { background: transparent; color: #64748b; }
    .nav-btn.inactive:hover { color: #334155; background: rgba(255,255,255,0.5); }
  `;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{premiumCSS}</style>
      
      <header className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 40px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '10px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' }}>MN</div>
           <span style={{ fontWeight: '800', fontSize: '20px', color: '#0f172a', letterSpacing: '1px' }}>建筑材料教案系统</span>
        </div>
        <div style={{ display: 'flex', background: 'rgba(226, 232, 240, 0.5)', padding: '6px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setTab('doc')} className={`nav-btn ${tab === 'doc' ? 'active' : 'inactive'}`}>📖 沉浸阅读</button>
          <button onClick={() => setTab('map')} className={`nav-btn ${tab === 'map' ? 'active' : 'inactive'}`}>🧠 结构导图</button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {tab === 'doc' ? (
          <div style={{ padding: '20px' }}>
            <div className="glass-container preview-content">
               <div dangerouslySetInnerHTML={{ __html: renderHTML(note.content) }} />
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: 'calc(100vh - 80px)', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)' }}>
             <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </main>
    </div>
  );
}
