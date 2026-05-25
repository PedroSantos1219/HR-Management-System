// Motoristas: lista filtrada por disponibilidade (Disponível / Indisponível).
// Indisponível agrupa Seguro + Baixa + Licença + Férias actuais, com o motivo
// à frente para se ver porque é que a pessoa não está na rua.

function MotoristasScreen({data, company, onNav, ferias, initContext}){
  const {employees=[]} = data;
  const [filter, setFilter] = useState('all');
  const cm = {'roupeta':'Roupeta','roupeta2':'Roupeta II','arlize':'Arlize','pit':'Pit Evolution'};
  const emps = (company==='all' ? employees : employees.filter(e=>e.company===cm[company]))
    .filter(e => (e.role||'').toLowerCase().includes('mot') && e.company !== 'Pit Evolution');

  // Disponibilidade efectiva: férias actuais sobrepõem-se ao campo availability,
  // por isso usamos o helper do 00-helpers.js em vez de ler emp.availability directo.
  const decorated = emps.map(e => ({...e, _eff: effectiveAvailability(e, ferias)}));
  const isDisp = e => (e._eff||'').toLowerCase().startsWith('dispon');

  const disponiveis   = decorated.filter(isDisp);
  const indisponiveis = decorated.filter(e => e._eff && !isDisp(e));
  const semDado       = decorated.filter(e => !e._eff);

  // O que mostrar em cada secção, conforme o filtro escolhido.
  const showDisp  = (filter==='all' || filter==='disponiveis') && disponiveis.length>0;
  const showIndisp = (filter==='all' || filter==='indisponiveis' || ['baixa','seguro','ferias'].includes(filter));
  const showSemDado = filter==='all' && semDado.length>0;

  const indispShown = indisponiveis.filter(e => {
    if(filter==='baixa')  return e._eff === 'Baixa';
    if(filter==='seguro') return e._eff === 'Seguro';
    if(filter==='ferias') return e._eff === 'Férias';
    return true;
  });

  function goTo(emp){
    onNav('employees', {id: emp.id, company: emp.company, _highlight: true});
  }

  function Row({emp, badge, badgeColor}){
    return (
      <tr onClick={()=>goTo(emp)}>
        <td className="col-muted">{emp.id}</td>
        <td className="col-name">{emp.name}</td>
        <td><Chip label={emp.company} type="gr"/></td>
        <td className="col-muted">{emp.role}</td>
        <td>{badge ? <Chip label={badge} type={badgeColor}/> : <span className="col-muted">—</span>}</td>
      </tr>
    );
  }

  const cols = (
    <colgroup>
      <col className="col-id"/>
      <col className="col-nome"/>
      <col className="col-emp"/>
      <col className="col-func"/>
      <col className="col-mot"/>
    </colgroup>
  );
  const tableHead = (
    <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Função</th><th>Motivo</th></tr></thead>
  );

  const FILTERS = [
    ['all',           'Todos'],
    ['disponiveis',   'Disponíveis'],
    ['indisponiveis', 'Indisponíveis'],
    ['baixa',         'Baixa'],
    ['seguro',        'Seguro'],
    ['ferias',        'Férias'],
  ];

  return (
    <div>

      {initContext?._fromEmployees && (
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <button className="btn-soft" onClick={()=>onNav('employees')} title="Voltar à lista de Colaboradores">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Voltar a Colaboradores</span>
          </button>
        </div>
      )}

      <div className="mot-toolbar">
        <div className="emp-filter-bar mot-toolbar__filters">
          {FILTERS.map(([k,lbl]) => (
            <button key={k} className={`emp-filter-btn ${filter===k?'is-active':''}`} onClick={()=>setFilter(k)}>{lbl}</button>
          ))}
        </div>
        <div className="mot-summary mot-summary--compact">
          <div className="mot-stat mot-stat--green">
            <div className="mot-stat__value mot-stat__value--green">{disponiveis.length}</div>
            <div className="mot-stat__label">Disponíveis</div>
          </div>
          <div className="mot-stat mot-stat--orange">
            <div className="mot-stat__value mot-stat__value--orange">{indisponiveis.length}</div>
            <div className="mot-stat__label">Indisponíveis</div>
          </div>
          {semDado.length>0 && (
            <div className="mot-stat mot-stat--muted">
              <div className="mot-stat__value mot-stat__value--muted">{semDado.length}</div>
              <div className="mot-stat__label">Sem dado</div>
            </div>
          )}
          <div className="mot-stat mot-stat--blue">
            <div className="mot-stat__value">{emps.length}</div>
            <div className="mot-stat__label">Total</div>
          </div>
        </div>
      </div>

      {showDisp && (
        <div className="mot-section">
          <div className="mot-section__head mot-section__head--green">
            <span>Disponíveis ({disponiveis.length})</span>
          </div>
          <table className="mot-table">
            {cols}
            {tableHead}
            <tbody>
              {disponiveis.map(e => <Row key={e.id+e.company} emp={e}/>)}
            </tbody>
          </table>
        </div>
      )}

      {showIndisp && (
        <div className="mot-section">
          <div className="mot-section__head mot-section__head--orange">
            <span>Indisponíveis ({indispShown.length})</span>
          </div>
          <table className="mot-table">
            {cols}
            {tableHead}
            <tbody>
              {indispShown.length===0
                ? <tr><td colSpan={5} className="mot-empty">Sem motoristas indisponíveis nesta categoria.</td></tr>
                : indispShown.map(e => {
                    const motivo = e._eff;
                    const c = motivo==='Baixa' ? 'orange'
                            : motivo==='Seguro' ? 'blue'
                            : motivo==='Férias' ? 'green'
                            : 'gr';
                    return <Row key={e.id+e.company} emp={e} badge={motivo} badgeColor={c}/>;
                  })
              }
            </tbody>
          </table>
        </div>
      )}

      {showSemDado && (
        <div className="mot-section">
          <div className="mot-section__head mot-section__head--muted">
            Sem disponibilidade definida ({semDado.length})
          </div>
          <table className="mot-table">
            {cols}
            {tableHead}
            <tbody>{semDado.map(e => <Row key={e.id+e.company} emp={e}/>)}</tbody>
          </table>
        </div>
      )}

    </div>
  );
}
