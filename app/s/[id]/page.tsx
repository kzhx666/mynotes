"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
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

export default function StudentPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'doc' | 'map'>('doc');
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(15); 
  
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<any>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile(); 
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetch(`/api/share/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('内容不存在或已被删除');
        return res.json();
      })
      .then(d => {
        setData(d);
        if (d.type === 'folder' && d.children?.length > 0) {
          setActiveNoteId(d.children[0].id); 
        }
      })
      .catch(err => setError(err.message));
  }, [params.id]);

  useEffect(() => {
    let scrollTimer: NodeJS.Timeout;
    if (isAutoScrolling && tab === 'doc') {
      const intervalMs = scrollSpeed * 1000; 
      
      scrollTimer = setInterval(() => {
        const container = document.querySelector('.main-content');
        if (container) {
          const overlap = 80;
          const jumpDistance = Math.max(100, container.clientHeight - overlap);
          const newScrollTop = container.scrollTop + jumpDistance;

          container.scrollTo({
            top: newScrollTop,
            behavior: 'smooth'
          });
          
          if (newScrollTop + container.clientHeight >= container.scrollHeight) {
            setIsAutoScrolling(false);
          }
        }
      }, intervalMs); 
    }
    return () => clearInterval(scrollTimer); 
  }, [isAutoScrolling, tab, scrollSpeed]);

  const isFolder = data?.type === 'folder';
  const currentNote = isFolder ? data.children?.find((c:any) => c.id === activeNoteId) : data;
  const contentToRender = currentNote?.content || '';
  const titleToRender = isFolder ? data.title : data?.title;

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
      html = html.replace(/==([^=]+)==/g, '<mark class="premium-highlight">$1</mark>');
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
      if (t.startsWith('![') || t.startsWith('<img') || t.startsWith('<div')) continue; 

      if (t.startsWith('#')) { processed.push(rawLine); continue; }
      if (t.startsWith('**') && t.endsWith('**') && t.length < 80) { processed.push(`${indent}##### ${t}`); continue; }
      if (/^\d+\.\s/.test(t) && !rawLine.startsWith(' ') && !t.startsWith('**')) { processed.push(`##### **${t}**`); continue; }
      if (t.startsWith('- ') || t.startsWith('* ') || /^\d+\.\s/.test(t)) { processed.push(rawLine); continue; }
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

  const handlePrint = () => {
    if (!data) return;
    let contentHtml = '';

    if (isFolder && data.children) {
      contentHtml += `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; page-break-after: always; text-align: center;">
          <div style="font-size: 24px; color: #666; margin-bottom: 20px; letter-spacing: 4px;">建筑材料内部讲义</div>
          <h1 style="font-size: 50px; font-weight: 900; border-bottom: 4px solid #000; padding-bottom: 20px; margin-bottom: 40px;">${data.title}</h1>
        </div>
      `;
      data.children.forEach((child: any, index: number) => {
        contentHtml += `
          <div style="${index > 0 ? 'page-break-before: always;' : ''}">
            <h2 style="font-size: 28px; text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 30px;">${child.title}</h2>
            ${renderHTML(child.content)}
          </div>
        `;
      });
    } else {
      contentHtml += `
        <div>
          <h2 style="font-size: 28px; text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 30px;">${data.title}</h2>
          ${renderHTML(data.content)}
        </div>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title} - 打印资料</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          body { padding: 40px; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 900px; margin: 0 auto; color: #000 !important; background: none !important; line-height: 1.8; }
          * { color: #000 !important; box-shadow: none !important; text-shadow: none !important; background: transparent !important; }
          .premium-highlight { border: 1.5px solid #000 !important; padding: 2px 6px !important; border-radius: 4px; font-weight: bold; background: #fff !important; }
          
          table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; page-break-inside: avoid; display: table !important; word-break: break-word; overflow-wrap: break-word; }
          th, td { border: 1px solid #000 !important; padding: 12px; text-align: left; white-space: normal !important; line-height: 1.6; }
          
          th { font-weight: bold; }
          blockquote { border-left: 4px solid #000 !important; padding: 12px 16px; margin: 20px 0; font-style: italic; }
          img { max-width: 100%; border-radius: 4px; margin: 20px auto; display: block; }
          div[align="left"] img { margin: 20px 20px 20px 0 !important; display: inline-block !important; }
          div[align="right"] img { margin: 20px 0 20px 20px !important; display: inline-block !important; }
          ul, ol { padding-left: 28px; }
          li { margin-bottom: 8px; }
          .katex-display { margin: 20px 0; overflow-x: auto; overflow-y: hidden; text-align: center; page-break-inside: avoid; }
          @media print {
            body { padding: 0; max-width: 100%; margin: 0; }
            @page { margin: 2cm; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
        <script>
          window.onload = function() {
            renderMathInElement(document.body, {
              delimiters: [ {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false} ],
              throwOnError: false
            });
            setTimeout(function(){ window.print(); }, 800);
          };
        </script>
      </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(fullHtml);
      w.document.close();
    } else {
      alert("请允许浏览器弹出新窗口以进行打印！");
    }
  };

  useEffect(() => {
    if (tab === 'map' && contentToRender && svgRef.current) {
      const cleanContent = transformForMarkmap(contentToRender);
      const { root } = transformer.transform(cleanContent);
      if (mmRef.current) mmRef.current.destroy();
      mmRef.current = Markmap.create(svgRef.current, { autoFit: true, duration: 400, paddingX: 40, spacingVertical: 40 }, root);
    }
  }, [tab, contentToRender]);

  useEffect(() => {
    if (tab === 'doc' && contentToRender) {
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
  }); 

  if (error) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#dc2626', background:'#f8fafc', fontSize:'18px', fontWeight:'bold'}}>❌ {error}</div>;
  if (!data) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', background:'#f8fafc', fontSize:'18px', fontWeight:'bold'}}>读取内容中...</div>;

  const premiumCSS = `
    body { background-color: #f8fafc; background-image: radial-gradient(at 0% 0%, hsla(213, 100%, 85%, 0.5) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(253, 100%, 85%, 0.5) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(200, 100%, 85%, 0.5) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(220, 100%, 85%, 0.5) 0px, transparent 50%); background-attachment: fixed; margin: 0; }
    .glass-nav { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03); }
    .glass-container { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); border-radius: 24px; padding: 50px 60px; margin: 40px auto; width: 100%; max-width: 1000px; }
    
    .layout-container { display: flex; height: calc(100vh - 80px); overflow: hidden; }
    .sidebar { flex-shrink: 0; background: rgba(255,255,255,0.6); backdrop-filter: blur(20px); overflow-y: auto; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 40; }
    
    .sidebar.desktop-open { width: 280px; padding: 24px 0; border-right: 1px solid rgba(0,0,0,0.05); opacity: 1; }
    .sidebar.desktop-closed { width: 0; padding: 0; border: none; opacity: 0; overflow: hidden; pointer-events: none; }
    
    .main-content { flex: 1; height: 100%; overflow-y: auto; position: relative; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; }
    
    .chapter-item { padding: 12px 30px; cursor: pointer; color: #475569; font-size: 15px; border-left: 4px solid transparent; transition: 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chapter-item:hover { color: #2563eb; background: rgba(37,99,235,0.05); }
    .chapter-item.active { color: #2563eb; background: rgba(37,99,235,0.1); border-left-color: #2563eb; font-weight: bold; }
    
    .menu-toggle { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: #0f172a; margin-right: 16px; padding: 6px; border-radius: 8px; transition: background 0.2s; }
    .menu-toggle:hover { background: rgba(0,0,0,0.05); }
    .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 39; backdrop-filter: blur(2px); }

    foreignObject { overflow: visible !important; }
    .markmap-foreign { overflow: visible !important; }

    @media (max-width: 768px) {
      .glass-container { padding: 30px 20px; width: 95%; margin: 20px auto; border-radius: 16px; }
      .glass-nav { padding: 0 15px !important; }
      .nav-btn { padding: 6px 10px; font-size: 13px; }
      .preview-content h1 { font-size: 28px; }
      
      .sidebar { position: fixed; left: 0; top: 80px; bottom: 0; width: 280px; background: #f8fafc; box-shadow: 4px 0 20px rgba(0,0,0,0.1); padding: 24px 0; opacity: 1; }
      .sidebar.mobile-open { transform: translateX(0); }
      .sidebar.mobile-closed { transform: translateX(-100%); }
      .mobile-overlay.open { display: block; }
    }

    .preview-content img { max-width: 100%; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin: 32px auto; display: block; }
    div[align="left"] img { margin: 16px 16px 16px 0 !important; display: inline-block !important; }
    div[align="right"] img { margin: 16px 0 16px 16px !important; display: inline-block !important; }
    .preview-content h1 { background: linear-gradient(135deg, #0f172a, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 40px; font-weight: 900; text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.05); letter-spacing: 2px; }
    .preview-content h2 { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 48px; margin-bottom: 24px; display: flex; alignItems: center; }
    .preview-content h2::before { content: ''; display: inline-block; width: 6px; height: 24px; background: linear-gradient(to bottom, #3b82f6, #60a5fa); margin-right: 14px; border-radius: 4px; }
    .preview-content p { font-size: 17px; line-height: 1.9; color: #334155; margin-bottom: 24px; }
    .preview-content blockquote { background: linear-gradient(to right, rgba(59,130,246,0.1), rgba(59,130,246,0.02)); border-left: 4px solid #3b82f6; padding: 20px 24px; border-radius: 0 16px 16px 0; margin: 32px 0; font-size: 16px; color: #1e293b; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
    
    /* 修复分享页的表格换行问题，去除所有可能导致横向滚动的限制 */
    .preview-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 32px 0; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); display: table !important; word-break: break-word; overflow-wrap: break-word; table-layout: auto; }
    .preview-content th, .preview-content td { padding: 16px 24px; text-align: left; white-space: normal !important; line-height: 1.6; word-wrap: break-word; }
    
    .preview-content th { background: #f8fafc; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;}
    .preview-content td { background: #ffffff; border-bottom: 1px solid #f1f5f9; color: #475569; }
    .preview-content tr:hover td { background: #f8fafc; transition: 0.2s; }
    .preview-content ul, .preview-content ol { padding-left: 28px; margin-bottom: 24px; color: #475569; line-height: 1.9; font-size: 17px; }
    .preview-content li { margin-bottom: 12px; }
    .preview-content li::marker { color: #3b82f6; font-weight: bold; }
    
    .premium-highlight { background: linear-gradient(120deg, #fee2e2 0%, #fecaca 100%); color: #dc2626; padding: 2px 8px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.1); }
    
    .nav-btn { padding: 8px 24px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .nav-btn.active { background: #ffffff; color: #2563eb; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
    .nav-btn.inactive { background: transparent; color: #64748b; }
    .nav-btn.inactive:hover { color: #334155; background: rgba(255,255,255,0.5); }

    .katex-display { margin: 24px 0; overflow-x: auto; overflow-y: hidden; padding: 10px 0; text-align: center; }
  `;

  const sidebarClass = isMobile 
    ? (sidebarOpen ? 'mobile-open' : 'mobile-closed') 
    : (sidebarOpen ? 'desktop-open' : 'desktop-closed');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{premiumCSS}</style>
      
      <header className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 40px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
           {isFolder && (
             <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="展开/收起目录">
               <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
           )}
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '10px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' }}>MN</div>
             <span style={{ fontWeight: '800', fontSize: '20px', color: '#0f172a', letterSpacing: '1px' }}>{titleToRender || '建筑材料教案系统'}</span>
           </div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(226, 232, 240, 0.5)', padding: '6px', borderRadius: '16px', backdropFilter: 'blur(10px)', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          
          {tab === 'doc' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
              <select
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.8)', color: '#475569', outline: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                title="选择翻页间隔时间"
              >
                {[5,10,15,20,25,30,35,40,45,50,55,60].map(s => (
                  <option key={s} value={s}>{s}秒 / 屏</option>
                ))}
              </select>
              <button 
                onClick={() => setIsAutoScrolling(!isAutoScrolling)} 
                className={`nav-btn ${isAutoScrolling ? 'active' : 'inactive'}`} 
                style={{ color: isAutoScrolling ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                title="开启/关闭翻页阅读"
              >
                {isAutoScrolling ? '⏸️ 停止' : '⬇️ 自动阅读'}
              </button>
            </div>
          )}

          <button onClick={() => setTab('doc')} className={`nav-btn ${tab === 'doc' ? 'active' : 'inactive'}`}>📖 阅读</button>
          <button onClick={() => setTab('map')} className={`nav-btn ${tab === 'map' ? 'active' : 'inactive'}`}>🧠 导图</button>
          <button onClick={handlePrint} className="nav-btn inactive" style={{ padding: '8px 16px', color: '#10b981' }} title="打印全册/单节资料">🖨️ 打印</button>
        </div>
      </header>

      <div className="layout-container">
        {isFolder && (
          <>
            <div className={`mobile-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
            <aside className={`sidebar ${sidebarClass}`}>
              <div style={{ padding: '0 30px 16px', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>章节目录</div>
              {data.children?.map((child: any) => (
                <div 
                  key={child.id} 
                  className={`chapter-item ${activeNoteId === child.id ? 'active' : ''}`}
                  onClick={() => { 
                    setActiveNoteId(child.id); 
                    if (isMobile) setSidebarOpen(false); 
                    document.querySelector('.main-content')?.scrollTo(0,0); 
                    setIsAutoScrolling(false); 
                  }}
                  title={child.title}
                >
                  {child.title}
                </div>
              ))}
              {data.children?.length === 0 && <div style={{ padding: '0 30px', color: '#94a3b8', fontSize: '13px', whiteSpace: 'nowrap' }}>该目录下暂无内容</div>}
            </aside>
          </>
        )}

        <main className="main-content">
          {tab === 'doc' ? (
            <div style={{ padding: '20px' }}>
              <div id="preview-container" className="glass-container preview-content">
                 {contentToRender ? (
                   <div dangerouslySetInnerHTML={{ __html: renderHTML(contentToRender) }} />
                 ) : (
                   <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>请在左侧选择章节，或该页面暂无内容</div>
                 )}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 80px)', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)' }}>
               {contentToRender ? <svg ref={svgRef} style={{ width: '100%', height: '100%' }} /> : <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '100px' }}>无内容可生成导图</div>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
