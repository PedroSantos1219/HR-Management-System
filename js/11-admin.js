// Ecrãs de administração: gestão de utilizadores, backups da BD e
// logs de segurança (capturas de ecrã e sessões activas).

function UserManagement({user: currentUser}){
  const [users,setUsers]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [loadErr,setLoadErr]=React.useState('');
  const [showModal,setShowModal]=React.useState(false);
  const [form,setForm]=React.useState({username:'',email:'',password:'',role:'READER'});
  const [formErr,setFormErr]=React.useState('');
  const [saving,setSaving]=React.useState(false);
  const [pwTarget,setPwTarget]=React.useState(null);
  const [pwStep,setPwStep]=React.useState('request'); // 'request' | 'verify' | 'done'
  const [pwCode,setPwCode]=React.useState('');
  const [pwNew,setPwNew]=React.useState('');
  const [pwNew2,setPwNew2]=React.useState('');
  const [pwErr,setPwErr]=React.useState('');
  const [pwInfo,setPwInfo]=React.useState('');
  const [pwBusy,setPwBusy]=React.useState(false);

  function openPwModal(u){
    setPwTarget(u); setPwStep('request');
    setPwCode(''); setPwNew(''); setPwNew2('');
    setPwErr(''); setPwInfo(''); setPwBusy(false);
  }
  function closePwModal(){ setPwTarget(null); }

  async function requestCode(){
    setPwBusy(true); setPwErr(''); setPwInfo('');
    try{
      await apiCall('admin_request_code',{
        actionType:'reset_user_password',
        targetUserId:pwTarget.id,
        description:`Alterar password do utilizador "${pwTarget.username}" (${pwTarget.email})`,
      });
      setPwInfo(`Código enviado para ${currentUser.email}. Válido por 10 minutos.`);
      setPwStep('verify');
    }catch(ex){ setPwErr(ex.message||'Falha ao enviar código.'); }
    setPwBusy(false);
  }

  async function verifyAndReset(){
    if(!/^\d{6}$/.test(pwCode)){ setPwErr('Código deve ter 6 dígitos.'); return; }
    if(pwNew.length<8){ setPwErr('A nova password deve ter pelo menos 8 caracteres.'); return; }
    if(pwNew!==pwNew2){ setPwErr('As passwords não coincidem.'); return; }
    setPwBusy(true); setPwErr('');
    try{
      await apiCall('admin_verify_code_and_reset',{
        code:pwCode, targetUserId:pwTarget.id, newPassword:pwNew,
      });
      setPwStep('done');
      setPwInfo(`Password de "${pwTarget.username}" actualizada.`);
    }catch(ex){ setPwErr(ex.message||'Falha ao validar código.'); }
    setPwBusy(false);
  }

  async function load(){
    setLoading(true); setLoadErr('');
    try{
      const r=await apiCall('list_users');
      setUsers(Array.isArray(r)?r:[]);
    }catch(e){
      setLoadErr(e.message||'Erro ao carregar utilizadores.');
    }
    setLoading(false);
  }
  React.useEffect(()=>{load();},[]);

  const ROLE_LABELS={ADMIN:'Administrador',EDITOR:'Editor',READER:'Leitor'};
  const ROLE_COLORS={ADMIN:'var(--red)',EDITOR:'var(--blue)',READER:'var(--green)'};

  async function handleCreate(e){
    e.preventDefault();
    if(!form.username.trim()||!form.email.trim()||!form.password){setFormErr('Preencha todos os campos.');return;}
    setSaving(true);setFormErr('');
    try{
      await apiCall('create_user',{username:form.username.trim(),email:form.email.trim(),password:form.password,role:form.role});
      setShowModal(false);
      setForm({username:'',email:'',password:'',role:'READER'});
      await load();
    }catch(ex){ setFormErr(ex.message||'Erro ao criar utilizador.'); }
    setSaving(false);
  }

  async function handleDelete(id,name){
    if(!confirm(`Eliminar utilizador "${name}"? Esta acção não pode ser desfeita.`))return;
    try{ await apiCall('delete_user',{userId:id}); await load(); }
    catch(ex){ alert(ex.message||'Erro ao eliminar.'); }
  }

  async function handleRoleChange(id,role){
    try{ await apiCall('update_user',{userId:id,role}); await load(); }
    catch(ex){ alert(ex.message||'Erro ao actualizar.'); }
  }

  async function handleResend(id){
    try{ await apiCall('resend_verification',{userId:id}); alert('Email de verificação reenviado.'); }
    catch(ex){ alert(ex.message||'Erro ao reenviar.'); }
  }

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'var(--muted)'}}>Gerir contas de acesso à plataforma</div>
        <button className="btn bp btn-sm" onClick={()=>setShowModal(true)}>+ Novo utilizador</button>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {loadErr&&<div style={{padding:'12px 16px',background:'#fef2f2',color:'var(--red)',fontSize:13,borderBottom:'1px solid #fecaca'}}>⚠ {loadErr}</div>}
        {loading?<div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>A carregar...</div>:
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--bg)'}}>
            <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600}}>Utilizador</th>
            <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600}}>Email</th>
            <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600}}>Função</th>
            <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600}}>Estado</th>
            <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600}}>Criado em</th>
            <th style={{padding:'10px 14px',textAlign:'right',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600}}>Acções</th>
          </tr></thead>
          <tbody>
          {users.map(u=>(
            <tr key={u.id} style={{borderTop:'1px solid var(--border)'}}>
              <td style={{padding:'12px 14px'}}>
                <div style={{fontWeight:600,fontSize:14}}>{u.username}</div>
                {u.created_by&&<div style={{fontSize:11,color:'var(--muted)'}}>por {u.created_by}</div>}
              </td>
              <td style={{padding:'12px 14px',fontSize:13,color:'var(--muted)'}}>{u.email}</td>
              <td style={{padding:'12px 14px'}}>
                {(()=>{
                  const locked = u.isSuper && !currentUser.isSuper;
                  if(u.id===currentUser.id||locked){
                    return <span style={{fontSize:12,fontWeight:600,color:ROLE_COLORS[u.role]}}>{ROLE_LABELS[u.role]||u.role}</span>;
                  }
                  return (
                    <select value={u.role} onChange={ev=>handleRoleChange(u.id,ev.target.value)}
                      style={{fontSize:12,padding:'3px 6px',borderRadius:6,border:'1px solid var(--border)',background:'var(--card)',color:ROLE_COLORS[u.role],fontWeight:600,cursor:'pointer'}}>
                      <option value="ADMIN">Administrador</option>
                      <option value="EDITOR">Editor</option>
                      <option value="READER">Leitor</option>
                    </select>
                  );
                })()}
              </td>
              <td style={{padding:'12px 14px'}}>
                {u.verified
                  ? <span style={{fontSize:11,background:'#d1fae5',color:'#065f46',padding:'2px 8px',borderRadius:12,fontWeight:600}}>Verificado</span>
                  : <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:11,background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:12,fontWeight:600}}>Pendente</span>
                      <button className="btn btn-sm" style={{fontSize:10,padding:'2px 8px'}} onClick={()=>handleResend(u.id)}>Reenviar</button>
                    </div>
                }
              </td>
              <td style={{padding:'12px 14px',fontSize:12,color:'var(--muted)'}}>{u.created_at?new Date(u.created_at).toLocaleDateString('pt-PT'):'-'}</td>
              <td style={{padding:'12px 14px',textAlign:'right'}}>
                {(()=>{
                  if(u.id===currentUser.id) return null;
                  if(u.isSuper && !currentUser.isSuper){
                    return <span style={{fontSize:11,color:'var(--muted)'}}>—</span>;
                  }
                  return (
                    <div style={{display:'inline-flex',gap:6,justifyContent:'flex-end'}}>
                      <button className="btn btn-sm" style={{color:'var(--blue)',borderColor:'var(--blue)',background:'transparent'}}
                        onClick={()=>openPwModal(u)}>Alterar password</button>
                      <button className="btn btn-sm" style={{color:'var(--red)',borderColor:'var(--red)',background:'transparent'}}
                        onClick={()=>handleDelete(u.id,u.username)}>Eliminar</button>
                    </div>
                  );
                })()}
              </td>
            </tr>
          ))}
          </tbody>
        </table>}
      </div>

      {showModal&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="modal" style={{width:400}}>
            <div className="mh"><div className="mh-t">Novo Utilizador</div></div>
            <form onSubmit={handleCreate}>
              <div className="mb">
                <div className="fg">
                  <label className="fl">Nome de utilizador</label>
                  <input className="fi" type="text" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required autoComplete="off" placeholder="ex: Ana Silva"/>
                </div>
                <div className="fg">
                  <label className="fl">Email</label>
                  <input className="fi" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required autoComplete="off" placeholder="ex: ana.silva@roupeta.com"/>
                </div>
                <div className="fg">
                  <label className="fl">Password inicial</label>
                  <input className="fi" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres"/>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Mínimo 8 caracteres. Será enviado email de verificação.</div>
                </div>
                <div className="fg">
                  <label className="fl">Função</label>
                  <select className="fi" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                    <option value="ADMIN">Administrador</option>
                    <option value="EDITOR">Editor</option>
                    <option value="READER">Leitor</option>
                  </select>
                </div>
                {formErr&&<div style={{color:'var(--red)',fontSize:12}}>{formErr}</div>}
              </div>
              <div className="mf">
                <button type="button" className="btn" onClick={()=>{setShowModal(false);setFormErr('');}}>Cancelar</button>
                <button type="submit" className="btn bp" disabled={saving}>{saving?'A criar…':'Criar e enviar email'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pwTarget&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget) closePwModal();}}>
          <div className="modal" style={{width:440}}>
            <div className="mh">
              <div className="mh-t">Alterar password · {pwTarget.username}</div>
              <button className="btn bg btn-sm" onClick={closePwModal}>✕</button>
            </div>
            <div className="mb">
              <div style={{fontSize:12,color:'var(--muted)',background:'var(--bg)',borderRadius:8,padding:'10px 12px',marginBottom:14,lineHeight:1.5}}>
                Por segurança, esta acção requer verificação. Enviaremos um código de 6 dígitos para o seu email
                (<strong>{currentUser.email}</strong>). Use esse código para confirmar a alteração.
              </div>

              {pwStep==='request'&&(
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:13,marginBottom:14}}>
                    Pretende alterar a password de <strong>{pwTarget.username}</strong> ({pwTarget.email})?
                  </div>
                  {pwErr&&<div style={{color:'var(--red)',background:'#fdecea',borderRadius:8,padding:'8px 12px',fontSize:13,marginBottom:12}}>{pwErr}</div>}
                  <button className="btn bp" onClick={requestCode} disabled={pwBusy}>
                    {pwBusy?'A enviar…':'Enviar código por email'}
                  </button>
                </div>
              )}

              {pwStep==='verify'&&(
                <div>
                  {pwInfo&&<div style={{color:'#1E7E34',background:'#e6f4ea',borderRadius:8,padding:'8px 12px',fontSize:13,marginBottom:12}}>{pwInfo}</div>}
                  <div className="fg">
                    <label className="fl">Código recebido (6 dígitos)</label>
                    <input className="fi" type="text" inputMode="numeric" maxLength={6}
                      value={pwCode} onChange={e=>{setPwCode(e.target.value.replace(/\D/g,''));setPwErr('');}}
                      placeholder="000000" autoFocus
                      style={{fontFamily:'Consolas, monospace',letterSpacing:'4px',textAlign:'center',fontSize:18}}/>
                  </div>
                  <div className="fg">
                    <label className="fl">Nova password</label>
                    <input className="fi" type="password" value={pwNew} onChange={e=>{setPwNew(e.target.value);setPwErr('');}}
                      autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres"/>
                  </div>
                  <div className="fg">
                    <label className="fl">Confirmar password</label>
                    <input className="fi" type="password" value={pwNew2} onChange={e=>{setPwNew2(e.target.value);setPwErr('');}}
                      autoComplete="new-password" minLength={8}/>
                  </div>
                  {pwErr&&<div style={{color:'var(--red)',background:'#fdecea',borderRadius:8,padding:'8px 12px',fontSize:13,marginTop:8}}>{pwErr}</div>}
                </div>
              )}

              {pwStep==='done'&&(
                <div style={{textAlign:'center',padding:'10px 0'}}>
                  <div style={{fontSize:32,marginBottom:8}}>✔</div>
                  <div style={{color:'#1E7E34',fontWeight:600,fontSize:14}}>{pwInfo}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:6}}>As sessões activas deste utilizador foram terminadas.</div>
                </div>
              )}
            </div>
            <div className="mf">
              {pwStep==='verify' ? (
                <>
                  <button type="button" className="btn" onClick={closePwModal} disabled={pwBusy}>Cancelar</button>
                  <button type="button" className="btn bp" onClick={verifyAndReset} disabled={pwBusy}>
                    {pwBusy?'A validar…':'Confirmar alteração'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn bp" onClick={closePwModal}>Fechar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BackupsScreen({user, onAfterRestore}){
  const [backups,setBackups]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [err,setErr]=React.useState('');
  const [creating,setCreating]=React.useState(false);
  const [restoring,setRestoring]=React.useState(null); // nome do backup em restauro
  const [restoreDone,setRestoreDone]=React.useState(null); // {restoredFrom, preSnapshot}
  const isSuper=!!user?.isSuper;

  async function load(){
    setLoading(true); setErr('');
    try{
      const r=await apiCall('list_backups');
      setBackups(Array.isArray(r)?r:[]);
    }catch(e){ setErr(e.message||'Erro a carregar backups.'); }
    setLoading(false);
  }
  React.useEffect(()=>{load();},[]);

  async function createNow(){
    setCreating(true);
    try{
      await apiCall('create_backup');
      await load();
    }catch(e){ alert('Erro: '+(e.message||'falha ao criar backup.')); }
    setCreating(false);
  }

  async function del(name){
    if(!confirm(`Eliminar backup "${name}"? Esta acção não pode ser desfeita.`)) return;
    try{
      await apiCall('delete_backup',{filename:name});
      await load();
    }catch(e){ alert('Erro: '+(e.message||'falha ao eliminar.')); }
  }

  async function restore(name, isPre){
    const label = dateFromName(name);
    const tipoMsg = isPre
      ? `Reverter para o snapshot pré-restauro de ${label}?\n\nIsto desfaz o restauro anterior. Será criado um novo snapshot do estado actual antes de avançar.`
      : `RESTAURAR a base de dados para o estado de ${label}?\n\n• Os dados actuais serão substituídos.\n• Antes da substituição, é criado um snapshot automático ("pré-restauro") com o estado actual — pode voltar atrás se algo correr mal.\n• Todas as sessões abertas serão recarregadas.\n\nConfirmar restauro?`;
    if(!confirm(tipoMsg)) return;
    setRestoring(name); setErr('');
    try{
      const r = await apiCall('restore_backup', {filename: name});
      setRestoreDone(r);
      await load();
      if(typeof onAfterRestore === 'function'){
        await onAfterRestore();
      }
    }catch(e){
      setErr('Erro no restauro: '+(e.message||'falha desconhecida.'));
    }
    setRestoring(null);
  }

  function fmtSize(b){
    if(b<1024) return b+' B';
    if(b<1024*1024) return (b/1024).toFixed(1)+' KB';
    return (b/(1024*1024)).toFixed(2)+' MB';
  }
  function fmtDate(s){
    try{ return new Date(s).toLocaleString('pt-PT'); }catch(e){ return s; }
  }
  // Extrai a data do nome do ficheiro: rh_backup_2026-05-07_235900.sqlite → 07/05/2026 23:59
  function dateFromName(n){
    const m=/rh_backup_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(n);
    if(!m) return n;
    return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  }

  const byDay={};
  backups.forEach(b=>{
    const m=/rh_backup_(\d{4}-\d{2}-\d{2})/.exec(b.name);
    const k=m?m[1]:'desconhecido';
    if(!byDay[k]) byDay[k]=[];
    byDay[k].push(b);
  });
  const days=Object.keys(byDay).sort((a,b)=>b.localeCompare(a));
  const today=new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14,marginBottom:18,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:260}}>
          <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.55}}>
            Cópias de segurança da base de dados SQLite. Um backup automático é criado <strong>todos os dias</strong> (idealmente às <strong>23:59</strong> via Task Scheduler do Windows; em alternativa na primeira sessão do dia seguinte). Pode também criar um backup manual a qualquer momento.
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button className="btn" onClick={load} disabled={loading}>↻ Actualizar</button>
          <button className="btn bp" onClick={createNow} disabled={creating}>{creating?'A criar…':'+ Criar backup agora'}</button>
        </div>
      </div>

      {restoreDone&&(
        <div style={{background:'#ecfdf5',border:'1px solid #6ee7b7',borderRadius:8,padding:'12px 14px',marginBottom:18,fontSize:12.5,color:'#065f46',lineHeight:1.55}}>
          <strong>✓ Restauro concluído.</strong> A base de dados foi revertida para <code style={{background:'rgba(0,0,0,.08)',padding:'1px 6px',borderRadius:4}}>{restoreDone.restoredFrom}</code>.
          Foi criado um snapshot pré-restauro <code style={{background:'rgba(0,0,0,.08)',padding:'1px 6px',borderRadius:4}}>{restoreDone.preSnapshot}</code> — clique nele aqui para voltar atrás se necessário. A página vai recarregar dentro de momentos.
        </div>
      )}

      <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'12px 14px',marginBottom:18,fontSize:12,color:'#92400e',lineHeight:1.5}}>
        <strong>Como funciona o restauro:</strong> ao clicar em <em>Restaurar</em>, é primeiro criado um <strong>snapshot pré-restauro</strong> com o estado actual da BD. Só depois o backup escolhido substitui a BD activa. Se algo correr mal, basta restaurar o snapshot pré-restauro mais recente para voltar ao ponto de partida.<br/>
        <strong>Tarefa diária (Windows):</strong> Task Scheduler → todos os dias às 23:59 com&nbsp;
        <code style={{background:'rgba(0,0,0,.08)',padding:'1px 6px',borderRadius:4,fontFamily:'Consolas,monospace'}}>{'C:\\xampp\\php\\php.exe "C:\\xampp\\htdocs\\Projeto RH Roupeta\\backup_cron.php"'}</code>.
        Backups com mais de 30 dias são removidos automaticamente.
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {err&&<div style={{padding:'12px 16px',background:'#fef2f2',color:'var(--red)',fontSize:13,borderBottom:'1px solid #fecaca'}}>⚠ {err}</div>}
        {loading?<div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>A carregar...</div>
         :backups.length===0?<div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>Sem backups guardados.<br/><button className="btn bp btn-sm" style={{marginTop:10}} onClick={createNow}>Criar primeiro backup</button></div>
         :<table style={{width:'100%',borderCollapse:'collapse'}}>
           <thead><tr style={{background:'var(--bg)'}}>
             <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,letterSpacing:'.4px'}}>Data / Hora</th>
             <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,letterSpacing:'.4px'}}>Nota</th>
             <th style={{padding:'10px 14px',textAlign:'right',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,letterSpacing:'.4px'}}>Tamanho</th>
             <th style={{padding:'10px 14px',textAlign:'right',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,letterSpacing:'.4px'}}>Acções</th>
           </tr></thead>
           <tbody>
             {days.map(day=>(
               <React.Fragment key={day}>
                 <tr style={{background:day===today?'#fef9e7':'#f9fafb'}}>
                   <td colSpan={4} style={{padding:'8px 14px',fontWeight:700,fontSize:12,color:'var(--muted)'}}>
                     {day===today?'📅 Hoje — ':''}{(()=>{const m=/(\d{4})-(\d{2})-(\d{2})/.exec(day);return m?`${m[3]}/${m[2]}/${m[1]}`:day;})()}
                     <span style={{marginLeft:8,fontWeight:500,color:'#9ca3af'}}>({byDay[day].length} {byDay[day].length===1?'backup':'backups'})</span>
                   </td>
                 </tr>
                 {byDay[day].map(b=>{
                   const isPre = /pre-restauro|pré-restauro/i.test(b.note||'');
                   const isRestoring = restoring === b.name;
                   return (
                   <tr key={b.name} style={{borderTop:'1px solid var(--border)',background:isPre?'#fef9c3':undefined}}>
                     <td style={{padding:'10px 14px',fontWeight:500,fontSize:13}}>
                       {isPre&&<span title="Snapshot criado automaticamente antes de um restauro" style={{display:'inline-block',padding:'1px 7px',marginRight:6,fontSize:10,fontWeight:700,color:'#854d0e',background:'#fef08a',border:'1px solid #facc15',borderRadius:10}}>↺ PRÉ-RESTAURO</span>}
                       {dateFromName(b.name)}
                     </td>
                     <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{b.note||'—'}</td>
                     <td style={{padding:'10px 14px',textAlign:'right',fontSize:12,color:'var(--muted)',fontFamily:'Consolas,monospace'}}>{fmtSize(b.size)}</td>
                     <td style={{padding:'10px 14px',textAlign:'right'}}>
                       <button className="btn btn-sm" style={{marginRight:6,background:isPre?'#854d0e':'#1a5276',color:'white',border:'none',fontWeight:700,opacity:isRestoring?.6:1}}
                         disabled={!!restoring}
                         onClick={()=>restore(b.name, isPre)}>
                         {isRestoring?'A restaurar…':(isPre?'↺ Reverter para este':'Restaurar')}
                       </button>
                       {isSuper&&<button className="btn btn-sm" style={{color:'var(--red)',borderColor:'var(--red)',background:'transparent'}} disabled={!!restoring} onClick={()=>del(b.name)}>Eliminar</button>}
                     </td>
                   </tr>);
                 })}
               </React.Fragment>
             ))}
           </tbody>
         </table>}
      </div>

      {!isSuper&&backups.length>0&&<div style={{marginTop:10,fontSize:11,color:'var(--muted)',textAlign:'right'}}>Apenas super-administradores podem eliminar backups.</div>}
    </div>
  );
}

