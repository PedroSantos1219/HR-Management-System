// Motoristas: lista filtrada por disponibilidade (Disponível / Indisponível).
// Indisponível agrupa Seguro + Baixa + Licença com o motivo à frente.

function MotoristasScreen({data, company, onNav}){
  const {employees=[]} = data;
  const cm = {'roupeta':'Roupeta','roupeta2':'Roupeta II','arlize':'Arlize','pit':'Pit Evolution'};
  const emps = (company==='all' ? employees : employees.filter(e=>e.company===cm[company]))
    .filter(e => (e.role||'').toLowerCase().includes('mot') && e.company !== 'Pit Evolution');

  const disponiveis  = emps.filter(e => (e.availability||'').toLowerCase() === 'disponível' || (e.availability||'').toLowerCase() === 'disponivel');
  const indisponiveis = emps.filter(e => {
    const a = (e.availability||'').toLowerCase();
    return a && a !== 'disponível' && a !== 'disponivel';
  });
  const semDado = emps.filter(e => !e.availability);

  function Row({emp, badge, badgeColor}){
    return (
      <tr style={{cursor:'pointer'}}
        onClick={()=>onNav('employees',{id:emp.id, company:emp.company, _highlight:true})}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
        onMouseLeave={e=>e.currentTarget.style.background=''}>
        <td style={{color:'var(--muted)',fontWeight:500}}>{emp.id}</td>
        <td style={{fontWeight:600}}>{emp.name}</td>
        <td><Chip label={emp.company} type="gr"/></td>
        <td style={{color:'var(--muted)'}}>{emp.role}</td>
        {badge && <td><Chip label={badge} type={badgeColor}/></td>}
      </tr>
    );
  }

  return (
    <div>
      {/* Resumo */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:18}}>
        <div className="card" style={{padding:14,borderLeft:'4px solid var(--green)'}}>
          <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Disponíveis</div>
          <div style={{fontSize:28,fontWeight:800,color:'var(--green)'}}>{disponiveis.length}</div>
        </div>
        <div className="card" style={{padding:14,borderLeft:'4px solid var(--orange)'}}>
          <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Indisponíveis</div>
          <div style={{fontSize:28,fontWeight:800,color:'var(--orange)'}}>{indisponiveis.length}</div>
        </div>
        {semDado.length>0 && (
          <div className="card" style={{padding:14,borderLeft:'4px solid var(--muted)'}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Sem disponibilidade</div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--muted)'}}>{semDado.length}</div>
          </div>
        )}
        <div className="card" style={{padding:14}}>
          <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Total de motoristas</div>
          <div style={{fontSize:28,fontWeight:800}}>{emps.length}</div>
        </div>
      </div>

      {/* Indisponíveis primeiro — é o que se quer ver imediatamente */}
      {indisponiveis.length>0 && (
        <div className="card" style={{padding:0,overflow:'hidden',marginBottom:18}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,background:'var(--orbg)'}}>
            <div style={{fontWeight:700,fontSize:13,color:'var(--orange)'}}>Indisponíveis ({indisponiveis.length})</div>
            <span style={{fontSize:11,color:'var(--muted)'}}>com motivo à direita</span>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Função</th><th>Motivo</th></tr></thead>
              <tbody>
                {indisponiveis.map(e=>{
                  const motivo = e.availability;
                  const c = motivo==='Baixa'?'orange':motivo==='Seguro'?'blue':'gr';
                  return <Row key={e.id+e.company} emp={e} badge={motivo} badgeColor={c}/>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disponíveis */}
      <div className="card" style={{padding:0,overflow:'hidden',marginBottom:18}}>
        <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,background:'var(--grbg)'}}>
          <div style={{fontWeight:700,fontSize:13,color:'var(--green)'}}>Disponíveis ({disponiveis.length})</div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Função</th></tr></thead>
            <tbody>
              {disponiveis.length===0 ? (
                <tr><td colSpan={4} style={{padding:24,textAlign:'center',color:'var(--muted)'}}>Sem motoristas disponíveis.</td></tr>
              ) : disponiveis.map(e=><Row key={e.id+e.company} emp={e}/>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sem dado (escritório com role motorista por engano, ou nunca preenchido) */}
      {semDado.length>0 && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
            <div style={{fontWeight:700,fontSize:13,color:'var(--muted)'}}>Sem disponibilidade definida ({semDado.length})</div>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>N.º</th><th>Colaborador</th><th>Empresa</th><th>Função</th></tr></thead>
              <tbody>{semDado.map(e=><Row key={e.id+e.company} emp={e}/>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
