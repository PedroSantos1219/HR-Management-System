// Formação: categorias internas e externas, tab individual na ficha
// do colaborador e ecrã global por sessão. Empresas fabris não têm CAM/ADR.

const TRAIN_CATS = [
  {id:'sht',       label:'SHT — Segurança, Higiene e Saúde',         type:'interna', color:'1D6A39'},
  {id:'integracao',label:'Formação de Integração / Acolhimento',      type:'interna', color:'1D6A39'},
  {id:'int_outra', label:'Outra Formação Interna',                    type:'interna', color:'1D6A39'},
  {id:'sht_ext',   label:'SHT — Segurança, Higiene e Saúde',         type:'externa', color:'1A5276'},
  {id:'tacografos',label:'Tacógrafos',                                 type:'externa', color:'1A5276'},
  {id:'cam',       label:'CAM / CQC',                                  type:'externa', color:'1A5276'},
  {id:'adr',       label:'ADR — Mercadorias Perigosas',               type:'externa', color:'1A5276'},
  {id:'ext_outra', label:'Outra Formação Externa',                    type:'externa', color:'1A5276'},
];

// Empresas fabris não conduzem — exclui CAM/CQC e ADR.
// co pode vir como name (Roupeta) ou key da pill (roupeta).
const trainCatsFor = co => {
  const name = COMPANY_NAME[co] || co;
  return isFabrilCompany(name) ? TRAIN_CATS.filter(c=>c.id!=='cam'&&c.id!=='adr') : TRAIN_CATS;
};

