// Lista de contratos por colaborador, com tipo, datas e atalhos para a ficha.

function ContratosScreen({data,company,onUpdate,readOnly,user,onAudit,onNav}){
  const [selEmp,setSelEmp]=useState(null);
  const [showModal,setShowModal]=useState(false);
  const [editEntry,setEditEntry]=useState(null);
  const [form,setForm]=useState({admissionDate:'',exitDate:'',contractType:'Efetivo',baseSalary:'',exitReason:'',notes:''});
  const [formErr,setFormErr]=useState('');
  const [search,setSearch]=useState('');
  const [timelineEmp,setTimelineEmp]=useState(null);
  const allEmps=data?.employees||[];
  const emps=filterEmps(allEmps, company);

  function getHistory(emp){
    if(emp.contractHistory&&emp.contractHistory.length>0)return emp.contractHistory;
    return[{id:'init_'+emp.id,admissionDate:emp.admissionDate||'',exitDate:null,contractType:emp.contractEndDate||'Efetivo',baseSalary:emp.baseSalary||'',exitReason:'',notes:''}];
  }

  async function saveHistory(emp,history){
    const updated=allEmps.map(e=>e.id===emp.id&&e.company===emp.company?{...e,contractHistory:history}:e);
    await onUpdate({...data,employees:updated});
    onAudit&&onAudit(`Actualizou histórico contratual de ${emp.name}`,'contratos');
  }

  async function handleSave(e){
    e.preventDefault();
    if(!form.admissionDate){setFormErr('A data de admissão é obrigatória.');return;}
    const emp=allEmps.find(x=>x.id===selEmp.id&&x.company===selEmp.company);
    if(!emp)return;
    const history=getHistory(emp);
    const entry={...form,exitDate:form.exitDate||null,id:editEntry?.id||Date.now().toString()};
    const updated=editEntry?history.map(h=>h.id===editEntry.id?entry:h):[...history,entry];
    updated.sort((a,b)=>(a.admissionDate||'').localeCompare(b.admissionDate||''));
    await saveHistory(emp,updated);
    setShowModal(false);setEditEntry(null);
    setForm({admissionDate:'',exitDate:'',contractType:'Efetivo',baseSalary:'',exitReason:'',notes:''});
    setFormErr('');
  }

  async function handleDelete(entryId){
    if(!confirm('Eliminar este registo do histórico?'))return;
    const emp=allEmps.find(x=>x.id===selEmp.id&&x.company===selEmp.company);
    await saveHistory(emp,getHistory(emp).filter(h=>h.id!==entryId));
  }

  function openAdd(){
    setEditEntry(null);
    setForm({admissionDate:'',exitDate:'',contractType:'Efetivo',baseSalary:'',exitReason:'',notes:''});
    setFormErr('');setShowModal(true);
  }
  function openEdit(h){setEditEntry(h);setForm({...h,exitDate:h.exitDate||''});setFormErr('');setShowModal(true);}

  const fullEmp=selEmp?allEmps.find(e=>e.id===selEmp.id&&e.company===selEmp.company):null;
  const history=fullEmp?getHistory(fullEmp):[];
  const currentPeriod=history.find(h=>!h.exitDate);
  const totalDays=history.reduce((s,h)=>{
    const a=new Date(h.admissionDate),b=h.exitDate?new Date(h.exitDate):new Date();
    return isNaN(a)?s:s+Math.max(0,(b-a)/86400000);
  },0);

  function durStr(h){
    const a=new Date(h.admissionDate),b=h.exitDate?new Date(h.exitDate):new Date();
    if(isNaN(a))return'—';
    const days=Math.round((b-a)/86400000);
    if(days<30)return days+'d';
    const yrs=Math.floor(days/365),mos=Math.floor((days%365)/30);
    return(yrs?yrs+'a ':'')+mos+'m';
  }

  const sorted=useMemo(()=>{
    const list=[...emps].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const q=search.trim().toLowerCase();
    if(!q) return list;
    return list.filter(e=>
      (e.name||'').toLowerCase().includes(q) ||
      String(e.id||'').includes(q) ||
      (e.company||'').toLowerCase().includes(q) ||
      (e.role||'').toLowerCase().includes(q)
    );
  },[emps,search]);

  return(
    <div>
      {!selEmp?(
        <div className="card cb" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div className="sec-t" style={{margin:0}}>Contratos</div>
            <input
              type="search"
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Pesquisar por nome, n.º, empresa ou função..."
              className="fi"
              style={{flex:'1 1 220px',maxWidth:340,padding:'5px 10px',fontSize:12}}
            />
            <span style={{fontSize:12,color:'var(--muted)',marginLeft:'auto'}}>
              {search ? `${sorted.length} de ${emps.length}` : `${sorted.length} colaborador${sorted.length!==1?'es':''}`}
            </span>
          </div>
          <div className="tw contratos-table">
            <table>
              <thead><tr>
                <th>N.º</th>
                <th>Colaborador</th>
                <th>Empresa</th>
                <th>Admissão</th>
                <th>Tipo</th>
                <th>Dias</th>
                <th>Estado</th>
              </tr></thead>
              <tbody>
                {sorted.map(emp=>{
                  const isTermo = (emp.contractEndDate||'').toLowerCase().includes('termo');
                  const d = isTermo && emp.endDate ? daysTo(emp.endDate) : null;
                  let diasColor = 'var(--muted)';
                  let diasText = '—';
                  if (d !== null) {
                    diasText = d < 0 ? `${Math.abs(d)}d (expirado)` : `${d}d`;
                    if (d < 0)        diasColor = 'var(--red)';
                    else if (d <= 30) diasColor = 'var(--red)';
                    else if (d <= 90) diasColor = 'var(--orange)';
                    else              diasColor = 'var(--green)';
                  }
                  return(
                    <tr key={emp.id+emp.company} style={{cursor:'pointer'}}
                      onClick={()=>setSelEmp({id:emp.id,company:emp.company})}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{color:'var(--muted)',fontWeight:500}}>{emp.id}</td>
                      <td style={{fontWeight:600}}>{emp.name}</td>
                      <td><Chip label={emp.company} type="gr"/></td>
                      <td>{fmtDate(emp.admissionDate)}</td>
                      <td style={{color:'var(--muted)'}}>{emp.contractEndDate||'—'}</td>
                      <td style={{color:diasColor,fontWeight: d!==null ? 700 : 400}}>{diasText}</td>
                      <td><Chip label={emp.contractStatus} type={emp.contractStatus==='Ativo'?'green':emp.contractStatus==='Inativo'?'red':'orange'}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ):!fullEmp?(
        <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>
          <button className="btn-ghost" onClick={()=>setSelEmp(null)} title="Voltar à lista">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Voltar</span>
          </button>
        </div>
      ):(
        <div>
          {/* Cabeçalho */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:200}}>
              <button className="btn-ghost" onClick={()=>setSelEmp(null)} title="Voltar à lista" style={{padding:'5px 6px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{minWidth:0,flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:16}}>{fullEmp.name}</span>
                  <span style={{fontSize:12,fontWeight:700,padding:'2px 8px',borderRadius:6,background:'var(--bg)',color:'var(--muted)',border:'1px solid var(--border)',whiteSpace:'nowrap'}}>N.º {fullEmp.id}</span>
                  <Chip label={fullEmp.contractStatus} type={fullEmp.contractStatus==='Ativo'?'green':fullEmp.contractStatus==='Inativo'?'red':'orange'}/>
                </div>
                <div style={{fontSize:12,color:'var(--muted)'}}>{fullEmp.role||'—'} · {fullEmp.company}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn-soft" onClick={()=>onNav('employees',{id:fullEmp.id,company:fullEmp.company})} title="Abrir ficha completa">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Ficha</span>
              </button>
              <button className="btn-soft" onClick={()=>onNav('ferias',{id:fullEmp.id,company:fullEmp.company})} title="Ver mapa de férias">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>Férias</span>
              </button>
            </div>
          </div>

          {/* Estatísticas */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:16}}>
            {[
              {l:'Períodos',v:history.length,c:'var(--blue)'},
              {l:'Tempo total',v:totalDays>365?Math.floor(totalDays/365)+'a '+Math.floor((totalDays%365)/30)+'m':Math.round(totalDays)+'d',c:'var(--green)'},
              {l:'Ordenado Atual',v:(currentPeriod?.baseSalary||fullEmp.baseSalary)?parseFloat(currentPeriod?.baseSalary||fullEmp.baseSalary).toFixed(2)+'€':'—',c:'var(--orange)'},
              {l:'Tipo',v:currentPeriod?.contractType||fullEmp.contractEndDate||'—',c:'var(--muted)'},
            ].map(s=>(
              <div key={s.l} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
                <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{s.l}</div>
                <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Marcos contratuais (experimental, 2.º contrato, efetivação) */}
          {(()=>{
            const trial = fullEmp.trialEndDate;
            const sec   = fullEmp.secondContractEnd;
            const isEf=(fullEmp.contractEndDate||'').toLowerCase()==='efetivo';
            // Início Efetivo = dia seguinte ao fim do 2.º contrato (se existir)
            // ou, na ausência, dia seguinte ao fim do período experimental.
            let efetivoIni = '';
            const base = sec || trial;
            if(base){
              const a=new Date(base);
              if(!isNaN(a)){ a.setDate(a.getDate()+1); efetivoIni=a.toISOString().split('T')[0]; }
            }
            const items=[
              {l:'Período Experimental (90 dias)', d:trial,      hint:'auto: admissão + 90 dias'},
              {l:'Fim do 2.º Contrato',            d:sec,        hint:'quando aplicável'},
              {l:'Início Efetivo',                 d:efetivoIni, hint:isEf?'já é Efetivo':'fim do experimental ou do 2.º contrato + 1 dia'},
            ];
            return (
              <div style={{marginBottom:16}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>Marcos Contratuais</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
                  {items.map(it=>{
                    const d=it.d?daysTo(it.d):null;
                    const passed=d!==null && d<0;
                    const close=d!==null && d>=0 && d<=60;
                    const color = !it.d ? 'var(--muted)' : passed ? 'var(--red)' : close ? 'var(--orange)' : 'var(--green)';
                    return (
                      <div key={it.l} onClick={()=>setTimelineEmp(fullEmp)}
                        title="Ver linha do tempo contratual"
                        style={{background:'var(--card)',border:`1px solid var(--border)`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:'10px 12px',cursor:'pointer',transition:'background .12s'}}
                        onMouseOver={e=>e.currentTarget.style.background='var(--bg)'}
                        onMouseOut={e=>e.currentTarget.style.background='var(--card)'}>
                        <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{it.l}</div>
                        <div style={{fontSize:15,fontWeight:700,color:color}}>{it.d?fmtDate(it.d):'—'}</div>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                          {it.d && d!==null
                            ? (passed?`passou há ${-d} dia${-d===1?'':'s'}`:close?`faltam ${d} dia${d===1?'':'s'}`:`faltam ${d} dias`)
                            : it.hint}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Histórico contratual */}
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontWeight:600,fontSize:14}}>Histórico Contratual</div>
              {!readOnly&&(
                <button className="btn-soft" style={{marginLeft:'auto'}} onClick={openAdd} title="Adicionar período contratual">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Adicionar período</span>
                </button>
              )}
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {[...history].sort((a,b)=>(b.admissionDate||'').localeCompare(a.admissionDate||'')).map((h,i,arr)=>{
                const isAtual=!h.exitDate;
                return(
                  <div key={h.id} style={{padding:'14px 16px',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',display:'flex',alignItems:'flex-start',gap:14}}>
                    {/* Ponto da timeline */}
                    <div style={{marginTop:4,width:10,height:10,borderRadius:'50%',flexShrink:0,background:isAtual?'var(--green)':'var(--muted)'}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:6}}>
                        <span style={{fontWeight:700,fontSize:13}}>
                          {fmtDate(h.admissionDate)||'?'} → {isAtual?<span style={{color:'var(--green)'}}>Presente</span>:fmtDate(h.exitDate)||'?'}
                        </span>
                        {isAtual&&<span style={{fontSize:10,fontWeight:700,background:'var(--green-l)',color:'var(--green)',padding:'2px 8px',borderRadius:10}}>ATUAL</span>}
                        <span style={{fontSize:11,color:'var(--muted)'}}>{durStr(h)}</span>
                      </div>
                      <div style={{display:'flex',gap:14,flexWrap:'wrap',fontSize:12,color:'var(--muted)'}}>
                        <span>📄 {h.contractType||'—'}</span>
                        {(h.baseSalary)?<span>💶 {parseFloat(h.baseSalary).toFixed(2)} €</span>:null}
                        {h.exitReason?<span>Motivo: {h.exitReason}</span>:null}
                        {h.notes?<span style={{fontStyle:'italic'}}>{h.notes}</span>:null}
                      </div>
                    </div>
                    {!readOnly&&(
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        <button className="btn-icon" onClick={()=>openEdit(h)} title="Editar período">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        {arr.length>1&&(
                          <button className="btn-icon btn-icon--danger" onClick={()=>handleDelete(h.id)} title="Eliminar período">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {history.length===0&&<div style={{padding:24,textAlign:'center',color:'var(--muted)',fontSize:13}}>Sem histórico. Adicione um período.</div>}
            </div>
          </div>

          {/* Documentos */}
          <div>
            <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>Documentos</div>
            <DocsTab empId={fullEmp.id} empCompany={fullEmp.company} empName={fullEmp.name} readOnly={readOnly} user={user} onAudit={onAudit}/>
          </div>
        </div>
      )}

      {/* Modal de período */}
      {showModal&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setEditEntry(null);}}}>
          <div className="modal" style={{width:420}}>
            <div className="mh">
              <div className="mh-t">{editEntry?'Editar Período':'Novo Período'} — {fullEmp?.name}</div>
              <button className="btn bg" onClick={()=>{setShowModal(false);setEditEntry(null);}}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="mb">
                <div className="fg">
                  <div className="field">
                    <div className="fl">Data de Admissão *</div>
                    <input className="fi" type="date" value={form.admissionDate} onChange={e=>setForm(x=>({...x,admissionDate:e.target.value}))} required/>
                  </div>
                  <div className="field">
                    <div className="fl">Data de Saída (vazio = contrato atual)</div>
                    <input className="fi" type="date" value={form.exitDate||''} onChange={e=>setForm(x=>({...x,exitDate:e.target.value||null}))}/>
                  </div>
                  <div className="field">
                    <div className="fl">Tipo de Contrato</div>
                    <select className="fi" value={form.contractType} onChange={e=>setForm(x=>({...x,contractType:e.target.value}))}>
                      <option>Efetivo</option><option>Termo Certo</option><option>Indeterminado</option>
                    </select>
                  </div>
                  <div className="field">
                    <div className="fl">Ordenado Base (€)</div>
                    <input className="fi" type="number" step="0.01" min="0" value={form.baseSalary} onChange={e=>setForm(x=>({...x,baseSalary:e.target.value}))} placeholder="ex: 958.00"/>
                  </div>
                  {form.exitDate&&(
                    <div className="field" style={{gridColumn:'1/-1'}}>
                      <div className="fl">Motivo de Saída</div>
                      <select className="fi" value={form.exitReason||''} onChange={e=>setForm(x=>({...x,exitReason:e.target.value}))}>
                        <option value="">Selecione...</option>
                        <option>Rescisão</option><option>Despedimento</option><option>Reforma</option>
                        <option>Fim de Contrato</option><option>Mútuo Acordo</option><option>Abandono</option><option>Outro</option>
                      </select>
                    </div>
                  )}
                  <div className="field" style={{gridColumn:'1/-1'}}>
                    <div className="fl">Notas</div>
                    <textarea className="fi" rows={2} style={{resize:'vertical'}} value={form.notes||''} onChange={e=>setForm(x=>({...x,notes:e.target.value}))} placeholder="Observações opcionais..."/>
                  </div>
                </div>
                {formErr&&<div style={{color:'var(--red)',fontSize:12,marginTop:8}}>{formErr}</div>}
              </div>
              <div className="mf">
                <button type="button" className="btn" onClick={()=>{setShowModal(false);setEditEntry(null);}}>Cancelar</button>
                <button type="submit" className="btn bp">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {timelineEmp && <ContractTimelineModal emp={timelineEmp} onClose={()=>setTimelineEmp(null)}/>}
    </div>
  );
}

function ContractTimelineModal({emp, onClose}){
  const adm = emp.admissionDate ? new Date(emp.admissionDate) : null;
  const trialEnd = emp.trialEndDate ? new Date(emp.trialEndDate) : null;
  const secondEnd = emp.secondContractEnd ? new Date(emp.secondContractEnd) : null;
  // Efetivo arranca no dia seguinte ao fim do contrato a termo (2.º se existir,
  // senão o experimental).
  const efetivoBase = secondEnd || trialEnd;
  const efetivoStart = efetivoBase ? new Date(efetivoBase.getTime()+86400000) : null;
  const today = new Date(); today.setHours(0,0,0,0);

  if(!adm){
    return (
      <div className="ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div className="modal" style={{maxWidth:420}}>
          <div className="mh"><div className="mh-t">Sem data de admissão</div><button className="btn bg" onClick={onClose}>✕</button></div>
          <div className="mb"><p>Preenche a data de admissão na ficha para ver a linha do tempo.</p></div>
        </div>
      </div>
    );
  }

  // Limites da timeline: 30 dias antes da admissao ate ao mais distante
  // entre os marcos e o dia de hoje, com folga no fim.
  const ends = [trialEnd, secondEnd, efetivoStart, today].filter(Boolean);
  const maxEnd = new Date(Math.max(...ends.map(d=>d.getTime())));
  const start = new Date(adm); start.setMonth(start.getMonth()-1);
  const end = new Date(maxEnd); end.setMonth(end.getMonth()+1);
  const total = end.getTime() - start.getTime();
  const pct = d => Math.max(0, Math.min(100, ((d.getTime() - start.getTime()) / total) * 100));

  // Eixo de meses: um tick a cada 1, 2 ou 3 meses conforme o intervalo
  const monthsSpan = (end.getFullYear()-start.getFullYear())*12 + (end.getMonth()-start.getMonth());
  const step = monthsSpan > 36 ? 6 : monthsSpan > 18 ? 3 : monthsSpan > 9 ? 2 : 1;
  const ticks = [];
  for(let d=new Date(start.getFullYear(),start.getMonth(),1); d<=end; d.setMonth(d.getMonth()+step)){
    ticks.push({pct: pct(new Date(d.getTime())), label: d.toLocaleDateString('pt-PT',{month:'short',year:'2-digit'}).replace('.','')});
  }

  const fmt = d => d.toLocaleDateString('pt-PT');
  const rawMarkers = [];
  rawMarkers.push({date: adm, label:'Admissão', color:'#16a34a'});
  // Quando o trial e o início do efetivo são consecutivos (1 dia entre eles)
  // e não há 2.º contrato, junta-se num só marcador para não sobrepor.
  const trialAndEfetivoConsec = trialEnd && efetivoStart && !secondEnd
    && Math.abs(efetivoStart.getTime() - trialEnd.getTime()) <= 86400000 * 2;
  if(trialAndEfetivoConsec){
    rawMarkers.push({date: efetivoStart, label:'Fim Exp. → Efetivo', color:'#0d9488'});
  } else {
    if(trialEnd)     rawMarkers.push({date: trialEnd,     label:'Fim Exp.',       color:'#dc2626'});
    if(secondEnd)    rawMarkers.push({date: secondEnd,    label:'Fim 2.º',        color:'#dc2626'});
    if(efetivoStart) rawMarkers.push({date: efetivoStart, label:'Início Efetivo', color:'#0d9488', dashed:true});
  }
  rawMarkers.push({date: today, label:'Hoje', color:'#2563eb', dotted:true});
  // Ordena por data e alterna lado em cima/baixo para evitar colisão de labels.
  rawMarkers.sort((a,b)=>a.date-b.date);
  const markers = rawMarkers.map((m,i)=>({...m, side: i%2===0?'top':'bottom', _pct: pct(m.date)}));

  return (
    <div className="ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal" style={{maxWidth:880,width:'94vw'}}>
        <div className="mh">
          <div className="mh-t">Linha do tempo — {emp.name}</div>
          <button className="btn bg" onClick={onClose}>✕</button>
        </div>
        <div className="mb">
          <div className="ctl-legend">
            <span><i className="ctl-sw ctl-sw--trial"/>Período Experimental</span>
            {secondEnd && <span><i className="ctl-sw ctl-sw--second"/>2.º Contrato</span>}
            <span><i className="ctl-sw ctl-sw--end"/>Fim de Contrato</span>
            <span><i className="ctl-sw ctl-sw--two"/>Início Efetivo</span>
          </div>
          <div className="ctl">
            <div className="ctl-bar">
              {trialEnd && (
                <div className="ctl-seg ctl-seg--trial"
                  style={{left:pct(adm)+'%', width:(pct(trialEnd)-pct(adm))+'%'}}
                  title={`Experimental: ${fmt(adm)} → ${fmt(trialEnd)}`}/>
              )}
              {trialEnd && secondEnd && (
                <div className="ctl-seg ctl-seg--second"
                  style={{left:pct(trialEnd)+'%', width:(pct(secondEnd)-pct(trialEnd))+'%'}}
                  title={`2.º Contrato: ${fmt(trialEnd)} → ${fmt(secondEnd)}`}/>
              )}
              {markers.map((m,i)=>(
                <div key={i} className={`ctl-mark ctl-mark--${m.side}${m.dashed?' is-dashed':''}${m.dotted?' is-dotted':''}`}
                  style={{left:m._pct+'%', borderColor:m.color}}>
                  <div className="ctl-mark-dot" style={{background:m.color}}/>
                  <div className="ctl-mark-lbl" style={{color:m.color}}>{m.label}</div>
                  <div className="ctl-mark-date">{fmt(m.date)}</div>
                </div>
              ))}
            </div>
            <div className="ctl-axis">
              {ticks.map((t,i)=>(
                <div key={i} className="ctl-tick" style={{left:t.pct+'%'}}>{t.label}</div>
              ))}
            </div>
          </div>
          <div style={{marginTop:28,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,fontSize:12}}>
            <div><strong>Admissão:</strong> {fmt(adm)}</div>
            <div><strong>Fim Exp. (90d):</strong> {trialEnd?fmt(trialEnd):'—'}</div>
            <div><strong>Fim 2.º Contrato:</strong> {secondEnd?fmt(secondEnd):'—'}</div>
            <div><strong>Início Efetivo:</strong> {efetivoStart?fmt(efetivoStart):'—'}</div>
          </div>
        </div>
        <div className="mf">
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
