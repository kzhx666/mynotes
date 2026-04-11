"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Menu, FileText, Layout, Monitor, Share2, MoreVertical, Trash2, Edit2, Folder, ChevronRight, ChevronDown, FolderPlus, FilePlus, Download, FileCode, Search, Move, LogOut, ArrowUp, ArrowDown } from 'lucide-react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { marked } from 'marked';

const transformer = new Transformer();

const loadKaTeX = () => {
  return new Promise((resolve) => {
    if ((window as any).renderMathInElement) return resolve(true);
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    script.onload = () => {
      const autoRender = document.createElement('script');
      autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
      autoRender.onload = () => resolve(true);
      document.head.appendChild(autoRender);
    };
    document.head.appendChild(script);
  });
};

export default function EditorContainer() {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'editor' | 'preview'>('both');
  const [showMindmap, setShowMindmap] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [menuState, setMenuState] = useState<{ id: string, x: number, y: number, is_folder: boolean, note: any, mode: 'default' | 'move' } | null>(null);
  const [saveStatus, setSaveStatus] = useState(''); 
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const vditorRef = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<any>(null);
  const activeNoteRef = useRef<any>(null); 

  useEffect(() => { 
    activeNoteRef.current = activeNote; 
    if (activeNote) setPreviewContent(activeNote.content || '');
  }, [activeNote]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false); 
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadData = async () => {
    try {
      const r = await fetch('/api/notes');
      const data = await r.json();
      setNotes(data);
      if (data.length && !activeNoteRef.current) {
        const first = data.find((n:any) => !n.is_folder);
        setActiveNote(first || data[0]);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  const renderHTML = (text: string) => {
    if (!text) return '';
    try {
      let processedText = text;
      const mathBlocks: string[] = [];
      processedText = processedText.replace(/\$\$(.*?)\$\$/gs, (match) => {
        mathBlocks.push(match);
        return `BLOCKMATHMARKER${mathBlocks.length - 1}ENDMARKER`;
      });
      processedText = processedText.replace(/\$(.*?)\$/g, (match) => {
        mathBlocks.push(match);
        return `INLINEMATHMARKER${mathBlocks.length - 1}ENDMARKER`;
      });
      let html = marked.parse(processedText) as string;
      html = html.replace(/==([^=]+)==/g, '<mark style="background:#fee2e2;color:#dc2626;padding:0 4px;border-radius:4px;font-weight:bold">$1</mark>');
      html = html.replace(/BLOCKMATHMARKER(\d+)ENDMARKER/g, (match, p1) => mathBlocks[p1]);
      html = html.replace(/INLINEMATHMARKER(\d+)ENDMARKER/g, (match, p1) => mathBlocks[p1]);
      return html;
    } catch (e) { return text; }
  };

  const transformForMarkmap = (md: string) => {
    if (!md) return '';
    let cleanMd = md.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, p1) => {
      return '$' + p1.replace(/\n/g, ' ') + '$';
    });
    cleanMd = cleanMd.replace(/\$\$/g, '$');

    const lines = cleanMd.split('\n');
    let processed = [];
    let tableHeaders: string[] = [];

    for (let line of lines) {
      let rawLine = line;
      let t = rawLine.trim();
      if (!t) continue;

      // 保留原文缩进，维持父子节点层次
      const indentMatch = rawLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';

      if (t.startsWith('|')) {
        if (t.includes('---')) continue; 
        const cells = t.split('|').map(c => c.trim()).filter(c => c !== "");
        if (cells.length > 0) {
          if (tableHeaders.length === 0) { tableHeaders = cells; processed.push(`${indent}- 📊 数据表格`); } 
          else {
            processed.push(`${indent}  - ${cells[0]}`);
            cells.slice(1).forEach((cell, idx) => { if (cell) processed.push(`${indent}    - ${tableHeaders[idx + 1] || '属性'}：${cell}`); });
          }
        }
        continue;
      } else { if (t !== "") tableHeaders = []; }

      if (t.startsWith('>')) { processed.push(`${indent}- 💡 ${t.replace(/^>\s*/, '').replace(/\[!.*?\]/, '')}`); continue; }
      if (t.startsWith('![')) continue; 

      if (t.startsWith('#')) { processed.push(rawLine); continue; }

      // 【核心升级】：识别纯加粗短文本（如：**3. 耐水性**），强制转为真正的标题节点
      if (t.startsWith('**') && t.endsWith('**') && t.length < 80) {
          processed.push(`${indent}##### ${t}`);
          continue;
      }
      
      // 【核心升级】：识别顶格的数字标号伪标题（如：6. 填充率与空隙率）
      if (/^\d+\.\s/.test(t) && !rawLine.startsWith(' ') && !t.startsWith('**')) {
          processed.push(`##### **${t}**`);
          continue;
      }

      // 若已经是列表，则完美保留缩进
      if (t.startsWith('- ') || t.startsWith('* ') || /^\d+\.\s/.test(t)) {
          processed.push(rawLine);
          continue;
      }

      // 长句拆分保留缩进
      if (t.length > 30 && t.includes('。')) {
        const parts = t.split('。').filter(p => p.trim());
        processed.push(`${indent}- ${parts[0]}。`); 
        parts.slice(1).forEach(p => processed.push(`${indent}  - ${p}。`));
        continue;
      }

      processed.push(`${indent}- ${t}`);
    }
    return processed.join('\n').replace(/==([^=]+)==/g, '<span style="color:#dc2626; background:#fee2e2; padding:0 4px; border-radius:4px; font-weight:bold;">$1</span>');
  };

  const globalCSS = `
    .vditor-ir__node mark { background: #fee2e2 !important; color: #dc2626 !important; font-weight: bold !important; padding: 0 4px !important; border-radius: 4px !important; }
    .vditor-tooltipped::after, .vditor-tooltipped::before { display: none !important; }
    .tree-item-active { background-color: #2563eb !important; color: white !important; }
    .ctx-menu-item:hover { background-color: #f1f5f9; color: #2563eb; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .vditor { border: none !important; }
    .vditor-toolbar { border-bottom: 1px solid #e2e8f0 !important; background: #f8fafc !important; }
    .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .preview-content th, .preview-content td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
    .preview-content th { background-color: #f8fafc; font-weight: bold; color: #1e293b; }
    .preview-content blockquote { border-left: 4px solid #3b82f6; padding: 12px 16px; color: #475569; background: #eff6ff; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .preview-content img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 16px auto; display: block; }
    .preview-content ul, .preview-content ol { padding-left: 24px; margin-bottom: 16px; }
    .preview-content li { margin-bottom: 8px; }
    .preview-content p { line-height: 1.7; margin-bottom: 16px; color: #334155; }
    .preview-content h1 { font-size: 28px; font-weight: 800; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 24px; color: #0f172a; }
    .preview-content h2 { font-size: 20px; font-weight: 700; margin-top: 32px; margin-bottom: 16px; color: #1e293b; border-left: 4px solid #2563eb; padding-left: 12px; }
    .katex-display { margin: 16px 0; overflow-x: auto; overflow-y: hidden; padding: 10px 0; text-align: center; }
    foreignObject { overflow: visible !important; }
    .markmap-foreign { overflow: visible !important; }
    .admin-sidebar { transition: transform 0.3s ease; z-index: 50; }
    .admin-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; display: none; }
    @media (max-width: 768px) {
      .admin-sidebar { position: fixed !important; left: 0; top: 0; bottom: 0; transform: translateX(-100%); }
      .admin-sidebar.open { transform: translateX(0); }
      .admin-overlay.open { display: block; }
      .header-btn-group button { padding: 6px 12px !important; font-size: 13px !important; }
    }
  `;

  const showEditor = (viewMode === 'editor' || viewMode === 'both') && activeNote && !activeNote.is_folder;
  const editorKey = activeNote ? `${activeNote.id}-${viewMode}` : 'none';

  useEffect(() => {
    if (!showEditor) return;
    let isCanceled = false; 
    let vditorInstance: any = null;
    const vditorId = `vditor-${activeNote.id}`;

    const initVditor = async () => {
      const VditorModule = await import('vditor');
      if (isCanceled) return; 
      
      const Vditor = VditorModule.default;
      vditorInstance = new Vditor(vditorId, {
        height: '100%', mode: 'ir', lang: 'zh_CN', value: activeNote.content || '',
        preview: { markdown: { mark: true } },
        upload: { 
          url: '/api/upload', fieldName: 'file[]', max: 10 * 1024 * 1024,
          format(files, responseText) {
            const res = JSON.parse(responseText);
            return JSON.stringify({ msg: '', code: 0, data: res.data });
          }
        },
        toolbar: [
          'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|', 'list', 'ordered-list', 'check', '|', 'quote', 'line', 'code', '|', 'upload',
          {
            name: 'add_mark', tip: '标注重点',
            icon: '<svg viewBox="0 0 1024 1024" width="16" height="16"><path d="M128 768h768v128H128zM318.4 640l-88-251.2 59.2-20.8 77.6 220.8L534.4 128l58.4 20.8L376 720z"/></svg>',
            click() { 
              const text = vditorInstance.getSelection();
              document.execCommand('insertText', false, `==${text.replace(/=/g, '') || '重点'}==`);
            }
          },
          {
            name: 'remove_mark', tip: '取消标注',
            icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20"/><path d="M6 11l7 7"/></svg>',
            click() { 
              const text = vditorInstance.getSelection();
              if (text) document.execCommand('insertText', false, text.replace(/=/g, ''));
            }
          },
          'table', 'undo', 'redo'
        ],
        input: (val) => { 
          if(activeNoteRef.current) activeNoteRef.current.content = val; 
          setPreviewContent(val); 
        },
        after: () => { 
          if (isCanceled) { vditorInstance.destroy(); return; }
          vditorRef.current = vditorInstance; 
        }
      });
    };

    setTimeout(initVditor, 20);

    return () => { 
      isCanceled = true;
      if (vditorRef.current) {
        try { vditorRef.current.destroy(); } catch(e) {}
        vditorRef.current = null;
      } else if (vditorInstance) {
        try { vditorInstance.destroy(); } catch(e) {}
      }
    };
  }, [editorKey]); 

  useEffect(() => {
    if (previewContent && (viewMode === 'preview' || viewMode === 'both')) {
      loadKaTeX().then(() => {
        const el = document.getElementById('preview-container');
        if (el && (window as any).renderMathInElement) {
          (window as any).renderMathInElement(el, {
            delimiters: [ {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false} ],
            throwOnError: false
          });
        }
      });
    }
  }, [previewContent, viewMode]);

  useEffect(() => {
    if (showMindmap && svgRef.current && activeNote && !activeNote.is_folder) {
      const cleanContent = transformForMarkmap(previewContent);
      const { root } = transformer.transform(cleanContent);
      if (mmRef.current) mmRef.current.destroy();
      mmRef.current = Markmap.create(svgRef.current, { autoFit: true, duration: 300, paddingX: 30, spacingVertical: 40 }, root);
    }
  }, [showMindmap, previewContent]);

  const downloadMindmap = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeNote?.title || '思维导图'}.svg`;
    a.click();
  };

  const handleExport = (note: any, format: 'html' | 'pdf') => {
    const htmlBody = renderHTML(note.content);
    const full = `<html><head><meta charset="utf-8"><style>body{padding:40px;font-family:sans-serif;max-width:800px;margin:0 auto;}mark{background:#fee2e2;color:#dc2626;font-weight:bold;padding:0 4px;border-radius:4px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}th{background:#f8fafc}blockquote{border-left:4px solid #3b82f6;padding:12px 16px;background:#eff6ff;margin:16px 0}img{max-width:100%;border-radius:8px}</style></head><body>${htmlBody}</body></html>`;
    if (format === 'html') {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([full], {type:'text/html'})); a.download = `${note.title}.html`; a.click();
    } else {
      const w = window.open(); w?.document.write(full); w?.document.close(); setTimeout(()=>w?.print(), 500);
    }
  };

  const createItem = async (title: string, isFolder: boolean, parentId: string | null) => {
    await fetch('/api/notes', { method: 'POST', body: JSON.stringify({title, is_folder: isFolder?1:0, parent_id: parentId}), headers: {'Content-Type': 'application/json'} });
    const r = await fetch('/api/notes'); const data = await r.json(); setNotes(data);
  };

  const adjustOrder = async (note: any, direction: 'up' | 'down') => {
    const currentOrder = note.sort_order || 0;
    const newOrder = direction === 'up' ? currentOrder - 10 : currentOrder + 10;
    await fetch('/api/notes', { method: 'PUT', body: JSON.stringify({...note, sort_order: newOrder}), headers: {'Content-Type': 'application/json'} });
    setMenuState(null);
    const r = await fetch('/api/notes'); const data = await r.json(); setNotes(data);
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const renderTree = (parentId: string | null, depth: number = 0) => {
    return notes.filter(n => n.parent_id === parentId && n.title.toLowerCase().includes(searchTerm.toLowerCase())).map(note => {
      const isF = note.is_folder === 1; const active = activeNote?.id === note.id; const expanded = expandedFolders.has(note.id);
      return (
        <div key={note.id}>
          <div onClick={() => {
              if (isF) {
                setExpandedFolders(s => {const n=new Set(s); expanded?n.delete(note.id):n.add(note.id); return n;});
              } else {
                setActiveNote(note);
                if (isMobile) setSidebarOpen(false); 
              }
            }}
            className={`tree-item-hover ${active ? 'tree-item-active' : ''}`}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', margin:'2px 8px', borderRadius:'8px', cursor:'pointer', paddingLeft: (depth*16+12)+'px', color: active?'#fff':'#cbd5e1' }}>
            {isF ? (expanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>) : <div style={{width:14}}/>}
            {isF ? <Folder size={16} color={active?'#fff':'#60a5fa'}/> : <FileText size={16} color={active?'#fff':'#94a3b8'}/>}
            <span style={{flex:1, fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{note.title}</span>
            <button onClick={(e)=>{e.stopPropagation(); setMenuState({id:note.id, x:e.clientX, y:e.clientY, is_folder:isF, note, mode:'default'});}} style={{background:'none', border:'none', color:'inherit', cursor:'pointer'}}><MoreVertical size={14}/></button>
          </div>
          {isF && expanded && renderTree(note.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vditor/dist/index.css" />
      <style>{globalCSS}</style>
      
      <div className={`admin-overlay ${sidebarOpen && isMobile ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ width: '280px', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
          <span style={{ fontWeight: 'bold' }}>MyNotes</span>
          <div style={{display:'flex', gap:'8px'}}>
            <FolderPlus size={18} style={{cursor:'pointer'}} title="新建根文件夹" onClick={()=>createItem(prompt('文件夹名')||'', true, null)}/>
            <FilePlus size={18} style={{cursor:'pointer'}} title="新建根笔记" onClick={()=>createItem(prompt('笔记名')||'', false, null)}/>
          </div>
        </div>
        <div style={{padding:'10px 15px'}}><div style={{display:'flex', alignItems:'center', background:'#1e293b', borderRadius:'6px', padding:'4px 8px', gap:'8px'}}><Search size={14} color="#64748b"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="搜索..." style={{background:'none', border:'none', color:'#fff', fontSize:'12px', outline:'none', width:'100%'}}/></div></div>
        
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>{renderTree(null)}</div>
        
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
           <button onClick={handleLogout} style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}} onMouseLeave={e => {e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = 'transparent'}}>
              <LogOut size={16}/> 退出登录
           </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: '64px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 10px' : '0 24px', flexShrink: 0, overflowX: 'auto' }}>
          <div style={{display:'flex', alignItems:'center', gap: isMobile ? '8px' : '15px'}}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#1e293b', display: 'flex' }}>
                <Menu size={24} />
              </button>
            )}
            <span style={{ fontWeight:'bold', color:'#1e293b', fontSize: isMobile ? '14px' : '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '80px' : 'none' }}>
              {activeNote?.title || '未选择'}
            </span>
            
            {!activeNote?.is_folder && (
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button onClick={()=>setViewMode('editor')} style={{ border:'none', padding:'6px', borderRadius:'6px', cursor:'pointer', backgroundColor: viewMode==='editor'?'white':'transparent' }} title="编辑模式"><FileText size={16}/></button>
                <button onClick={()=>setViewMode('both')} style={{ border:'none', padding:'6px', borderRadius:'6px', cursor:'pointer', backgroundColor: viewMode==='both'?'white':'transparent' }} title="双栏比对/上下分屏"><Layout size={16}/></button>
                <button onClick={()=>setViewMode('preview')} style={{ border:'none', padding:'6px', borderRadius:'6px', cursor:'pointer', backgroundColor: viewMode==='preview'?'white':'transparent' }} title="预览模式"><Monitor size={16}/></button>
              </div>
            )}
          </div>
          
          <div className="header-btn-group" style={{ display: 'flex', gap: '8px' }}>
            {showMindmap && !isMobile && <button onClick={downloadMindmap} style={{ padding: '8px 20px', borderRadius: '30px', border: '1px solid #10b981', cursor: 'pointer', background: '#fff', color: '#10b981', fontWeight:'bold', whiteSpace: 'nowrap' }}>下载</button>}
            {!activeNote?.is_folder && <button onClick={() => setShowMindmap(!showMindmap)} style={{ padding: '8px 16px', borderRadius: '30px', border: '1px solid #e2e8f0', cursor: 'pointer', background: showMindmap ? '#2563eb' : '#fff', color: showMindmap ? '#fff' : '#475569', whiteSpace: 'nowrap' }}>{showMindmap?'课件':'导图'}</button>}
            <button onClick={async ()=>{await fetch('/api/backup',{method:'POST'}); alert('云端备份已启动');}} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{isMobile ? '备份' : '云端备份'}</button>
            <button onClick={async ()=>{if(activeNote && !activeNote.is_folder) { await fetch('/api/notes',{method:'PUT', body:JSON.stringify(activeNote), headers:{'Content-Type':'application/json'}}); alert('保存成功'); } }} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', whiteSpace: 'nowrap' }}>保存</button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: (isMobile && viewMode === 'both') ? 'column' : 'row' }}>
          {showEditor && (
            <div style={{ flex: 1, position: 'relative', borderRight: (!isMobile && viewMode==='both') ? '1px solid #e2e8f0' : 'none', borderBottom: (isMobile && viewMode==='both') ? '1px solid #e2e8f0' : 'none', minWidth: 0, minHeight: 0 }}>
              <div key={editorKey} id={`vditor-${activeNote.id}`} style={{ width: '100%', height: '100%' }}></div>
            </div>
          )}
          
          {((viewMode === 'preview' || viewMode === 'both') && activeNote) && (
            <div style={{ flex: 1, backgroundColor: '#f8fafc', overflowY: 'auto', minWidth: 0, minHeight: 0 }}>
              {showMindmap ? <svg ref={svgRef} style={{ width: '100%', height: '100%', minHeight: '500px' }}></svg> : (
                <div style={{ padding: isMobile ? '20px' : '40px' }}>
                  <div id="preview-container" className="preview-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: isMobile ? '20px' : '50px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '80vh' }}>
                    <div dangerouslySetInnerHTML={{ __html: renderHTML(previewContent) }} />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!activeNote && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '16px' }}>
              请在左侧选择或新建一个课件
            </div>
          )}
        </div>
      </main>

      {menuState && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:999998}} onMouseDown={()=>setMenuState(null)} />
          <div style={{ position:'fixed', left:menuState.x, top:menuState.y, backgroundColor:'#fff', borderRadius:'8px', boxShadow:'0 10px 30px rgba(0,0,0,0.2)', width:'180px', zIndex:999999, overflow:'hidden', border:'1px solid #e2e8f0', color:'#334155', fontSize:'13px' }}>
            {menuState.mode === 'default' ? (
              <>
                {menuState.is_folder && <div onClick={()=>{const t=prompt('新建子文件夹名称'); if(t) createItem(t, true, menuState.id); setMenuState(null);}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px'}}><FolderPlus size={14}/> 新建子文件夹</div>}
                {menuState.is_folder && <div onClick={()=>{const t=prompt('新建笔记名称'); if(t) createItem(t, false, menuState.id); setMenuState(null);}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px', borderBottom:'1px solid #f1f5f9'}}><FilePlus size={14}/> 新建笔记</div>}
                <div onClick={()=>adjustOrder(menuState.note, 'up')} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px'}}><ArrowUp size={14}/> 向上排移</div>
                <div onClick={()=>adjustOrder(menuState.note, 'down')} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px', borderBottom:'1px solid #f1f5f9'}}><ArrowDown size={14}/> 向下排移</div>
                {!menuState.is_folder && <div onClick={()=>setMenuState({...menuState, mode: 'move'})} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px'}}><Move size={14}/> 移动到...</div>}
                <div onClick={()=>{prompt('分享链接', window.location.origin + '/s/' + menuState.id); setMenuState(null);}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px'}}><Share2 size={14}/> 分享链接</div>
                {!menuState.is_folder && <div onClick={()=>{handleExport(menuState.note, 'html'); setMenuState(null);}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px'}}><FileCode size={14}/> 导出 HTML</div>}
                {!menuState.is_folder && <div onClick={()=>{handleExport(menuState.note, 'pdf'); setMenuState(null);}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px'}}><Download size={14}/> 导出 PDF</div>}
                <div onClick={()=>{const t=prompt('重命名', menuState.note.title);if(t){ fetch('/api/notes',{method:'PUT',body:JSON.stringify({...menuState.note, title:t}),headers:{'Content-Type':'application/json'}}).then(()=>{const r = fetch('/api/notes').then(res=>res.json()).then(data=>setNotes(data))}); setMenuState(null);}}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px', borderTop:'1px solid #f1f5f9'}}><Edit2 size={14}/> 重命名</div>
                <div onClick={async ()=>{if(confirm('确定删除?')){await fetch('/api/notes',{method:'DELETE', body:JSON.stringify({id:menuState.id}), headers:{'Content-Type':'application/json'}}); const r = await fetch('/api/notes'); const data = await r.json(); setNotes(data); setMenuState(null);}}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px', color:'#dc2626'}}><Trash2 size={14}/> 删除</div>
              </>
            ) : (
              <div style={{ maxHeight:'300px', overflowY:'auto' }}>
                <div style={{padding:'10px 14px', fontWeight:'bold', background:'#f8fafc'}}>移动至</div>
                <div onClick={async ()=>{await fetch('/api/notes',{method:'PUT',body:JSON.stringify({...menuState.note, parent_id: null}),headers:{'Content-Type':'application/json'}}); const r = await fetch('/api/notes'); const data = await r.json(); setNotes(data); setMenuState(null);}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer'}}>根目录</div>
                {notes.filter(n => n.is_folder === 1 && n.id !== menuState.id).map(f => (
                  <div key={f.id} onClick={async ()=>{await fetch('/api/notes',{method:'PUT',body:JSON.stringify({...menuState.note, parent_id: f.id}),headers:{'Content-Type':'application/json'}}); const r = await fetch('/api/notes'); const data = await r.json(); setNotes(data); setMenuState(null);}} className="ctx-menu-item" style={{padding:'10px 14px', cursor:'pointer', display:'flex', gap:'8px'}}><Folder size={14} color="#60a5fa"/> {f.title}</div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
