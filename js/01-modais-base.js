function LoginScreen({onLogin}){
  const initialHash = (typeof location !== 'undefined' && location.hash.startsWith('#reset='))
    ? location.hash.slice('#reset='.length) : '';
  const [view,setView]=React.useState(initialHash ? 'reset' : 'login');
  const [resetToken,setResetToken]=React.useState(initialHash);

  const [email,setEmail]=React.useState('');
  const [pass,setPass]=React.useState('');
  const [err,setErr]=React.useState('');
  const [info,setInfo]=React.useState('');
  const [loading,setLoading]=React.useState(false);

  const [forgotEmail,setForgotEmail]=React.useState('');
  const [newPass,setNewPass]=React.useState('');
  const [newPass2,setNewPass2]=React.useState('');

  function backToLogin(){
    setView('login'); setErr(''); setForgotEmail('');
    setNewPass(''); setNewPass2(''); setResetToken('');
    if(location.hash.startsWith('#reset=')) history.replaceState(null,'',location.pathname+location.search);
  }

  async function go(e){
    e.preventDefault();
    if(!email.trim()||!pass){setErr('Preencha o email e a password.');return;}
    setLoading(true);setErr('');
    try{
      const u=await apiCall('login',{email:email.trim(),password:pass});
      if(u){
        window.__sec.csrf = u.csrf || '';
        window.__sec.securityVersion = u.securityVersion || 0;
      }
      await appendAudit({user:u.username,role:u.role,action:'login',details:'Sessão iniciada'});
      onLogin(u);
    }catch(ex){
      setErr(ex.message||'Email ou password incorretos.');
    }finally{setLoading(false);}
  }

  async function submitForgot(e){
    e.preventDefault();
    if(!forgotEmail.trim()){setErr('Indique o seu email.');return;}
    setLoading(true);setErr('');setInfo('');
    try{
      const r=await apiCall('request_password_reset',{email:forgotEmail.trim()});
      setInfo(r?.message || 'Se a conta existir, receberá um email com instruções dentro de minutos.');
    }catch(ex){
      setErr(ex.message||'Não foi possível enviar o email.');
    }finally{setLoading(false);}
  }

  async function submitReset(e){
    e.preventDefault();
    if(newPass.length<8){setErr('A nova password deve ter pelo menos 8 caracteres.');return;}
    if(newPass!==newPass2){setErr('As passwords não coincidem.');return;}
    setLoading(true);setErr('');setInfo('');
    try{
      const r=await apiCall('reset_password_with_token',{token:resetToken,password:newPass});
      setInfo(r?.message || 'Password actualizada. Pode iniciar sessão com a nova password.');
      setTimeout(backToLogin, 1800);
    }catch(ex){
      setErr(ex.message||'Não foi possível actualizar a password.');
    }finally{setLoading(false);}
  }

  return(
    <div className="container-login">
      <div style={{textAlign:'center',color:'white'}}>
        <img src="css/assets/Logo-header.svg" alt="Transportes Roupeta" style={{height:'72px',display:'block',margin:'0 auto 14px',filter:'brightness(0) invert(1)'}}/>
        <div style={{fontSize:'24px',fontWeight:'800',letterSpacing:'2px'}}>TRANSPORTES ROUPETA</div>
        <div style={{fontSize:'12px',color:'rgba(255,255,255,.45)',marginTop:'5px'}}>Gestão de Recursos Humanos</div>
      </div>

      {view==='login' && (
        <form onSubmit={go} className="container-login-form">
          <div style={{marginBottom:'16px'}}>
            <div className="fl" style={{marginBottom:'6px'}}>Email</div>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr('');}} className="fi" placeholder="utilizador@empresa.com" autoComplete="email" required/>
          </div>
          <div style={{marginBottom:'16px'}}>
            <div className="fl" style={{marginBottom:'6px'}}>Password</div>
            <input type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr('');}} className="fi" placeholder="••••••••" autoComplete="current-password" required/>
          </div>
          {err&&<div style={{color:'#C0392B',fontSize:'13px',marginBottom:'12px',background:'#fdecea',borderRadius:'8px',padding:'8px 12px'}}>{err}</div>}
          <button type="submit" className="btn bp" style={{width:'100%',justifyContent:'center',padding:'12px'}} disabled={loading}>
            {loading?'A entrar…':'Entrar'}
          </button>
          <div style={{textAlign:'center',marginTop:14}}>
            <button type="button" onClick={()=>{setView('forgot');setErr('');setInfo('');}} style={{background:'transparent',border:'none',color:'var(--muted)',fontSize:12,cursor:'pointer',textDecoration:'underline',padding:0}}>
              Esqueci-me da password
            </button>
          </div>
        </form>
      )}

      {view==='forgot' && (
        <form onSubmit={submitForgot} className="container-login-form">
          <div style={{textAlign:'center',marginBottom:14,color:'#1f2a37',fontSize:14,fontWeight:700}}>Recuperar password</div>
          <div style={{fontSize:11,color:'#6b7280',marginBottom:14,textAlign:'center',lineHeight:1.5}}>
            Indique o email da sua conta. Enviaremos um link válido por 1 hora para definir uma nova password.
          </div>
          <div style={{marginBottom:'16px'}}>
            <div className="fl" style={{marginBottom:'6px'}}>Email</div>
            <input type="email" value={forgotEmail} onChange={e=>{setForgotEmail(e.target.value);setErr('');}} className="fi" placeholder="utilizador@empresa.com" autoComplete="email" required/>
          </div>
          {err&&<div style={{color:'#C0392B',fontSize:'13px',marginBottom:'12px',background:'#fdecea',borderRadius:'8px',padding:'8px 12px'}}>{err}</div>}
          {info&&<div style={{color:'#1E7E34',fontSize:'13px',marginBottom:'12px',background:'#e6f4ea',borderRadius:'8px',padding:'8px 12px'}}>{info}</div>}
          <button type="submit" className="btn bp" style={{width:'100%',justifyContent:'center',padding:'12px'}} disabled={loading}>
            {loading?'A enviar…':'Enviar email'}
          </button>
          <div style={{textAlign:'center',marginTop:14}}>
            <button type="button" onClick={backToLogin} style={{background:'transparent',border:'none',color:'var(--muted)',fontSize:12,cursor:'pointer',textDecoration:'underline',padding:0}}>
              ← Voltar ao login
            </button>
          </div>
        </form>
      )}

      {view==='reset' && (
        <form onSubmit={submitReset} className="container-login-form">
          <div style={{textAlign:'center',marginBottom:14,color:'#1f2a37',fontSize:14,fontWeight:700}}>Definir nova password</div>
          <div style={{fontSize:11,color:'#6b7280',marginBottom:14,textAlign:'center',lineHeight:1.5}}>
            Escolha uma password com pelo menos 8 caracteres.
          </div>
          <div style={{marginBottom:'16px'}}>
            <div className="fl" style={{marginBottom:'6px'}}>Nova password</div>
            <input type="password" value={newPass} onChange={e=>{setNewPass(e.target.value);setErr('');}} className="fi" placeholder="••••••••" autoComplete="new-password" required/>
          </div>
          <div style={{marginBottom:'16px'}}>
            <div className="fl" style={{marginBottom:'6px'}}>Confirmar password</div>
            <input type="password" value={newPass2} onChange={e=>{setNewPass2(e.target.value);setErr('');}} className="fi" placeholder="••••••••" autoComplete="new-password" required/>
          </div>
          {err&&<div style={{color:'#C0392B',fontSize:'13px',marginBottom:'12px',background:'#fdecea',borderRadius:'8px',padding:'8px 12px'}}>{err}</div>}
          {info&&<div style={{color:'#1E7E34',fontSize:'13px',marginBottom:'12px',background:'#e6f4ea',borderRadius:'8px',padding:'8px 12px'}}>{info}</div>}
          <button type="submit" className="btn bp" style={{width:'100%',justifyContent:'center',padding:'12px'}} disabled={loading||!!info}>
            {loading?'A actualizar…':'Definir password'}
          </button>
          <div style={{textAlign:'center',marginTop:14}}>
            <button type="button" onClick={backToLogin} style={{background:'transparent',border:'none',color:'var(--muted)',fontSize:12,cursor:'pointer',textDecoration:'underline',padding:0}}>
              ← Voltar ao login
            </button>
          </div>
        </form>
      )}

      <div style={{fontSize:'10px',color:'rgba(255,255,255,.22)'}}>Transportes Roupeta · Roupeta II · Arlize · Pit Evolution &middot; {new Date().getFullYear()}</div>
    </div>
  );
}

