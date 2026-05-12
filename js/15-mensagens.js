// Mensagens: campanhas personalizadas para colaboradores (email + WhatsApp).
// Fluxo em 4 passos:
//   1) Tipo (template pré-definido ou mensagem livre)
//   2) Destinatários (seleccionar quem recebe)
//   3) Mensagem (editar texto com placeholders, ver preview)
//   4) Enviar (WhatsApp via wa.me, email via SMTP)

const MSG_TEMPLATES = [
  {
    id: 'validacoes',
    label: 'Validações de Documentos',
    icon: '📄',
    accent: '#dc2626',
    description: 'Lembrete a quem tem documentos a expirar (CC, Carta, CAM, Tac., ADR, SEF).',
    subject: 'Lembrete: documento a expirar',
    body: 'Olá {{primeironome}},\n\nO teu Cartão de Cidadão expira a {{validadeCC}}.\nA tua Carta de Condução expira a {{validadeCarta}}.\nO teu CAM/CQC expira a {{validadeCAM}}.\n\nPor favor trata da renovação antes do prazo.\n\nCumprimentos,\n{{remetente}}\n{{empresa}}',
    suggest: emp => {
      const fields = ['ccExpiry','driverLicenseExpiry','camExpiry','tachographCardExpiry','adrExpiry','sefExpiry'];
      return fields.some(f => { const d = daysTo(emp[f]); return d !== null && d <= 60; });
    },
  },
  {
    id: 'medicina',
    label: 'Medicina do Trabalho',
    icon: '🩺',
    accent: '#2563eb',
    description: 'Convocatória para consulta médica.',
    subject: 'Convocatória — Medicina do Trabalho',
    body: 'Olá {{primeironome}},\n\nFoi marcada uma consulta de Medicina do Trabalho. Por favor confirma a tua disponibilidade.\n\nÚltima consulta: {{ultimaConsulta}}\nPróxima prevista: {{proximaConsulta}}\n\nCumprimentos,\n{{remetente}}\n{{empresa}}',
    suggest: emp => { const d = daysTo(nextMed(emp)); return d !== null && d <= 60; },
  },
  {
    id: 'evento',
    label: 'Convite para Evento',
    icon: '🎉',
    accent: '#0d9488',
    description: 'Convite genérico para um evento da empresa.',
    subject: 'Convite — Evento {{empresa}}',
    body: 'Olá {{primeironome}},\n\nGostaríamos de te convidar para um evento da {{empresa}}:\n\n📅 Data: [PREENCHER]\n🕒 Hora: [PREENCHER]\n📍 Local: [PREENCHER]\n\nPor favor confirma a tua presença até [DATA LIMITE].\n\nCumprimentos,\n{{remetente}}',
  },
  {
    id: 'livre',
    label: 'Mensagem Livre',
    icon: '✎',
    accent: '#6b7280',
    description: 'Escrever do zero, sem template pré-definido.',
    subject: '',
    body: '',
  },
];

const MSG_PLACEHOLDERS = [
  ['{{nome}}',           'Nome completo'],
  ['{{primeironome}}',   'Primeiro nome'],
  ['{{empresa}}',        'Empresa'],
  ['{{funcao}}',         'Função'],
  ['{{remetente}}',      'O teu nome (quem envia)'],
  ['{{data}}',           'Data de hoje'],
  ['{{admissao}}',       'Data de admissão'],
  ['{{salario}}',        'Ordenado base actual'],
  ['{{validadeCC}}',     'Validade do CC'],
  ['{{validadeCarta}}',  'Validade da carta de condução'],
  ['{{validadeCAM}}',    'Validade do CAM'],
  ['{{validadeTac}}',    'Validade do cartão de tacógrafo'],
  ['{{validadeADR}}',    'Validade do ADR'],
  ['{{validadeSEF}}',    'Validade SEF'],
  ['{{ultimaConsulta}}', 'Última consulta médica'],
  ['{{proximaConsulta}}','Próxima consulta médica'],
  ['{{telefone}}',       'Telefone pessoal'],
  ['{{email}}',          'Email'],
];

