function CartasConducaoScreen({data,company,onUpdate,readOnly,onAudit,onNav,initSel}){
  const {employees=[]}=data;
  const [search,setSearch]=useState('');
  const [selRow,setSelRow]=useState(null);
  function update(emp, field, val){
    if(readOnly||!onUpdate) return;
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,[field]:val}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`Actualizou ${field} de ${emp.name}: ${val||'(vazio)'}`, 'colaborador');
  }
  function toggleHiddenIn(emp, mk){
    if(readOnly)return;
    const cur=isHidden(emp, mk);
    const baseObj=(emp.hidden&&typeof emp.hidden==='object')?emp.hidden:{};
    const newHidden={...baseObj, [mk]:!cur};
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,hidden:newHidden}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`${!cur?'Ocultou':'Mostrou'} ${emp.name} no módulo ${mk.toUpperCase()}`, 'colaborador');
    setSelRow(s=>s?{...s,hidden:newHidden}:s);
  }
  const [showHidden,setShowHidden]=useState(false);
  const emps=useMemo(()=>{
    const base=filterEmps(employees, company);
    return (showHidden||company==='escritorio') ? base : base.filter(e=>!isHidden(e,'cartas'));
  },[employees,company,showHidden]);
  const hiddenCount=useMemo(()=>filterEmps(employees, company).filter(e=>isHidden(e,'cartas')).length,[employees,company]);
  const searchLower=search.trim().toLowerCase();
  // Highlight quando navegado a partir de um alerta do dashboard.
  const [hlId,setHlId]=useState(null);
  const [hlPhase,setHlPhase]=useState(null);
  useEffect(()=>{
    if(!initSel||!initSel._highlight)return;
    const key=initSel.id+'_'+initSel.company;
    setHlId(key); setHlPhase('blink');
    const t1=setTimeout(()=>setHlPhase('gray'),3000);
    const t2=setTimeout(()=>{setHlPhase(null);setHlId(null);},63000);
    setTimeout(()=>{
      const el=document.getElementById('carta-row-'+key);
      if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
    },80);
    return()=>{clearTimeout(t1);clearTimeout(t2);};
  },[initSel?.id,initSel?.company,initSel?._highlight]);
  const withLic=emps.filter(e=>e.driverLicenseExpiry)
    .map(e=>({...e,days:daysTo(e.driverLicenseExpiry),_drv:isDriver(e)}))
    .sort((a,b)=>{
      if(a._drv!==b._drv) return a._drv?-1:1;
      if(a.days===null&&b.days===null)return 0;
      if(a.days===null)return 1;if(b.days===null)return -1;
      return a.days-b.days;
    })
    .filter(e=>!searchLower||e.name?.toLowerCase().includes(searchLower)||String(e.id).includes(searchLower));
  const drivers=withLic.filter(e=>e._drv);
  const expired=drivers.filter(e=>e.days!==null&&e.days<0);
  const warning=drivers.filter(e=>e.days!==null&&e.days>=0&&e.days<=90);
  const ok=drivers.filter(e=>e.days===null||e.days>90);
  const naoConduzCount=withLic.filter(e=>!e._drv).length;
  const noLic=emps.filter(e=>isDriver(e)&&!e.driverLicenseExpiry).filter(e=>!searchLower||e.name?.toLowerCase().includes(searchLower)||String(e.id).includes(searchLower));
  return(
    <div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes carta-hl-blink {
          0%, 100% { background-color: #fee2e2; box-shadow: inset 0 0 0 2px #dc2626; }
          50%      { background-color: transparent; box-shadow: inset 0 0 0 2px transparent; }
        }
        tr.carta-hl-blink   td { animation: carta-hl-blink 1s ease-in-out 0s 3; }
        tr.carta-hl-grayed  td { background-color: #e5e7eb !important; transition: background-color .8s ease; }
      `}}/>
      <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:14}}>Cartas de Condução</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar colaborador..." className="fi" style={{width:200,padding:'5px 10px',fontSize:12,marginLeft:'auto'}}/>
        {hiddenCount>0&&company!=='escritorio'&&(
          <label className="show-hidden">
            <input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/>
            Mostrar ocultos
          </label>
        )}
      </div>
      <div style={{background:'var(--orbg)',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12,color:'var(--orange)'}}>
        Alerta activado 90 dias antes do vencimento. Apenas motoristas contam para os indicadores; pessoal de escritório aparece a cinzento.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8,marginBottom:14}}>
        <div style={{background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:8,padding:'6px 10px'}}>
          <div style={{fontSize:18,fontWeight:800,color:'var(--red)',lineHeight:1.1}}>{expired.length}</div>
          <div style={{fontSize:11,color:'#991b1b'}}>Caducadas</div>
        </div>
        <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'6px 10px'}}>
          <div style={{fontSize:18,fontWeight:800,color:'#92400e',lineHeight:1.1}}>{warning.length}</div>
          <div style={{fontSize:11,color:'#92400e'}}>A caducar (90 dias)</div>
        </div>
        <div style={{background:'#d1fae5',border:'1px solid #6ee7b7',borderRadius:8,padding:'6px 10px'}}>
          <div style={{fontSize:18,fontWeight:800,color:'var(--green)',lineHeight:1.1}}>{ok.length}</div>
          <div style={{fontSize:11,color:'#065f46'}}>Em dia</div>
        </div>
        <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 10px'}}>
          <div style={{fontSize:18,fontWeight:800,color:'var(--muted)',lineHeight:1.1}}>{noLic.length}</div>
          <div style={{fontSize:11,color:'var(--muted)'}}>Motorista s/ validade</div>
        </div>
        <div style={{background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,padding:'6px 10px'}}>
          <div style={{fontSize:18,fontWeight:800,color:'#6b7280',lineHeight:1.1}}>{naoConduzCount}</div>
          <div style={{fontSize:11,color:'#6b7280'}}>Não conduz</div>
        </div>
      </div>
      <div className="card cartas-table"><div className="tw"><table>
        <thead><tr>
          <th>Colaborador</th><th>Função</th><th>Empresa</th><th>Nº Carta</th><th>Validade</th><th>Dias</th><th>Estado</th>
        </tr></thead>
        <tbody>
          {withLic.map(emp=>{
            const drv=emp._drv;
            const exp=drv&&emp.days!==null&&emp.days<0;
            const warn=drv&&emp.days!==null&&emp.days>=0&&emp.days<=90;
            const sc=!drv
              ?{bg:'#f3f4f6',c:'#6b7280',label:'—'}
              :emp.days===null?{bg:'#f3f4f6',c:'#6b7280',label:'—'}
              :exp?{bg:'#fee2e2',c:'var(--red)',label:emp.days+'d'}
              :warn?{bg:'#fef3c7',c:'#92400e',label:emp.days+'d'}
              :{bg:'#d1fae5',c:'#065f46',label:emp.days+'d'};
            const dateColor=!drv?'#9ca3af':exp?'var(--red)':warn?'#92400e':'inherit';
            const rowKey=emp.id+'_'+emp.company;
            const isHl=hlId===rowKey;
            const hlClass=isHl?(hlPhase==='blink'?'carta-hl-blink':hlPhase==='gray'?'carta-hl-grayed':''):'';
            return(
              <tr id={'carta-row-'+rowKey} key={emp.id+emp.company}
                  className={`row-clickable ${hlClass} ${isHidden(emp,'cartas')?'row-hidden':''}`} onClick={()=>setSelRow(emp)}
                  style={isHl?{}:{background:!drv?'#f9fafb':(exp?'#fff5f5':warn?'#fffbeb':'')}}>
                <td style={{fontWeight:500,textAlign:'left',color:!drv?'#9ca3af':(exp?'var(--red)':'')}}>{emp.name}</td>
                <td style={{fontSize:11,color:!drv?'#9ca3af':'inherit'}}>{emp.role||'—'}</td>
                <td><Chip label={emp.company} type="gr"/></td>
                <td style={{color:!drv?'#9ca3af':'inherit',fontSize:12}}>{emp.driverLicense||'—'}</td>
                <td style={{fontWeight:!drv?400:600,color:dateColor}}>{fmtDate(emp.driverLicenseExpiry)||'—'}</td>
                <td><span style={{fontSize:12,fontWeight:700,padding:'2px 8px',borderRadius:10,background:sc.bg,color:sc.c}}>{sc.label}</span></td>
                <td>{!drv
                  ?<span className="chip" style={{background:'#f3f4f6',color:'#6b7280',fontWeight:600}}>Não conduz</span>
                  :exp?<span className="chip cr">Caducada</span>
                  :warn?<span className="chip co">Alerta</span>
                  :<span className="chip cg">OK</span>}</td>
              </tr>
            );
          })}
          {withLic.length===0&&<tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'var(--muted)'}}>Sem registos de carta de condução.</td></tr>}
        </tbody>
      </table></div></div>
      {selRow && <RowActionsModal
        emp={selRow} moduleKey="cartas" moduleLabel="Cartas de Condução"
        dateField="driverLicenseExpiry" dateLabel="Validade da Carta"
        onClose={()=>setSelRow(null)}
        onUpdateField={(f,v)=>{ update(selRow,f,v); setSelRow(s=>({...s,[f]:v})); }}
        onToggleHiddenIn={mk=>toggleHiddenIn(selRow, mk)}
        onGotoFicha={onNav?(emp=>onNav('employees',emp)):null}/>}
    </div>
  );
}

function AvaliacaoScreen({data,company,evals,onNav}){
  const {employees=[],inactive=[]}=data;

  function getEmp(ev){
    return employees.find(e=>e.id===ev.empId&&e.company===ev.empCompany)||
           inactive.find(e=>e.id===ev.empId&&e.company===ev.empCompany);
  }

  const filtered=useMemo(()=>{
    const all=[...evals].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    if(company==='all') return all;
    if(company==='escritorio') return all.filter(ev=>{const e=getEmp(ev); return e&&isOffice(e);});
    return all.filter(ev=>ev.empCompany===COMPANY_NAME[company]);
  },[evals,company,employees,inactive]);

  const totalEmps=new Set(filtered.map(e=>e.empId+'|'+e.empCompany)).size;
  const byType=useMemo(()=>{
    const map={};
    filtered.forEach(e=>{const t=e.type||'Outro';map[t]=(map[t]||0)+1;});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[filtered]);

  return(
    <div>
      <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12.5,color:'#92400e',display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:18}}>⚠</span>
        <span><strong>Módulo em fase de testes e análise.</strong> Funcionalidade ainda não final — os dados podem ser revistos ou alterados antes da versão estável.</span>
      </div>
      <div className="stats" style={{marginBottom:20}}>
        <div className="stat"><div className="stat-n">{filtered.length}</div><div className="stat-l">Registos</div></div>
        <div className="stat"><div className="stat-n" style={{color:'var(--blue)'}}>{totalEmps}</div><div className="stat-l">Colaboradores</div></div>
        {byType.slice(0,3).map(([t,n])=>(
          <div key={t} className="stat"><div className="stat-n" style={{color:'var(--orange)'}}>{n}</div><div className="stat-l" style={{fontSize:10,maxWidth:80}}>{t}</div></div>
        ))}
      </div>
      {filtered.length===0?<div className="empty">Sem registos de avaliação</div>:
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {filtered.map((ev,i)=>{
          const emp=getEmp(ev);
          return(
            <div key={ev.id} style={{padding:'12px 16px',borderBottom:i<filtered.length-1?'1px solid var(--border)':'none',
              display:'flex',alignItems:'flex-start',gap:12,cursor:emp?'pointer':'default',transition:'background .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
              onMouseLeave={e=>e.currentTarget.style.background=''}
              onClick={()=>emp&&onNav('employees',emp)}>
              <div className="av" style={{width:34,height:34,fontSize:12,flexShrink:0,background:COMP_COLORS[emp?.company]||'#999'}}>{initials(emp?.name||ev.empId||'?')}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontWeight:700,fontSize:13}}>{emp?.name||ev.empName||ev.empId}</span>
                  <span className="chip cgr" style={{fontSize:10}}>{ev.empCompany}</span>
                  <span className="chip" style={{fontSize:10,background:'var(--blbg)',color:'var(--blue)',border:'none'}}>{ev.type}</span>
                </div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{fmtDate(ev.date)} · Por {ev.by||'RH'}</div>
                <div style={{fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.notes}</div>
                {ev.nextAction&&<div style={{fontSize:11,color:'var(--blue)',marginTop:3,background:'var(--blbg)',display:'inline-block',borderRadius:4,padding:'2px 7px'}}>
                  → {ev.nextAction}{ev.nextDate?` (${fmtDate(ev.nextDate)})`:''}</div>}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

function AniversariosScreen({data,company}){
  const [search,setSearch]=useState('');
  const [shareEmp,setShareEmp]=useState(null);
  const [shareMsg,setShareMsg]=useState('');
  const [sharePhone,setSharePhone]=useState('');
  const [shareFile,setShareFile]=useState(null);
  const [shareSending,setShareSending]=useState(false);
  const allEmps=(data?.employees||[]).filter(e=>e.status!=='inactive');

  // Devolve o nº formatado para wa.me (sem '+'), ou null se não houver match.
  function waPhone(phone){
    if(!phone) return null;
    const d=String(phone).replace(/\D/g,'');
    if(!d) return null;
    if(/^9\d{8}$/.test(d)) return '351'+d;
    if(/^00\d{9,}$/.test(d)) return d.slice(2);
    if(d.length>=10) return d;
    return null;
  }

  function defaultMsg(name){
    const first = (name||'').split(' ')[0]||'';
    return `Olá ${first}!\n\nA Transportes Roupeta deseja-lhe um Feliz Aniversário! 🎂\n\nQue tenha um dia maravilhoso e um ano cheio de alegrias e conquistas.\n\nUm forte abraço da equipa!`;
  }

  function openShare(emp){
    setShareEmp(emp);
    setShareMsg(defaultMsg(emp.name));
    setSharePhone(emp.personalPhone||'');
    setShareFile(null);
  }
  function closeShare(){
    setShareEmp(null); setShareMsg(''); setSharePhone(''); setShareFile(null); setShareSending(false);
  }

  async function sendWA(){
    if(!shareMsg.trim()){ alert('A mensagem é obrigatória.'); return; }
    const phone=waPhone(sharePhone);
    if(!phone){ alert('Número de telefone inválido. Indique um número PT (9 dígitos) ou com indicativo internacional.'); return; }
    setShareSending(true);
    try{
      if(shareFile && navigator.canShare && navigator.canShare({files:[shareFile]})){
        try{
          await navigator.share({files:[shareFile], text:shareMsg, title:'Aniversário'});
          closeShare();
          return;
        }catch(e){ /* cancelado pelo utilizador */ }
      }
      let pasteHint='';
      if(shareFile){
        try{
          if(window.ClipboardItem && navigator.clipboard?.write && shareFile.type.startsWith('image/')){
            await navigator.clipboard.write([new ClipboardItem({[shareFile.type]:shareFile})]);
            pasteHint=' (imagem copiada — cole com Ctrl+V no WhatsApp)';
          }else{
            const a=document.createElement('a');
            a.href=URL.createObjectURL(shareFile);
            a.download=shareFile.name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(()=>URL.revokeObjectURL(a.href),2000);
            pasteHint=' (imagem descarregada — anexe-a manualmente no WhatsApp)';
          }
        }catch(e){}
      }
      const url=`https://wa.me/${phone}?text=${encodeURIComponent(shareMsg)}`;
      window.open(url,'_blank');
      if(pasteHint) alert('WhatsApp aberto'+pasteHint);
      closeShare();
    }catch(e){
      console.error(e);
      alert('Erro ao abrir WhatsApp.');
      setShareSending(false);
    }
  }
  const filtered=useMemo(()=>{
    return filterEmps(allEmps, company)
      .filter(e=>!search||e.name?.toLowerCase().includes(search.toLowerCase()))
      .map(e=>({...e,daysLeft:daysToBirthday(e.birthDate)}))
      .filter(e=>e.daysLeft!==null)
      .sort((a,b)=>a.daysLeft-b.daysLeft);
  },[allEmps,company,search]);

  function getColor(d){
    if(d===0) return{bg:'#fdecea',border:'#E74C3C',txt:'#C0392B',label:'Hoje!'};
    if(d<=5)  return{bg:'#fdecea',border:'#E74C3C',txt:'#C0392B',label:`${d} dias`};
    if(d<=15) return{bg:'#fff4e5',border:'#E67E22',txt:'#D35400',label:`${d} dias`};
    if(d<=30) return{bg:'#fffde7',border:'#F1C40F',txt:'#B7950B',label:`${d} dias`};
    return{bg:'#eafaf1',border:'#27AE60',txt:'#1E8449',label:`${d} dias`};
  }

  const today=filtered.filter(e=>e.daysLeft===0).length;
  const soon=filtered.filter(e=>e.daysLeft>0&&e.daysLeft<=5).length;
  const month=filtered.filter(e=>e.daysLeft>0&&e.daysLeft<=30).length;

  function fmtBirthday(s){
    if(!s)return'—';
    const d=new Date(s);if(isNaN(d))return s;
    return d.toLocaleDateString('pt-PT',{day:'2-digit',month:'long'});
  }
  function calcAge(s){
    if(!s)return'—';
    const d=new Date(s),t=new Date();
    let a=t.getFullYear()-d.getFullYear();
    if(t<new Date(t.getFullYear(),d.getMonth(),d.getDate()))a--;
    const next=a+1;
    return`${a} → ${next}`;
  }

  const stats = [
    {l:'Hoje',            v:today,           c:'#E74C3C', bg:'#fdecea'},
    {l:'Próximos 5 dias', v:soon,            c:'#E67E22', bg:'#fff4e5'},
    {l:'Este mês (30d)',  v:month,           c:'#F1C40F', bg:'#fffde7'},
    {l:'Total visíveis',  v:filtered.length, c:'#27AE60', bg:'#eafaf1'},
  ];
  const legend = [
    {c:'#E74C3C', bg:'#fdecea', l:'≤ 5 dias (ou hoje)'},
    {c:'#E67E22', bg:'#fff4e5', l:'≤ 15 dias'},
    {c:'#F1C40F', bg:'#fffde7', l:'≤ 30 dias'},
    {c:'#27AE60', bg:'#eafaf1', l:'Mais de 30 dias'},
  ];
  return(
    <div>
      <div className="aniv-stats">
        {stats.map(s=>(
          <div key={s.l} className="card aniv-stat" style={{'--c':s.c, background:s.bg}}>
            <div className="aniv-stat__label">{s.l}</div>
            <div className="aniv-stat__value">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card cb aniv-search">
        <input className="fi aniv-search__inp" placeholder="Pesquisar colaborador…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="aniv-legend">
        {legend.map(x=>(
          <span key={x.l} className="aniv-legend__chip" style={{'--c':x.c, '--c-bg':x.bg}}>{x.l}</span>
        ))}
      </div>

      <div className="card cb" style={{overflow:'hidden'}}>
        <table className="aniv-table">
          <thead>
            <tr>
              {['Nº','Nome','Empresa','Data Nasc.','Próximo Aniversário','Faltam','Idade (atual→próx.)','Partilha'].map(h=>(
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={8} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>Sem colaboradores encontrados.</td></tr>
            )}
            {filtered.map(e=>{
              const col = getColor(e.daysLeft);
              return(
                <tr key={e.id+e.company} style={{'--c':col.txt, '--c-bg':col.bg, '--c-border':col.border+'22'}}>
                  <td className="id">{e.id||'—'}</td>
                  <td className="name">{e.name||'—'}</td>
                  <td className="company"><span className="pill">{e.company||'—'}</span></td>
                  <td className="dob">{e.birthDate?new Date(e.birthDate).toLocaleDateString('pt-PT'):'—'}</td>
                  <td className="next">{fmtBirthday(e.birthDate)}</td>
                  <td><span className="aniv-days" style={{'--c':col.txt, '--c-bg':col.bg}}>{col.label}</span></td>
                  <td className="age">{calcAge(e.birthDate)}</td>
                  <td className="action">
                    <button className="aniv-send" onClick={()=>openShare(e)}
                            disabled={e.daysLeft!==0}
                            title={e.daysLeft===0?`Enviar mensagem de aniversário a ${e.name}`:'Disponível apenas no dia do aniversário'}>
                      Enviar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shareEmp && (
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget) closeShare();}}>
          <div className="modal wa-modal">
            <div className="wa-modal__head">
              <img className="wa-modal__bolo" src="css/assets/bolo.png" alt=""/>
              <div className="wa-modal__title-block">
                <div className="wa-modal__title">Mensagem de Aniversário</div>
                <div className="wa-modal__sub">{shareEmp.name} · {shareEmp.company}</div>
              </div>
              <button className="btn bg" onClick={closeShare}>✕</button>
            </div>

            <div className="mb wa-form">
              <div className="field">
                <div className="fl wa-form__phone-row">
                  <span>Telefone <span style={{color:'var(--red)'}}>*</span></span>
                  {shareEmp.personalPhone && sharePhone!==shareEmp.personalPhone && (
                    <button className="wa-form__reset" onClick={()=>setSharePhone(shareEmp.personalPhone)}>↻ repor da ficha</button>
                  )}
                </div>
                <input type="tel" className="fi wa-form__phone-inp"
                  value={sharePhone} onChange={e=>setSharePhone(e.target.value)}
                  placeholder="ex: 912 345 678 ou 351912345678"/>
                <div className={`wa-form__phone-hint ${waPhone(sharePhone)?'ok':'err'}`}>
                  {waPhone(sharePhone) ? `✓ Será enviado para +${waPhone(sharePhone)}` : '⚠ Número inválido — use 9 dígitos PT ou número com indicativo'}
                </div>
              </div>

              <div className="field">
                <div className="fl wa-form__msg-head">
                  <span>Mensagem <span style={{color:'var(--red)'}}>*</span></span>
                  <span className="wa-form__counter">{shareMsg.length} caracteres</span>
                </div>
                <textarea className="fi wa-form__msg" rows={7}
                  value={shareMsg} onChange={e=>setShareMsg(e.target.value)}
                  placeholder="Escreva a mensagem personalizada..."/>
              </div>

              <div className="field">
                <div className="fl">Anexo (opcional)</div>
                <input type="file" accept="image/*,application/pdf" className="fi wa-form__file"
                  onChange={e=>setShareFile(e.target.files?.[0]||null)}/>
                {shareFile && (
                  <div className="wa-form__file-preview">
                    {shareFile.type.startsWith('image/') && <img className="wa-form__thumb" src={URL.createObjectURL(shareFile)} alt=""/>}
                    <span className="wa-form__fname">{shareFile.name}</span>
                    <span className="wa-form__fsize">{(shareFile.size/1024).toFixed(1)} KB</span>
                    <button className="btn bs btn-sm" onClick={()=>setShareFile(null)}>✕</button>
                  </div>
                )}
                <div className="wa-form__file-help">
                  No telemóvel/Edge/Chrome: o anexo é partilhado directamente.<br/>
                  No WhatsApp Web tradicional: a imagem é copiada para a área de transferência (cole com Ctrl+V).
                </div>
              </div>
            </div>

            <div className="wa-modal__foot">
              <button className="btn" onClick={closeShare}>Cancelar</button>
              <button className="wa-send-btn" onClick={sendWA}
                disabled={!shareMsg.trim()||shareSending||!waPhone(sharePhone)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
                {shareSending ? 'A enviar…' : 'Enviar via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