// Mostrado quando a BD não tem nenhum utilizador (instalação fresca).
// Cria o primeiro admin e desaparece para sempre — o endpoint recusa-se a correr
// novamente se já houver utilizadores na BD.
function SetupScreen({smtpConfigured, onDone}){
  const [email,setEmail]=React.useState('');
  const [name,setName]=React.useState('');
  const [pass,setPass]=React.useState('');
  const [pass2,setPass2]=React.useState('');
  const [err,setErr]=React.useState('');
  const [loading,setLoading]=React.useState(false);
  const [done,setDone]=React.useState(false);

  async function submit(e){
    e.preventDefault();
    setErr('');
    if(!email.trim()){ setErr('Indique um email.'); return; }
    if(pass.length<8){ setErr('A password deve ter pelo menos 8 caracteres.'); return; }
    if(pass!==pass2){ setErr('As passwords não coincidem.'); return; }
    setLoading(true);
    try{
      await apiCall('setup_create_admin',{email:email.trim(),name:name.trim(),password:pass});
      setDone(true);
      setTimeout(onDone, 1400);
    }catch(ex){
      setErr(ex.message||'Falha ao criar administrador.');
    }finally{ setLoading(false); }
  }

  return(
    <div className="container-login">
      <div style={{textAlign:'center',color:'white'}}>
        <img src="css/assets/Logo-header.svg" alt="" style={{height:'72px',display:'block',margin:'0 auto 14px',filter:'brightness(0) invert(1)'}}/>
        <div style={{fontSize:'22px',fontWeight:'800',letterSpacing:'2px'}}>PRIMEIRO ACESSO</div>
        <div style={{fontSize:'12px',color:'rgba(255,255,255,.5)',marginTop:'5px'}}>Crie a conta de administrador</div>
      </div>
      <form onSubmit={submit} className="container-login-form">
        <div style={{fontSize:11,color:'#6b7280',marginBottom:14,lineHeight:1.5,textAlign:'center'}}>
          Esta página só aparece uma vez, na instalação inicial. Depois de criar
          o primeiro administrador pode gerir os restantes utilizadores a partir
          da própria aplicação.
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',marginBottom:14,borderRadius:8,
                     background: smtpConfigured ? '#e6f4ea' : '#fef4e7',
                     color: smtpConfigured ? '#1E7E34' : '#92400e',
                     border: `1px solid ${smtpConfigured ? '#cae8d3' : '#f4d6b1'}`,
                     fontSize:12,fontWeight:600}}>
          <span style={{fontFamily:'monospace',fontWeight:800}}>{smtpConfigured ? '[OK]' : '[!]'}</span>
          <span>SMTP {smtpConfigured ? 'configurado — emails activos.' : 'não configurado — verifique config.php para activar recuperação de password.'}</span>
        </div>

        <div style={{marginBottom:'12px'}}>
          <div className="fl" style={{marginBottom:'6px'}}>Email do administrador</div>
          <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr('');}} className="fi" placeholder="admin@empresa.com" autoComplete="email" required disabled={done}/>
        </div>
        <div style={{marginBottom:'12px'}}>
          <div className="fl" style={{marginBottom:'6px'}}>Nome (opcional)</div>
          <input type="text" value={name} onChange={e=>setName(e.target.value)} className="fi" placeholder="Nome completo" autoComplete="name" disabled={done}/>
        </div>
        <div style={{marginBottom:'12px'}}>
          <div className="fl" style={{marginBottom:'6px'}}>Password</div>
          <input type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr('');}} className="fi" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required disabled={done}/>
        </div>
        <div style={{marginBottom:'16px'}}>
          <div className="fl" style={{marginBottom:'6px'}}>Confirmar password</div>
          <input type="password" value={pass2} onChange={e=>{setPass2(e.target.value);setErr('');}} className="fi" placeholder="Repita a password" autoComplete="new-password" required disabled={done}/>
        </div>

        {err && <div style={{color:'#C0392B',fontSize:13,marginBottom:12,background:'#fdecea',borderRadius:8,padding:'8px 12px'}}>{err}</div>}
        {done && <div style={{color:'#1E7E34',fontSize:13,marginBottom:12,background:'#e6f4ea',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>Administrador criado. A redirigir para o login…</div>}

        <button type="submit" className="btn bp" style={{width:'100%',justifyContent:'center',padding:'12px'}} disabled={loading||done}>
          {done ? 'Conta criada' : loading ? 'A criar…' : 'Criar administrador'}
        </button>
      </form>
      <div style={{fontSize:10,color:'rgba(255,255,255,.22)'}}>{new Date().getFullYear()}</div>
    </div>
  );
}