function _fmt(d){ return d ? fmtDate(d) : ''; }
function renderTemplate(text, emp, user){
  if(!text || !emp) return text || '';
  const map = {
    nome:           emp.name || '',
    primeironome:   (emp.name || '').split(' ')[0],
    empresa:        emp.company || '',
    funcao:         emp.role || '',
    remetente:      user?.name || user?.username || 'RH',
    data:           new Date().toLocaleDateString('pt-PT'),
    admissao:       _fmt(emp.admissionDate),
    salario:        emp.baseSalary ? parseFloat(emp.baseSalary).toFixed(2)+'€' : '',
    validadeCC:     _fmt(emp.ccExpiry),
    validadeCarta:  _fmt(emp.driverLicenseExpiry),
    validadeCAM:    _fmt(emp.camExpiry),
    validadeTac:    _fmt(emp.tachographCardExpiry),
    validadeADR:    _fmt(emp.adrExpiry),
    validadeSEF:    _fmt(emp.sefExpiry),
    ultimaConsulta: _fmt(emp.lastMedicalConsult),
    proximaConsulta:_fmt(nextMed(emp)),
    telefone:       emp.personalPhone || emp.companyPhone || '',
    email:          emp.email || '',
  };
  return text.replace(/\{\{(\w+)\}\}/g, (m, k) => map[k] !== undefined ? map[k] : m);
}

// Limpa um número PT para o formato +351XXXXXXXXX usado pelo wa.me.
function waPhone(raw){
  if(!raw) return null;
  let s = String(raw).replace(/[^\d+]/g, '');
  if(s.startsWith('+')) s = s.slice(1);
  if(s.startsWith('00')) s = s.slice(2);
  if(s.length === 9 && /^[239]/.test(s)) s = '351' + s; // PT mobile/landline
  if(s.length < 10) return null;
  return s;
}

