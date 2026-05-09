// Fardas: tab individual, ecrã com lista de colaboradores e gestor de stock por tamanho.

const FARDA_ITEMS = [
  {id:'casaco',         label:'Casaco',                icon:'🧥'},
  {id:'calcas',         label:'Calças',                icon:'👖'},
  {id:'polar',          label:'Polar',                 icon:'🧶'},
  {id:'polo_curta',     label:'Polo Manga Curta',      icon:'👕'},
  {id:'polo_comprida',  label:'Polo Manga Comprida',   icon:'👔'},
  {id:'casacao',        label:'Casacão',               icon:'🧥'},
];

// Polo curta/comprida partilham o mesmo stock.
const FARDA_TO_STOCK = {
  casaco:        'casaco',
  calcas:        'calcas',
  polar:         'polar',
  polo_curta:    'polo',
  polo_comprida: 'polo',
  casacao:       'casacao',
};

const FARDA_STOCK_DEFAULT = {
  calcas: {
    label:'Calças', icon:'👖',
    sizes:[
      {key:'S',   label:'S (34-36-38)', qty:2},
      {key:'M',   label:'M (40-42-44)', qty:3},
      {key:'L',   label:'L (46-48)',    qty:6},
      {key:'XL',  label:'XL (50-52)',   qty:0},
      {key:'XXL', label:'XXL (54-56)',  qty:4},
    ],
  },
  casaco: {
    label:'Casaco', icon:'🧥',
    sizes:[
      {key:'48-50', label:'48-50', qty:4},
      {key:'52-54', label:'52-54', qty:2},
      {key:'56-58', label:'56-58', qty:1},
      {key:'60-62', label:'60-62', qty:0},
      {key:'64-66', label:'64-66', qty:0},
    ],
  },
  polar: {
    label:'Polar', icon:'🧶',
    sizes:[
      {key:'48-50', label:'48-50', qty:0},
      {key:'52-54', label:'52-54', qty:1},
      {key:'56-58', label:'56-58', qty:3},
      {key:'60-62', label:'60-62', qty:0},
      {key:'64-66', label:'64-66', qty:0},
    ],
  },
  polo: {
    label:'Polo (Manga Curta / Comprida)', icon:'👕',
    sizes:[
      {key:'48-50', label:'48-50', qty:0},
      {key:'52-54', label:'52-54', qty:3},
      {key:'56-58', label:'56-58', qty:10},
      {key:'60-62', label:'60-62', qty:0},
      {key:'64-66', label:'64-66', qty:0},
    ],
  },
  casacao: {
    label:'Casacão', icon:'🧥',
    sizes:[
      {key:'48-50', label:'48-50', qty:0},
      {key:'52-54', label:'52-54', qty:0},
      {key:'56-58', label:'56-58', qty:0},
      {key:'60-62', label:'60-62', qty:0},
      {key:'64-66', label:'64-66', qty:0},
    ],
  },
};

function totalStockQty(stockCat){
  if(!stockCat||!Array.isArray(stockCat.sizes)) return 0;
  return stockCat.sizes.reduce((s,it)=>s+(parseInt(it.qty,10)||0),0);
}

