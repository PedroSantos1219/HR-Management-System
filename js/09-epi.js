// EPIs: tab por colaborador e ecrã global com histórico de entregas.

const EPI_ITEMS = [
  {id:'capacete',  label:'Capacete',           icon:'⛑'},
  {id:'colete',    label:'Colete Refletor',     icon:'🦺'},
  {id:'botas',     label:'Botas de Segurança',  icon:'👢'},
  {id:'luvas',     label:'Luvas',               icon:'🧤'},
  {id:'oculos',    label:'Óculos de Proteção',  icon:'🥽'},
  {id:'auricular', label:'Proteção Auricular',  icon:'👂'},
  {id:'fato',      label:'Fato de Trabalho',    icon:'👔'},
];

function EpiTab({emp, readOnly, user, onAudit}) {
  const [epiData, setEpiData] = useState(null);
  const [adding, setAdding] = useState(null);
  const [form, setForm] = useState({date:'', notes:''});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadEpi(emp.id, emp.company).then(d => { if(active) setEpiData(d||{}); });
    return () => { active = false; };
  }, [emp.id, emp.company]);

  async function addEntry(itemId) {
    if(!form.date) return;
    setSaving(true);
    const hist = epiData?.[itemId] || [];
    const entry = {date: form.date, notes: form.notes, by: user?.name || ''};
    const nd = {...epiData, [itemId]: [...hist, entry]};
    await saveEpiStore(emp.id, emp.company, nd);
    if(onAudit) onAudit(`EPI "${EPI_ITEMS.find(i=>i.id===itemId)?.label}" registado para ${emp.name} em ${form.date}`, 'update');
    setEpiData(nd);
    setAdding(null);
    setForm({date:'', notes:''});
    setSaving(false);
  }

  if(!epiData) return <div style={{padding:20,color:'var(--muted)',fontSize:13,textAlign:'center'}}>A carregar dados EPI...</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {EPI_ITEMS.map(item => {
        const hist = (epiData[item.id]||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
        const last = hist[0];
        const days = last ? daysTo(last.date) : null;
        let stBg='#FDEDEC', stColor='#C0392B', stText='Não entregue';
        if(last) {
          if(days !== null && days < -365) { stBg='#FEF9E7'; stColor='#D68910'; stText='Há mais de 1 ano'; }
          else { stBg='#EAFAF1'; stColor='#1D6A39'; stText='Em dia'; }
        }
        return (
          <div key={item.id} className="card" style={{padding:'10px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:18}}>{item.icon}</span>
              <span style={{fontWeight:700,fontSize:13,flex:1}}>{item.label}</span>
              <span style={{fontSize:11,fontWeight:600,padding:'2px 10px',borderRadius:20,background:stBg,color:stColor}}>{stText}</span>
              {!readOnly && (
                <button className="btn bs btn-sm" onClick={()=>{setAdding(adding===item.id?null:item.id);setForm({date:new Date().toISOString().split('T')[0],notes:''});}}>
                  {adding===item.id?'Cancelar':'+ Registar'}
                </button>
              )}
            </div>
            {last && (
              <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>
                Última entrega: <strong>{fmtDate(last.date)}</strong>{last.notes?` — ${last.notes}`:''}{last.by&&<span style={{color:'var(--muted)',marginLeft:4}}>por {last.by}</span>}
              </div>
            )}
            {hist.length > 1 && (
              <details style={{marginTop:4}}>
                <summary style={{cursor:'pointer',fontSize:11,color:'var(--blue)',fontWeight:600}}>Histórico ({hist.length} entregas)</summary>
                <div style={{paddingTop:5,display:'flex',flexDirection:'column',gap:3}}>
                  {hist.map((h,i)=>(
                    <div key={i} style={{fontSize:11,padding:'3px 0',borderBottom:'1px solid var(--border)'}}>
                      📅 {fmtDate(h.date)}{h.notes?` — ${h.notes}`:''}{h.by&&<span style={{color:'var(--muted)',marginLeft:4}}>por {h.by}</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}
            {adding===item.id && (
              <div style={{marginTop:8,display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap',background:'var(--bg)',padding:'8px 10px',borderRadius:8}}>
                <div className="field" style={{flex:'0 0 150px'}}>
                  <div className="fl">Data de Entrega</div>
                  <input type="date" className="fi" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
                </div>
                <div className="field" style={{flex:'1 1 180px'}}>
                  <div className="fl">Notas (opcional)</div>
                  <input type="text" className="fi" placeholder="Tamanho, modelo…" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
                </div>
                <button className="btn bp" disabled={!form.date||saving} onClick={()=>addEntry(item.id)}>Guardar</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EpiScreen({data, company, onUpdate, readOnly, user, onAudit, onNav}) {
  const {employees=[]} = data;
  const [selEmp, setSelEmp] = useState(null);
  const [selRow, setSelRow] = useState(null);
  const [filterMissing, setFilterMissing] = useState(false);
  const [epiCache, setEpiCache] = useState({});
  const [epiLoading, setEpiLoading] = useState(true);
  const [showHidden,setShowHidden]=useState(false);
  const emps=useMemo(()=>{
    const base=filterEmps(employees, company);
    return (showHidden||company==='escritorio') ? base : base.filter(e=>!isHidden(e,'epi'));
  },[employees,company,showHidden]);
  const hiddenCount=useMemo(()=>filterEmps(employees, company).filter(e=>isHidden(e,'epi')).length,[employees,company]);
  function toggleHiddenIn(emp, mk){
    if(readOnly||!onUpdate)return;
    const cur=isHidden(emp, mk);
    const baseObj=(emp.hidden&&typeof emp.hidden==='object')?emp.hidden:{};
    const newHidden={...baseObj, [mk]:!cur};
    const ne=employees.map(e=>e.id===emp.id&&e.company===emp.company?{...e,hidden:newHidden}:e);
    onUpdate({...data,employees:ne});
    onAudit&&onAudit(`${!cur?'Ocultou':'Mostrou'} ${emp.name} no módulo ${mk.toUpperCase()}`, 'colaborador');
    setSelRow(s=>s?{...s,hidden:newHidden}:s);
  }

  useEffect(() => {
    let active = true;
    setEpiLoading(true);
    loadAllEpi().then(map => {
      if(active) { setEpiCache(map); setEpiLoading(false); }
    });
    return () => { active = false; };
  }, []);

  function getEpiData(emp) {
    return epiCache[emp.id+'|'+emp.company] || {};
  }

  function empEpiStatus(emp) {
    const d = getEpiData(emp);
    let missing=0, old=0, ok=0;
    EPI_ITEMS.forEach(item => {
      const hist = d[item.id]||[];
      if(!hist.length) { missing++; return; }
      const last = hist.sort((a,b)=>b.date.localeCompare(a.date))[0];
      const days = daysTo(last.date);
      if(days !== null && days < -365) old++;
      else ok++;
    });
    return {missing, old, ok, total:7};
  }

  const list = emps.map(e=>({...e, _epi:empEpiStatus(e)}))
    .filter(e => !filterMissing || e._epi.missing>0 || e._epi.old>0)
    .sort((a,b)=>b._epi.missing-a._epi.missing||b._epi.old-a._epi.old);

  // Resumo agregado para o header
  const totalEmps = emps.length;
  const completos = emps.filter(e=>{const s=empEpiStatus(e);return s.missing===0&&s.old===0;}).length;
  const desatualizados = emps.filter(e=>{const s=empEpiStatus(e);return s.old>0;}).length;
  const emFalta = emps.filter(e=>{const s=empEpiStatus(e);return s.missing>0;}).length;

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:220}}>
          <div style={{fontWeight:700,fontSize:18}}>Controlo de EPIs</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{EPI_ITEMS.map(i=>i.label).join(' · ')}</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {[
            {l:'Completos',     v:completos,     c:'var(--green)'},
            {l:'Em falta',      v:emFalta,       c:'var(--red)'},
            {l:'Desactualizados',v:desatualizados,c:'var(--orange)'},
            {l:'Total',         v:totalEmps,     c:'var(--muted)'},
          ].map(s=>(
            <div key={s.l} style={{padding:'4px 12px',background:'#fff',border:'1px solid var(--border)',borderRadius:8,textAlign:'center',minWidth:60}}>
              <div style={{fontSize:15,fontWeight:800,color:s.c,lineHeight:1.1}}>{s.v}</div>
              <div style={{fontSize:9,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.3}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-bar: filtros */}
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <label className="farda-toggle">
          <input type="checkbox" checked={filterMissing} onChange={e=>setFilterMissing(e.target.checked)}/>
          <span>Apenas com itens em falta ou desactualizados</span>
        </label>
        {hiddenCount>0&&company!=='escritorio'&&(
          <label className="farda-toggle">
            <input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/>
            <span>Mostrar ocultos ({hiddenCount})</span>
          </label>
        )}
        <span style={{fontSize:11,color:'var(--muted)',flex:1,minWidth:200,textAlign:'right'}}>
          Click numa linha para opções · Botão Gerir para registar entrega.
        </span>
      </div>

      {epiLoading&&<div style={{padding:'12px',color:'var(--muted)',fontSize:12}}>A carregar dados EPI...</div>}

      <div className="card" style={{overflow:'hidden',padding:0}}>
        <div style={{overflowX:'auto'}}>
          <table className="farda-table">
            <thead>
              <tr>
                <th className="farda-th farda-th--left">Colaborador</th>
                <th className="farda-th farda-th--left">Empresa</th>
                {EPI_ITEMS.map(item=>(
                  <th key={item.id} className="farda-th farda-th--icon" title={item.label}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                      <span style={{fontSize:16,lineHeight:1}}>{item.icon}</span>
                      <span style={{fontSize:9,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.3,whiteSpace:'nowrap'}}>{item.label.split(' ')[0]}</span>
                    </div>
                  </th>
                ))}
                <th className="farda-th">Estado</th>
                <th className="farda-th"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(emp => {
                const d = getEpiData(emp);
                const accent = COMP_COLORS[emp.company]||'#999';
                return (
                  <tr key={emp.id+emp.company}
                    className={`farda-row ${isHidden(emp,'epi')?'row-hidden':''}`}
                    onClick={()=>setSelRow(emp)} style={{cursor:'pointer'}}>
                    <td className="farda-td">
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{width:3,height:24,borderRadius:2,background:accent,flexShrink:0}}/>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13}}>{emp.name}</div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>N.º {emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="farda-td"><span className="chip cgr">{emp.company}</span></td>
                    {EPI_ITEMS.map(item => {
                      const hist = d[item.id]||[];
                      let cls = 'is-empty', mark = <span style={{fontSize:11,fontWeight:700}}>–</span>;
                      if(hist.length) {
                        const last = hist.sort((a,b)=>b.date.localeCompare(a.date))[0];
                        const days = daysTo(last.date);
                        if(days!==null && days < -365) {
                          cls = 'is-old';
                          mark = <span style={{fontSize:11,fontWeight:700}}>!</span>;
                        } else {
                          cls = 'is-has';
                          mark = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
                        }
                      }
                      return (
                        <td key={item.id} className="farda-td farda-td--cell">
                          <span className={`farda-mark ${cls}`}>{mark}</span>
                        </td>
                      );
                    })}
                    <td className="farda-td" style={{padding:'8px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,display:'flex',gap:2,maxWidth:90}}>
                          {Array.from({length:emp._epi.total}).map((_,i)=>{
                            let bg = 'var(--border)';
                            if(i < emp._epi.ok) bg = 'var(--green)';
                            else if(i < emp._epi.ok+emp._epi.old) bg = 'var(--orange)';
                            return <div key={i} style={{flex:1,height:5,borderRadius:2,background:bg}}/>;
                          })}
                        </div>
                        <span style={{fontSize:11,fontWeight:700,whiteSpace:'nowrap',color:emp._epi.missing===0&&emp._epi.old===0?'var(--green)':'var(--muted)'}}>
                          {emp._epi.ok}/{emp._epi.total}
                        </span>
                      </div>
                    </td>
                    <td className="farda-td" style={{textAlign:'right'}}>
                      <button className="btn-soft" onClick={e=>{e.stopPropagation();setSelEmp(emp);}} title="Gerir EPIs deste colaborador">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        <span>Gerir</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length===0&&<tr><td colSpan={EPI_ITEMS.length+4} style={{padding:32,textAlign:'center',color:'var(--muted)'}}>{filterMissing?'Todos os colaboradores estão em dia.':'Sem colaboradores.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de acções (clique numa linha) */}
      {selRow && <RowActionsModal
        emp={selRow} moduleKey="epi" moduleLabel="EPIs"
        onClose={()=>setSelRow(null)}
        onUpdateField={()=>{}}
        onToggleHiddenIn={mk=>toggleHiddenIn(selRow, mk)}
        onGotoFicha={onNav?(emp=>onNav('employees',emp)):null}/>}

      {/* Modal "Gerir EPIs" — aberto via botão Ver */}
      {selEmp && (
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setSelEmp(null)}}>
          <div className="modal" style={{maxWidth:820}}>
            <div className="mh">
              <div className="mh-t">EPIs — {selEmp.name} <span style={{fontSize:12,color:'var(--muted)',fontWeight:400}}>· {selEmp.company}</span></div>
              <button className="btn bg" onClick={()=>setSelEmp(null)}>✕</button>
            </div>
            <div className="mb">
              <EpiTab emp={selEmp} readOnly={readOnly} user={user} onAudit={onAudit}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