function MensagensScreen({data, company, user, onAudit}){
  const allEmps = data?.employees || [];
  const emps = filterEmps(allEmps, company);
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState(null);
  const [selected, setSelected] = useState(()=>new Set());
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [canal, setCanal] = useState('whatsapp'); // 'whatsapp' | 'email' | 'both'
  const [sendStatus, setSendStatus] = useState(null);

  const filtered = useMemo(()=>{
    if(!search.trim()) return emps;
    return emps.filter(e => nameMatches(e.name, search) || String(e.id).includes(search.trim()));
  }, [emps, search]);

  const selectedEmps = useMemo(()=> emps.filter(e=>selected.has(e.id+'|'+e.company)), [emps, selected]);

  function pickTipo(t){
    setTipo(t);
    setSubject(t.subject || '');
    setBody(t.body || '');
    if(t.suggest){
      const sug = new Set(emps.filter(t.suggest).map(e=>e.id+'|'+e.company));
      setSelected(sug);
    } else {
      setSelected(new Set());
    }
    setStep(2);
  }

  function toggle(emp){
    const k = emp.id+'|'+emp.company;
    setSelected(prev => { const n = new Set(prev); if(n.has(k)) n.delete(k); else n.add(k); return n; });
  }
  function allOrNone(){
    if(selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(e=>e.id+'|'+e.company)));
  }
  function insertPh(ph){
    setBody(b => b + ph);
  }

  const previewEmp = selectedEmps[previewIdx] || selectedEmps[0] || null;
  const previewSubject = previewEmp ? renderTemplate(subject, previewEmp, user) : subject;
  const previewBody    = previewEmp ? renderTemplate(body,    previewEmp, user) : body;

  async function doSend(){
    setSendStatus({status:'sending'});
    const rows = selectedEmps.map(emp => ({
      emp,
      subject: renderTemplate(subject, emp, user),
      body:    renderTemplate(body, emp, user),
    }));
    let waOpened = 0, emailQueued = 0, errors = [];

    if(canal === 'whatsapp' || canal === 'both'){
      for(const r of rows){
        const ph = waPhone(r.emp.personalPhone || r.emp.companyPhone);
        if(!ph){ errors.push(`${r.emp.name}: sem número de telefone válido`); continue; }
        const url = `https://wa.me/${ph}?text=${encodeURIComponent(r.body)}`;
        window.open(url, '_blank');
        waOpened++;
      }
    }

    if(canal === 'email' || canal === 'both'){
      const recipients = rows
        .filter(r => r.emp.email)
        .map(r => ({ to: r.emp.email, name: r.emp.name, subject: r.subject, body: r.body }));
      const missing = rows.filter(r => !r.emp.email).map(r => r.emp.name);
      missing.forEach(n => errors.push(`${n}: sem email registado`));
      if(recipients.length > 0){
        try {
          const res = await apiCall('send_messages', { recipients });
          emailQueued = res?.sent || recipients.length;
          if(res?.failed) res.failed.forEach(f => errors.push(`${f.to}: ${f.error}`));
        } catch(e){
          errors.push('SMTP: ' + (e.message || 'falha ao enviar'));
        }
      }
    }

    if(onAudit){
      onAudit(`Enviou mensagens (${tipo?.label||'livre'}) a ${selectedEmps.length} colaboradores por ${canal}`, 'mensagens');
    }
    setSendStatus({status:'done', waOpened, emailQueued, errors});
  }

  function reset(){
    setStep(1); setTipo(null); setSelected(new Set()); setSearch('');
    setSubject(''); setBody(''); setPreviewIdx(0); setCanal('whatsapp'); setSendStatus(null);
  }

  const steps = [
    {n:1, l:'Tipo'},
    {n:2, l:'Destinatários'},
    {n:3, l:'Mensagem'},
    {n:4, l:'Enviar'},
  ];

  // ===== Render =====
  return (
    <div>
      {/* Stepper */}
      <div className="msg-stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className={`msg-step ${step===s.n?'is-active':''} ${s.n<step?'is-done':''}`}
              onClick={()=>{ if(s.n<step) setStep(s.n); }}>
              <span className="msg-step__num">
                {s.n<step ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : s.n}
              </span>
              {s.l}
            </div>
            {i<steps.length-1 && <div className={`msg-step__bar ${s.n<step?'is-done':''}`}/>}
          </React.Fragment>
        ))}
        {step>1 && (
          <button className="btn-ghost" onClick={reset} style={{marginLeft:'auto'}} title="Recomeçar do início">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            <span>Recomeçar</span>
          </button>
        )}
      </div>

      {/* STEP 1 — Tipo */}
      {step===1 && (
        <div>
          <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Escolhe o tipo de comunicação. O template é só um ponto de partida — podes editar tudo a seguir.</div>
          <div className="msg-tpl-grid">
            {MSG_TEMPLATES.map(t => (
              <div key={t.id} className="msg-tpl" style={{'--accent': t.accent}} onClick={()=>pickTipo(t)}>
                <div className="msg-tpl__icon">{t.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="msg-tpl__title">{t.label}</div>
                  <div className="msg-tpl__desc">{t.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — Destinatários */}
      {step===2 && (
        <div>
          <div className="msg-step-head">
            <div className="msg-step-head__title">{tipo?.label}</div>
            <span className="msg-step-head__count">{selected.size} de {filtered.length}</span>
            <input className="fi" placeholder="Pesquisar nome ou n.º..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{maxWidth:280,padding:'5px 10px',fontSize:12}}/>
            <button className="btn-soft" onClick={allOrNone}>
              {selected.size===filtered.length ? 'Nenhum' : 'Todos'}
            </button>
            <div className="msg-step-head__spacer"/>
            <button className="btn-soft" disabled={selected.size===0} onClick={()=>setStep(3)}
              style={{background: selected.size>0 ? 'var(--blue)' : '', color: selected.size>0 ? '#fff' : '', borderColor: selected.size>0 ? 'var(--blue)' : ''}}>
              <span>Continuar</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div className="msg-recip-list">
            {filtered.length===0 ? (
              <div className="empty" style={{padding:24,textAlign:'center',color:'var(--muted)'}}>Sem colaboradores correspondentes.</div>
            ) : filtered.map(emp => {
              const k = emp.id+'|'+emp.company;
              const on = selected.has(k);
              return (
                <div key={k} className={`msg-recip ${on?'is-on':''}`} onClick={()=>toggle(emp)}>
                  <input type="checkbox" checked={on} readOnly className="msg-recip__check"/>
                  <div className="msg-recip__bar" style={{background: COMP_COLORS[emp.company]||'#999'}}/>
                  <div className="msg-recip__info">
                    <div className="msg-recip__name">{emp.name}</div>
                    <div className="msg-recip__meta">{emp.company} · #{emp.id} · {emp.role||'—'}</div>
                  </div>
                  <div className="msg-recip__icons">
                    {emp.email && <span title={emp.email}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </span>}
                    {(emp.personalPhone || emp.companyPhone) && <span title={emp.personalPhone||emp.companyPhone}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3 — Mensagem */}
      {step===3 && (
        <div className="msg-edit-grid">
          <div>
            <div className="msg-step-head" style={{marginBottom:10}}>
              <div className="msg-step-head__title">Editar mensagem</div>
            </div>
            <div className="field" style={{marginBottom:10}}>
              <div className="fl">Assunto (email)</div>
              <input className="fi" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="ex: Lembrete de validade do CC"/>
            </div>
            <div className="field" style={{marginBottom:10}}>
              <div className="fl">Corpo da mensagem</div>
              <textarea className="fi" value={body} onChange={e=>setBody(e.target.value)} rows={14}
                style={{fontFamily:'inherit',resize:'vertical'}}/>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,fontWeight:600}}>Placeholders (clica para inserir):</div>
            <div className="msg-ph-tray">
              {MSG_PLACEHOLDERS.map(([ph,desc]) => (
                <button key={ph} className="msg-ph" onClick={()=>insertPh(ph)} title={desc}>{ph}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:6}}>
              <button className="btn-soft" onClick={()=>setStep(2)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span>Destinatários</span>
              </button>
              <button className="btn-soft" style={{marginLeft:'auto', background: body.trim()?'var(--blue)':'', color: body.trim()?'#fff':'', borderColor: body.trim()?'var(--blue)':''}}
                disabled={!body.trim()} onClick={()=>setStep(4)}>
                <span>Continuar</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
          <div>
            <div className="msg-step-head" style={{marginBottom:10}}>
              <div className="msg-step-head__title">Pré-visualização</div>
              {selectedEmps.length>1 && (
                <select className="fi" style={{padding:'3px 8px',fontSize:11,width:'auto'}}
                  value={previewIdx} onChange={e=>setPreviewIdx(parseInt(e.target.value))}>
                  {selectedEmps.map((e,i) => <option key={e.id+e.company} value={i}>{e.name}</option>)}
                </select>
              )}
              {selectedEmps.length>0 && <span className="msg-step-head__count">{selectedEmps.length} destinatários</span>}
            </div>
            <div className="msg-preview">
              {previewEmp ? (
                <>
                  <div className="msg-preview__to">Para: <strong>{previewEmp.name}</strong> &lt;{previewEmp.email||'(sem email)'}&gt;</div>
                  <div className="msg-preview__to">Telefone: {previewEmp.personalPhone || previewEmp.companyPhone || '(sem telefone)'}</div>
                  {subject && <div className="msg-preview__subj">{previewSubject}</div>}
                  <div className="msg-preview__body">{previewBody}</div>
                </>
              ) : (
                <div className="empty" style={{textAlign:'center',color:'var(--muted)',padding:24}}>Sem destinatários — volta atrás e escolhe pelo menos um.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — Enviar */}
      {step===4 && (
        <div>
          <div className="msg-step-head" style={{marginBottom:18}}>
            <div className="msg-step-head__title">Enviar para {selectedEmps.length} colaboradores</div>
          </div>

          <div className="msg-channels">
            {[
              {k:'whatsapp', l:'WhatsApp', desc:'Abre o WhatsApp Web para cada destinatário com a mensagem já preenchida.'},
              {k:'email',    l:'Email',    desc:'Envia por SMTP da empresa para quem tiver email registado.'},
              {k:'both',     l:'Ambos',    desc:'WhatsApp e Email em simultâneo para os destinatários elegíveis.'},
            ].map(o => (
              <label key={o.k} className={`msg-channel ${canal===o.k?'is-on':''}`}>
                <div className="msg-channel__head">
                  <input type="radio" name="canal" checked={canal===o.k} onChange={()=>setCanal(o.k)} className="msg-channel__radio"/>
                  <span className="msg-channel__title">{o.l}</span>
                </div>
                <div className="msg-channel__desc">{o.desc}</div>
              </label>
            ))}
          </div>

          {canal!=='email' && (
            <div className="msg-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <strong>WhatsApp Web:</strong> vão abrir {selectedEmps.length} separadores, um por destinatário com a mensagem preenchida. Tens que carregar em <em>Enviar</em> em cada um. <strong>Permite pop-ups</strong> deste site antes de continuar.
              </div>
            </div>
          )}

          <div className="card" style={{padding:14,marginBottom:14,maxHeight:280,overflowY:'auto'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Destinatários ({selectedEmps.length})</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {selectedEmps.map(e => {
                const wa = waPhone(e.personalPhone || e.companyPhone);
                const okWa = canal!=='email' ? !!wa : true;
                const okEmail = canal!=='whatsapp' ? !!e.email : true;
                const ok = okWa && okEmail;
                return (
                  <span key={e.id+e.company} className={`msg-chip ${ok?'is-ok':'is-warn'}`}
                    title={ok ? 'Pronto a enviar' : (`Faltam dados: ${!okWa?'telefone ':''}${!okEmail?'email':''}`).trim()}>
                    {e.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{display:'flex',gap:8}}>
            <button className="btn-soft" onClick={()=>setStep(3)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Mensagem</span>
            </button>
            <button style={{marginLeft:'auto',display:'inline-flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:8,fontSize:13,fontWeight:700,border:'none',background:'var(--blue)',color:'#fff',cursor:'pointer'}}
              disabled={sendStatus?.status==='sending'}
              onClick={doSend}>
              {sendStatus?.status==='sending' ? 'A enviar...' : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  <span>{
                    canal==='email' ? `Enviar emails (${selectedEmps.length})` :
                    canal==='whatsapp' ? `Abrir WhatsApp (${selectedEmps.length})` :
                    `Enviar tudo (${selectedEmps.length})`
                  }</span>
                </>
              )}
            </button>
          </div>

          {sendStatus?.status==='done' && (
            <div className="msg-result">
              <div className="msg-result__title">✓ Concluído</div>
              {sendStatus.waOpened>0 && <div>WhatsApp: {sendStatus.waOpened} separador{sendStatus.waOpened===1?'':'es'} aberto{sendStatus.waOpened===1?'':'s'}.</div>}
              {sendStatus.emailQueued>0 && <div>Email: {sendStatus.emailQueued} mensagem{sendStatus.emailQueued===1?'':'s'} enviada{sendStatus.emailQueued===1?'':'s'}.</div>}
              {sendStatus.errors?.length>0 && (
                <div className="msg-result__errors">
                  <strong>{sendStatus.errors.length} aviso(s) / erro(s):</strong>
                  <ul>{sendStatus.errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