function EmpTrainingTab({emp, readOnly, user, onAudit}) {
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [yr, setYr] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState({
    category:'sht', description:'', entity:'',
    date: new Date().toISOString().split('T')[0], hours:'8', certified:'Sim', certNumber:'', notes:'', responsible:''
  });

  useEffect(()=>{
    let active=true;
    loadTraining().then(r=>{ if(active) setRecords(r); });
    return ()=>{active=false;};
  },[]);

  const myRecs = useMemo(()=>
    records.filter(r=>r.empId===emp.id&&r.empCompany===emp.company&&(yr==='all'||r.date?.startsWith(yr)))
      .sort((a,b)=>b.date?.localeCompare(a.date)||0),
  [records,emp,yr]);

  async function addRecord() {
    const cat = TRAIN_CATS.find(c=>c.id===form.category);
    const rec = {
      id: Date.now().toString(),
      empId: emp.id, empName: emp.name, empCompany: emp.company,
      category: form.category, categoryLabel: cat?.label||form.category, type: cat?.type||'interna',
      description: form.description||cat?.label||'',
      entity: form.entity, date: form.date,
      hours: parseFloat(form.hours)||0,
      certified: form.certified==='Sim',
      certNumber: form.certNumber, notes: form.notes,
      responsible: form.responsible,
      createdBy: user?.name||'RH', createdAt: new Date().toISOString()
    };
    const updated = [...records, rec];
    setRecords(updated); await saveTrainingStore(updated);
    onAudit&&onAudit(`Registou formação "${rec.categoryLabel}" para ${emp.name} (${rec.hours}h, ${fmtDate(rec.date)})`, 'formacao');
    setShowForm(false);
    setForm({category:'sht',description:'',entity:'',date:new Date().toISOString().split('T')[0],hours:'8',certified:'Sim',certNumber:'',notes:'',responsible:''});
  }

  async function delRecord(id) {
    if(!confirm('Eliminar este registo de formação?')) return;
    const updated = records.filter(r=>r.id!==id);
    setRecords(updated); await saveTrainingStore(updated);
  }

  const totalHours = myRecs.reduce((s,r)=>s+(r.hours||0),0);
  const intHours   = myRecs.filter(r=>r.type==='interna').reduce((s,r)=>s+(r.hours||0),0);
  const extHours   = myRecs.filter(r=>r.type==='externa').reduce((s,r)=>s+(r.hours||0),0);

  return (
    <div>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
        <div className="sec-t" style={{marginBottom:0}}>Formações Registadas</div>
        <select className="fi" style={{width:100,padding:'3px 6px',fontSize:12}} value={yr} onChange={e=>setYr(e.target.value)}>
          <option value="all">Todos</option>
          {[2023,2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
        </select>
        {!readOnly&&<button className="btn bp btn-sm" style={{marginLeft:'auto'}} onClick={()=>setShowForm(true)}>+ Registar Formação</button>}
      </div>

      {/* Summary */}
      {myRecs.length>0&&<div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        {[
          {l:'Total',v:totalHours+'h',c:'var(--text)'},
          {l:'Interna',v:intHours+'h',c:'var(--green)'},
          {l:'Externa',v:extHours+'h',c:'var(--blue)'},
          {l:'N.º acções',v:myRecs.length,c:'var(--muted)'},
        ].map(s=>(
          <div key={s.l} style={{background:'var(--bg)',borderRadius:7,padding:'6px 12px',border:'1px solid var(--border)'}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase'}}>{s.l}</div>
            <div style={{fontSize:17,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>}

      {/* Records */}
      {myRecs.length===0?<div className="empty">Sem registos de formação</div>:
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Data','Tipo','Acção de Formação','Entidade','Horas','Cert.','Obs.',''].map(h=>(
                  <th key={h} style={{background:'var(--bg)',padding:'7px 10px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--muted)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myRecs.map((r,i)=>(
                <tr key={r.id} style={{backgroundColor:i%2===0?'white':'var(--bg)'}}>
                  <td style={{padding:'7px 10px',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(r.date)}</td>
                  <td style={{padding:'7px 10px'}}>
                    <span className={`chip ${r.type==='interna'?'cg':'cb2'}`} style={{fontSize:10}}>{r.type==='interna'?'Interna':'Externa'}</span>
                  </td>
                  <td style={{padding:'7px 10px',fontSize:12,fontWeight:500}}>{r.categoryLabel}</td>
                  <td style={{padding:'7px 10px',fontSize:11,color:'var(--muted)'}}>{r.entity||'—'}</td>
                  <td style={{padding:'7px 10px',fontSize:13,fontWeight:700,textAlign:'center'}}>{r.hours}h</td>
                  <td style={{padding:'7px 10px',fontSize:12,textAlign:'center'}}>{r.certified?'Sim':'—'}{r.certNumber?' '+r.certNumber:''}</td>
                  <td style={{padding:'7px 10px',fontSize:11,color:'var(--muted)',maxWidth:160}}>{r.notes||'—'}</td>
                  <td style={{padding:'7px 6px'}}>
                    {!readOnly&&<button className="btn bg btn-sm" style={{color:'var(--red)',padding:'2px 5px'}} onClick={()=>delRecord(r.id)}>Elim.</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {/* FORM MODAL */}
      {showForm&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div className="modal" style={{maxWidth:540}}>
            <div className="mh"><div className="mh-t">Registar Formação — {emp.name}</div><button className="btn bg" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="mb">
              <div className="fg">
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Acção de Formação</div>
                  <select className="fi" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    <optgroup label="─── Formação Interna">
                      {trainCatsFor(emp.company).filter(c=>c.type==='interna').map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                    </optgroup>
                    <optgroup label="─── Formação Externa">
                      {trainCatsFor(emp.company).filter(c=>c.type==='externa').map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Descrição (opcional)</div>
                  <input className="fi" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Online, Presencial, Módulo 2..."/>
                </div>
                <div className="field">
                  <div className="fl">Data de Realização</div>
                  <input type="date" className="fi" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                </div>
                <div className="field">
                  <div className="fl">Horas</div>
                  <input type="number" className="fi" min="0.5" step="0.5" value={form.hours} onChange={e=>setForm(f=>({...f,hours:e.target.value}))}/>
                </div>
                <div className="field">
                  <div className="fl">Entidade Formadora</div>
                  <input className="fi" value={form.entity} onChange={e=>setForm(f=>({...f,entity:e.target.value}))}/>
                </div>
                <div className="field">
                  <div className="fl">Responsável de Formação</div>
                  <input className="fi" value={form.responsible} onChange={e=>setForm(f=>({...f,responsible:e.target.value}))}
                    placeholder="Nome do responsável"/>
                </div>
                <div className="field">
                  <div className="fl">Com Certificado?</div>
                  <select className="fi" value={form.certified} onChange={e=>setForm(f=>({...f,certified:e.target.value}))}>
                    <option>Sim</option><option>Não</option>
                  </select>
                </div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Código da Formação</div>
                  <input className="fi" value={form.certNumber} onChange={e=>setForm(f=>({...f,certNumber:e.target.value}))} placeholder="Opcional"/>
                </div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Notas</div>
                  <input className="fi" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Observações adicionais"/>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn bs" onClick={()=>setShowForm(false)}>Cancelar</button>
              <button className="btn bp" onClick={addRecord}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainingScreen({data, company, readOnly, user, onAudit}) {
  const {employees=[]} = data;
  const cm = COMPANY_NAME;

  const [records, setRecords] = useState([]);
  const [yr, setYr] = useState(String(new Date().getFullYear()));
  const [tab, setTab] = useState('formacoes'); // formacoes | relatorio
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | interna | externa

  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showEmpPicker, setShowEmpPicker] = useState(false);
  const [empPickerSearch, setEmpPickerSearch] = useState('');

  const emptyForm = {
    trainingName:'', type:'interna', category:'sht', entity:'',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    hours:'8', certified:'Sim', certNumber:'', notes:'', selectedEmps:[]
  };
  const [form, setForm] = useState(emptyForm);

  const emps = filterEmps(employees, company);

  useEffect(()=>{
    let active=true;
    loadTraining().then(r=>{ if(active) setRecords(r); });
    return ()=>{active=false;};
  },[]);

  const sessions = useMemo(()=>{
    const groups = {};
    records.forEach(r=>{
      const sid = r.sessionId || ('legacy_'+r.id);
      if(!groups[sid]){
        groups[sid]={
          sessionId:sid,
          trainingName: r.trainingName || r.categoryLabel || r.description || '—',
          type: r.type || 'interna',
          category: r.category || '',
          entity: r.entity || '',
          startDate: r.startDate || r.date || '',
          endDate: r.endDate || r.date || '',
          hours: r.hours || 0,
          certified: r.certified,
          certNumber: r.certNumber || '',
          notes: r.notes || '',
          createdBy: r.createdBy || '',
          createdAt: r.createdAt || '',
          participants:[]
        };
      }
      groups[sid].participants.push({empId:r.empId, empName:r.empName, empCompany:r.empCompany});
    });
    return Object.values(groups).sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  },[records]);

  const filteredSessions = useMemo(()=>sessions.filter(s=>{
    const coOk = company==='all' || s.participants.some(p=>matchesCompany(p,company,'empCompany'));
    const yrOk = yr==='all' || (s.startDate||s.endDate||'').startsWith(yr);
    const tOk  = typeFilter==='all' || s.type===typeFilter;
    const sOk  = !searchFilter.trim() ||
                 s.trainingName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                 (s.entity||'').toLowerCase().includes(searchFilter.toLowerCase());
    return coOk && yrOk && tOk && sOk;
  }),[sessions, company, yr, typeFilter, searchFilter]);

  function openNew(){
    setForm(emptyForm);
    setEditingSession(null);
    setShowModal(true);
  }

  function openEdit(s){
    setForm({
      trainingName: s.trainingName,
      type: s.type,
      category: s.category || (s.type==='interna'?'int_outra':'ext_outra'),
      entity: s.entity||'',
      startDate: s.startDate||'',
      endDate: s.endDate||s.startDate||'',
      hours: String(s.hours),
      certified: s.certified?'Sim':'Não',
      certNumber: s.certNumber||'',
      notes: s.notes||'',
      selectedEmps: s.participants.map(p=>p.empId+'|'+p.empCompany)
    });
    setEditingSession(s.sessionId);
    setShowModal(true);
  }

  async function saveFormation(){
    if(!form.trainingName.trim()){ alert('Indique o nome da formação.'); return; }
    if(!form.selectedEmps.length){ alert('Selecione pelo menos um colaborador.'); return; }
    if(!form.startDate){ alert('Indique a data de início.'); return; }

    const sessionId = editingSession || ('sess_'+Date.now());
    const withoutSession = records.filter(r=>(r.sessionId||('legacy_'+r.id))!==sessionId);

    const cat = TRAIN_CATS.find(c=>c.id===form.category);
    const newRecs = form.selectedEmps.map(key=>{
      const [empId,empCo]=key.split('|');
      const emp=employees.find(e=>e.id===empId&&e.company===empCo);
      if(!emp) return null;
      return {
        id: Date.now().toString()+'_'+key,
        sessionId,
        empId:emp.id, empName:emp.name, empCompany:emp.company,
        trainingName: form.trainingName,
        type: cat?.type || form.type,
        entity: form.type==='interna'?'Interna':(form.entity||''),
        startDate: form.startDate,
        endDate: form.endDate||form.startDate,
        date: form.endDate||form.startDate, // backward compat
        hours: parseFloat(form.hours)||0,
        certified: form.certified==='Sim',
        certNumber: form.certNumber,
        notes: form.notes,
        category: form.category,
        categoryLabel: cat?.label || form.trainingName,
        description: form.trainingName,
        createdBy: user?.name||'RH',
        createdAt: new Date().toISOString()
      };
    }).filter(Boolean);

    const updated=[...withoutSession,...newRecs];
    setRecords(updated);
    await saveTrainingStore(updated);
    onAudit&&onAudit(`${editingSession?'Editou':'Criou'} formação "${form.trainingName}" (${form.type}) — ${newRecs.length} participantes`,'formacao');
    setShowModal(false);
  }

  async function deleteSession(sessionId){
    if(!confirm('Eliminar esta formação e todos os seus registos?')) return;
    const updated=records.filter(r=>(r.sessionId||('legacy_'+r.id))!==sessionId);
    setRecords(updated);
    await saveTrainingStore(updated);
  }

  const relData = useMemo(()=>{
    const ef = filterEmps(employees, company);
    return ef.map(emp=>{
      const er=records.filter(r=>r.empId===emp.id&&r.empCompany===emp.company&&(yr==='all'||((r.startDate||r.date)||'').startsWith(yr)));
      const intH=er.filter(r=>r.type==='interna').reduce((s,r)=>s+(r.hours||0),0);
      const extH=er.filter(r=>r.type==='externa').reduce((s,r)=>s+(r.hours||0),0);
      const cats={};
      TRAIN_CATS.forEach(c=>{ cats[c.id]=er.filter(r=>r.category===c.id).reduce((s,r)=>s+(r.hours||0),0); });
      const codes=er.map(r=>r.certNumber).filter(Boolean);
      return {...emp, intH, extH, totalH:intH+extH, cats, nAcoes:er.length, codes};
    }).filter(e=>e.totalH>0||e.nAcoes>0);
  },[employees,records,company,yr]);


  const years=[2023,2024,2025,2026,2027];
  const pickerEmps=emps.filter(e=>
    !empPickerSearch.trim()||
    e.name.toLowerCase().includes(empPickerSearch.toLowerCase())||
    (e.id||'').includes(empPickerSearch)
  ).sort((a,b)=>a.company.localeCompare(b.company)||a.name.localeCompare(b.name));

  return(
    <div>

      {/* filtros + acções */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <select className="fi" style={{width:90,padding:'4px 8px',fontSize:13}} value={yr} onChange={e=>setYr(e.target.value)}>
          <option value="all">Todos os anos</option>
          {years.map(y=><option key={y}>{y}</option>)}
        </select>

        {/* Toggle Tipo */}
        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid var(--border)'}}>
          {[['all','Todos'],['interna','Interno'],['externa','Externo']].map(([k,l])=>(
            <button key={k} onClick={()=>setTypeFilter(k)}
              style={{padding:'5px 13px',fontSize:12,fontWeight:600,border:'none',cursor:'pointer',
                background:typeFilter===k?(k==='interna'?'#C0392B':k==='externa'?'#7D3C98':'#1a0d0d'):'var(--bg)',
                color:typeFilter===k?'white':'var(--muted)',transition:'all .15s'}}>
              {l}
            </button>
          ))}
        </div>

        <input value={searchFilter} onChange={e=>setSearchFilter(e.target.value)}
          placeholder="Pesquisar formação..." className="fi"
          style={{padding:'5px 10px',fontSize:12,width:200,flex:'none'}}/>

        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          
          {!readOnly&&<button className="btn bp btn-sm" onClick={openNew}>+ Nova Formação</button>}
        </div>
      </div>

      {/* tabs */}
      <div className="tabs" style={{marginBottom:12}}>
        {[['formacoes','Formações'],['relatorio','Relatório Único']].map(([k,l])=>(
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
        ))}
      </div>

      {/* tab: formações */}
      {tab==='formacoes'&&(
        <div className="card" style={{overflow:'hidden'}}>
          {filteredSessions.length===0
            ?<div className="empty" style={{padding:48,textAlign:'center'}}>
               <img src="css/assets/icon-formacao-presencial-300x190.png" alt="" style={{width:120,marginBottom:8,opacity:.55}}/>
               <div style={{fontWeight:600,marginBottom:6}}>Sem formações para o período seleccionado</div>
               {!readOnly&&<button className="btn bp btn-sm" style={{marginTop:4}} onClick={openNew}>+ Criar primeira formação</button>}
             </div>
            :<div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    {['Tipo','Nome da Formação','Empresa Formadora','Início','Conclusão','Carga H.','Participantes','Por',''].map(h=>(
                      <th key={h} style={{background:'var(--bg)',padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--muted)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((s,i)=>(
                    <tr key={s.sessionId} style={{backgroundColor:i%2===0?'white':'var(--bg)'}}>
                      <td style={{padding:'8px 10px'}}>
                        <span style={{
                          display:'inline-flex',alignItems:'center',gap:5,padding:'4px 11px',borderRadius:20,
                          background:s.type==='interna'?'#FDEDEC':'#F4ECF7',
                          color:s.type==='interna'?'#C0392B':'#7D3C98',
                          fontWeight:800,fontSize:11,whiteSpace:'nowrap',
                          border:`1.5px solid ${s.type==='interna'?'#C0392B':'#7D3C98'}`
                        }}>
                          {s.type==='interna'?'🏢 INTERNO':'🎓 EXTERNO'}
                        </span>
                      </td>
                      <td style={{padding:'8px 10px',fontWeight:600,fontSize:13,maxWidth:220}}>{s.trainingName}</td>
                      <td style={{padding:'8px 10px',fontSize:12,color:'var(--muted)'}}>{s.entity||'—'}</td>
                      <td style={{padding:'8px 10px',fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(s.startDate)}</td>
                      <td style={{padding:'8px 10px',fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(s.endDate)}</td>
                      <td style={{padding:'8px 10px',fontWeight:700,fontSize:15,textAlign:'center',color:'var(--blue)'}}>{s.hours}h</td>
                      <td style={{padding:'8px 10px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontWeight:700,fontSize:14}}>{s.participants.length}</span>
                          <div style={{display:'flex',gap:2,flexWrap:'wrap',maxWidth:110}}>
                            {[...new Set(s.participants.map(p=>p.empCompany))].map(co=>(
                              <span key={co} className="chip cgr" style={{fontSize:9,padding:'1px 5px'}}>{co}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'8px 10px',fontSize:11,color:'var(--muted)'}}>{s.createdBy||'—'}</td>
                      <td style={{padding:'8px 8px',whiteSpace:'nowrap'}}>
                        {!readOnly&&<>
                          <button className="btn bs btn-sm" style={{marginRight:4,padding:'3px 8px'}} onClick={()=>openEdit(s)}>Editar</button>
                          <button className="btn bg btn-sm" style={{color:'var(--red)',padding:'3px 8px'}} onClick={()=>deleteSession(s.sessionId)}>Elim.</button>
                        </>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* tab: relatório único */}
      {tab==='relatorio'&&(
        <div>
          <div style={{background:'var(--blbg)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'var(--blue)',display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <span>ℹ️</span>
            <span>Listagem para o <strong>Relatório Único</strong> {yr!=='all'?`— Ano ${yr}`:''} · Apenas colaboradores com formação registada</span>
          </div>
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{background:'#1a2a3a',padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',color:'white',borderRight:'1px solid #444',minWidth:180}}>Colaborador</th>
                    <th rowSpan={2} style={{background:'#1a2a3a',padding:'8px 10px',fontSize:10,fontWeight:700,textTransform:'uppercase',color:'white',borderRight:'1px solid #444',whiteSpace:'nowrap'}}>Empresa</th>
                    <th colSpan={4} style={{background:'#C0392B',padding:'6px 10px',textAlign:'center',fontSize:10,fontWeight:700,textTransform:'uppercase',color:'white',borderRight:'1px solid rgba(255,255,255,.2)'}}>FORMAÇÃO INTERNA</th>
                    <th colSpan={6} style={{background:'#7D3C98',padding:'6px 10px',textAlign:'center',fontSize:10,fontWeight:700,textTransform:'uppercase',color:'white',borderRight:'1px solid rgba(255,255,255,.2)'}}>FORMAÇÃO EXTERNA</th>
                    <th rowSpan={2} style={{background:'#C0392B',padding:'8px 10px',textAlign:'center',fontSize:10,fontWeight:700,textTransform:'uppercase',color:'white',whiteSpace:'nowrap',borderRight:'1px solid #444'}}>TOTAL (h)</th>
                    <th rowSpan={2} style={{background:'#1a2a3a',padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',color:'white',whiteSpace:'nowrap',minWidth:140}}>Códigos</th>
                  </tr>
                  <tr>
                    {[['SHT','1D6A39'],['Integr.','1D6A39'],['Outra','1D6A39'],['Sub-tot.','155A2A']].map(([h,c])=>(
                      <th key={h} style={{background:'#'+c,padding:'5px 8px',textAlign:'center',fontSize:10,color:'white',fontWeight:700,whiteSpace:'nowrap',borderRight:'1px solid rgba(255,255,255,.15)'}}>{h}</th>
                    ))}
                    {[['SHT','1A5276'],['Tacóg.','1A5276'],['CAM/CQC','1A5276'],['ADR','1A5276'],['Outra','1A5276'],['Sub-tot.','154360']].map(([h,c])=>(
                      <th key={h} style={{background:'#'+c,padding:'5px 8px',textAlign:'center',fontSize:10,color:'white',fontWeight:700,whiteSpace:'nowrap',borderRight:'1px solid rgba(255,255,255,.15)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relData.sort((a,b)=>a.company.localeCompare(b.company)||a.name.localeCompare(b.name)).map((emp,i)=>(
                    <tr key={emp.id+emp.company} style={{backgroundColor:i%2===0?'white':'var(--bg)'}}>
                      <td style={{padding:'7px 10px',fontWeight:600,fontSize:12,borderRight:'1px solid var(--border)'}}>{emp.name}</td>
                      <td style={{padding:'7px 10px',borderRight:'1px solid var(--border)'}}><span className="chip cgr" style={{fontSize:10}}>{emp.company}</span></td>
                      {[emp.cats.sht,emp.cats.integracao,emp.cats.int_outra,emp.intH].map((v,ci)=>(
                        <td key={ci} style={{padding:'7px 8px',textAlign:'center',fontWeight:ci===3?700:400,fontSize:ci===3?13:12,color:ci===3?'#C0392B':'var(--text)',background:ci===3?'#FDEDEC':'',borderRight:'1px solid var(--border)'}}>{v||'—'}{v?'h':''}</td>
                      ))}
                      {[emp.cats.sht_ext,emp.cats.tacografos,emp.cats.cam,emp.cats.adr,emp.cats.ext_outra,emp.extH].map((v,ci)=>(
                        <td key={ci} style={{padding:'7px 8px',textAlign:'center',fontWeight:ci===5?700:400,fontSize:ci===5?13:12,color:ci===5?'#7D3C98':'var(--text)',background:ci===5?'#F4ECF7':'',borderRight:'1px solid var(--border)'}}>{v||'—'}{v?'h':''}</td>
                      ))}
                      <td style={{padding:'7px 10px',textAlign:'center',fontWeight:700,fontSize:14,color:'#C0392B',background:'#FDEDEC',borderRight:'1px solid var(--border)'}}>{emp.totalH}h</td>
                      <td style={{padding:'7px 10px',fontSize:11,color:'var(--muted)',maxWidth:200,wordBreak:'break-word'}}>{emp.codes.length?emp.codes.join(', '):'—'}</td>
                    </tr>
                  ))}
                  {relData.length===0&&(
                    <tr><td colSpan={14} style={{padding:'30px',textAlign:'center',color:'var(--muted)'}}>Sem formação registada para este período</td></tr>
                  )}
                </tbody>
                {relData.length>0&&(
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{padding:'8px 10px',fontWeight:700,fontSize:12,background:'var(--bg)',borderTop:'2px solid var(--border)'}}>TOTAIS</td>
                      {['sht','integracao','int_outra'].map(k=>(
                        <td key={k} style={{padding:'8px 8px',textAlign:'center',fontWeight:700,fontSize:12,background:'#FDEDEC',borderTop:'2px solid var(--border)'}}>
                          {relData.reduce((s,e)=>s+(e.cats[k]||0),0)||'—'}{relData.reduce((s,e)=>s+(e.cats[k]||0),0)?'h':''}
                        </td>
                      ))}
                      <td style={{padding:'8px 8px',textAlign:'center',fontWeight:700,fontSize:13,color:'#C0392B',background:'#FDEDEC',borderTop:'2px solid var(--border)'}}>{relData.reduce((s,e)=>s+e.intH,0)}h</td>
                      {['sht_ext','tacografos','cam','adr','ext_outra'].map(k=>(
                        <td key={k} style={{padding:'8px 8px',textAlign:'center',fontWeight:700,fontSize:12,background:'#F4ECF7',borderTop:'2px solid var(--border)'}}>
                          {relData.reduce((s,e)=>s+(e.cats[k]||0),0)||'—'}{relData.reduce((s,e)=>s+(e.cats[k]||0),0)?'h':''}
                        </td>
                      ))}
                      <td style={{padding:'8px 8px',textAlign:'center',fontWeight:700,fontSize:13,color:'#7D3C98',background:'#F4ECF7',borderTop:'2px solid var(--border)'}}>{relData.reduce((s,e)=>s+e.extH,0)}h</td>
                      <td style={{padding:'8px 10px',textAlign:'center',fontWeight:700,fontSize:15,color:'#C0392B',background:'#FDEDEC',borderTop:'2px solid var(--border)',borderRight:'1px solid var(--border)'}}>{relData.reduce((s,e)=>s+e.totalH,0)}h</td>
                      <td style={{padding:'8px 10px',background:'var(--bg)',borderTop:'2px solid var(--border)'}}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* modal: nova / editar formação */}
      {showModal&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal" style={{maxWidth:680,width:'95%'}}>
            <div className="mh">
              <div className="mh-t">{editingSession?'Editar Formação':'Nova Formação'}</div>
              <button className="btn bg" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="mb" style={{maxHeight:'75vh',overflowY:'auto'}}>

              {/* tipo de formação — selector muito visível */}
              <div style={{marginBottom:20}}>
                <div className="fl" style={{marginBottom:8,fontWeight:700}}>Tipo de Formação <span style={{color:'var(--red)'}}>*</span></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[
                    {k:'interna', icon:'🏢', label:'INTERNA', desc:'Realizada internamente', bg:'#FDEDEC', border:'#C0392B', color:'#C0392B'},
                    {k:'externa', icon:'🎓', label:'EXTERNA', desc:'Realizada por entidade externa', bg:'#F4ECF7', border:'#7D3C98', color:'#7D3C98'},
                  ].map(opt=>(
                    <div key={opt.k} onClick={()=>setForm(f=>{
                      const cats=trainCatsFor(company).filter(c=>c.type===opt.k);
                      return {...f,type:opt.k,category:cats.some(c=>c.id===f.category)?f.category:(cats[0]?.id||'')};
                    })}
                      style={{
                        padding:'16px',borderRadius:10,cursor:'pointer',
                        border:`2.5px solid ${form.type===opt.k?opt.border:'var(--border)'}`,
                        background:form.type===opt.k?opt.bg:'var(--card)',
                        transition:'all .15s',display:'flex',alignItems:'center',gap:12,
                        boxShadow:form.type===opt.k?`0 0 0 3px ${opt.border}22`:''
                      }}>
                      <span style={{fontSize:28}}>{opt.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:900,fontSize:15,letterSpacing:'.5px',color:form.type===opt.k?opt.color:'var(--text)'}}>{opt.label}</div>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{opt.desc}</div>
                      </div>
                      {form.type===opt.k&&<span style={{color:opt.color,fontSize:20,fontWeight:700}}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* campos principais */}
              <div className="fg">
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Nome da Formação <span style={{color:'var(--red)'}}>*</span></div>
                  <input className="fi" value={form.trainingName}
                    onChange={e=>setForm(f=>({...f,trainingName:e.target.value}))}
                    placeholder="Ex: Segurança, Higiene e Saúde no Trabalho 2026"/>
                </div>

                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Categoria <span style={{color:'var(--red)'}}>*</span></div>
                  <select className="fi" value={form.category}
                    onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {trainCatsFor(company).filter(c=>c.type===form.type).map(c=>(
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {form.type==='externa'&&(
                  <div className="field" style={{gridColumn:'1/-1'}}>
                    <div className="fl">Empresa / Entidade Formadora <span style={{color:'var(--red)'}}>*</span></div>
                    <input className="fi" value={form.entity}
                      onChange={e=>setForm(f=>({...f,entity:e.target.value}))}
                      placeholder="Ex: IEFP, Cegoc, ATCUD, EDP Formação..."/>
                  </div>
                )}

                <div className="field">
                  <div className="fl">Data de Início <span style={{color:'var(--red)'}}>*</span></div>
                  <input type="date" className="fi" value={form.startDate}
                    onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>
                </div>
                <div className="field">
                  <div className="fl">Data de Conclusão</div>
                  <input type="date" className="fi" value={form.endDate}
                    onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
                </div>
                <div className="field">
                  <div className="fl">Carga Horária (h) <span style={{color:'var(--red)'}}>*</span></div>
                  <input type="number" className="fi" min="0.5" step="0.5" value={form.hours}
                    onChange={e=>setForm(f=>({...f,hours:e.target.value}))} placeholder="Ex: 8"/>
                </div>
                <div className="field">
                  <div className="fl">Com Certificado?</div>
                  <select className="fi" value={form.certified} onChange={e=>setForm(f=>({...f,certified:e.target.value}))}>
                    <option>Sim</option><option>Não</option>
                  </select>
                </div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Código da Formação</div>
                  <input className="fi" value={form.certNumber}
                    onChange={e=>setForm(f=>({...f,certNumber:e.target.value}))}
                    placeholder="Opcional"/>
                </div>
                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Notas</div>
                  <input className="fi" value={form.notes}
                    onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Observações adicionais"/>
                </div>
              </div>

              {/* colaboradores */}
              <div style={{marginTop:18,paddingTop:16,borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div className="fl" style={{marginBottom:0}}>
                    Colaboradores participantes
                    <span style={{color:'var(--muted)',fontWeight:400,marginLeft:6}}>({form.selectedEmps.length} selecionados)</span>
                  </div>
                  <button className="btn bp btn-sm" onClick={()=>{setEmpPickerSearch('');setShowEmpPicker(true);}}>
                    + Adicionar / Gerir colaboradores
                  </button>
                </div>
                {form.selectedEmps.length===0
                  ?<div style={{padding:'14px 16px',background:'var(--bg)',borderRadius:8,border:'1.5px dashed var(--border)',textAlign:'center',fontSize:13,color:'var(--muted)'}}>
                     Nenhum colaborador adicionado. Clique em <strong>"+ Adicionar / Gerir colaboradores"</strong>.
                   </div>
                  :<div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {form.selectedEmps.map(key=>{
                      const [eId,eCo]=key.split('|');
                      const emp=employees.find(e=>e.id===eId&&e.company===eCo);
                      if(!emp) return null;
                      return(
                        <div key={key} style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:20,padding:'4px 10px 4px 6px',fontSize:12}}>
                          <div className="av" style={{background:COMP_COLORS[emp.company]||'#1a0d0d',width:22,height:22,fontSize:9,flexShrink:0}}>{initials(emp.name)}</div>
                          <span style={{fontWeight:600}}>{emp.name}</span>
                          <span style={{fontSize:10,color:'var(--muted)'}}>{emp.company}</span>
                          <button onClick={()=>setForm(f=>({...f,selectedEmps:f.selectedEmps.filter(k=>k!==key)}))}
                            style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',padding:0,marginLeft:2,fontSize:14,lineHeight:1}}>×</button>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            </div>
            <div className="mf">
              <button className="btn bs" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn bp" onClick={saveFormation}>
                {editingSession?'Guardar Alterações':'Criar Formação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal picker: selecionar colaboradores */}
      {showEmpPicker&&(
        <div className="ov" style={{zIndex:1100}} onClick={e=>{if(e.target===e.currentTarget)setShowEmpPicker(false)}}>
          <div className="modal" style={{maxWidth:500,width:'95%'}}>
            <div className="mh">
              <div className="mh-t">Selecionar Colaboradores</div>
              <button className="btn bg" onClick={()=>setShowEmpPicker(false)}>✕</button>
            </div>
            <div className="mb">
              <input value={empPickerSearch}
                onChange={e=>setEmpPickerSearch(e.target.value)}
                placeholder="Pesquisar por nome ou n.º..."
                className="fi" style={{marginBottom:10}}/>
              <div style={{display:'flex',gap:6,marginBottom:10,alignItems:'center'}}>
                <button className="btn bs btn-sm" onClick={()=>setForm(f=>({...f,selectedEmps:emps.map(e=>e.id+'|'+e.company)}))}>Selecionar todos</button>
                <button className="btn bs btn-sm" onClick={()=>setForm(f=>({...f,selectedEmps:[]}))}>Limpar</button>
                <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{form.selectedEmps.length}/{emps.length}</span>
              </div>
              <div style={{maxHeight:340,overflow:'auto',border:'1px solid var(--border)',borderRadius:8}}>
                {pickerEmps.length===0
                  ?<div style={{padding:24,textAlign:'center',color:'var(--muted)',fontSize:13}}>Sem resultados</div>
                  :pickerEmps.map((emp,i)=>{
                    const key=emp.id+'|'+emp.company;
                    const checked=form.selectedEmps.includes(key);
                    return(
                      <label key={key} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderTop:i>0?'1px solid var(--border)':'none',cursor:'pointer',background:checked?'rgba(26,82,118,.07)':'transparent',transition:'background .1s'}}>
                        <input type="checkbox" checked={checked}
                          onChange={e=>setForm(f=>({...f,selectedEmps:e.target.checked?[...f.selectedEmps,key]:f.selectedEmps.filter(k=>k!==key)}))}/>
                        <div className="av" style={{background:COMP_COLORS[emp.company]||'#1a0d0d',width:30,height:30,fontSize:11,flexShrink:0}}>{initials(emp.name)}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{emp.name}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>N.º {emp.id||'—'}</div>
                        </div>
                        <span className="chip cgr" style={{fontSize:10,flexShrink:0}}>{emp.company}</span>
                      </label>
                    );
                  })
                }
              </div>
            </div>
            <div className="mf">
              <span style={{fontSize:12,color:'var(--muted)',marginRight:'auto'}}>{form.selectedEmps.length} selecionado(s)</span>
              <button className="btn bp" onClick={()=>setShowEmpPicker(false)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
