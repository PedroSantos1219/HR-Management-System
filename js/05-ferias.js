// Mapa de férias: índice por empresa, ficha individual, configuração anual e PDF.

const COMP_META={
  roupeta:  {label:'Roupeta',      color:'#C0392B', bg:'#fdecea'},
  roupeta2: {label:'Roupeta II',   color:'#2E86C1', bg:'#e8f4fc'},
  arlize:   {label:'Arlize',       color:'#1D6A39', bg:'#e6f4ec'},
  pit:      {label:'Pit Evolution', color:'#7D3C98', bg:'#f3e8fb'},
};
const CO_KEY={'Roupeta':'roupeta','Roupeta II':'roupeta2','Arlize':'arlize','Pit Evolution':'pit'};
const DIREITO_DIAS=22;

function FeriasScreen({data,ferias,feriasConfig,onSaveFerias,onSaveConfig,readOnly,user,onAudit,company,initSel,onNav}){
  const year=new Date().getFullYear();
  const CO_MAP={'all':'all','roupeta':'Roupeta','roupeta2':'Roupeta II','arlize':'Arlize','pit':'Pit Evolution'};
  const [search,setSearch]=React.useState('');
  const [selEmp,setSelEmp]=React.useState(initSel||null);
  const [showModal,setShowModal]=React.useState(false);
  const [editEntry,setEditEntry]=React.useState(null);
  const [form,setForm]=React.useState({startDate:'',endDate:'',notes:''});
  const [formErr,setFormErr]=React.useState('');
  const [cfgForm,setCfgForm]=React.useState({diasDireitoSubsidio:22,estado:'Por Fechar',observacoes:''});
  const [cfgDirty,setCfgDirty]=React.useState(false);
  const [feriaPdfHtml,setFeriaPdfHtml]=React.useState(null);
  const [showFeriasShare,setShowFeriasShare]=React.useState(false);
  const [view,setView]=React.useState('indice'); // 'indice' | 'mapa'
  React.useEffect(()=>{
    if(!showFeriasShare)return;
    const t=setTimeout(()=>document.addEventListener('click',()=>setShowFeriasShare(false),{once:true}),0);
    return()=>clearTimeout(t);
  },[showFeriasShare]);

  const {employees:allEmps=[],inactive:inactiveEmps=[]}=data||{};
  const employees=allEmps.filter(e=>e.status!=='inactive');
  const COMP_ORDER=['Roupeta','Roupeta II','Arlize','Pit Evolution'];

  function countDays(s,e){
    if(!s||!e)return 0;
    const d1=new Date(s),d2=new Date(e);
    if(d2<d1)return 0;
    let count=0;
    const cur=new Date(d1);
    while(cur<=d2){
      const dow=cur.getDay();
      if(dow!==0&&dow!==6)count++;
      cur.setDate(cur.getDate()+1);
    }
    return count;
  }
  function empPeriods(empId,empCo){
    return(ferias||[]).filter(f=>f.empId===empId&&f.empCompany===empCo&&Number(f.year)===year);
  }
  function getConfig(empId,empCo){
    return(feriasConfig||[]).find(c=>c.empId===empId&&c.empCompany===empCo&&Number(c.year)===year)||
      {empId,empCompany:empCo,year,diasDireitoSubsidio:22,estado:'Por Fechar',observacoes:''};
  }
  function usedDays(empId,empCo){
    return empPeriods(empId,empCo).reduce((s,f)=>s+(f.days||0),0);
  }

  const enriched=React.useMemo(()=>employees.map(e=>{
    const cfg=getConfig(e.id,e.company);
    const used=usedDays(e.id,e.company);
    const key=CO_KEY[e.company]||'roupeta';
    return{...e,used,disponivel:DIREITO_DIAS-used,config:cfg,meta:COMP_META[key]||{label:e.company,color:'#555',bg:'#eee'}};
  }),[employees,ferias,feriasConfig,year]);

  React.useEffect(()=>{
    if(selEmp){
      const cfg=getConfig(selEmp.id,selEmp.company);
      setCfgForm({...cfg});
      setCfgDirty(false);
    }
  },[selEmp?.id,selEmp?.company,year]);

  function filterList(list){
    return list.filter(e=>{
      const coName=CO_MAP[company]||'all';
      const coOk=coName==='all'||e.company===coName;
      return coOk && nameMatches(e.name, search);
    });
  }

  async function handleSavePeriod(e){
    e.preventDefault();
    if(!form.startDate||!form.endDate){setFormErr('Indique início e fim.');return;}
    if(new Date(form.endDate)<new Date(form.startDate)){setFormErr('Fim anterior ao início.');return;}
    const days=countDays(form.startDate,form.endDate);
    const entry={...form,days,year:new Date(form.startDate).getFullYear(),
      empId:selEmp.id,empCompany:selEmp.company,empName:selEmp.name,
      id:editEntry?.id||Date.now().toString(),
      createdBy:editEntry?.createdBy||(user?.name||'RH'),
      createdAt:editEntry?.createdAt||new Date().toISOString()};
    const updated=editEntry?(ferias||[]).map(f=>f.id===editEntry.id?entry:f):[...(ferias||[]),entry];
    await onSaveFerias(updated);
    onAudit&&onAudit(`${editEntry?'Editou':'Registou'} férias de ${selEmp.name} (${form.startDate}→${form.endDate})`,'ferias');
    setShowModal(false);setEditEntry(null);
  }
  async function handleDelete(id){
    if(!window.confirm('Eliminar este período?'))return;
    await onSaveFerias((ferias||[]).filter(f=>f.id!==id));
    onAudit&&onAudit(`Eliminou período de férias de ${selEmp.name}`,'ferias');
  }
  async function handleSaveConfig(){
    if(!selEmp)return;
    const empId=selEmp.id,empCo=selEmp.company;
    const updated=(feriasConfig||[]).filter(c=>!(c.empId===empId&&c.empCompany===empCo&&Number(c.year)===year));
    updated.push({...cfgForm,empId,empCompany:empCo,year});
    await onSaveConfig(updated);
    onAudit&&onAudit(`Actualizou configuração de férias de ${selEmp.name||empId}`,'ferias');
    setCfgDirty(false);
  }
  function setCfgField(k,v){setCfgForm(x=>({...x,[k]:v}));setCfgDirty(true);}

  function MapaView(){
    const filtered=filterList(enriched).sort((a,b)=>{
      if(a.company!==b.company) return COMP_ORDER.indexOf(a.company)-COMP_ORDER.indexOf(b.company);
      return (a.name||'').localeCompare(b.name||'');
    });
    const MONTHS=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const yearStart=new Date(year,0,1);
    const yearEnd=new Date(year,11,31);
    const totalMs=yearEnd.getTime()-yearStart.getTime();
    const pct=d=>{
      const t=Math.max(yearStart.getTime(),Math.min(yearEnd.getTime(),d.getTime()));
      return ((t-yearStart.getTime())/totalMs)*100;
    };
    const todayPct=(()=>{
      const t=new Date();
      if(t<yearStart||t>yearEnd) return null;
      return pct(t);
    })();

    if(filtered.length===0){
      return <div className="empty" style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Sem colaboradores para mostrar.</div>;
    }

    // CSS grid garante que cabeçalho e linhas usam exactamente a mesma
    // distribuição de colunas (220px para o nome + 12 fracções iguais
    // para os meses) — sem o desalinhamento que aparecia quando a
    // scrollbar vertical comia largura no flex.
    const gridTpl = '220px repeat(12, minmax(0, 1fr))';
    return (
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{maxHeight:'calc(100vh - 260px)',overflowY:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:gridTpl,background:'var(--bg)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:2}}>
            <div style={{padding:'10px 14px',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--muted)',letterSpacing:.5,borderRight:'1px solid var(--border)'}}>Colaborador</div>
            {MONTHS.map((m,i)=>(
              <div key={i} style={{padding:'10px 4px',fontSize:11,fontWeight:700,textAlign:'center',color:'var(--muted)',borderRight:i<11?'1px solid var(--border)':'none'}}>{m}</div>
            ))}
          </div>
          {filtered.map(emp=>{
            const periods=empPeriods(emp.id,emp.company);
            const used=emp.used;
            const left=DIREITO_DIAS-used;
            return (
              <div key={emp.id+emp.company} style={{display:'grid',gridTemplateColumns:gridTpl,borderBottom:'1px solid var(--border)',minHeight:38,cursor:'pointer',transition:'background .1s'}}
                onClick={()=>setSelEmp({id:emp.id,company:emp.company})}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>
                <div style={{padding:'8px 14px',borderRight:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                  <div style={{width:6,height:24,borderRadius:3,background:COMP_COLORS[emp.company]||'#999',flexShrink:0}}/>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{emp.name}</div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>{used}/{DIREITO_DIAS} usados · {left>=0?left+' por gozar':Math.abs(left)+' a mais'}</div>
                  </div>
                </div>
                <div style={{gridColumn:'2 / span 12',position:'relative',display:'grid',gridTemplateColumns:'repeat(12, 1fr)'}}>
                  {MONTHS.map((m,i)=>(
                    <div key={i} style={{borderRight:i<11?'1px solid var(--border)':'none'}}/>
                  ))}
                  {periods.map(p=>{
                    const sd=new Date(p.startDate),ed=new Date(p.endDate);
                    if(isNaN(sd)||isNaN(ed)||ed<yearStart||sd>yearEnd) return null;
                    const l=pct(sd), r=pct(ed);
                    const w=Math.max(.6, r-l);
                    return (
                      <div key={p.id}
                        title={`${sd.toLocaleDateString('pt-PT')} → ${ed.toLocaleDateString('pt-PT')} · ${p.days||0} dias úteis${p.notes?'\n'+p.notes:''}`}
                        style={{position:'absolute',top:7,bottom:7,left:l+'%',width:w+'%',background:COMP_COLORS[emp.company]||'#16a34a',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700,overflow:'hidden',whiteSpace:'nowrap',padding:'0 4px'}}>
                        {w>4 ? `${p.days||0}d` : ''}
                      </div>
                    );
                  })}
                  {todayPct!==null && (
                    <div style={{position:'absolute',top:0,bottom:0,left:todayPct+'%',width:0,borderLeft:'2px dashed var(--blue)',pointerEvents:'none'}}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function IndiceView(){
    const filtered=filterList(enriched);
    const byComp={};
    COMP_ORDER.forEach(co=>{const l=filtered.filter(e=>e.company===co);if(l.length)byComp[co]=l;});
    const total=filtered.length,pgz=filtered.filter(e=>e.disponivel>0).length,
          neg=filtered.filter(e=>e.disponivel<0).length,
          fec=filtered.filter(e=>e.config.estado==='Fechado').length;
    return(
      <div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8,marginBottom:14}}>
          {[{l:'Colaboradores',v:total,c:'var(--blue)'},{l:'Por gozar',v:pgz,c:'var(--green)'},
            {l:'A compensar',v:neg,c:'var(--red)'},{l:'Fechados',v:fec,c:'var(--muted)'}].map(k=>(
            <div key={k.l} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 10px'}}>
              <div style={{fontSize:18,fontWeight:800,color:k.c,lineHeight:1.1}}>{k.v}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{k.l}</div>
            </div>
          ))}
        </div>
        {Object.keys(byComp).length===0
          ?<div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Sem colaboradores para mostrar.</div>
          :<div className="card" style={{overflow:'hidden',padding:0}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'var(--bg)'}}>
                <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600}}>Colaborador</th>
                <th style={{padding:'8px 12px',textAlign:'center',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,whiteSpace:'nowrap'}}>Gozados</th>
                <th style={{padding:'8px 12px',textAlign:'center',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,whiteSpace:'nowrap'}}>Disponíveis</th>
                <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,whiteSpace:'nowrap'}}>Estado</th>
              </tr></thead>
              <tbody>
                {Object.entries(byComp).map(([co,emps])=>{
                  const meta=COMP_META[CO_KEY[co]]||{color:'#555'};
                  return[
                    <tr key={'grp-'+co}>
                      <td colSpan={4} style={{padding:'6px 12px',background:'var(--bg)',borderTop:'2px solid '+meta.color,borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontWeight:700,fontSize:12,color:meta.color}}>{co}</span>
                        <span style={{fontSize:11,fontWeight:400,color:'var(--muted)',marginLeft:6}}>{emps.length} colaborador(es)</span>
                      </td>
                    </tr>,
                    ...emps.map(emp=>{
                      const dc=emp.disponivel<0?'var(--red)':emp.disponivel===0&&emp.used>0?'var(--orange)':'var(--green)';
                      const ec=emp.config.estado==='Fechado'?{bg:'#d1fae5',c:'#065f46'}:{bg:'#fef3c7',c:'#92400e'};
                      return(
                        <tr key={emp.id+emp.company} style={{borderTop:'1px solid var(--border)',cursor:'pointer'}}
                          onClick={()=>setSelEmp({id:emp.id,company:emp.company})}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                          onMouseLeave={e=>e.currentTarget.style.background=''}>
                          <td style={{padding:'9px 12px'}}>
                            <div style={{fontWeight:600,fontSize:13}}>{emp.name}</div>
                            <div style={{fontSize:11,color:'var(--muted)'}}>{emp.role||'—'}</div>
                          </td>
                          <td style={{padding:'9px 12px',textAlign:'center',fontWeight:700}}>{emp.used}</td>
                          <td style={{padding:'9px 12px',textAlign:'center',fontWeight:700,color:dc}}>{emp.disponivel}</td>
                          <td style={{padding:'9px 12px'}}>
                            <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,background:ec.bg,color:ec.c}}>{emp.config.estado}</span>
                          </td>
                        </tr>
                      );
                    })
                  ];
                })}
              </tbody>
            </table>
          </div>
        }

        {/* atalho para colaboradores inativos no módulo colaboradores */}
        {inactiveEmps.length>0&&onNav&&(
          <div style={{marginTop:24}}>
            <button onClick={()=>onNav('employees',{goToArchive:true})}
              style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'1px dashed var(--border)',
                borderRadius:8,padding:'8px 14px',cursor:'pointer',color:'var(--muted)',fontSize:12,fontWeight:600,width:'100%'}}>
              <span style={{fontSize:14}}>↗</span>
              Ver {inactiveEmps.length} Colaboradores Inativos em Colaboradores →
            </button>
          </div>
        )}
      </div>
    );
  }

  function buildFeriasPdf(){
    const emp=enriched.find(e=>e.id===selEmp?.id&&e.company===selEmp?.company);
    if(!emp)return'';
    const periods=empPeriods(emp.id,emp.company).sort((a,b)=>a.startDate.localeCompare(b.startDate));
    const salary=parseFloat(emp.baseSalary)||0;
    const valorSub=salary?(salary/22*(cfgForm.diasDireitoSubsidio||22)).toFixed(2):null;
    const today=new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
    const accent=COMP_COLORS[emp.company]||'#C0392B';
    const estadoBg=cfgForm.estado==='Fechado'?'#d1fae5':'#fef3c7';
    const estadoColor=cfgForm.estado==='Fechado'?'#065f46':'#92400e';
    const rowsHtml=periods.length===0
      ?'<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">Sem períodos registados</td></tr>'
      :periods.map((f,i)=>`<tr style="${i%2?'background:#f9fafb':''};border-bottom:1px solid #eaeaea">
        <td style="padding:6px 10px">${f.startDate}</td>
        <td style="padding:6px 10px">${f.endDate}</td>
        <td style="padding:6px 10px;text-align:center;font-weight:700">${f.days}</td>
        <td style="padding:6px 10px;color:#6b7280;font-size:10px">${f.notes||'—'}</td>
      </tr>`).join('');
    return`<div style="font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#1f2a37;max-width:860px;margin:0 auto">
      <div style="background:linear-gradient(135deg,${accent},${accent}cc);color:white;padding:18px 24px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:16px;font-weight:800">Ficha de Férias — ${year}</div><div style="font-size:10px;opacity:.7;margin-top:3px">Transportes Roupeta · RH Manager · ${today}</div></div>
        <div style="text-align:right;font-size:10px;opacity:.8">${emp.company}</div>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;padding:20px 24px">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #f0f0f0">
          <div style="width:46px;height:46px;border-radius:50%;background:${accent}22;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:${accent}">${emp.name.charAt(0)}</div>
          <div>
            <div style="font-size:16px;font-weight:800">${emp.name}</div>
            <div style="font-size:12px;color:#6b7280">${emp.role||'—'} · ${emp.company}</div>
          </div>
          <div style="margin-left:auto;background:${estadoBg};color:${estadoColor};padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700">${cfgForm.estado}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
          <div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px">Direito</div><div style="font-size:24px;font-weight:800">${DIREITO_DIAS}</div><div style="font-size:10px;color:#9ca3af">dias/ano</div></div>
          <div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px">Gozados</div><div style="font-size:24px;font-weight:800;color:${accent}">${emp.used}</div><div style="font-size:10px;color:#9ca3af">${periods.length} período(s)</div></div>
          <div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px">Disponíveis</div><div style="font-size:24px;font-weight:800;color:${emp.disponivel<0?'#c0392b':emp.disponivel===0?'#e67e22':'#27ae60'}">${emp.disponivel}</div><div style="font-size:10px;color:#9ca3af">dias restantes</div></div>
          <div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px">Subsídio</div><div style="font-size:20px;font-weight:800;color:#27ae60">${valorSub?valorSub+'€':'—'}</div><div style="font-size:10px;color:#9ca3af">${cfgForm.diasDireitoSubsidio||22} dias</div></div>
        </div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:8px">Períodos de Férias — ${year}</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:${accent};color:white">
            <th style="padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase">Início</th>
            <th style="padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase">Fim</th>
            <th style="padding:7px 10px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase">Dias</th>
            <th style="padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase">Notas</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${cfgForm.observacoes?`<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e0e0e0"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9ca3af">Observações:</span><div style="margin-top:4px;font-size:12px">${cfgForm.observacoes}</div></div>`:''}
        <div style="margin-top:20px;padding-top:12px;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af">
          <span>Transportes Roupeta — RH Manager</span><span>Gerado em ${today}</span>
        </div>
      </div>
    </div>`;
  }

  function EmpDetailView(){
    const emp=enriched.find(e=>e.id===selEmp.id&&e.company===selEmp.company);
    if(!emp)return<div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Colaborador não encontrado.</div>;
    const periods=empPeriods(emp.id,emp.company).sort((a,b)=>a.startDate.localeCompare(b.startDate));
    const salary=parseFloat(emp.baseSalary)||0;
    const valorSub=salary?(salary/22*(cfgForm.diasDireitoSubsidio||22)).toFixed(2):null;
    const dc=emp.disponivel<0?'var(--red)':emp.disponivel===0&&emp.used>0?'var(--orange)':'var(--green)';
    const ec=cfgForm.estado==='Fechado'?{bg:'#d1fae5',c:'#065f46'}:{bg:'#fef3c7',c:'#92400e'};
    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:200}}>
            <button className="btn-ghost" onClick={()=>setSelEmp(null)} title="Voltar à lista" style={{padding:'5px 6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{minWidth:0,flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontWeight:700,fontSize:16}}>{emp.name}</span>
                <span style={{fontSize:12,fontWeight:700,padding:'2px 8px',borderRadius:6,background:'var(--bg)',color:'var(--muted)',border:'1px solid var(--border)',whiteSpace:'nowrap'}}>N.º {emp.id}</span>
              </div>
              <div style={{fontSize:12,color:'var(--muted)'}}>{emp.role||'—'} · {emp.company}</div>
            </div>
          </div>
          <span style={{fontSize:12.5,fontWeight:700,padding:'5px 11px',borderRadius:8,background:ec.bg,color:ec.c,
            cursor:readOnly?'default':'pointer',border:'1px solid '+ec.c+'40',whiteSpace:'nowrap'}}
            onClick={()=>!readOnly&&setCfgField('estado',cfgForm.estado==='Fechado'?'Por Fechar':'Fechado')}>
            {cfgForm.estado}{!readOnly&&<span style={{fontSize:10,marginLeft:6,opacity:.6}}>clicar</span>}
          </span>
          <button onClick={()=>setFeriaPdfHtml(buildFeriasPdf())} title="Exportar PDF de férias"
            style={{display:'flex',alignItems:'center',background:'transparent',border:'none',padding:0,cursor:'pointer',transition:'opacity .15s'}} onMouseOver={e=>e.currentTarget.style.opacity='.75'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>
            <img src="css/assets/PDF_file_icon.svg.png" alt="PDF" style={{height:32,width:'auto',display:'block'}}/>
          </button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:20}}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Gozados</div>
            <div style={{fontSize:28,fontWeight:800}}>{emp.used}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>de {DIREITO_DIAS} dias</div>
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Disponíveis</div>
            <div style={{fontSize:28,fontWeight:800,color:dc}}>{emp.disponivel}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>dias restantes</div>
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Dir. Subsídio</div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--blue)'}}>{cfgForm.diasDireitoSubsidio||22}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>dias</div>
          </div>
          {valorSub!==null&&(
            <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Valor a Receber</div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--green)'}}>{valorSub}€</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>subsídio estimado</div>
            </div>
          )}
          {!valorSub&&<div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Valor a Receber</div>
            <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Salário base não definido</div>
          </div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,alignItems:'start'}}>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontWeight:600,fontSize:14}}>Períodos — {year}</div>
              {!readOnly&&<button className="btn bp btn-sm" onClick={()=>{setEditEntry(null);setForm({startDate:'',endDate:'',notes:''});setFormErr('');setShowModal(true);}}>+ Período</button>}
            </div>
            <div className="card" style={{overflow:'hidden',padding:0}}>
              {periods.length===0
                ?<div style={{padding:24,textAlign:'center',color:'var(--muted)',fontSize:13}}>Sem períodos registados em {year}.</div>
                :periods.map(f=>(
                  <div key={f.id} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{f.startDate} → {f.endDate}</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{f.days} dia(s){f.notes?' · '+f.notes:''}</div>
                    </div>
                    {!readOnly&&<div style={{display:'flex',gap:6}}>
                      <button className="btn btn-sm" onClick={()=>{setEditEntry(f);setForm({startDate:f.startDate,endDate:f.endDate,notes:f.notes||''});setFormErr('');setShowModal(true);}}>Editar</button>
                      <button className="btn btn-sm" style={{color:'var(--red)'}} onClick={()=>handleDelete(f.id)}>Elim.</button>
                    </div>}
                  </div>
                ))
              }
            </div>
          </div>
          <div>
            <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>Configuração</div>
            <div className="card" style={{padding:14}}>
              <div className="fg">
                <label className="fl">Dias Direito a Subsídio</label>
                <input className="fi" type="number" min={0} max={30} value={cfgForm.diasDireitoSubsidio??22}
                  onChange={e=>setCfgField('diasDireitoSubsidio',parseInt(e.target.value)||22)} readOnly={readOnly}/>
              </div>
              <div className="fg" style={{marginTop:10}}>
                <label className="fl">Observações</label>
                <textarea className="fi" rows={3} style={{resize:'vertical'}} value={cfgForm.observacoes||''}
                  onChange={e=>setCfgField('observacoes',e.target.value)} readOnly={readOnly}
                  placeholder="Notas sobre as férias..."/>
              </div>
              {!readOnly&&cfgDirty&&<button className="btn bp" style={{width:'100%',marginTop:12}}
                onClick={handleSaveConfig}>Guardar</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div>
      {!selEmp&&(
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--blbg)',border:'1px solid var(--blue)',borderRadius:8,padding:'4px 14px'}}>
            <span style={{fontWeight:700,fontSize:14,color:'var(--blue)'}}>{year}</span>
          </div>
          <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:8}}>
            <button onClick={()=>setView('indice')}
              style={{padding:'4px 12px',fontSize:12,fontWeight:600,border:'none',borderRadius:6,cursor:'pointer',background:view==='indice'?'#fff':'transparent',color:view==='indice'?'var(--text)':'var(--muted)',boxShadow:view==='indice'?'0 1px 3px rgba(0,0,0,.08)':'none'}}>Tabela</button>
            <button onClick={()=>setView('mapa')}
              style={{padding:'4px 12px',fontSize:12,fontWeight:600,border:'none',borderRadius:6,cursor:'pointer',background:view==='mapa'?'#fff':'transparent',color:view==='mapa'?'var(--text)':'var(--muted)',boxShadow:view==='mapa'?'0 1px 3px rgba(0,0,0,.08)':'none'}}>Mapa</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar colaborador..." className="fi" style={{flex:1,minWidth:140,padding:'5px 10px'}}/>
        </div>
      )}

      {selEmp ? <EmpDetailView/> : (view==='mapa' ? <MapaView/> : <IndiceView/>)}

      {feriaPdfHtml!==null&&(()=>{
        const emp=enriched.find(e=>e.id===selEmp?.id&&e.company===selEmp?.company);
        const accent=emp?COMP_COLORS[emp.company]||'#C0392B':'#C0392B';
        return(
          <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:9999,background:'white',overflowY:'auto'}}>
            <style dangerouslySetInnerHTML={{__html:`@media print{.rh-noprint{display:none!important;}.rh-printbody{padding:0!important;}}`}}/>
            <div className="rh-noprint" style={{position:'sticky',top:0,zIndex:10,background:'white',borderBottom:`3px solid ${accent}`,padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,.12)'}}>
              <span style={{fontWeight:800,fontSize:14,color:'#1a0d0d'}}>Férias {new Date().getFullYear()} — {emp?.name}</span>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <button onClick={()=>window.print()}
                  style={{display:'flex',alignItems:'center',gap:8,background:`linear-gradient(135deg,${accent} 0%,${accent}cc 100%)`,color:'white',border:'none',padding:'9px 22px',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:`0 3px 12px ${accent}55`}}>
                  Transferir PDF
                </button>
                <button onClick={()=>generateAndSharePdf(feriaPdfHtml,'Férias '+(new Date().getFullYear())+' — '+(emp?.name||''),'share').catch(()=>{})}
                  style={{display:'flex',alignItems:'center',gap:7,background:'white',border:'1.5px solid #ddd',padding:'9px 18px',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',color:'#333',transition:'border-color .15s,color .15s'}} onMouseOver={e=>{e.currentTarget.style.borderColor='#1a0d0d';e.currentTarget.style.color='#1a0d0d';}} onMouseOut={e=>{e.currentTarget.style.borderColor='#ddd';e.currentTarget.style.color='#333';}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Partilhar
                </button>
                <button onClick={()=>{setFeriaPdfHtml(null);setShowFeriasShare(false);}}
                  style={{display:'flex',alignItems:'center',gap:6,background:'white',border:'1.5px solid #ddd',padding:'9px 18px',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',color:'#555'}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Fechar
                </button>
              </div>
            </div>
            <div className="rh-printbody" style={{maxWidth:900,margin:'0 auto',padding:'28px'}}>
              <div dangerouslySetInnerHTML={{__html:feriaPdfHtml}}/>
            </div>
          </div>
        );
      })()}

      {showModal&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="modal" style={{width:380}}>
            <div className="mh"><div className="mh-t">{editEntry?'Editar Período':'Novo Período'} — {selEmp?.name}</div></div>
            <form onSubmit={handleSavePeriod}>
              <div className="mb">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div className="fg">
                    <label className="fl">Data início</label>
                    <input className="fi" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required/>
                  </div>
                  <div className="fg">
                    <label className="fl">Data fim</label>
                    <input className="fi" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} required/>
                  </div>
                </div>
                {form.startDate&&form.endDate&&new Date(form.endDate)>=new Date(form.startDate)&&(
                  <div style={{fontSize:12,color:'var(--blue)',marginTop:4}}>{countDays(form.startDate,form.endDate)} dias úteis</div>
                )}
                <div className="fg" style={{marginTop:10}}>
                  <label className="fl">Notas (opcional)</label>
                  <input className="fi" type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="ex: férias de verão"/>
                </div>
                {formErr&&<div style={{color:'var(--red)',fontSize:12,marginTop:4}}>{formErr}</div>}
              </div>
              <div className="mf">
                <button type="button" className="btn" onClick={()=>setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn bp">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
