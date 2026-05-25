// Motoristas: lista filtrada por disponibilidade (Disponível / Indisponível).
// Indisponível agrupa Seguro + Baixa + Licença com o motivo à frente.

function MotoristasScreen({data, company, onNav}){
  const {employees=[]} = data;
  const cm = {'roupeta':'Roupeta','roupeta2':'Roupeta II','arlize':'Arlize','pit':'Pit Evolution'};
  const emps = (company==='all' ? employees : employees.filter(e=>e.company===cm[company]))
    .filter(e => (e.role||'').toLowerCase().includes('mot') && e.company !== 'Pit Evolution');

  const isDisp = e => (e.availability||'').toLowerCase().startsWith('dispon');
  const disponiveis   = emps.filter(e => isDisp(e));
  const indisponiveis = emps.filter(e => e.availability && !isDisp(e));
  const semDado       = emps.filter(e => !e.availability);

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
        {badge && <td><Chip label={badge} type={badgeColor}/></td>}
      </tr>
    );
  }

  return (
    <div>

      <div className="mot-summary">
        <div className="mot-stat mot-stat--green">
          <div className="mot-stat__label">Disponíveis</div>
          <div className="mot-stat__value mot-stat__value--green">{disponiveis.length}</div>
        </div>
        <div className="mot-stat mot-stat--orange">
          <div className="mot-stat__label">Indisponíveis</div>
          <div className="mot-stat__value mot-stat__value--orange">{indisponiveis.length}</div>
        </div>
        {semDado.length>0 && (
          <div className="mot-stat mot-stat--muted">
            <div className="mot-stat__label">Sem dado</div>
            <div className="mot-stat__value mot-stat__value--muted">{semDado.length}</div>
          </div>
        )}
        <div className="mot-stat mot-stat--blue">
          <div className="mot-stat__label">Total</div>
          <div className="mot-stat__value">{emps.length}</div>
        </div>
      </div>

      {/* Indisponíveis primeiro — é o que se quer ver imediatamente */}
      {indisponiveis.length>0 && (
        <div className="mot-section">
          <div className="mot-section__head mot-section__head--orange">
            <span>Indisponíveis ({indisponiveis.length})</span>
            <span className="mot-section__hint">com motivo à direita</span>
          </div>
          <table className="mot-table">
            <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Função</th><th>Motivo</th></tr></thead>
            <tbody>
              {indisponiveis.map(e => {
                const motivo = e.availability;
                const c = motivo==='Baixa' ? 'orange' : motivo==='Seguro' ? 'blue' : 'gr';
                return <Row key={e.id+e.company} emp={e} badge={motivo} badgeColor={c}/>;
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mot-section">
        <div className="mot-section__head mot-section__head--green">
          <span>Disponíveis ({disponiveis.length})</span>
        </div>
        <table className="mot-table">
          <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Função</th></tr></thead>
          <tbody>
            {disponiveis.length===0
              ? <tr><td colSpan={4} className="mot-empty">Sem motoristas disponíveis.</td></tr>
              : disponiveis.map(e => <Row key={e.id+e.company} emp={e}/>)
            }
          </tbody>
        </table>
      </div>

      {/* Sem dado: motoristas que ainda não foram marcados */}
      {semDado.length>0 && (
        <div className="mot-section">
          <div className="mot-section__head mot-section__head--muted">
            Sem disponibilidade definida ({semDado.length})
          </div>
          <table className="mot-table">
            <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Função</th></tr></thead>
            <tbody>{semDado.map(e => <Row key={e.id+e.company} emp={e}/>)}</tbody>
          </table>
        </div>
      )}

    </div>
  );
}
