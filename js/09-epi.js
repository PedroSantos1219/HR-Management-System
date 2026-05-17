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

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontWeight:700,fontSize:14}}>Controlo de EPIs</span>
        <label style={{display:'flex',alignItems:'center',gap:5,fontSize:12,cursor:'pointer',marginLeft:'auto'}}>
          <input type="checkbox" checked={filterMissing} onChange={e=>setFilterMissing(e.target.checked)}/>
          Mostrar apenas com itens em falta ou desactualizados
        </label>
        {hiddenCount>0&&company!=='escritorio'&&(
          <label className="show-hidden">
            <input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)}/>
            Mostrar ocultos
          </label>
        )}
      </div>

      {/* Legend */}
      {epiLoading&&<div style={{padding:'12px',color:'var(--muted)',fontSize:12}}>A carregar dados EPI...</div>}
      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
        {[['#C0392B','Não entregue','#FDEDEC','#C0392B'],['#D68910','Há mais de 1 ano','#FEF9E7','#D68910'],['#1D6A39','Em dia','#EAFAF1','#1D6A39']].map(([dot,lb,bg,tc])=>(
          <div key={lb} style={{display:'flex',alignItems:'center',gap:5,background:bg,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,color:tc}}><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:dot}}></span>{lb}</div>
        ))}
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{background:'var(--bg)',padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--muted)',position:'sticky',top:0}}>Colaborador</th>
                <th style={{background:'var(--bg)',padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--muted)',position:'sticky',top:0}}>Empresa</th>
                {EPI_ITEMS.map(item=>(
                  <th key={item.id} style={{background:'var(--bg)',padding:'8px 6px',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--muted)',position:'sticky',top:0,whiteSpace:'nowrap'}} title={item.label}>{item.icon}</th>
                ))}
                <th style={{background:'var(--bg)',padding:'8px 10px',textAlign:'center',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--muted)',position:'sticky',top:0}}>Estado</th>
                <th style={{background:'var(--bg)',padding:'8px 10px',position:'sticky',top:0}}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((emp,ri) => {
                const d = getEpiData(emp);
                return (
                  <tr key={emp.id+emp.company} className={`row-clickable ${isHidden(emp,'epi')?'row-hidden':''}`} style={{backgroundColor:ri%2===0?'white':'var(--bg)'}} onClick={()=>setSelRow(emp)} title="Clique para ver opções">
                    <td style={{padding:'8px 10px',fontWeight:600,fontSize:13}}>{emp.name}</td>
                    <td style={{padding:'8px 10px'}}><span className="chip cgr">{emp.company}</span></td>
                    {EPI_ITEMS.map(item => {
                      const hist = d[item.id]||[];
                      let bg='#FDEDEC',color='#C0392B',sym='✕';
                      if(hist.length) {
                        const last=hist.sort((a,b)=>b.date.localeCompare(a.date))[0];
                        const days=daysTo(last.date);
                        if(days!==null&&days<-365){bg='#FEF9E7';color='#D68910';sym='!';}
                        else{bg='#EAFAF1';color='#1D6A39';sym='✓';}
                      }
                      return (
                        <td key={item.id} style={{padding:'6px',textAlign:'center'}}>
                          <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:22,height:22,borderRadius:'50%',background:bg,color,fontWeight:700,fontSize:13}}>{sym}</span>
                        </td>
                      );
                    })}
                    <td style={{padding:'8px 10px',textAlign:'center'}}>
                      {emp._epi.missing>0 && <span className="chip cr" style={{marginRight:3}}>{emp._epi.missing} em falta</span>}
                      {emp._epi.old>0 && <span className="chip co">{emp._epi.old} desact.</span>}
                      {emp._epi.missing===0&&emp._epi.old===0 && <span className="chip cg">OK</span>}
                    </td>
                    <td style={{padding:'8px 10px'}}>
                      <button className="btn bs btn-sm" onClick={e=>{e.stopPropagation();setSelEmp(emp);}}>Ver</button>
                    </td>
                  </tr>
                );
              })}
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