function ExitModal({emp, onConfirm, onClose}){
  const [form,setForm]=useState({
    exitDate: new Date().toISOString().split('T')[0],
    exitReason: '',
    exitInitiative: 'Empresa',
    exitNotes: ''
  });
  function F(k,v){setForm(p=>({...p,[k]:v}));}
  function handleSubmit(){
    if(!form.exitDate){alert('Seleccione a data de saída.');return;}
    if(!form.exitReason){alert('Indique o motivo da saída.');return;}
    onConfirm(emp, form);
  }
  return(
    <div className="ov">
      <div className="modal" style={{maxWidth:480}}>
        <div className="mh">
          <div className="mh-t">Desativar Colaborador</div>
          <button className="btn bg btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="mb">
          <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--red-l)',border:'1px solid #f5cbc5',borderRadius:8,padding:'10px 14px',marginBottom:16}}>
            <div className="av" style={{width:36,height:36,background:COMP_COLORS[emp.company]||'#1a0d0d',fontSize:13,flexShrink:0}}>{initials(emp.name)}</div>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{emp.name}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{emp.role} · {emp.company}</div>
            </div>
          </div>
          <div style={{fontSize:12,color:'var(--red)',background:'var(--red-l)',borderRadius:8,padding:'8px 12px',marginBottom:14}}>
            O colaborador será movido para <strong>Inativos</strong>. Esta acção pode ser revertida com "Retomar à Empresa".
          </div>
          <div className="fg">
            <div className="field">
              <div className="fl">Data de Saída *</div>
              <input type="date" className="fi" value={form.exitDate} onChange={e=>F('exitDate',e.target.value)}/>
            </div>
            <div className="field">
              <div className="fl">Iniciativa *</div>
              <select className="fi" value={form.exitInitiative} onChange={e=>F('exitInitiative',e.target.value)}>
                <option>Empresa</option>
                <option>Colaborador</option>
                <option>Mútuo Acordo</option>
              </select>
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <div className="fl">Motivo da Saída *</div>
              <select className="fi" value={form.exitReason} onChange={e=>F('exitReason',e.target.value)}>
                <option value="">Seleccione o motivo...</option>
                <option>Rescisão de contrato</option>
                <option>Fim de contrato a prazo</option>
                <option>Reforma / Aposentação</option>
                <option>Abandono de trabalho</option>
                <option>Despedimento por justa causa</option>
                <option>Acordo de cessação</option>
                <option>Transferência de empresa</option>
                <option>Outro</option>
              </select>
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <div className="fl">Observações</div>
              <textarea className="fi" rows={3} placeholder="Observações adicionais sobre a saída..." value={form.exitNotes} onChange={e=>F('exitNotes',e.target.value)}/>
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{background:'var(--red)',color:'#fff',borderColor:'var(--red)'}} onClick={handleSubmit}>Confirmar Desativação</button>
        </div>
      </div>
    </div>
  );
}