function useMobile(){
  const [mob,setMob]=useState(()=>window.innerWidth<=768);
  useEffect(()=>{
    const mq=window.matchMedia('(max-width: 768px)');
    const h=e=>setMob(e.matches);
    mq.addEventListener('change',h);
    return ()=>mq.removeEventListener('change',h);
  },[]);
  return mob;
}


function SecurityLogsScreen(){
  const [logRows,setLogRows]=useState([]);
  const [byDivision,setByDivision]=useState([]);
  const [sessions,setSessions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filterDivision,setFilterDivision]=useState('all');
  const [filterEvent,setFilterEvent]=useState('all');
  const [viewShot,setViewShot]=useState(null); // {row, url}

  const DIVISION_NAMES={
    dashboard:'Dashboard',colaboradores:'Colaboradores',sef:'SEF',medicina:'Medicina',
    diuturnidades:'Diuturnidades',cartas:'Cartas Condução',formacao:'Formação',
    epi:'EPIs',fardas:'Fardas',ferias:'Férias',contratos:'Contratos',
    relatorios:'Relatórios',avaliacao:'Avaliações',aniversarios:'Aniversários',
    audit:'Logs Sistema',users:'Utilizadores',backups:'Backups',
    security_logs:'Logs Segurança',login:'Login',desconhecida:'Desconhecida'
  };
  const EVENT_NAMES={
    printscreen:{l:'PrintScreen',c:'#E74C3C'},
    display_media:{l:'Gravação ecrã',c:'#8E44AD'},
    visibility_blur:{l:'Mudança de janela',c:'#F39C12'},
    window_blur:{l:'Perda de foco',c:'#F39C12'}
  };

  function formatDetails(eventType, raw){
    raw = (raw||'').trim();
    if(!raw) return '—';
    if(eventType === 'printscreen'){
      const m = raw.match(/ctrl=(true|false).*alt=(true|false).*shift=(true|false)/);
      if(!m) return 'Tecla Print Screen pressionada.';
      const mods = [];
      if(m[1]==='true')  mods.push('Ctrl');
      if(m[2]==='true')  mods.push('Alt');
      if(m[3]==='true')  mods.push('Shift');
      if(mods.length === 0) return 'Tecla Print Screen pressionada (captura para clipboard).';
      if(m[2]==='true') return 'Alt + Print Screen — captura só da janela activa.';
      return `${mods.join(' + ')} + Print Screen pressionados.`;
    }
    if(eventType === 'window_blur' || eventType === 'visibility_blur'){
      const m = raw.match(/gap_ms=(\d+)/);
      if(!m) return raw;
      const ms = Number(m[1]);
      const secs = (ms/1000).toFixed(ms<2000?1:0);
      const where = eventType === 'visibility_blur' ? 'Separador escondido' : 'Janela perdeu foco';
      const hint = ms < 1500
        ? ' — duração curta, típica da Snipping Tool / Win+Shift+S.'
        : ms < 5000
          ? ' — pode ter mudado de janela ou tirado screenshot externa.'
          : ' — afastou-se do programa por algum tempo.';
      return `${where} durante ${secs}s${hint}`;
    }
    return raw;
  }

  async function load(){
    setLoading(true);
    try{
      const r = await apiCall('get_screenshot_log',{limit:1000});
      setLogRows(r.rows||[]);
      setByDivision(r.byDivision||[]);
    }catch(e){ alert('Erro: '+e.message); }
    try{
      const s = await apiCall('get_user_sessions');
      setSessions(s||[]);
    }catch(e){}
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  async function clearAll(){
    if(!confirm('Apagar TODOS os registos de captura de ecrã? Esta operação não pode ser desfeita.')) return;
    try{ await apiCall('clear_screenshot_log'); await load(); }catch(e){ alert('Erro: '+e.message); }
  }
  async function revokeSession(id){
    if(!confirm('Terminar esta sessão? O utilizador será forçado a iniciar sessão novamente.')) return;
    try{ await apiCall('revoke_session',{sessionId:id}); await load(); }catch(e){ alert('Erro: '+e.message); }
  }

  const filtered = logRows.filter(r=>{
    if(filterDivision!=='all' && r.division!==filterDivision) return false;
    if(filterEvent!=='all' && r.event_type!==filterEvent) return false;
    return true;
  });

  return (
    <div className="sec-logs">
      <div className="sec-logs__header">
        <h2 className="sec-logs__title">🛡️ Logs de Segurança</h2>
        <div className="sec-logs__subtitle">
          Tentativas de captura de ecrã por divisão do programa e sessões activas. Acesso reservado a super-administradores.
        </div>
      </div>

      {loading ? <div className="sec-logs__loading">A carregar…</div> : (
        <>
          {/* Resumo por divisão */}
          <div className="card sec-logs__section">
            <div className="sec-logs__section-title">POR DIVISÃO</div>
            {byDivision.length === 0
              ? <div className="sec-logs__empty">Sem eventos registados.</div>
              : <div className="div-grid">
                  {byDivision.map(d => (
                    <div key={d.division}
                      className={`div-card ${d.division === filterDivision ? 'is-active' : ''}`}
                      onClick={() => setFilterDivision(d.division === filterDivision ? 'all' : d.division)}>
                      <div className="div-card__name">{DIVISION_NAMES[d.division] || d.division}</div>
                      <div className="div-card__count">
                        {d.count} {d.count === 1 ? 'evento' : 'eventos'} · último {d.lastTs ? new Date(d.lastTs).toLocaleString('pt-PT') : '—'}
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Filtros + lista cronológica */}
          <div className="card sec-logs__section">
            <div className="sec-logs__filters">
              <div className="sec-logs__section-title" style={{marginBottom:0}}>EVENTOS DETALHADOS ({filtered.length})</div>
              <div className="sec-logs__filter-controls">
                <select className="fi sec-logs__filter-sel" value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
                  <option value="all">Todos os eventos</option>
                  {Object.entries(EVENT_NAMES).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                </select>
                {filterDivision !== 'all' && (
                  <button className="btn bg btn-sm" onClick={() => setFilterDivision('all')}>
                    ✕ Divisão: {DIVISION_NAMES[filterDivision] || filterDivision}
                  </button>
                )}
                <button className="btn br btn-sm" onClick={clearAll}>Limpar tudo</button>
              </div>
            </div>
            {filtered.length === 0
              ? <div className="sec-logs__empty">Sem eventos para os filtros seleccionados.</div>
              : <div className="sec-logs__tw">
                  <table>
                    <thead>
                      <tr>
                        {['Data','Utilizador','Perfil','Divisão','Evento','IP','Detalhes','Imagem'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(r => {
                        const ev = EVENT_NAMES[r.event_type] || {l:r.event_type, c:'#7f8c8d'};
                        const hasShot = !!r.screenshot_path;
                        const url = hasShot ? `./api.php?action=serve_screenshot&name=${encodeURIComponent(r.screenshot_path)}` : null;
                        return (
                          <tr key={r.id} className={hasShot ? 'clickable' : ''}
                              onClick={() => { if(hasShot) setViewShot({row:r, url}); }}>
                            <td className="mono">{r.ts ? new Date(r.ts).toLocaleString('pt-PT') : '—'}</td>
                            <td className="user">{r.username || '—'}</td>
                            <td className="muted">{r.role || '—'}</td>
                            <td>{DIVISION_NAMES[r.division] || r.division}</td>
                            <td><span className="event-chip" style={{'--c':ev.c}}>{ev.l}</span></td>
                            <td className="mono muted">{r.ip || '—'}</td>
                            <td className="details" title={r.details || ''}>{formatDetails(r.event_type, r.details)}</td>
                            <td>
                              {hasShot
                                ? <button className="shot-btn" onClick={ev => {ev.stopPropagation(); setViewShot({row:r, url});}}>Ver imagem</button>
                                : <span className="shot-dash">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* Sessões recentes */}
          <div className="card sec-logs__section">
            <div className="sec-logs__section-title">SESSÕES RECENTES ({sessions.length})</div>
            {sessions.length === 0
              ? <div className="sec-logs__empty">Sem sessões registadas.</div>
              : <div className="sec-logs__tw">
                  <table>
                    <thead>
                      <tr>
                        {['Utilizador','Email','Perfil','IP','Dispositivo','Início','Última actividade','Estado',''].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.id} className={s.revoked ? 'revoked' : ''}>
                          <td className="user">{s.username || '—'}</td>
                          <td className="muted">{s.email || '—'}</td>
                          <td className="muted">{s.role || '—'}</td>
                          <td className="mono">{s.ip || '—'}</td>
                          <td className="ua" title={s.user_agent || ''}>{s.user_agent || '—'}</td>
                          <td className="mono">{s.created_at ? new Date(s.created_at).toLocaleString('pt-PT') : '—'}</td>
                          <td className="mono">{s.last_seen ? new Date(s.last_seen).toLocaleString('pt-PT') : '—'}</td>
                          <td>
                            <span className={`sess-status ${s.revoked ? 'sess-status--revoked' : 'sess-status--active'}`}>
                              {s.revoked ? 'Terminada' : 'Activa'}
                            </span>
                          </td>
                          <td>
                            {!s.revoked && <button className="btn br btn-sm" onClick={() => revokeSession(s.id)}>Terminar</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </>
      )}

      {/* Modal: imagem capturada do DOM no momento do PrintScreen */}
      {viewShot && (
        <div className="shot-modal" onClick={e => { if(e.target === e.currentTarget) setViewShot(null); }}>
          <div className="shot-frame">
            <div className="shot-frame__head">
              <div className="shot-frame__head-info">
                <div className="shot-frame__title">{viewShot.row.username} · {DIVISION_NAMES[viewShot.row.division] || viewShot.row.division}</div>
                <div className="shot-frame__sub">{new Date(viewShot.row.ts).toLocaleString('pt-PT')} · IP {viewShot.row.ip || '—'}</div>
              </div>
              <a className="shot-frame__download" href={viewShot.url} download={`screenshot_${viewShot.row.id}.jpg`}>Descarregar</a>
              <button className="shot-frame__close" onClick={() => setViewShot(null)}>✕</button>
            </div>
            <div className="shot-frame__body">
              <img src={viewShot.url} alt="Captura do DOM"
                onError={() => alert('A imagem não está disponível (pode ter expirado após 7 dias).')}/>
            </div>
            <div className="shot-frame__foot">
              Captura do DOM da app no momento da tecla. Não inclui outras janelas do sistema. Apagada automaticamente após 7 dias.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
