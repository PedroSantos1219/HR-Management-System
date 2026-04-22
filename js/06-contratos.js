// Lista de contratos por colaborador, com tipo, datas e atalhos para a ficha.

function ContratosScreen({data,company,onUpdate,readOnly,user,onAudit,onNav}){
  const [selEmp,setSelEmp]=useState(null);
  const [showModal,setShowModal]=useState(false);
  const [editEntry,setEditEntry]=useState(null);
  const [form,setForm]=useState({admissionDate:'',exitDate:'',contractType:'Efetivo',baseSalary:'',exitReason:'',notes:''});
  const [formErr,setFormErr]=useState('');
  const [search,setSearch]=useState('');
  const allEmps=data?.employees||[];
  const CM={'roupeta':'Roupeta','roupeta2':'Roupeta II','arlize':'Arlize','pit':'Pit Evolution'};
  const emps=company==='all'?allEmps:allEmps.filter(e=>e.company===CM[company]);

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
          <button className="btn" onClick={()=>setSelEmp(null)}>← Voltar</button>
        </div>
      ):(
        <div>
          {/* Cabeçalho */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
            <button className="btn" style={{padding:'5px 14px'}} onClick={()=>setSelEmp(null)}>← Contratos</button>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:16}}>{fullEmp.name}</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>{fullEmp.role||'—'} · {fullEmp.company}</div>
            </div>
            <Chip label={fullEmp.contractStatus} type={fullEmp.contractStatus==='Ativo'?'green':fullEmp.contractStatus==='Inativo'?'red':'orange'}/>
            <button className="btn bp btn-sm" onClick={()=>onNav('ferias',{id:fullEmp.id,company:fullEmp.company})}>🏖 Ver Férias</button>
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
            const adm   = fullEmp.admissionDate;
            let efetivo = '';
            if(adm){
              const a=new Date(adm);
              if(!isNaN(a)){ a.setFullYear(a.getFullYear()+2); efetivo=a.toISOString().split('T')[0]; }
            }
            const isEf=(fullEmp.contractEndDate||'').toLowerCase()==='efetivo';
            const items=[
              {l:'Período Experimental (90 dias)', d:trial, hint:'auto: admissão + 90 dias'},
              {l:'Fim do 2.º Contrato',            d:sec,   hint:'quando aplicável'},
              {l:'Limite p/ Efetivo (2 anos)',     d:efetivo, hint:isEf?'já é Efetivo':'admissão + 2 anos'},
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
                      <div key={it.l} style={{background:'var(--card)',border:`1px solid var(--border)`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:'10px 12px'}}>
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
              {!readOnly&&<button className="btn bp btn-sm" style={{marginLeft:'auto'}} onClick={openAdd}>+ Período</button>}
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
                      <div style={{display:'flex',gap:6,flexShrink:0}}>
                        <button className="btn btn-sm" onClick={()=>openEdit(h)}>Editar</button>
                        {arr.length>1&&<button className="btn btn-sm" style={{color:'var(--red)'}} onClick={()=>handleDelete(h.id)}>Elim.</button>}
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
    </div>
  );
}