function ReturnModal({emp, onConfirm, onClose}){
  const age=ageOf(emp.birthDate);
  const [form,setForm]=useState({
    readmissionDate: new Date().toISOString().split('T')[0],
    baseSalary: emp.baseSalary||'',
    iban: emp.iban||'',
    driverLicenseExpiry: emp.driverLicenseExpiry||'',
    contractEndDate: emp.contractEndDate||''
  });
  function F(k,v){setForm(p=>({...p,[k]:v}));}
  function handleSubmit(){
    if(!form.readmissionDate){alert('Seleccione a data de readmissão.');return;}
    onConfirm(emp, form);
  }
  return(
    <div className="ov">
      <div className="modal" style={{maxWidth:520}}>
        <div className="mh">
          <div className="mh-t">Retomar à Empresa</div>
          <button className="btn bg btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="mb">
          <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--grbg)',border:'1px solid #cae8d3',borderRadius:8,padding:'10px 14px',marginBottom:16}}>
            <div className="av" style={{width:36,height:36,background:COMP_COLORS[emp.company]||'#1a0d0d',fontSize:13,flexShrink:0}}>{initials(emp.name)}</div>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{emp.name}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{emp.role} · {emp.company}</div>
            </div>
          </div>
          <div style={{fontSize:12,color:'var(--green)',background:'var(--grbg)',borderRadius:8,padding:'8px 12px',marginBottom:14}}>
            O colaborador será reativado e os campos abaixo actualizados em todos os módulos.
          </div>
          <div className="fg">
            <div className="field">
              <div className="fl">Data de Readmissão *</div>
              <input type="date" className="fi" value={form.readmissionDate} onChange={e=>F('readmissionDate',e.target.value)}/>
            </div>

            <div className="field">
              <div className="fl">Idade (automática)</div>
              <input className="fi" value={age?age+' anos':'—'} readOnly style={{background:'#f9fafb',color:'var(--muted)',cursor:'default'}}/>
            </div>

            <div className="field">
              <div className="fl">Salário Base (€)</div>
              <input type="text" className="fi" placeholder="ex: 958.91" value={form.baseSalary} onChange={e=>F('baseSalary',e.target.value)}/>
            </div>

            <div className="field">
              <div className="fl">IBAN</div>
              <input type="text" className="fi" placeholder="ex: PT50 0000 0000 0000 0000 0000 0" value={form.iban} onChange={e=>F('iban',e.target.value)}/>
            </div>

            <div className="field">
              <div className="fl">Validade Carta de Condução</div>
              <input type="date" className="fi" value={form.driverLicenseExpiry} onChange={e=>F('driverLicenseExpiry',e.target.value)}/>
            </div>

            <div className="field">
              <div className="fl">Tipo de Contrato</div>
              <select className="fi" value={form.contractEndDate} onChange={e=>F('contractEndDate',e.target.value)}>
                <option value="">Seleccione...</option>
                <option>Efetivo</option>
                <option>Termo Certo</option>
                <option>Indeterminado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancelar</button>
          <button className="btn bp" onClick={handleSubmit}>✔ Retomar à Empresa</button>
        </div>
      </div>
    </div>
  );
}
