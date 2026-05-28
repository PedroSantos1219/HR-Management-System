// Dashboard inicial: cartões de estatísticas e alertas por módulo.

function Dashboard({data,company,ferias,feriasConfig,onNav,user,onUpdate}){
  const {employees=[],inactive=[]}=data;
  const emps=filterEmps(employees, company);
  const cy=new Date().getFullYear();
  const isAdmin = user?.role === 'ADMIN';

  // Disponibilidade dos motoristas (empresas fabris não têm este conceito).
  const motoristas = emps.filter(e => (e.role||'').toLowerCase().includes('mot') && !isFabrilCompany(e.company));
  const disponiveis = motoristas.filter(e => (e.availability||'').toLowerCase().startsWith('dispon')).length;
  const meta = parseInt(data.motoristasMetaDisponiveis) || 0;
  const faltam = meta > 0 ? Math.max(0, meta - disponiveis) : 0;
  const metaOk = meta > 0 && disponiveis >= meta;

  async function changeMeta(){
    if(!isAdmin || !onUpdate) return;
    const v = window.prompt(`Quantos motoristas disponíveis quer ter?\n(actual: ${disponiveis})`, String(meta || ''));
    if(v === null) return;
    const n = parseInt(v);
    if(isNaN(n) || n < 0){ alert('Indique um número inteiro válido.'); return; }
    await onUpdate({...data, motoristasMetaDisponiveis: n});
  }

  const alerts=useMemo(()=>{
    const sef=[],med=[],diut=[],cc=[],adr=[],cartas=[],contratos=[],efetivacao=[];
    emps.forEach(emp=>{
      const sd=daysTo(emp.sefExpiry); if(sd!==null&&sd<=60) sef.push({...emp,days:sd});
      const nm=nextMed(emp),md=daysTo(nm); if(md!==null&&md<=60) med.push({...emp,days:md,nextDate:nm});
      const nd=nextDiut(emp),dd=daysTo(nd); if(dd!==null&&dd>=0&&dd<=45) diut.push({...emp,days:dd,nextDate:nd});
      const cd=daysTo(emp.ccExpiry); if(cd!==null&&cd<=60) cc.push({...emp,days:cd});
      const ad=daysTo(emp.adrExpiry); if(ad!==null&&ad<=60) adr.push({...emp,days:ad});
      // Contratos a termo certo perto de acabar (90 dias) — para
      // avisar com a antecedência legal mínima.
      const isTermo = (emp.contractEndDate||'').toLowerCase().includes('termo');
      if(isTermo && emp.endDate){
        const td = daysTo(emp.endDate);
        if(td !== null && td <= 90) contratos.push({...emp, days: td, nextDate: emp.endDate});
      }
      // Aviso de efetivação: alerta a 60 dias do início efetivo (= dia
      // seguinte ao fim do 2.º contrato, ou ao fim do experimental se
      // não houver 2.º). Só para quem ainda não está como Efetivo.
      if((emp.contractEndDate||'').toLowerCase() !== 'efetivo'){
        const base = emp.secondContractEnd || emp.trialEndDate;
        if(base){
          const b = new Date(base);
          if(!isNaN(b)){
            b.setDate(b.getDate()+1);
            const ed = b.toISOString().split('T')[0];
            const td = daysTo(ed);
            if(td !== null && td <= 60) efetivacao.push({...emp, days: td, nextDate: ed});
          }
        }
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
    return {sef,med,diut,cc,adr,cartas,contratos,efetivacao};
  },[emps]);

  const feriasStats=useMemo(()=>{
    const yr=cy;
    const usedDays=(empId,empCo)=>(ferias||[]).filter(f=>f.empId===empId&&f.empCompany===empCo&&Number(f.year)===yr).reduce((s,f)=>s+(f.days||0),0);
    const getCfg=(empId,empCo)=>(feriasConfig||[]).find(c=>c.empId===empId&&c.empCompany===empCo&&Number(c.year)===yr)||{estado:'Por Fechar'};
    const list=emps.map(e=>({...e,used:usedDays(e.id,e.company),cfg:getCfg(e.id,e.company)}));
    const porFechar=list.filter(e=>e.cfg.estado!=='Fechado');
    const semGozar=list.filter(e=>e.used===0);
    const recentes=list.filter(e=>e.used>0).sort((a,b)=>b.used-a.used).slice(0,5);
    return {porFechar,semGozar,recentes,total:list.length};
  },[emps,ferias,feriasConfig,cy]);

  const stats={
    total: emps.length,
    baixa: emps.filter(e=>e.contractStatus?.toLowerCase().includes('baixa')).length,
    seguro: emps.filter(e=>e.contractStatus?.toLowerCase().includes('seguro')).length,
    motoristas: emps.filter(e=>e.role?.toLowerCase().includes('mot')).length,
  };
  const totalAlerts = alerts.sef.length+alerts.med.length+alerts.diut.length+alerts.cc.length+alerts.adr.length+alerts.cartas.length+alerts.contratos.length+alerts.efetivacao.length;
  // Em empresas fabris o equivalente aos motoristas são operários; o
  // "escritório" da fábrica só conta direção/admin/qualidade, técnicos vão para operário.
  const officeFabril = e => /diretor|gerent|chef|admin|financ|contab|escrit|qualid/.test((e.role||'').toLowerCase());
  const byComp = companyNames().map(name => {
    const list = employees.filter(e => e.company === name);
    const fabril = isFabrilCompany(name);
    const office = list.filter(fabril ? officeFabril : isOffice).length;
    const field  = fabril
      ? list.filter(e => !officeFabril(e)).length
      : list.filter(e => /^mot/i.test(e.role||'')).length;
    return { n: name, c: list.length, office, field, fieldLabel: fabril ? 'operários' : 'motoristas' };
  });

  const motoristasAccent = meta>0 ? (metaOk?'stat--accent-green':'stat--accent-red') : 'stat--accent-blue';
  const motoristasNumColor = meta>0 ? (metaOk?'stat-n--green':'stat-n--red') : '';

  function dotClass(days){
    if(days<0)       return 'dot dot--red';
    if(days<=30)     return 'dot dot--orange';
    return 'dot dot--green';
  }

  const showMot = company !== 'pit';
  const gridMod = company==='all' ? 'dash-grid--3' : (showMot ? 'dash-grid--2' : 'dash-grid--1');

  return(
    <div>
      <div className={`dash-grid ${gridMod}`}>

        <div className="dash-sec">
          <div className="dash-sec-label">Visão Geral</div>
          <div className="stats">
            <div className="stat stat--click" onClick={()=>onNav('employees')}>
              <div className="stat-n">{stats.total}</div>
              <div className="stat-l">Colaboradores</div>
              <div className="stat-s">{stats.motoristas} motoristas</div>
            </div>
            {stats.baixa>0 && (
              <div className="stat">
                <div className="stat-n stat-n--orange">{stats.baixa}</div>
                <div className="stat-l">De baixa</div>
              </div>
            )}
            {stats.seguro>0 && (
              <div className="stat">
                <div className="stat-n stat-n--blue">{stats.seguro}</div>
                <div className="stat-l">De seguro</div>
              </div>
            )}
            <div className={`stat ${totalAlerts>0 ? 'stat--alert' : ''}`}>
              <div className="stat-n stat-n--red">{totalAlerts}</div>
              <div className="stat-l">Alertas</div>
              <div className="stat-s">Requerem atenção</div>
            </div>
          </div>
        </div>

        {showMot && (
          <div className="dash-sec">
            <div className="dash-sec-label">
              <span>Motoristas</span>
              {/* Meta é global (toda a organização), por isso só faz sentido
                  comparar Disponíveis vs Meta quando o filtro é "Todas". */}
              {isAdmin && company==='all' && (
                <button className="meta-btn" onClick={changeMeta} title="Definir meta de disponíveis">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="22" x2="4" y2="15"/><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1"/></svg>
                  <span>Meta</span>
                </button>
              )}
            </div>
            <div className={`stat stat--click ${company==='all' ? motoristasAccent : 'stat--accent-blue'}`} onClick={()=>onNav('motoristas')}>
              <div className={`stat-n ${company==='all' ? motoristasNumColor : ''}`}>
                {disponiveis}
                {company==='all' && meta>0 && <span className="stat-n-sub"> / {meta}</span>}
              </div>
              <div className="stat-l">Disponíveis</div>
              <div className="stat-s">
                {company==='all' && meta>0
                  ? (metaOk ? 'meta atingida' : `faltam ${faltam}`)
                  : `de ${motoristas.length} motoristas`}
              </div>
            </div>
          </div>
        )}

        {company==='all' && (
          <div className="dash-sec">
            <div className="dash-sec-label">Por Empresa</div>
            <div className="stats">
              {byComp.map(b => (
                <div key={b.n} className="stat" style={{borderLeft:`3px solid ${COMP_COLORS[b.n]||'#999'}`}}>
                  <div className="stat-n" style={{color:COMP_COLORS[b.n]||'#999'}}>{b.c}</div>
                  <div className="stat-l">{b.n}</div>
                  <div className="comp-mix">
                    <span className="comp-mix__cell"><b>{b.office}</b><em>escritório</em></span>
                    <span className="comp-mix__cell"><b>{b.field}</b><em>{b.fieldLabel}</em></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="ag">
        {[
          {title:'SEF / Declarações Porto',           items:alerts.sef,       color:'var(--orbg)', tc:'var(--orange)', field:'sefExpiry', screen:'sef',           transportOnly:true},
          {title:'Medicina do Trabalho',              items:alerts.med,       color:'var(--blbg)', tc:'var(--blue)',   field:'nextDate',  screen:'medicina'},
          {title:'Diuturnidades — Mês seguinte',      items:alerts.diut,      color:'var(--grbg)', tc:'var(--green)',  field:'nextDate',  screen:'diuturnidades', transportOnly:true},
          {title:'Cartas de Condução (Carta · CAM · Tac.)', items:alerts.cartas, color:'#fef3c7',  tc:'#92400e',       field:'nextDate',  screen:'cartas',        showDocType:true, transportOnly:true},
          {title:'Cartão de Cidadão',                 items:alerts.cc,        color:'var(--red-l)', tc:'var(--red)',  field:'ccExpiry',  screen:'employees'},
          {title:'ADR — Mercadorias Perigosas',       items:alerts.adr,       color:'#f5eef8',    tc:'#7D3C98',       field:'adrExpiry', screen:'cartas',        transportOnly:true},
          {title:'Contratos a Termo — fim próximo',   items:alerts.contratos, color:'#eef2ff',    tc:'#3730a3',       field:'nextDate',  screen:'contratos'},
          {title:'Próximos a Efetivar',               items:alerts.efetivacao,color:'#ccfbf1',    tc:'#0d9488',       field:'nextDate',  screen:'contratos'},
        ]
        .filter(c => !(c.transportOnly && company==='pit'))
        .map(({title,items,color,tc,field,screen,showDocType}) => {
          const MAX=4;
          const sorted=items.slice().sort((a,b)=>a.days-b.days);
          const visible=sorted.slice(0,MAX);
          const hidden=sorted.length-MAX;
          return(
            <div key={title} className="ac ac--click" onClick={()=>onNav(screen)}>
              <div className="ac-h" style={{background:color, color:tc}}>
                <span>{title} ({items.length})</span>
                <span className="ac-hint">clique para gerir →</span>
              </div>
              <div className="ac-list">
                {visible.length===0
                  ? <div className="ac-empty">Sem alertas</div>
                  : visible.map(emp => (
                      <div className="ac-item" key={emp.id+emp.company}
                           onClick={e => { e.stopPropagation(); onNav(screen, {...emp, _highlight:true}); }}>
                        <span className={dotClass(emp.days)}></span>
                        <span className="ac-item-text">{emp.name}</span>
                        {showDocType && emp.docType && (
                          <span className="ac-doc-badge" style={{color:tc, background:color}}>{emp.docType}</span>
                        )}
                        <span className="ac-item-days">{emp.days===0 ? 'Hoje' : emp.days+'d'}</span>
                        <ExpiryChip date={emp[field]}/>
                      </div>
                    ))
                }
                {hidden>0 && (
                  <div className="ac-more" style={{background:color, color:tc}}>
                    + {hidden} mais — ver todos →
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {(()=>{
          const bdays = emps
            .map(e => ({...e, daysLeft: daysToBirthday(e.birthDate)}))
            .filter(e => e.daysLeft!==null && e.daysLeft<=30)
            .sort((a,b) => a.daysLeft-b.daysLeft);
          return(
            <div className="ac ac--click" onClick={()=>onNav('aniversarios')}>
              <div className="ac-h" style={{background:'#fff3e0', color:'#e67e22'}}>
                <span>Aniversários — 30 dias ({bdays.length})</span>
                <span className="ac-hint">ver todos →</span>
              </div>
              <div className="ac-list">
                {bdays.length===0
                  ? <div className="ac-empty">Sem aniversários nos próximos 30 dias</div>
                  : bdays.slice(0,6).map(emp => (
                      <div className="ac-item" key={emp.id+emp.company}>
                        <span className={`dot ${emp.daysLeft===0?'dot--bday-today':emp.daysLeft<=7?'dot--bday-week':'dot--bday-far'}`}></span>
                        <span className="ac-item-text">{emp.name}</span>
                        <span className="ac-item-days">
                          {emp.daysLeft===0 ? 'Hoje!' : emp.daysLeft===1 ? 'Amanhã' : emp.daysLeft+'d'}
                        </span>
                      </div>
                    ))
                }
                {bdays.length>6 && <div className="ac-more">+{bdays.length-6} mais...</div>}
              </div>
            </div>
          );
        })()}

        <div className="ac ac--click" onClick={()=>onNav('ferias')}>
          <div className="ac-h" style={{background:'#f0faf4', color:'var(--green)'}}>
            <span>Férias {cy}</span>
            <span className="ac-hint">clique para gerir →</span>
          </div>
          <div className="ac-list">
            <div className="ferias-split">
              <div className="ferias-cell ferias-cell--divider">
                <div className="big-num big-num--orange">{feriasStats.porFechar.length}</div>
                <div className="tiny-muted">Por Fechar</div>
              </div>
              <div className="ferias-cell">
                <div className="big-num big-num--green">{feriasStats.total - feriasStats.porFechar.length}</div>
                <div className="tiny-muted">Fechados</div>
              </div>
            </div>
            <div className="ferias-extra">
              {feriasStats.semGozar.length>0 && (
                <div className="ferias-warn">
                  <strong>{feriasStats.semGozar.length}</strong> ainda sem dias gozados
                </div>
              )}
              {feriasStats.recentes.slice(0,3).map(e => (
                <div key={e.id+e.company} className="ferias-row">
                  <span className="ferias-row-name">{e.name}</span>
                  <span className="ferias-row-days">{e.used}d</span>
                </div>
              ))}
              {feriasStats.recentes.length===0 && (
                <div className="ferias-empty">Sem dias registados em {cy}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {data.lastSaved && (
        <div className="last-update">
          Última actualização: {new Date(data.lastSaved).toLocaleString('pt-PT')}
        </div>
      )}
    </div>
  );
}
