"use client";
import { useState } from 'react';

export default function LoginPage() {
  const [pass, setPass] = useState('');
  
  const handleLogin = async () => {
    const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ password: pass }) });
    if (res.ok) window.location.href = '/';
    else alert('密码错误，请重试！');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', padding: '50px 40px', borderRadius: '24px', width: '380px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ width: '60px', height: '60px', background: '#3b82f6', borderRadius: '16px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>MN</div>
        <h2 style={{ marginBottom: '10px', color: '#fff', fontSize: '24px' }}>建筑材料教案系统</h2>
        <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '14px' }}>请输入管理员密码进入</p>
        <input 
          type="password" 
          placeholder="••••••••" 
          value={pass} 
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '14px', marginBottom: '24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '16px', textAlign: 'center', letterSpacing: '2px' }}
        />
        <button onClick={handleLogin} style={{ width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.2s' }}>登 录</button>
      </div>
    </div>
  );
}