function FardaTab({emp, readOnly, user, onAudit, onStockChange}) {
  const [fData, setFData] = useState(null);
  const [adding, setAdding] = useState(null);
  const [form, setForm] = useState({date:'', size:'', notes:'', deductStock:true});
  const [saving, setSaving] = useState(false);
  const [stock, setStock] = useState(null);

  useEffect(() => {
    let active = true;
    loadFarda(emp.id, emp.company).then(d => { if(active) setFData(d||{}); });
    loadFardaStock().then(s => { if(active) setStock(s&&Object.keys(s).length?s:FARDA_STOCK_DEFAULT); });
    return () => { active = false; };
  }, [emp.id, emp.company]);

  function stockCatForItem(itemId){
    return stock && stock[FARDA_TO_STOCK[itemId]];
  }

  async function addEntry(itemId) {
    setSaving(true);
    const stockKey = FARDA_TO_STOCK[itemId];
    const cat = stock?.[stockKey];
    let newStock = stock;
    if(form.deductStock && cat && form.size){
      const idx = cat.sizes.findIndex(s=>s.key===form.size);
      if(idx>=0 && (parseInt(cat.sizes[idx].qty,10)||0) > 0){
        const updatedSizes = cat.sizes.map((s,i)=>i===idx?{...s,qty:(parseInt(s.qty,10)||0)-1}:s);
        newStock = {...stock, [stockKey]:{...cat, sizes:updatedSizes}};
        await saveFardaStockStore(newStock);
        setStock(newStock);
        onStockChange && onStockChange(newStock);
      } else if(form.deductStock) {
        if(!confirm('Não há stock disponível para este tamanho. Continuar mesmo assim?')){ setSaving(false); return; }
      }
    }
    const sizeLabel = cat?.sizes.find(s=>s.key===form.size)?.label || form.size;
    const hist = fData?.[itemId] || [];
    const entry = {date: form.date||new Date().toISOString().split('T')[0], size: sizeLabel, sizeKey: form.size, notes: form.notes, by: user?.name || '', deducted: !!form.deductStock};
    const nd = {...fData, [itemId]: [...hist, entry]};
    await saveFardaStore(emp.id, emp.company, nd);
    if(onAudit) onAudit(`Farda "${FARDA_ITEMS.find(i=>i.id===itemId)?.label}" entregue a ${emp.name}${sizeLabel?` (tam. ${sizeLabel})`:''}`, 'update');
    setFData(nd);
    setAdding(null);
    setForm({date:'', size:'', notes:'', deductStock:true});
    setSaving(false);
  }

  async function toggleHas(itemId) {
    const hist = fData?.[itemId] || [];
    if(hist.length){
      if(!confirm(`Marcar "${FARDA_ITEMS.find(i=>i.id===itemId)?.label}" como NÃO entregue?\n(O histórico será removido — o stock NÃO é devolvido automaticamente)`)) return;
      const nd = {...fData, [itemId]: []};
      await saveFardaStore(emp.id, emp.company, nd);
      if(onAudit) onAudit(`Farda "${FARDA_ITEMS.find(i=>i.id===itemId)?.label}" desmarcada para ${emp.name}`, 'update');
      setFData(nd);
    } else {
      setAdding(itemId);
      setForm({date:new Date().toISOString().split('T')[0], size:'', notes:'', deductStock:true});
    }
  }

  if(!fData) return <div style={{padding:20,color:'var(--muted)',fontSize:13,textAlign:'center'}}>A carregar dados de fardas...</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {FARDA_ITEMS.map(item => {
        const hist = (fData[item.id]||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
        const last = hist[0];
        const has = hist.length > 0;
        const stBg = has ? '#EAFAF1' : '#FDEDEC';
        const stColor = has ? '#1D6A39' : '#C0392B';
        const stText = has ? 'Tem' : 'Não tem';
        return (
          <div key={item.id} className="card" style={{padding:'10px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:18}}>{item.icon}</span>
              <span style={{fontWeight:700,fontSize:13,flex:1}}>{item.label}</span>
              <span style={{fontSize:11,fontWeight:600,padding:'2px 10px',borderRadius:20,background:stBg,color:stColor}}>{stText}</span>
              {!readOnly && (
                <button className={has?'btn bg btn-sm':'btn bp btn-sm'} onClick={()=>toggleHas(item.id)}>
                  {has?'Remover':'+ Marcar como entregue'}
                </button>
              )}
            </div>
            {last && (
              <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>
                Entregue: <strong>{fmtDate(last.date)||'—'}</strong>
                {last.size?` · Tamanho: ${last.size}`:''}
                {last.notes?` · ${last.notes}`:''}
                {last.by&&<span style={{color:'var(--muted)',marginLeft:4}}>por {last.by}</span>}
              </div>
            )}
            {hist.length > 1 && (
              <details style={{marginTop:4}}>
                <summary style={{cursor:'pointer',fontSize:11,color:'var(--blue)',fontWeight:600}}>Histórico ({hist.length} entregas)</summary>
                <div style={{paddingTop:5,display:'flex',flexDirection:'column',gap:3}}>
                  {hist.map((h,i)=>(
                    <div key={i} style={{fontSize:11,padding:'3px 0',borderBottom:'1px solid var(--border)'}}>
                      📅 {fmtDate(h.date)||'—'}{h.size?` · ${h.size}`:''}{h.notes?` — ${h.notes}`:''}{h.by&&<span style={{color:'var(--muted)',marginLeft:4}}>por {h.by}</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}
            {adding===item.id && (() => {
              const sCat = stockCatForItem(item.id);
              return (
                <div style={{marginTop:8,display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap',background:'var(--bg)',padding:'8px 10px',borderRadius:8}}>
                  <div className="field" style={{flex:'0 0 140px'}}>
                    <div className="fl">Data de Entrega</div>
                    <input type="date" className="fi" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
                  </div>
                  <div className="field" style={{flex:'0 0 180px'}}>
                    <div className="fl">Tamanho {sCat?<span style={{fontSize:10,color:'var(--muted)',fontWeight:400}}>(stock: {totalStockQty(sCat)})</span>:''}</div>
                    {sCat?(
                      <select className="fi" value={form.size} onChange={e=>setForm(p=>({...p,size:e.target.value}))}>
                        <option value="">— escolher —</option>
                        {sCat.sizes.map(s=>(
                          <option key={s.key} value={s.key} disabled={form.deductStock&&(parseInt(s.qty,10)||0)<=0}>
                            {s.label} ({s.qty} em stock)
                          </option>
                        ))}
                      </select>
                    ):(
                      <input type="text" className="fi" placeholder="ex: M, L, 42" value={form.size} onChange={e=>setForm(p=>({...p,size:e.target.value}))}/>
                    )}
                  </div>
                  <div className="field" style={{flex:'1 1 160px'}}>
                    <div className="fl">Notas (opcional)</div>
                    <input type="text" className="fi" placeholder="ex: cor, modelo…" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
                  </div>
                  {sCat&&(
                    <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--muted)',cursor:'pointer',padding:'5px 0'}}>
                      <input type="checkbox" checked={form.deductStock} onChange={e=>setForm(p=>({...p,deductStock:e.target.checked}))}/>
                      Descontar do stock
                    </label>
                  )}
                  <button className="btn bp" disabled={saving} onClick={()=>addEntry(item.id)}>Guardar</button>
                  <button className="btn bs" onClick={()=>setAdding(null)}>Cancelar</button>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

function FardaScreen({data, company, readOnly, user, onAudit}) {
  const {employees=[]} = data;
  const cm = {'roupeta':'Roupeta','roupeta2':'Roupeta II','arlize':'Arlize','pit':'Pit Evolution'};
  const emps = filterEmps(employees, company);
  const [selEmp, setSelEmp] = useState(null);
  const [filterMissing, setFilterMissing] = useState(false);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('emp'); // 'emp' | 'stock'
  const [stock, setStock] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadAllFarda(), loadFardaStock()]).then(([map, st]) => {
      if(!active) return;
      setCache(map);
      setStock(st && Object.keys(st).length ? st : FARDA_STOCK_DEFAULT);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // BD vazia → semeia o stock por defeito.
  useEffect(() => {
    if(stock && Object.keys(stock).length>0 && stock===FARDA_STOCK_DEFAULT){
      saveFardaStockStore(FARDA_STOCK_DEFAULT);
    }
  }, [stock]);

  function getData(emp) { return cache[emp.id+'|'+emp.company] || {}; }

  function empStatus(emp) {
    const d = getData(emp);
    let has=0, missing=0;
    FARDA_ITEMS.forEach(item => {
      const hist = d[item.id]||[];
      if(hist.length) has++; else missing++;
    });
    return {has, missing, total:FARDA_ITEMS.length};
  }

  const list = emps.map(e=>({...e, _f:empStatus(e)}))
    .filter(e => !filterMissing || e._f.missing>0)
    .sort((a,b)=>b._f.missing-a._f.missing||a.name.localeCompare(b.name));

  if(view==='stock'){
    return <FardaStockScreen
      stock={stock}
      onChange={async(s)=>{ setStock(s); await saveFardaStockStore(s); }}
      onBack={()=>setView('emp')}
      readOnly={readOnly}
      onAudit={onAudit}
    />;
  }

  // Resumo agregado para o header
  const totalEmps = emps.length;
  const completos = emps.filter(e=>empStatus(e).missing===0).length;
  const emFalta = emps.filter(e=>empStatus(e).missing>0).length;

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:220}}>
          <div style={{fontWeight:700,fontSize:18}}>Controlo de Fardas</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{FARDA_ITEMS.map(i=>i.label).join(' · ')}</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {[
            {l:'Completos', v:completos, c:'var(--green)'},
            {l:'Em falta',  v:emFalta,   c:'var(--orange)'},
            {l:'Total',     v:totalEmps, c:'var(--muted)'},
          ].map(s=>(
            <div key={s.l} style={{padding:'4px 12px',background:'#fff',border:'1px solid var(--border)',borderRadius:8,textAlign:'center',minWidth:60}}>
              <div style={{fontSize:15,fontWeight:800,color:s.c,lineHeight:1.1}}>{s.v}</div>
              <div style={{fontSize:9,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.3}}>{s.l}</div>
            </div>
          ))}
        </div>
        <button className="btn-soft" onClick={()=>setView('stock')} title="Gerir stock por tamanho">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <span>Ver Stock</span>
        </button>
      </div>

      {/* Sub-bar: filtros + nota */}
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <label className="farda-toggle">
          <input type="checkbox" checked={filterMissing} onChange={e=>setFilterMissing(e.target.checked)}/>
          <span>Apenas com peças em falta</span>
        </label>
        <span style={{fontSize:11,color:'var(--muted)',flex:1,minWidth:200}}>
          Quando entregue, a peça fica descontada no stock.
        </span>
      </div>

      {loading&&<div style={{padding:'12px',color:'var(--muted)',fontSize:12}}>A carregar dados...</div>}

      <div className="card" style={{overflow:'hidden',padding:0}}>
        <div style={{overflowX:'auto'}}>
          <table className="farda-table">
            <thead>
              <tr>
                <th className="farda-th farda-th--left">Colaborador</th>
                <th className="farda-th farda-th--left">Empresa</th>
                {FARDA_ITEMS.map(item=>(
                  <th key={item.id} className="farda-th farda-th--icon" title={item.label}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                      <span style={{fontSize:16,lineHeight:1}}>{item.icon}</span>
                      <span style={{fontSize:9,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.3,whiteSpace:'nowrap'}}>{item.label.replace('Polo Manga ','').replace('Manga ','')}</span>
                    </div>
                  </th>
                ))}
                <th className="farda-th">Estado</th>
                <th className="farda-th"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(emp => {
                const d = getData(emp);
                const accent = COMP_COLORS[emp.company]||'#999';
                return (
                  <tr key={emp.id+emp.company} className="farda-row" onClick={()=>setSelEmp(emp)}
                    style={{cursor:'pointer'}}>
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
                    {FARDA_ITEMS.map(item => {
                      const has = (d[item.id]||[]).length > 0;
                      return (
                        <td key={item.id} className="farda-td farda-td--cell">
                          <span className={`farda-mark ${has?'is-has':'is-empty'}`}>
                            {has
                              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <span style={{fontSize:11,fontWeight:700}}>–</span>}
                          </span>
                        </td>
                      );
                    })}
                    <td className="farda-td" style={{padding:'8px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,display:'flex',gap:2,maxWidth:90}}>
                          {Array.from({length:emp._f.total}).map((_,i)=>(
                            <div key={i} style={{flex:1,height:5,borderRadius:2,background:i<emp._f.has?'var(--green)':'var(--border)'}}/>
                          ))}
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:emp._f.has===emp._f.total?'var(--green)':'var(--muted)',whiteSpace:'nowrap'}}>
                          {emp._f.has}/{emp._f.total}
                        </span>
                      </div>
                    </td>
                    <td className="farda-td" style={{textAlign:'right'}}>
                      <button className="btn-soft" onClick={e=>{e.stopPropagation();setSelEmp(emp);}} title="Gerir farda deste colaborador">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        <span>Gerir</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length===0&&<tr><td colSpan={FARDA_ITEMS.length+4} style={{padding:32,textAlign:'center',color:'var(--muted)'}}>{filterMissing?'Todos os colaboradores filtrados têm a farda completa.':'Sem colaboradores.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selEmp && (
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setSelEmp(null)}}>
          <div className="modal" style={{maxWidth:820}}>
            <div className="mh">
              <div className="mh-t">Fardas — {selEmp.name} <span style={{fontSize:12,color:'var(--muted)',fontWeight:400}}>· {selEmp.company}</span></div>
              <button className="btn bg" onClick={()=>{setSelEmp(null); loadAllFarda().then(setCache);}}>✕</button>
            </div>
            <div className="mb">
              <FardaTab emp={selEmp} readOnly={readOnly} user={user} onAudit={onAudit} onStockChange={setStock}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FardaStockScreen({stock, onChange, onBack, readOnly, onAudit}){
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(stock||FARDA_STOCK_DEFAULT);
  const [empSearch, setEmpSearch] = React.useState('');
  const [companyF, setCompanyF] = React.useState('all');
  const [allEmps, setAllEmps] = React.useState([]);
  const [empCache, setEmpCache] = React.useState({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        const d = await apiCall('get_data');
        if(!active) return;
        const ems = (d&&d.employees)||[];
        setAllEmps(ems);
        const m = await loadAllFarda();
        if(!active) return;
        setEmpCache(m||{});
      }catch(e){}
      if(active) setLoading(false);
    })();
    return ()=>{ active=false; };
  },[]);

  React.useEffect(()=>{ setDraft(stock||FARDA_STOCK_DEFAULT); }, [stock]);

  function setSizeQty(catKey, sizeKey, qty){
    setDraft(d=>{
      const cat = d[catKey] || FARDA_STOCK_DEFAULT[catKey];
      const sizes = cat.sizes.map(s=> s.key===sizeKey ? {...s, qty: Math.max(0, parseInt(qty,10)||0)} : s);
      return {...d, [catKey]: {...cat, sizes}};
    });
  }
  function adjQty(catKey, sizeKey, delta){
    const cat = draft[catKey];
    const cur = cat?.sizes.find(s=>s.key===sizeKey)?.qty || 0;
    setSizeQty(catKey, sizeKey, Math.max(0, (parseInt(cur,10)||0) + delta));
  }
  async function saveDraft(){
    await onChange(draft);
    setEditing(false);
    onAudit && onAudit('Stock de fardas actualizado', 'update');
  }

  const filteredEmps = React.useMemo(()=>{
    const q = empSearch.trim().toLowerCase();
    return allEmps
      .filter(e=> companyF==='all' || e.company===companyF)
      .filter(e=> !q || (e.name||'').toLowerCase().includes(q) || String(e.id||'').includes(q))
      .sort((a,b)=> (a.company||'').localeCompare(b.company||'') || (a.name||'').localeCompare(b.name||''));
  }, [allEmps, empSearch, companyF]);

  function empMissingItems(emp){
    const d = empCache[emp.id+'|'+emp.company] || {};
    const missing = [];
    FARDA_ITEMS.forEach(item=>{
      const hist = d[item.id] || [];
      if(!hist.length) missing.push(item);
    });
    return missing;
  }

  const totalPieces = Object.values(draft||{}).reduce((s,c)=>s+totalStockQty(c),0);

  const cats = Object.entries(stock||FARDA_STOCK_DEFAULT);

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
        <button className="btn-ghost" onClick={onBack} title="Voltar a Controlo de Fardas" style={{padding:'5px 6px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{fontWeight:800,fontSize:16}}>Stock de Fardas</span>
        <span style={{fontSize:12,color:'var(--muted)'}}>Total em stock: <strong style={{color:'var(--fg)'}}>{totalPieces}</strong> peças</span>
        {!readOnly && (
          editing
            ? <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                <button className="btn bs" onClick={()=>{setDraft(stock); setEditing(false);}}>Cancelar</button>
                <button className="btn bp" onClick={saveDraft}>Guardar alterações</button>
              </div>
            : <button className="btn" style={{marginLeft:'auto',padding:'5px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}} onClick={()=>setEditing(true)}>✎ Editar quantidades</button>
        )}
      </div>

      {/* Tabela do stock */}
      <div className="stock-grid">
        {cats.map(([key, cat]) => {
          const data = (editing ? draft : stock)?.[key];
          const total = totalStockQty(data);
          return (
            <div key={key} className="card stock-cat">
              <div className="stock-cat-head">
                <span className="stock-cat-icon">{cat.icon}</span>
                <span className="stock-cat-label">{cat.label}</span>
                <span className={`qty-pill ${total > 0 ? 'qty-pill--ok' : 'qty-pill--empty'}`}>
                  {total} un.
                </span>
              </div>
              <div className="stock-sizes">
                {data?.sizes.map(s => (
                  <div key={s.key} className="stock-size-row">
                    <span className="stock-size-label">{s.label}</span>
                    {editing
                      ? <div className="qty-controls">
                          <button className="btn bs btn-sm qty-btn" onClick={() => adjQty(key, s.key, -1)}>−</button>
                          <input type="number" min="0" className="qty-input"
                            value={s.qty}
                            onChange={e => setSizeQty(key, s.key, e.target.value)}/>
                          <button className="btn bs btn-sm qty-btn" onClick={() => adjQty(key, s.key, +1)}>+</button>
                        </div>
                      : <span className={`stock-size-qty ${s.qty === 0 ? 'is-zero' : ''}`}>{s.qty}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Colaboradores para atribuir */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,flexWrap:'wrap'}}>
        <span style={{fontWeight:800,fontSize:14}}>👥 Atribuir a colaboradores</span>
        <span style={{fontSize:11,color:'var(--muted)'}}>Clica num colaborador abaixo para gerir as suas peças</span>
        <select className="fi" value={companyF} onChange={e=>setCompanyF(e.target.value)} style={{marginLeft:'auto',padding:'4px 10px',fontSize:12,width:160}}>
          <option value="all">Todas as empresas</option>
          <option value="Roupeta">Roupeta</option>
          <option value="Roupeta II">Roupeta II</option>
          <option value="Arlize">Arlize</option>
          <option value="Pit Evolution">Pit Evolution</option>
        </select>
        <input className="fi" placeholder="Pesquisar colaborador..." value={empSearch} onChange={e=>setEmpSearch(e.target.value)} style={{padding:'4px 10px',fontSize:12,width:200}}/>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {loading ? <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>A carregar colaboradores...</div>
         : filteredEmps.length===0 ? <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>Nenhum colaborador encontrado.</div>
         : <div style={{maxHeight:500,overflowY:'auto'}}>
             {filteredEmps.map((emp,i)=>{
               const missing = empMissingItems(emp);
               const has = FARDA_ITEMS.length - missing.length;
               return (
                 <FardaStockEmpRow key={emp.id+emp.company} emp={emp} has={has} striped={i%2===1}
                   stock={stock} onChange={onChange} onAudit={onAudit}
                   onAfter={async()=>{ const m=await loadAllFarda(); setEmpCache(m||{}); }}/>
               );
             })}
           </div>
        }
      </div>
    </div>
  );
}

function FardaStockEmpRow({emp, has, striped, stock, onChange, onAudit, onAfter}){
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  React.useEffect(()=>{ apiCall('check_session').then(setUser).catch(()=>{}); },[]);
  function close(){ setOpen(false); onAfter&&onAfter(); }
  return (
    <>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'background .12s',background:striped?'var(--bg)':''}}
        onMouseOver={e=>e.currentTarget.style.background='var(--blbg)'} onMouseOut={e=>e.currentTarget.style.background=striped?'var(--bg)':''}
        onClick={()=>setOpen(true)}>
        <span style={{width:8,height:8,borderRadius:'50%',background:COMP_COLORS[emp.company]||'#999',flexShrink:0}}/>
        <span style={{fontWeight:600,fontSize:13,flex:1}}>{emp.name}</span>
        <span className="chip cgr" style={{fontSize:10}}>{emp.company}</span>
        <span style={{fontSize:11,fontWeight:700,minWidth:60,textAlign:'right'}}>
          <span style={{color:'#1D6A39'}}>{has}</span>
          <span style={{color:'var(--muted)',fontWeight:400}}> / {FARDA_ITEMS.length}</span>
        </span>
        <button className="btn bp btn-sm" style={{padding:'4px 12px',fontSize:11,fontWeight:700}}
          onClick={(e)=>{ e.stopPropagation(); setOpen(true); }}>
          Atribuir →
        </button>
      </div>
      {open&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget) close();}}>
          <div className="modal" style={{maxWidth:780}}>
            <div className="mh">
              <div className="mh-t">Atribuir Farda — {emp.name} <span style={{fontSize:12,color:'var(--muted)',fontWeight:400}}>· {emp.company}</span></div>
              <button className="btn bg" onClick={close}>✕</button>
            </div>
            <div className="mb">
              <FardaTab emp={emp} readOnly={false} user={user} onAudit={onAudit} onStockChange={onChange}/>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
