// Dashboard inicial: cartões de estatísticas e alertas por módulo.

function Dashboard({data,company,ferias,feriasConfig,onNav}){
  const {employees=[],inactive=[]}=data;
  const cm={'roupeta':'Roupeta','roupeta2':'Roupeta II','arlize':'Arlize','pit':'Pit Evolution'};
  const emps=filterEmps(employees, company);
  const cy=new Date().getFullYear();
  const alerts=useMemo(()=>{
    const sef=[],med=[],diut=[],cc=[],adr=[],cartas=[],contratos=[];
    emps.forEach(emp=>{
      const sd=daysTo(emp.sefExpiry); if(sd!==null&&sd<=60) sef.push({...emp,days:sd});
      const nm=nextMed(emp),md=daysTo(nm); if(md!==null&&md<=60) med.push({...emp,days:md,nextDate:nm});
      const nd=nextDiut(emp),dd=daysTo(nd); if(dd!==null&&dd>=0&&dd<=45) diut.push({...emp,days:dd,nextDate:nd});
      const cd=daysTo(emp.ccExpiry); if(cd!==null&&cd<=60) cc.push({...emp,days:cd});
      const ad=daysTo(emp.adrExpiry); if(ad!==null&&ad<=60) adr.push({...emp,days:ad});
      // Contratos a termo certo perto de acabar (90 dias). Indica que a Tatiana
      // precisa de avisar com pelo menos a antecedência legal mínima.
      const isTermo = (emp.contractEndDate||'').toLowerCase().includes('termo');
      if(isTermo && emp.endDate){
        const td = daysTo(emp.endDate);
        if(td !== null && td <= 90) contratos.push({...emp, days: td, nextDate: emp.endDate});
      }
      if(isDriver(emp)){
        const checks=[
          {field:'driverLicenseExpiry', label:'Carta', d:daysTo(emp.driverLicenseExpiry)},
          {field:'camExpiry',           label:'CAM',   d:daysTo(emp.camExpiry)},
          {field:'tachographCardExpiry',label:'Tac.',  d:daysTo(emp.tachographCardExpiry)},
        ].filter(c=>c.d!==null);
        if(checks.length){
          const m=checks.reduce((a,b)=>a.d<b.d?a:b);
          if(m.d<=90) cartas.push({...emp,days:m.d,docType:m.label,nextDate:emp[m.field]});
        }
      }
    });
    return {sef,med,diut,cc,adr,cartas,contratos};
  },[emps]);
  const feriasStats=useMemo(()=>{
    const yr=cy;
    function usedDays(empId,empCo){return(ferias||[]).filter(f=>f.empId===empId&&f.empCompany===empCo&&Number(f.year)===yr).reduce((s,f)=>s+(f.days||0),0);}
    function getCfg(empId,empCo){return(feriasConfig||[]).find(c=>c.empId===empId&&c.empCompany===empCo&&Number(c.year)===yr)||{estado:'Por Fechar'};}
    const list=emps.map(e=>({...e,used:usedDays(e.id,e.company),cfg:getCfg(e.id,e.company)}));
    const porFechar=list.filter(e=>e.cfg.estado!=='Fechado');
    const semGozar=list.filter(e=>e.used===0);
    const recentes=list.filter(e=>e.used>0).sort((a,b)=>b.used-a.used).slice(0,5);
    return {porFechar,semGozar,recentes,total:list.length};
  },[emps,ferias,feriasConfig,cy]);
  const stats={total:emps.length,ativo:emps.filter(e=>e.contractStatus==='Ativo').length,baixa:emps.filter(e=>e.contractStatus?.toLowerCase().includes('baixa')).length,seguro:emps.filter(e=>e.contractStatus?.toLowerCase().includes('seguro')).length,motoristas:emps.filter(e=>e.role?.toLowerCase().includes('mot')).length};
  const totalAlerts=alerts.sef.length+alerts.med.length+alerts.diut.length+alerts.cc.length+alerts.adr.length+alerts.cartas.length+alerts.contratos.length;
  const byComp=Object.entries({'Roupeta':0,'Roupeta II':0,'Arlize':0,'Pit Evolution':0}).map(([n,_])=>({n,c:employees.filter(e=>e.company===n).length}));
  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:company==='all'?'1fr 1fr':'1fr',gap:16,marginBottom:24,alignItems:'start'}}>
        <div>
          <div style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:'var(--muted)',marginBottom:'10px',paddingBottom:'6px',borderBottom:'1px solid var(--border)'}}>Visão Geral</div>
          <div className="stats" style={{marginBottom:0}}>
            <div className="stat" style={{cursor:'pointer'}} onClick={()=>onNav('employees')}><div className="stat-n">{stats.total}</div><div className="stat-l">Colaboradores</div><div className="stat-s">{stats.motoristas} motoristas</div></div>
            {stats.baixa>0&&<div className="stat"><div className="stat-n" style={{color:'var(--orange)'}}>{stats.baixa}</div><div className="stat-l">De baixa</div></div>}
            {stats.seguro>0&&<div className="stat"><div className="stat-n" style={{color:'var(--blue)'}}>{stats.seguro}</div><div className="stat-l">De seguro</div></div>}
            <div className="stat" style={{borderColor:totalAlerts>0?'var(--red)':''}}><div className="stat-n" style={{color:'var(--red)'}}>{totalAlerts}</div><div className="stat-l">Alertas</div><div className="stat-s">Requerem atenção</div></div>
          </div>
        </div>
        {company==='all'&&<div>
          <div style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:'var(--muted)',marginBottom:'10px',paddingBottom:'6px',borderBottom:'1px solid var(--border)'}}>Por Empresa</div>
          <div className="stats" style={{marginBottom:0}}>
            {byComp.map(b=><div key={b.n} className="stat" style={{borderLeft:`3px solid ${COMP_COLORS[b.n]||'#999'}`}}><div className="stat-n" style={{color:COMP_COLORS[b.n]||'#999'}}>{b.c}</div><div className="stat-l">{b.n}</div></div>)}
          </div>
        </div>}
      </div>
      <div className="ag">
        {[
          {title:'SEF / Declarações Porto',items:alerts.sef,color:'var(--orbg)',tc:'var(--orange)',field:'sefExpiry',screen:'sef',transportOnly:true},
          {title:'Medicina do Trabalho',items:alerts.med,color:'var(--blbg)',tc:'var(--blue)',field:'nextDate',screen:'medicina'},
          {title:'Diuturnidades — Mês seguinte',items:alerts.diut,color:'var(--grbg)',tc:'var(--green)',field:'nextDate',screen:'diuturnidades',transportOnly:true},
          {title:'Cartas de Condução (Carta · CAM · Tac.)',items:alerts.cartas,color:'#fef3c7',tc:'#92400e',field:'nextDate',screen:'cartas',showDocType:true,transportOnly:true},
          {title:'Cartão de Cidadão',items:alerts.cc,color:'var(--red-l)',tc:'var(--red)',field:'ccExpiry',screen:'employees'},
          {title:'ADR — Mercadorias Perigosas',items:alerts.adr,color:'#f5eef8',tc:'#7D3C98',field:'adrExpiry',screen:'cartas',transportOnly:true},
          {title:'Contratos a Termo — fim próximo',items:alerts.contratos,color:'#eef2ff',tc:'#3730a3',field:'nextDate',screen:'contratos'},
        ].filter(c=>!(c.transportOnly && company==='pit'))
         .map(({title,items,color,tc,field,screen,showDocType})=>{
          const MAX=4;
          const sorted=items.slice().sort((a,b)=>a.days-b.days);
          const visible=sorted.slice(0,MAX);
          const hidden=sorted.length-MAX;
          return(
          <div key={title} className="ac" style={{cursor:'pointer'}} onClick={()=>onNav(screen)}>
            <div className="ac-h" style={{background:color,color:tc,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{title} ({items.length})</span>
              <span style={{fontSize:10,fontWeight:400,opacity:.7}}>clique para gerir →</span>
            </div>
            <div className="ac-list">
              {visible.length===0?<div style={{padding:'12px',color:'var(--muted)',fontSize:12,textAlign:'center'}}>Sem alertas</div>:
              visible.map(emp=>(
                <div className="ac-item" key={emp.id+emp.company} onClick={e=>{e.stopPropagation();onNav(screen,{...emp,_highlight:true});}}>
                  <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:emp.days<0?'var(--red)':emp.days<=30?'var(--orange)':'var(--green)',flexShrink:0}}></span>
                  <span style={{flex:1,fontWeight:500}}>{emp.name}</span>
                  {showDocType&&emp.docType&&<span style={{fontSize:10,fontWeight:700,color:tc,background:color,padding:'1px 6px',borderRadius:8}}>{emp.docType}</span>}
                  <span style={{color:'var(--muted)',fontSize:11}}>{emp.days===0?'Hoje':emp.days+'d'}</span>
                  <ExpiryChip date={emp[field]}/>
                </div>
              ))}
              {hidden>0&&(
                <div style={{padding:'6px 14px',fontSize:11,color:tc,fontWeight:600,textAlign:'center',background:color,borderTop:'1px solid var(--border)'}}>
                  + {hidden} mais — ver todos →
                </div>
              )}
            </div>
          </div>
          );
        })}
        {/* Painel Aniversários */}
        {(()=>{const bdays=emps.map(e=>({...e,daysLeft:daysToBirthday(e.birthDate)})).filter(e=>e.daysLeft!==null&&e.daysLeft<=30).sort((a,b)=>a.daysLeft-b.daysLeft);return(
          <div className="ac" style={{cursor:'pointer'}} onClick={()=>onNav('aniversarios')}>
            <div className="ac-h" style={{background:'#fff3e0',color:'#e67e22',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Aniversários — 30 dias ({bdays.length})</span>
              <span style={{fontSize:10,fontWeight:400,opacity:.7}}>ver todos →</span>
            </div>
            <div className="ac-list">
              {bdays.length===0
                ?<div style={{padding:'12px',color:'var(--muted)',fontSize:12,textAlign:'center'}}>Sem aniversários nos próximos 30 dias</div>
                :bdays.slice(0,6).map(emp=>(
                  <div className="ac-item" key={emp.id+emp.company}>
                    <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:emp.daysLeft===0?'#E74C3C':emp.daysLeft<=7?'#E67E22':'#27AE60',flexShrink:0}}></span>
                    <span style={{flex:1,fontWeight:500}}>{emp.name}</span>
                    <span style={{color:'var(--muted)',fontSize:11,whiteSpace:'nowrap'}}>{emp.daysLeft===0?'Hoje!':emp.daysLeft===1?'Amanhã':emp.daysLeft+'d'}</span>
                  </div>
                ))
              }
              {bdays.length>6&&<div style={{padding:'4px 14px',fontSize:11,color:'var(--muted)',textAlign:'right'}}>+{bdays.length-6} mais...</div>}
            </div>
          </div>
        );})()}
        {/* Painel Férias */}
        <div className="ac" style={{cursor:'pointer'}} onClick={()=>onNav('ferias')}>
          <div className="ac-h" style={{background:'#f0faf4',color:'var(--green)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>Férias {cy}</span>
            <span style={{fontSize:10,fontWeight:400,opacity:.7}}>clique para gerir →</span>
          </div>
          <div className="ac-list">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
              <div style={{padding:'10px 14px',borderRight:'1px solid var(--border)'}}>
                <div style={{fontSize:22,fontWeight:800,color:'var(--orange)'}}>{feriasStats.porFechar.length}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Por Fechar</div>
              </div>
              <div style={{padding:'10px 14px'}}>
                <div style={{fontSize:22,fontWeight:800,color:'var(--green)'}}>{feriasStats.total-feriasStats.porFechar.length}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Fechados</div>
              </div>
            </div>
            <div style={{borderTop:'1px solid var(--border)',padding:'6px 0'}}>
              {feriasStats.semGozar.length>0&&<div style={{padding:'4px 14px',fontSize:12,color:'var(--muted)'}}>
                <span style={{fontWeight:600,color:'var(--orange)'}}>{feriasStats.semGozar.length}</span> ainda sem dias gozados
              </div>}
              {feriasStats.recentes.slice(0,3).map(e=>(
                <div key={e.id+e.company} style={{padding:'4px 14px',display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{e.name}</span>
                  <span style={{color:'var(--green)',fontWeight:700,marginLeft:8}}>{e.used}d</span>
                </div>
              ))}
              {feriasStats.recentes.length===0&&<div style={{padding:'8px 14px',color:'var(--muted)',fontSize:12,textAlign:'center'}}>Sem dias registados em {cy}</div>}
            </div>
          </div>
        </div>
      </div>
      {data.lastSaved&&<div style={{fontSize:11,color:'var(--muted)',textAlign:'right',marginTop:4}}>Última actualização: {new Date(data.lastSaved).toLocaleString('pt-PT')}</div>}
    </div>
  );
}
