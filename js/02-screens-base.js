function AuditScreen(){
  const [audit,setAudit]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filterUser,setFilterUser]=useState('all');
  const [filterAction,setFilterAction]=useState('all');

  useEffect(()=>{
    setLoading(true);
    loadAudit().then(a=>{
      const rows=[...a].reverse().filter(e=>e.role==='ADMIN'||e.role==='EDITOR');
      setAudit(rows);
      setLoading(false);
    });
  },[]);

  const TAGS=[
    {k:'all',l:'Todos',c:'#1a0d0d'},
    {k:'colaborador',l:'Colaborador',c:'#2E86C1'},
    {k:'doc',l:'Documento',c:'#8E44AD'},
    {k:'sef',l:'SEF',c:'#1D6A39'},
    {k:'medicina',l:'Medicina',c:'#E74C3C'},
    {k:'diuturnidade',l:'Diuturnidade',c:'#F39C12'},
    {k:'ferias',l:'Férias',c:'#16A085'},
    {k:'formacao',l:'Formação',c:'#2980B9'},
    {k:'epi',l:'EPI',c:'#E67E22'},
    {k:'avaliacao',l:'Avaliação',c:'#9B59B6'},
    {k:'export',l:'Downloads',c:'#27AE60'},
    {k:'sessao',l:'Sessão',c:'#7F8C8D'},
    {k:'consulta',l:'Consulta',c:'#95A5A6'},
  ];
  const tagColor=k=>TAGS.find(t=>t.k===k)?.c||'#95A5A6';
  const tagLabel=k=>TAGS.find(t=>t.k===k)?.l||k;
  const roleColor=r=>r==='ADMIN'?'#C0392B':r==='EDITOR'?'#2E86C1':'#7F8C8D';

  const users=React.useMemo(()=>['all',...new Set(audit.map(a=>a.user))]  ,[audit]);
  const shown=React.useMemo(()=>audit.filter(a=>{
    if(filterUser!=='all'&&a.user!==filterUser) return false;
    if(filterAction!=='all'&&a.action!==filterAction) return false;
    return true;
  }),[audit,filterUser,filterAction]);

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:14,marginRight:4}}>Logs</span>
        <select value={filterUser} onChange={e=>setFilterUser(e.target.value)}
          style={{border:'1px solid var(--border)',borderRadius:6,padding:'4px 10px',fontSize:12,background:'var(--card)',color:'var(--text)',cursor:'pointer'}}>
          {users.map(u=><option key={u} value={u}>{u==='all'?'Todos os utilizadores':u}</option>)}
        </select>
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
        {TAGS.map(({k,l,c})=>(
          <button key={k} onClick={()=>setFilterAction(k)}
            style={{padding:'3px 11px',borderRadius:20,border:'1px solid',fontSize:11,fontWeight:600,cursor:'pointer',
              background:filterAction===k?c:'var(--card)',
              borderColor:filterAction===k?c:'var(--border)',
              color:filterAction===k?'white':'var(--text)'}}>
            {l}
          </button>
        ))}
      </div>
      <div className="card" style={{overflow:'hidden'}}>
        <div className="ch"><span className="ch-t">{shown.length===1?'1 ação':`${shown.length} ações`}{filterAction!=='all'||filterUser!=='all'?' · filtrado':''}</span></div>
        <div style={{maxHeight:'calc(100vh - 290px)',overflow:'auto'}}>
          {loading?<div className="empty">A carregar...</div>:
           shown.length===0?<div className="empty">Sem registos</div>:
           shown.map((a,i)=>(
            <div key={i} className="audit-item">
              <div style={{color:'var(--muted)',whiteSpace:'nowrap',fontSize:11}}>{new Date(a.ts).toLocaleString('pt-PT')}</div>
              <div style={{fontWeight:700,color:roleColor(a.role)}}>{a.user}</div>
              <div style={{padding:'1px 7px',borderRadius:10,background:roleColor(a.role)+'22',color:roleColor(a.role),fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>{a.role}</div>
              {a.action&&a.action!=='action'&&a.action!=='update'&&(
                <div style={{padding:'1px 7px',borderRadius:10,background:tagColor(a.action)+'22',color:tagColor(a.action),fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>{tagLabel(a.action)}</div>
              )}
              <div style={{flex:1,fontSize:13}}>{a.details||a.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SefScreen({data,company,onUpdate,readOnly,onAudit,onNav}){
  const {employees=[]}=data;
  const [f,setF]=useState('all');
  const [search,setSearch]=useState('');
  const [showHidden,setShowHidden]=useState(false);
  const [selRow,setSelRow]=useState(null);
  const emps=useMemo(()=>{
    const base=filterEmps(employees, company);
    return (showHidden||company==='escritorio') ? base : base.filter(e=>!isHidden(e,'sef'));
  },[employees,company,showHidden]);
  const hiddenCount=useMemo(()=>filterEmps(employees, company).filter(e=>isHidden(e,'sef')).length,[employees,company]);
  const list=useMemo(()=>{
    let l=[...emps].sort((a,b)=>{const da=daysTo(a.sefExpiry),db=daysTo(b.sefExpiry);if(da===null&&db===null)return 0;if(da===null)return 1;if(db===null)return -1;return da-db;});
    if(f==='expired') l=l.filter(e=>daysTo(e.sefExpiry)<0);
    if(f==='soon') l=l.filter(e=>{const d=daysTo(e.sefExpiry);return d!==null&&d>=0&&d<=60;});
    if(f==='ok') l=l.filter(e=>daysTo(e.sefExpiry)>60);
    if(search.trim()){const s=search.trim();l=l.filter(e=>nameMatches(e.name,s)||String(e.id).includes(s));}
    return l;
  },[emps,f,search]);
  function update(emp,field,val){
    if(readOnly)return;
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,[field]:val}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`Actualizou SEF de ${emp.name}: ${field}=${val}`, 'sef');
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
  return(
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:14}}>SEF / Declarações Porto</span>
        <div className="rh-search"><span className="rh-search__ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar colaborador..." className="fi rh-search__inp"/>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:5}}>
          {[['all','Todos'],['expired','Vencidos'],['soon','≤60d'],['ok','OK']].map(([k,l])=>(
            <button key={k} className={`btn btn-sm ${f===k?'bp':'bs'}`} onClick={()=>setF(k)}>{l}</button>
          ))}
        </div>
        {hiddenCount>0&&company!=='escritorio'&&(
          <label className="show-hidden">
            <input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/>
            Mostrar ocultos
          </label>
        )}
      </div>
      <div className="card"><div className="tw">
        <table>
          <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Validade</th><th>Dias</th><th>Estado</th><th>Notif.</th></tr></thead>
          <tbody>
            {list.map(emp=>{const d=daysTo(emp.sefExpiry);return(
              <tr key={emp.id+emp.company} className={`row-clickable ${isHidden(emp,'sef')?'row-hidden':''}`} onClick={()=>setSelRow(emp)}>
                <td>{emp.id}</td><td style={{fontWeight:500}}>{emp.name}</td>
                <td><Chip label={emp.company} type="gr"/></td>
                <td className={expClass(d)}>{fmtDate(emp.sefExpiry)}</td>
                <td>{d===null?'—':<span className={d<0?'chip cr':d<=60?'chip co':'chip cg'}>{d}d</span>}</td>
                <td><ExpiryChip date={emp.sefExpiry}/></td>
                <td onClick={e=>e.stopPropagation()}>
                  {!readOnly?<label style={{cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:12}}>
                    <input type="checkbox" checked={!!(emp.sefSentWhatsapp||emp.sefSentWhatsapp==='Sim')} onChange={e=>update(emp,'sefSentWhatsapp',e.target.checked)}/>
                    {emp.sefSentWhatsapp?'Sim':'Não'}
                  </label>:<span style={{fontSize:12}}>{emp.sefSentWhatsapp?'Sim':'Não'}</span>}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div></div>
      {selRow && <RowActionsModal
        emp={selRow} moduleKey="sef" moduleLabel="SEF"
        dateField="sefExpiry" dateLabel="Validade SEF"
        onClose={()=>setSelRow(null)}
        onUpdateField={(f,v)=>{ update(selRow,f,v); setSelRow(s=>({...s,[f]:v})); }}
        onToggleHiddenIn={mk=>toggleHiddenIn(selRow, mk)}
        onGotoFicha={onNav?(emp=>onNav('employees',emp)):null}/>}
    </div>
  );
}

function MedScreen({data,company,onUpdate,readOnly,onAudit}){
  const {employees=[]}=data;
  const emps=filterEmps(employees, company);
  const [f,setF]=useState('all');
  const [search,setSearch]=useState('');
  const list=useMemo(()=>{
    let l=emps.map(e=>({...e,_nm:nextMed(e)})).sort((a,b)=>{const da=daysTo(a._nm),db=daysTo(b._nm);if(da===null&&db===null)return 0;if(da===null)return 1;if(db===null)return -1;return da-db;});
    if(f==='expired') l=l.filter(e=>daysTo(e._nm)<0);
    if(f==='soon') l=l.filter(e=>{const d=daysTo(e._nm);return d!==null&&d>=0&&d<=60;});
    if(search.trim()){const s=search.trim();l=l.filter(e=>nameMatches(e.name,s)||String(e.id).includes(s));}
    return l;
  },[emps,f,search]);
  function update(emp,field,val){
    if(readOnly)return;
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,[field]:val}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`Actualizou medicina de ${emp.name}: ${field}=${val}`, 'medicina');
  }
  return(
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:14}}>Medicina do Trabalho</span>
        <div className="rh-search"><span className="rh-search__ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar colaborador..." className="fi rh-search__inp"/>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:5}}>
          {[['all','Todos'],['expired','Vencidos'],['soon','≤60d']].map(([k,l])=>(
            <button key={k} className={`btn btn-sm ${f===k?'bp':'bs'}`} onClick={()=>setF(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="card"><div className="tw">
        <table>
          <thead><tr><th>Colaborador</th><th>Empresa</th><th>Idade</th><th>Periodic.</th><th>Última Consulta</th><th>Próxima</th><th>Dias</th><th>Estado</th><th>Notas</th></tr></thead>
          <tbody>
            {list.map(emp=>{const d=daysTo(emp._nm),a=ageOf(emp.birthDate);return(
              <tr key={emp.id+emp.company}>
                <td style={{fontWeight:500}}>{emp.name}</td>
                <td><Chip label={emp.company} type="gr"/></td>
                <td>{a||'—'}</td>
                <td><span className={`chip ${a&&a>=50?'cr':'cb2'}`}>{a&&a>=50?'Anual':'Bienal'}</span></td>
                <td>{!readOnly?<DateEdit value={emp.lastMedicalConsult} onCommit={v=>update(emp,'lastMedicalConsult',v)} style={{padding:'3px 6px',fontSize:12,width:130}}/>:fmtDate(emp.lastMedicalConsult)}</td>
                <td className={expClass(d)}>{fmtDate(emp._nm)}</td>
                <td>{d===null?'—':<span className={d<0?'chip cr':d<=60?'chip co':'chip cg'}>{d}d</span>}</td>
                <td><ExpiryChip date={emp._nm}/></td>
                <td style={{maxWidth:180}}>{!readOnly?<TextEdit value={emp.medicalNotes} onCommit={v=>update(emp,'medicalNotes',v)} style={{padding:'2px 5px',fontSize:11,width:170}}/>:<span style={{fontSize:11,color:'var(--muted)'}}>{emp.medicalNotes||''}</span>}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}

function DiutScreen({data,company,onUpdate,readOnly,onAudit}){
  const {employees=[]}=data;
  const emps=filterEmps(employees, company);
  const [search,setSearch]=useState('');
  // null = sort por próxima diuturnidade; depois cicla 'desc' → 'asc'.
  const [sortAnt,setSortAnt]=useState(null);
  // Edição inline da contagem de diuturnidades (override manual).
  const [editKey,setEditKey]=useState(null);
  const [editVal,setEditVal]=useState('');
  function commitEdit(emp){
    if(readOnly) return;
    const v=String(editVal||'').trim();
    const n=parseInt(v);
    if(v==='' || isNaN(n) || n<0){ setEditKey(null); return; }
    const clamped=Math.min(DIUT_MAX, n);
    if(String(clamped)===String(parseInt(emp.diuturnidasCount)||0)){ setEditKey(null); return; }
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,diuturnidasCount:String(clamped)}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`Diuturnidades de ${emp.name} alteradas manualmente para ${clamped}`, 'diuturnidade');
    setEditKey(null);
  }

  // Máximo entre o auto-calculado e o confirmado manualmente, com clamp ao DIUT_MAX
  // (limpa registos legacy que tinham >5 diuturnidades).
  function eff(emp){ return Math.min(DIUT_MAX, Math.max(parseInt(emp.diuturnidasCount)||0, calcDiut(emp))); }
  function nextFor(emp){
    if(!emp.admissionDate) return null;
    const n=eff(emp); if(n>=DIUT_MAX) return null;
    const d=new Date(emp.admissionDate);
    d.setFullYear(d.getFullYear()+(n+1)*3);
    return d.toISOString().split('T')[0];
  }

  const list=useMemo(()=>{
    let l=emps.map(e=>({...e,_nd:nextFor(e)}));
    if(sortAnt){
      l=l.sort((a,b)=>{
        const ta=a.admissionDate?new Date(a.admissionDate).getTime():Infinity;
        const tb=b.admissionDate?new Date(b.admissionDate).getTime():Infinity;
        return sortAnt==='desc'?ta-tb:tb-ta;
      });
    }else{
      l=l.sort((a,b)=>{const da=daysTo(a._nd),db=daysTo(b._nd);if(da===null&&db===null)return 0;if(da===null)return 1;if(db===null)return -1;return da-db;});
    }
    if(search.trim()){const s=search.trim();l=l.filter(e=>nameMatches(e.name,s)||String(e.id).includes(s));}
    return l;
  },[emps,search,sortAnt]);
  function toggleSortAnt(){ setSortAnt(s=>s===null?'desc':s==='desc'?'asc':null); }

  function confirm_diut(emp){
    if(readOnly)return;
    const n=Math.min(DIUT_MAX, eff(emp)+1);
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,diuturnidasCount:String(n)}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`Confirmou ${n}ª diuturnidade de ${emp.name}`, 'diuturnidade');
  }
  function undo_diut(emp){
    if(readOnly)return;
    const cur=Math.min(DIUT_MAX, parseInt(emp.diuturnidasCount)||0);
    const prev=Math.max(0, cur-1);
    if(!confirm(`Desmarcar a ${cur}ª diuturnidade de ${emp.name}?\n\nA contagem volta para ${prev}.`)) return;
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,diuturnidasCount:String(prev)}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`Desmarcou ${cur}ª diuturnidade de ${emp.name} (reposto para ${prev})`, 'diuturnidade');
  }

  return(
    <div>
      <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:14}}>Diuturnidades</span>
        <div className="rh-search" style={{marginLeft:'auto'}}><span className="rh-search__ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar colaborador..." className="fi rh-search__inp"/>
        </div>
      </div>
      <div style={{background:'var(--orbg)',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:12,color:'var(--orange)'}}>
        Cada 3 anos de antiguidade gera uma nova diuturnidade. Alerta activado antes do dia 15 do mês anterior ao vencimento.
      </div>
      <div className="card"><div className="tw">
        <table>
          <thead><tr><th>Colaborador</th><th>Empresa</th><th>Admissão</th>
            <th onClick={toggleSortAnt} style={{cursor:'pointer',userSelect:'none',textAlign:'center'}} title="Ordenar por antiguidade">
              Antiguidade <span style={{color:sortAnt?'var(--blue)':'var(--muted)',fontSize:11}}>{sortAnt==='desc'?'↓':sortAnt==='asc'?'↑':'↕'}</span>
            </th>
            <th>Diuturnidades</th><th>Próxima</th><th>Dias</th><th>Estado</th>{!readOnly&&<th>Acção</th>}</tr></thead>
          <tbody>
            {list.map(emp=>{
              const d=daysTo(emp._nd),yrs=emp.admissionDate?Math.floor((new Date()-new Date(emp.admissionDate))/31557600000):null;
              const n=eff(emp);
              const stored=parseInt(emp.diuturnidasCount)||0;
              const isConfirmed=stored>calcDiut(emp);
              return(
                <tr key={emp.id+emp.company}>
                  <td style={{fontWeight:500}}>{emp.name}</td>
                  <td><Chip label={emp.company} type="gr"/></td>
                  <td>{fmtDate(emp.admissionDate)}</td>
                  <td style={{textAlign:'center',fontWeight:700,fontSize:15}}>{yrs!==null?`${yrs} ${yrs===1?'ano':'anos'}`:''}</td>
                  <td style={{textAlign:'center',fontWeight:700,fontSize:16}}>
                    {readOnly ? n : (
                      editKey===emp.id+'|'+emp.company ? (
                        <input
                          type="number" min="0" max={DIUT_MAX} autoFocus
                          value={editVal}
                          onChange={e=>setEditVal(e.target.value)}
                          onBlur={()=>commitEdit(emp)}
                          onKeyDown={e=>{if(e.key==='Enter')commitEdit(emp);else if(e.key==='Escape')setEditKey(null);}}
                          style={{width:54,padding:'2px 4px',fontSize:15,fontWeight:700,textAlign:'center',border:'1px solid var(--blue)',borderRadius:4,outline:'none'}}
                        />
                      ) : (
                        <span
                          onClick={()=>{setEditKey(emp.id+'|'+emp.company);setEditVal(String(n));}}
                          title="Clica para alterar (override manual)"
                          style={{cursor:'pointer',display:'inline-block',padding:'2px 8px',borderRadius:4,transition:'background .12s'}}
                          onMouseOver={e=>e.currentTarget.style.background='var(--bg)'}
                          onMouseOut={e=>e.currentTarget.style.background='transparent'}
                        >{n}</span>
                      )
                    )}
                  </td>
                  <td>{fmtDate(emp._nd)}</td>
                  <td>{d===null?'—':d<0?<span className="chip cr">Passou</span>:d<=45?<span className="chip co">{d}d</span>:<span className="chip cg">{d}d</span>}</td>
                  <td>{n>=DIUT_MAX?<span className="chip cg">Máximo</span>:d!==null&&d<0?<span className="chip cr">Por confirmar</span>:d!==null&&d<=45?<span className="chip co">Alerta</span>:<span className="chip cg">OK</span>}</td>
                  {!readOnly&&<td>{
                    isConfirmed
                      ? <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                          <span style={{fontSize:11,color:'var(--green)',fontWeight:700}}>✓ {stored}ª confirmada</span>
                          <button className="btn bg btn-sm" style={{fontSize:11,color:'var(--muted)',padding:'1px 6px',minWidth:'auto',lineHeight:1}} onClick={()=>undo_diut(emp)} title="Desmarcar (em caso de erro)">✕</button>
                        </span>
                      : n>=DIUT_MAX
                        ? <span style={{fontSize:11,color:'var(--muted)'}}>Máx. atingido</span>
                        : d!==null&&d<=45
                          ? <button className="btn bp btn-sm" onClick={()=>confirm_diut(emp)}>Confirmar</button>
                          : null
                  }</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
