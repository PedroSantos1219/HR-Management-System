// Colaboradores: lista, ficha completa (multi-tab) e formulário de criação/edição.
// EmpFormCtx é o context partilhado pelos inputs do formulário (SI, FV, etc).

const EmpFormCtx=React.createContext(null);
function SI({k,label,type='text',opts=null,span=false,ph=''}){
  const {form,set,readOnly}=React.useContext(EmpFormCtx);
  const val=form[k]||'';
  const style=span?{gridColumn:'1/-1'}:{};
  return(
    <div className="field" style={style}>
      <div className="fl">{label}</div>
      {opts?<select className="fi" value={val} onChange={e=>set(k,e.target.value)} disabled={readOnly}>
        {opts.map(o=><option key={o}>{o}</option>)}
      </select>:
      <input type={type} className="fi" value={val} onChange={e=>set(k,e.target.value)} readOnly={readOnly} placeholder={ph}/>}
    </div>
  );
}
function EmpModal({emp,onSave,onClose,readOnly}){
  const isNew=!emp.id||emp.id==='new';
  const [f,setF]=useState(()=>{
    const init={id:'',app:'SIM',company:(APP_COMPANIES[0]?.name||''),name:'',role:'Mot. Veic. Pesados',contractStatus:'Ativo',admissionDate:'',contractEndDate:'Efetivo',trialEndDate:'',secondContractEnd:'',birthplace:'',nationality:'Portuguesa',birthDate:'',personalPhone:'',email:'',companyPhone:'',ccNumber:'',ccExpiry:'',nif:'',niss:'',address:'',education:'',maritalStatus:'',incomeHolder:'1',dependents:'0',driverLicense:'',driverLicenseExpiry:'',camExpiry:'',tachographCardExpiry:'',adrExpiry:'',iban:'',baseSalary:'',diuturnidasCount:'0',lastMedicalConsult:'',sefExpiry:'',sefSentWhatsapp:false,medicalNotes:'',status:'active',...emp};
    // Para colaboradores antigos só com admissão preenchida, sugere o
    // fim do período experimental (admissão + 90 dias).
    if(init.admissionDate && !init.trialEndDate){
      const d=new Date(init.admissionDate);
      if(!isNaN(d)){ d.setDate(d.getDate()+90); init.trialEndDate=d.toISOString().split('T')[0]; }
    }
    return init;
  });
  const set=(k,v)=>{
    setF(p=>{
      const np={...p,[k]:v};
      // Auto-preencher fim do período experimental (90 dias) quando se mete
      // a data de admissão pela primeira vez. Continua editável.
      if(k==='admissionDate' && v && !p.trialEndDate){
        const d=new Date(v);
        if(!isNaN(d)){
          d.setDate(d.getDate()+90);
          np.trialEndDate=d.toISOString().split('T')[0];
        }
      }
      return np;
    });
  };
  return(
    <EmpFormCtx.Provider value={{form:f,set,readOnly}}>
    <div className="ov" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <div className="mh"><div className="mh-t">{isNew?'Novo Colaborador':readOnly?emp.name:'Editar — '+emp.name}</div><button className="btn bg" onClick={onClose}>✕</button></div>
        <div className="mb">
          <div className="sec-t">Identificação e Contrato</div>
          <div className="fg">
            <SI k="id" label="N.º Funcionário" ph="ex: 1234"/>
            <SI k="company" label="Empresa" opts={companyNames()}/>
            <SI k="name" label="Nome Completo" span ph="Nome próprio e apelidos"/>
            <SI k="role" label="Função" ph="ex: Mot. Veic. Pesados"/>
            <SI k="contractStatus" label="Estado" opts={['Ativo','De baixa','De seguro','Férias','Suspenso','Inativo']}/>
            <SI k="availability" label="Disponibilidade" opts={['','Disponível','Seguro','Baixa','Licença']}/>
            <SI k="admissionDate" label="Data Admissão" type="date"/>
            <SI k="contractEndDate" label="Tipo Contrato" opts={['Efetivo','Termo Certo','Indeterminado']}/>
            <SI k="trialEndDate" label="Fim Período Experimental" type="date"/>
            <SI k="secondContractEnd" label="Fim 2.º Contrato" type="date"/>
            <SI k="app" label="Acesso à App" opts={['SIM','NÃO']}/>
          </div>
          <hr className="divider"/>
          <div className="sec-t">Dados Pessoais</div>
          <div className="fg">
            <SI k="birthDate" label="Data Nascimento" type="date"/>
            <SI k="birthplace" label="Naturalidade" ph="ex: Lisboa"/>
            <SI k="nationality" label="Nacionalidade" ph="ex: Portuguesa"/>
            <SI k="maritalStatus" label="Estado Civil" opts={['','Solteiro','Casado','Divorciado','Viúvo','União de Facto']}/>
            <SI k="education" label="Habilitações" ph="ex: 12.º Ano"/>
            <SI k="dependents" label="Dependentes" ph="ex: 0"/>
            <SI k="incomeHolder" label="Titular IRS" ph="1 (único) ou 2 (dois titulares)"/>
            <SI k="address" label="Morada" span ph="Rua ..., n.º ..., C.P. ..., Localidade"/>
          </div>
          <hr className="divider"/>
          <div className="sec-t">Contactos e Dados Fiscais</div>
          <div className="fg">
            <SI k="personalPhone" label="Telefone Pessoal" ph="ex: 912 345 678"/>
            <SI k="email" label="E-mail" ph="ex: nome@empresa.com"/>
            <SI k="companyPhone" label="Telefone Empresa" ph="ex: 913 000 000"/>
            <SI k="iban" label="IBAN" ph="PT50 0000 0000 0000 0000 0000 0"/>
            <SI k="nif" label="NIF" ph="ex: 123456789"/>
            <SI k="niss" label="NISS" ph="ex: 12345678901"/>
            <SI k="ccNumber" label="N.º CC / BI" ph="ex: 12345678 0 ZY4"/>
            <SI k="ccExpiry" label="Validade CC" type="date"/>
          </div>
          <hr className="divider"/>
          <div className="sec-t">Documentos Profissionais</div>
          <div className="fg">
            <SI k="driverLicense" label="Carta de Condução" ph="ex: SA-12345 0"/>
            <SI k="driverLicenseExpiry" label="Validade Carta" type="date"/>
            <SI k="camExpiry" label="Validade CAM/CQC" type="date"/>
            <SI k="tachographCardExpiry" label="Cartão Condutor Tac." type="date"/>
            <SI k="adrExpiry" label="Validade ADR" type="date"/>
          </div>
          <hr className="divider"/>
          <div className="sec-t">Medicina, SEF e Remuneração</div>
          <div className="fg">
            <SI k="lastMedicalConsult" label="Última Consulta Méd." type="date"/>
            <SI k="medicalNotes" label="Notas Medicina" ph="Apto, restrições, observações..."/>
            <SI k="sefExpiry" label="Validade SEF/Porto" type="date"/>
            <SI k="sefSentWhatsapp" label="Notificação SEF enviada" opts={['Não','Sim']}/>
            <SI k="baseSalary" label="Ordenado Base (€)" ph="ex: 958.00"/>
            <SI k="diuturnidasCount" label="N.º Diuturnidades" ph="ex: 0"/>
          </div>
          {f.status==='inactive'&&<>
          <hr className="divider"/>
          <div className="sec-t" style={{color:'var(--red)'}}>Dados de Saída</div>
          <div className="fg">
            <SI k="endDate" label="Data de Saída" type="date"/>
            <SI k="exitInitiative" label="Iniciativa" opts={['Empresa','Colaborador','Acordo Mútuo','Reforma','Falecimento','Outros']}/>
            <SI k="exitReason" label="Motivo de Saída" span ph="Motivo detalhado..."/>
            <SI k="exitNotes" label="Observações" span ph="Notas internas..."/>
          </div>
          </>
          }
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Fechar</button>
          {!readOnly&&<button className="btn bp" onClick={()=>onSave(f)}>Guardar</button>}
        </div>
      </div>
    </div>
    </EmpFormCtx.Provider>
  );
}

const NOTE_TAGS = [
  {k:'telefonema',  l:'Telefonema',  c:'#2563eb'},
  {k:'reuniao',     l:'Reunião',     c:'#0d9488'},
  {k:'advertencia', l:'Advertência', c:'#dc2626'},
  {k:'elogio',      l:'Elogio',      c:'#16a34a'},
  {k:'observacao',  l:'Observação',  c:'#6b7280'},
  {k:'outro',       l:'Outro',       c:'#6b7280'},
];

function NotasTab({emp,notes,readOnly,user,onSaveNote,onDelNote,onAudit}){
  const myNotes=useMemo(()=>
    (notes||[]).filter(n=>n.empId===emp.id&&n.empCompany===emp.company)
      .sort((a,b)=>(b.ts||'').localeCompare(a.ts||'')),
  [notes,emp]);
  const [text,setText]=useState('');
  const [tag,setTag]=useState('observacao');

  function add(){
    const t=text.trim();
    if(!t) return;
    const n={id:Date.now().toString(),empId:emp.id,empCompany:emp.company,ts:new Date().toISOString(),by:user?.name||user?.username||'RH',tag,text:t};
    onSaveNote(n);
    onAudit&&onAudit(`Nota adicionada a ${emp.name} (${NOTE_TAGS.find(x=>x.k===tag)?.l||tag})`, 'nota');
    setText('');
  }
  function remove(n){
    if(!confirm('Apagar esta nota?')) return;
    onDelNote(n.id);
    onAudit&&onAudit(`Nota removida de ${emp.name}`, 'nota');
  }

  return (
    <div>
      {!readOnly && (
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center',flexWrap:'wrap'}}>
            <select className="fi" style={{padding:'4px 8px',fontSize:12,width:'auto'}} value={tag} onChange={e=>setTag(e.target.value)}>
              {NOTE_TAGS.map(t=><option key={t.k} value={t.k}>{t.l}</option>)}
            </select>
            <span style={{fontSize:11,color:'var(--muted)'}}>por {user?.name||user?.username||'RH'} · {new Date().toLocaleDateString('pt-PT')}</span>
          </div>
          <textarea
            className="fi"
            value={text}
            onChange={e=>setText(e.target.value)}
            placeholder="Escreve a nota… (ex: ligou a faltar amanhã, motivo médico)"
            rows={3}
            style={{width:'100%',padding:8,fontSize:13,resize:'vertical',minHeight:60,boxSizing:'border-box'}}
            onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) add();}}
          />
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8,alignItems:'center'}}>
            <span style={{fontSize:11,color:'var(--muted)'}}>Ctrl+Enter para guardar</span>
            <button className="btn bp btn-sm" onClick={add} disabled={!text.trim()}>Adicionar nota</button>
          </div>
        </div>
      )}
      {myNotes.length===0 ? (
        <div className="empty" style={{padding:24,textAlign:'center',color:'var(--muted)'}}>Sem notas para este colaborador.</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {myNotes.map(n=>{
            const t=NOTE_TAGS.find(x=>x.k===n.tag)||NOTE_TAGS[NOTE_TAGS.length-1];
            const d=new Date(n.ts);
            const dateStr=isNaN(d)?'':d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
            return (
              <div key={n.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderLeft:`3px solid ${t.c}`,borderRadius:8,padding:'10px 12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,color:t.c}}>{t.l}</span>
                  <span style={{fontSize:11,color:'var(--muted)'}}>{dateStr} · {n.by}</span>
                  {!readOnly && (
                    <button onClick={()=>remove(n)} title="Apagar" style={{marginLeft:'auto',background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 4px'}}>✕</button>
                  )}
                </div>
                <div style={{fontSize:13,whiteSpace:'pre-wrap',color:'var(--text)'}}>{n.text}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AusenciasTab({emp,absences,readOnly,user,onSaveAbsence,onDelAbsence,onAudit}){
  const myAbs=useMemo(()=>
    (absences||[]).filter(a=>a.empId===emp.id&&a.empCompany===emp.company)
      .sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||'')),
  [absences,emp]);

  const [showModal,setShowModal]=useState(false);
  const [form,setForm]=useState({type:'Baixa Médica',startDate:'',endDate:'',reason:'',notes:'',indefinite:false});

  function calcDays(s,e){
    if(!s||!e) return null;
    const d=Math.round((new Date(e)-new Date(s))/86400000)+1;
    return d>0?d:null;
  }

  const totalDays=myAbs.reduce((s,a)=>s+(calcDays(a.startDate,a.endDate)||0),0);

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div className="sec-t" style={{marginBottom:2}}>Histórico de Ausências</div>
          {myAbs.length>0&&<div style={{fontSize:11,color:'var(--muted)'}}>{myAbs.length} registo(s) · {totalDays} dias no total</div>}
        </div>
        {!readOnly&&<button className="btn bp btn-sm" onClick={()=>{setForm({type:'Baixa Médica',startDate:'',endDate:'',reason:'',notes:'',indefinite:false});setShowModal(true);}}>+ Registar</button>}
      </div>
      {myAbs.length===0?<div className="empty">Sem ausências registadas</div>:
      myAbs.map(ab=>{
        const days=calcDays(ab.startDate,ab.endDate);
        const indef=ab.indefinite;
        const ongoing=!ab.endDate;
        return(
          <div key={ab.id} className="eval-item">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:700,color:ongoing?'var(--orange)':'var(--text)',fontSize:13}}>{ab.type}{indef?' — por tempo indeterminado':ongoing?' — em curso':''}</span>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {days&&<span style={{fontSize:11,background:'var(--grbg)',color:'var(--green)',borderRadius:4,padding:'2px 7px',fontWeight:600}}>{days}d</span>}
                {!readOnly&&<button className="btn bg btn-sm" style={{color:'var(--red)'}} onClick={()=>{
                  onDelAbsence(ab.id);
                  onAudit&&onAudit(`Eliminou registo de ausência de ${emp.name}: ${ab.type} (${ab.startDate})`,'colaborador');
                }}>Elim.</button>}
              </div>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',margin:'3px 0'}}>
              {fmtDate(ab.startDate)}{ab.endDate?` → ${fmtDate(ab.endDate)}`:indef?' → por tempo indeterminado':' → (em curso)'}
              {' · Por: '}{ab.by||'RH'}
            </div>
            {ab.reason&&<div style={{fontSize:12}}>{ab.reason}</div>}
            {ab.notes&&<div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{ab.notes}</div>}
          </div>
        );
      })}
      {showModal&&(
        <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="mh">
              <div className="mh-t">Registar Ausência — {emp.name}</div>
              <button className="btn bg" onClick={()=>setShowModal(false)}>✕</button>
            </div>

            <div className="mb">
              <div className="fg">
                <div className="field"><div className="fl">Tipo</div>
                  <select className="fi" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    {['Baixa Médica','Acidente de Trabalho','Baixa sem Vencimento','Licença de Maternidade/Paternidade','Ausência Injustificada','Outro'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="field">
                  <div className="fl">Data Início</div>
                  <input type="date" className="fi" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>
                </div>

                <div className="field">
                  <div className="fl">Data Fim</div>
                  <input type="date" className="fi" value={form.indefinite?'':form.endDate} disabled={form.indefinite} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
                  <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--muted)',cursor:'pointer',marginTop:5}}>
                    <input type="checkbox" checked={form.indefinite} onChange={e=>setForm(f=>({...f,indefinite:e.target.checked,endDate:e.target.checked?'':f.endDate}))}/>
                    Por tempo indeterminado
                  </label>
                </div>

                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Motivo</div>
                  <input className="fi" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Motivo da ausência..."/>
                </div>

                <div className="field" style={{gridColumn:'1/-1'}}>
                  <div className="fl">Notas</div>
                  <textarea className="fi" rows={2} style={{resize:'vertical'}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
                </div>
              </div>
            </div>

            <div className="mf">
              <button className="btn bs" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn bp" onClick={()=>{
                if(!form.startDate){alert('A data de início é obrigatória.');return;}
                onSaveAbsence({
                  ...form,
                  id:Date.now().toString(),
                  empId:emp.id, empCompany:emp.company, empName:emp.name,
                  days:calcDays(form.startDate,form.endDate),
                  by:user?.name||'RH',
                  createdAt:new Date().toISOString()
                });
                onAudit&&onAudit(`Registou ausência de ${emp.name}: ${form.type} (${form.startDate})`,'colaborador');
                setShowModal(false);
              }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmpDetail({emp,onEdit,onDeactivate,onReturn,onClose,readOnly,isInactive,user,evals,onSaveEval,onDelEval,absences,onSaveAbsence,onDelAbsence,notes,onSaveNote,onDelNote,onAudit,ferias,onRenameId}){
  const [tab,setTab]=useState('info');
  const [showEvalModal,setShowEvalModal]=useState(false);
  const [ef,setEf]=useState({type:'',date:new Date().toISOString().split('T')[0],notes:'',nextAction:'',nextDate:''});
  const [empPdfHtml,setEmpPdfHtml]=React.useState(null);
  const [showShare,setShowShare]=React.useState(false);
  const [copied,setCopied]=React.useState(false);
  const [idEdit,setIdEdit]=useState(false);
  const [idVal,setIdVal]=useState('');
  const [idErr,setIdErr]=useState(null);
  const [idSaving,setIdSaving]=useState(false);
  useEffect(()=>{ setIdEdit(false); setIdErr(null); },[emp.id, emp.company]);
  async function commitId(value){
    if(idSaving) return;
    const v=String(value??idVal).trim();
    if(!v){ setIdErr({msg:'O n.º não pode ficar vazio'}); return; }
    if(v===emp.id){ setIdEdit(false); setIdErr(null); return; }
    setIdSaving(true);
    const r=await onRenameId(v);
    setIdSaving(false);
    if(r.ok){ setIdEdit(false); setIdErr(null); }
    else setIdErr({msg:r.error, suggestion:r.suggestion});
  }
  const myEvals=evals.filter(e=>e.empId===emp.id&&e.empCompany===emp.company).sort((a,b)=>b.date.localeCompare(a.date));
  const nm=nextMed(emp);
  const nd=nextDiut(emp);

  useEffect(()=>{
    if(!showShare) return;
    const close=(e)=>{ setShowShare(false); };
    // setTimeout para que o click que abre o popover não o feche logo de seguida.
    const t = setTimeout(()=>document.addEventListener('click',close,{once:true}),0);
    return()=>{ clearTimeout(t); document.removeEventListener('click',close); };
  },[showShare]);

  const _empCMETA = Object.fromEntries(APP_COMPANIES.map(c => [c.name, {name:c.name, color:c.color||'#1a0d0d', logo:''}]));
  const _ecm = _empCMETA[emp.company] || {name:emp.company||'', color:'#1a0d0d', logo:''};
  const _eAccent = _ecm.color;

  function empPdfCSS(){
    return `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#2c2c2c;background:#fff;}.ph{display:flex;align-items:center;gap:16px;border-bottom:3px solid ${_eAccent};padding-bottom:12px;margin-bottom:16px;}.ph img{height:38px;}.phi h1{font-size:15px;font-weight:800;color:#1a0d0d;margin-bottom:2px;}.phi p{font-size:10px;color:#888;}.st{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1a0d0d;border-left:3px solid ${_eAccent};padding-left:8px;margin:14px 0 6px;}.tbl{width:100%;border-collapse:collapse;margin-bottom:4px;}.tbl td{padding:4px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:11px;}.tbl td.lbl{font-weight:700;color:#888;font-size:10px;width:145px;white-space:nowrap;}.badge{border-radius:8px;padding:1px 7px;font-size:9.5px;font-weight:700;display:inline-block;}.bv{background:#fdecea;color:#c0392b;}.bc{background:#fff3e0;color:#e67e22;}.ba{background:#fffde7;color:#b7950b;}.bo{background:#eafaf1;color:#1d8348;}.ft{font-size:9px;color:#bbb;text-align:center;margin-top:20px;border-top:1px solid #eee;padding-top:8px;}@media print{@page{margin:15mm 12mm;size:A4 portrait;}}`;
  }


  function buildEmpPdf(){
    const baseUrl=window.location.href.replace(/\/[^\/]*(\?.*)?$/,'/');
    const lUrl=baseUrl+'css/assets/Logo-header.svg';
    const todayFmt=new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
    function dr(lbl,val){return `<tr><td class="lbl">${lbl}</td><td>${val||'&mdash;'}</td></tr>`;}
    function eb(date){
      const d=date?daysTo(date):null;
      if(d===null||d===undefined)return '';
      if(d<0)return ' <span class="badge bv">Vencido</span>';
      if(d<=60)return ` <span class="badge bc">${d}d &mdash; Urgente</span>`;
      if(d<=120)return ` <span class="badge ba">${d}d &mdash; Aten\u00e7\u00e3o</span>`;
      return ` <span class="badge bo">${d}d</span>`;
    }
    const empLogo = compLogoHtml(_ecm, _eAccent, lUrl);
    const bodyHtml = `<div class="ph">${empLogo}
      <div class="phi"><h1>${emp.name||''}</h1>
        <p>${emp.role||''} &middot; ${emp.company||''} &middot; N.&ordm; ${emp.id||''}</p>
        <p>Gerado em ${todayFmt}</p></div></div>
      <div class="st">Dados Pessoais</div>
      <table class="tbl">
        ${dr('Data de Nascimento',fmtDate(emp.birthDate))}
        ${dr('Idade',ageOf(emp.birthDate)?ageOf(emp.birthDate)+' anos':'')}
        ${dr('Naturalidade',emp.birthplace)}
        ${dr('Nacionalidade',emp.nationality)}
        ${dr('Estado Civil',emp.maritalStatus)}
        ${dr('Habilita\u00e7\u00f5es',emp.education)}
        ${dr('Morada',emp.address)}
        ${dr('Telefone Pessoal',emp.personalPhone)}
        ${dr('Telefone Empresa',emp.companyPhone)}
        ${dr('E-mail',emp.email)}
      </table>
      <div class="st">Dados Profissionais</div>
      <table class="tbl">
        ${dr('Data Admiss\u00e3o',fmtDate(emp.admissionDate))}
        ${emp.endDate?dr('Data de Sa\u00edda',fmtDate(emp.endDate)):''}
        ${emp.status==='inactive'?dr('Iniciativa de Sa\u00edda',emp.exitInitiative||'\u2014'):''}
        ${emp.status==='inactive'?dr('Motivo de Sa\u00edda',emp.exitReason||'\u2014'):''}
        ${(emp.status==='inactive'&&emp.exitNotes)?dr('Obs. Sa\u00edda',emp.exitNotes):''}
        ${emp.readmissionDate?dr('Data de Retorno',fmtDate(emp.readmissionDate)):''}
        ${dr('Tipo Contrato',emp.contractType||emp.contractEndDate)}
        ${dr('Estado Contrato',emp.contractStatus)}
        ${dr('NIF',emp.nif)}
        ${dr('NISS',emp.niss)}
        ${dr('IBAN',emp.iban)}
        ${dr('Ordenado Base',(()=>{const s=emp.baseSalary;const n=parseFloat(s);return (s&&!isNaN(n)&&!String(s).startsWith('='))?n.toFixed(2)+'&euro;':'';})())}
        ${dr('Titular IRS',(()=>{const v=emp.incomeHolder;return (v!==undefined&&v!==''&&!String(v).startsWith('='))?v+'\u00a0titular(es)':'\u2014';})())}
        ${dr('Dependentes',(()=>{const v=emp.dependents;return (v!==undefined&&v!==''&&!String(v).startsWith('='))?String(v):'0';})())}
        ${dr('N.&ordm; Diuturnidades',String(calcDiut(emp)))}
        ${emp.status!=='inactive'?dr('Pr&oacute;x. Diuturnidade',fmtDate(nd)+eb(nd)):''}
      </table>
      <div class="st">Documentos</div>
      <table class="tbl">
        ${dr('N.&ordm; CC',emp.ccNumber)}
        ${dr('Validade CC',fmtDate(emp.ccExpiry)+eb(emp.ccExpiry))}
        ${dr('Carta de Condu\u00e7\u00e3o',emp.driverLicense)}
        ${dr('Validade Carta',fmtDate(emp.driverLicenseExpiry)+eb(emp.driverLicenseExpiry))}
        ${dr('Validade CAM/CQC',fmtDate(emp.camExpiry)+eb(emp.camExpiry))}
        ${dr('Cart\u00e3o Tac\u00f3grafo',fmtDate(emp.tachographCardExpiry)+eb(emp.tachographCardExpiry))}
        ${dr('Validade ADR',fmtDate(emp.adrExpiry)+eb(emp.adrExpiry))}
        ${dr('Validade SEF',fmtDate(emp.sefExpiry)+eb(emp.sefExpiry))}
      </table>
      <div class="st">Sa\u00fade e Vigil\u00e2ncia</div>
      <table class="tbl">
        ${dr('\u00daltima Consulta M\u00e9d.',fmtDate(emp.lastMedicalConsult))}
        ${dr('Pr\u00f3x. Consulta',fmtDate(nm)+eb(nm))}
        ${dr('Periodicidade',ageOf(emp.birthDate)>=50?'Anual (\u226550 anos)':'Bienal (&lt;50 anos)')}
      </table>
      <div class="ft">Ficha de colaborador &mdash; ${emp.name} &mdash; Gerado em ${todayFmt} &mdash; ${_ecm.name} &mdash; HR Management</div>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${empPdfCSS()}</style></head><body>${bodyHtml}</body></html>`;
  }

  function buildShareText(){
    const today=new Date().toLocaleDateString('pt-PT');
    return `Ficha de Colaborador — ${emp.name}\nEmpresa: ${emp.company}\nFun\u00e7\u00e3o: ${emp.role||'—'}\nEstado: ${emp.contractStatus||'—'}\nAdmiss\u00e3o: ${fmtDate(emp.admissionDate)}\nNIF: ${emp.nif||'—'}\nTelefone: ${emp.companyPhone||emp.personalPhone||'—'}\n\nGerado em ${today} via HR Management`;
  }

  function FV({label,val,expiry=false}){
    const cls=expiry?expClass(daysTo(val)):'';
    return<div className="field"><div className="fl">{label}</div><div className={`fv ${cls}`}>{expiry?fmtDate(val):val||'—'}</div></div>;
  }

  if(empPdfHtml!==null){
    return(
      <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:9999,background:'white',overflowY:'auto'}}>
        <style dangerouslySetInnerHTML={{__html:`@media print{.rh-noprint{display:none!important;}}`}}/>
        <div className="rh-noprint" style={{position:'sticky',top:0,zIndex:10,background:'white',borderBottom:'3px solid '+_eAccent,padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,.12)'}}>
          <span style={{fontWeight:800,fontSize:14,color:'#1a0d0d'}}>Ficha de Colaborador — {emp.name}</span>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button onClick={()=>window.print()}
              style={{display:'flex',alignItems:'center',gap:8,background:`linear-gradient(135deg,${_eAccent} 0%,${_eAccent}cc 100%)`,color:'white',border:'none',padding:'9px 22px',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:`0 3px 12px ${_eAccent}55`,letterSpacing:'.3px',transition:'filter .15s'}} onMouseOver={e=>e.currentTarget.style.filter='brightness(1.12)'} onMouseOut={e=>e.currentTarget.style.filter='none'}>
              Transferir PDF
            </button>
            <button onClick={()=>generateAndSharePdf(empPdfHtml,'Ficha — '+emp.name,'share').catch(()=>{})}
              style={{display:'flex',alignItems:'center',gap:7,background:'white',border:'1.5px solid #ddd',padding:'9px 18px',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',color:'#333',transition:'border-color .15s,color .15s'}} onMouseOver={e=>{e.currentTarget.style.borderColor=_eAccent;e.currentTarget.style.color=_eAccent;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#ddd';e.currentTarget.style.color='#333';}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Partilhar
            </button>
            <button onClick={()=>{setEmpPdfHtml(null);setShowShare(false);}}
              style={{display:'flex',alignItems:'center',gap:6,background:'white',border:'1.5px solid #ddd',padding:'9px 18px',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',color:'#555',transition:'border-color .15s,color .15s'}} onMouseOver={e=>{e.currentTarget.style.borderColor='#999';e.currentTarget.style.color='#222';}} onMouseOut={e=>{e.currentTarget.style.borderColor='#ddd';e.currentTarget.style.color='#555';}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Fechar
            </button>
          </div>
        </div>
        <div className="container-modal-content">
          <style dangerouslySetInnerHTML={{__html:empPdfCSS()}}/>
          <div dangerouslySetInnerHTML={{__html:empPdfHtml}}/>
        </div>
      </div>
    );
  }

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px',flexShrink:0}}>
        <div className="av" style={{width:50,height:50,background:COMP_COLORS[emp.company]||'#1a0d0d',fontSize:18}}>{initials(emp.name)}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div style={{fontWeight:700,fontSize:17}}>{emp.name}</div>
            {(()=>{
              const co=COMP_COLORS[emp.company]||'#1a0d0d';
              const canEdit=!readOnly && typeof onRenameId==='function';
              if(idEdit){
                return (
                  <span className="emp-id-pill is-editing" style={{color:co}}>
                    <span className="emp-id-pill__lbl">N.º</span>
                    <input
                      className="emp-id-pill__input"
                      autoFocus
                      value={idVal}
                      disabled={idSaving}
                      onChange={e=>{setIdVal(e.target.value);if(idErr)setIdErr(null);}}
                      onKeyDown={e=>{
                        if(e.key==='Enter') commitId();
                        else if(e.key==='Escape'){ setIdEdit(false); setIdErr(null); }
                      }}/>
                  </span>
                );
              }
              return (
                <span
                  className={`emp-id-pill${canEdit?' is-editable':''}`}
                  style={{color:co}}
                  title={canEdit?'Clica para alterar o n.º do colaborador':'N.º do colaborador'}
                  onClick={canEdit?()=>{setIdVal(emp.id||'');setIdEdit(true);setIdErr(null);}:undefined}>
                  <span className="emp-id-pill__lbl">N.º</span>
                  <span className="emp-id-pill__num">{emp.id||'—'}</span>
                </span>
              );
            })()}
            {idErr && (
              <span className="emp-id-err">
                {idErr.msg}
                {idErr.suggestion && (
                  <button className="emp-id-err__btn" onClick={()=>commitId(idErr.suggestion)}>
                    usar #{idErr.suggestion}
                  </button>
                )}
              </span>
            )}
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{emp.role} · {emp.company}</div>
          <div style={{display:'flex',gap:5,marginTop:3,flexWrap:'wrap'}}>
            <Chip label={emp.contractStatus} type={emp.contractStatus==='Ativo'?'green':emp.contractStatus?.includes('baixa')?'orange':'gr'}/>
            {(()=>{
              const eff = effectiveAvailability(emp, ferias);
              if(!eff) return null;
              if(eff.toLowerCase().startsWith('dispon')) return <Chip label="Disponível" type="green"/>;
              return <span title={eff}><Chip label={`Indisponível · ${eff}`} type="orange"/></span>;
            })()}
            {emp.app==='SIM'&&<Chip label="App" type="blue"/>}
          </div>
        </div>
        <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
          {onEdit&&<button className="btn bs btn-sm" onClick={onEdit}>Editar</button>}
          {onDeactivate&&<button className="btn btn-sm" style={{background:'var(--red)',color:'#fff',borderColor:'var(--red)'}} onClick={onDeactivate}>Desativar</button>}
          {onReturn&&<button className="btn btn-sm" style={{background:'var(--green)',color:'#fff',borderColor:'var(--green)'}} onClick={onReturn}>Retomar à Empresa</button>}
          <button title="Exportar ficha em PDF" onClick={()=>setEmpPdfHtml(buildEmpPdf())} style={{display:'flex',alignItems:'center',background:'transparent',border:'none',padding:0,cursor:'pointer',transition:'opacity .15s'}} onMouseOver={e=>e.currentTarget.style.opacity='.75'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>
            <img src="css/assets/PDF_file_icon.svg.png" alt="PDF" style={{height:34,width:'auto',display:'block'}}/>
          </button>
          <button className="btn bg" onClick={onClose}>✕</button>
        </div>
      </div>
      {isInactive&&(
        <div style={{background:'#f9f0f0',border:'1px solid #f5cbc5',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:12,flexShrink:0}}>
          <div style={{fontWeight:700,color:'var(--red)',marginBottom:4}}>Colaborador Inativo</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px 18px',color:'var(--muted)'}}>
            <span><strong>Saída:</strong> {emp.endDate?fmtDate(emp.endDate):'—'}</span>
            <span><strong>Iniciativa:</strong> {emp.exitInitiative||'—'}</span>
            <span><strong>Motivo:</strong> {emp.exitReason||'—'}</span>
            {emp.exitNotes&&<span style={{gridColumn:'1/-1'}}><strong>Obs:</strong> {emp.exitNotes}</span>}
          </div>
        </div>
      )}
      <div className="tabs" style={{flexShrink:0}}>
        {[['info','Dados'],['docs','Docs'],['notes','Notas'],['medical','Medicina'],['sef','SEF'],['training','Formação'],['diut','Diuturnidades'],['evals','Avaliações'],['ausencias','Ausências'],['epi','EPI'],['farda','Farda']].map(([k,l])=>(
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
        ))}
      </div>
      <div style={{flex:1,overflow:'auto',paddingTop:12}}>
        {tab==='info'&&<div className="fg">
          <FV label="N.º Funcionário" val={emp.id}/><FV label="Empresa" val={emp.company}/>
          <FV label="Data Admissão" val={fmtDate(emp.admissionDate)}/>{emp.endDate&&<FV label="Data de Saída" val={fmtDate(emp.endDate)}/>}{emp.status==='inactive'&&emp.exitInitiative&&<FV label="Iniciativa de Saída" val={emp.exitInitiative}/>}{emp.status==='inactive'&&<FV label="Motivo de Saída" val={emp.exitReason||'—'}/>}{emp.readmissionDate&&<FV label="Data de Retorno" val={fmtDate(emp.readmissionDate)}/>}<FV label="Tipo Contrato" val={emp.contractEndDate}/>
          {emp.trialEndDate&&<div className="field"><div className="fl">Fim P. Experimental</div><div className={`fv ${expClass(daysTo(emp.trialEndDate))}`}>{fmtDate(emp.trialEndDate)} <ExpiryChip date={emp.trialEndDate}/></div></div>}
          {emp.secondContractEnd&&<div className="field"><div className="fl">Fim 2.º Contrato</div><div className={`fv ${expClass(daysTo(emp.secondContractEnd))}`}>{fmtDate(emp.secondContractEnd)} <ExpiryChip date={emp.secondContractEnd}/></div></div>}
          <FV label="Data Nascimento" val={fmtDate(emp.birthDate)}/><FV label="Idade" val={ageOf(emp.birthDate)?ageOf(emp.birthDate)+' anos':''}/>
          <FV label="Naturalidade" val={emp.birthplace}/><FV label="Nacionalidade" val={emp.nationality}/>
          <FV label="Estado Civil" val={emp.maritalStatus}/><FV label="Habilitações" val={emp.education}/>
          <FV label="N.º CC" val={emp.ccNumber}/>
          <div className="field"><div className="fl">Validade CC</div><div className={`fv ${expClass(daysTo(emp.ccExpiry))}`}>{fmtDate(emp.ccExpiry)} <ExpiryChip date={emp.ccExpiry}/></div></div>
          <FV label="NIF" val={emp.nif}/><FV label="NISS" val={emp.niss}/>
          <FV label="Titular IRS" val={(()=>{const v=emp.incomeHolder;return (v!==undefined&&v!==''&&!String(v).startsWith('='))?v:'—';})()}/><FV label="Dependentes" val={(()=>{const v=emp.dependents;return (v!==undefined&&v!==''&&!String(v).startsWith('='))?String(v):'0';})()}/>
          <FV label="IBAN" val={emp.iban}/><FV label="Ordenado Base" val={(()=>{const s=emp.baseSalary;const n=parseFloat(s);return (s&&!isNaN(n)&&!String(s).startsWith('='))?n.toFixed(2)+'€':'';})()}/>  
          <div className="field" style={{gridColumn:'1/-1'}}><div className="fl">Morada</div><div className="fv">{emp.address||'—'}</div></div>
          <FV label="Telefone Pessoal" val={emp.personalPhone}/><FV label="Telefone Empresa" val={emp.companyPhone}/>
          <div className="field" style={{gridColumn:'1/-1'}}><div className="fl">E-mail</div><div className="fv">{emp.email||'—'}</div></div>
          <hr className="divider" style={{gridColumn:'1/-1'}}/>
          <div style={{gridColumn:'1/-1',fontWeight:600,fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>Documentos Profissionais</div>
          <FV label="Carta de Condução" val={emp.driverLicense}/>
          <div className="field"><div className="fl">Validade Carta</div><div className={`fv ${expClass(daysTo(emp.driverLicenseExpiry))}`}>{fmtDate(emp.driverLicenseExpiry)} <ExpiryChip date={emp.driverLicenseExpiry}/></div></div>
          <div className="field"><div className="fl">Validade CAM/CQC</div><div className={`fv ${expClass(daysTo(emp.camExpiry))}`}>{fmtDate(emp.camExpiry)} <ExpiryChip date={emp.camExpiry}/></div></div>
          <div className="field"><div className="fl">Cartão Condutor Tac.</div><div className={`fv ${expClass(daysTo(emp.tachographCardExpiry))}`}>{fmtDate(emp.tachographCardExpiry)} <ExpiryChip date={emp.tachographCardExpiry}/></div></div>
          <div className="field"><div className="fl">Validade ADR</div><div className={`fv ${expClass(daysTo(emp.adrExpiry))}`}>{fmtDate(emp.adrExpiry)} <ExpiryChip date={emp.adrExpiry}/></div></div>
        </div>}
        {tab==='docs'&&<DocsTab empId={emp.id} empCompany={emp.company} empName={emp.name} readOnly={readOnly} user={user} onAudit={onAudit}/>}
        {tab==='notes'&&<NotasTab emp={emp} notes={notes} readOnly={readOnly} user={user} onSaveNote={onSaveNote} onDelNote={onDelNote} onAudit={onAudit}/>}
        {tab==='medical'&&<div className="fg">
          <FV label="Última Consulta" val={fmtDate(emp.lastMedicalConsult)}/>
          <div className="field"><div className="fl">Próxima Consulta</div><div className={`fv ${expClass(daysTo(nm))}`}>{fmtDate(nm)} <ExpiryChip date={nm}/></div></div>
          <FV label="Periodicidade" val={ageOf(emp.birthDate)>=50?'Anual (≥50 anos)':'Bienal (<50 anos)'}/>
          <FV label="Dias Restantes" val={nm?(daysTo(nm)+'d'):'—'}/>
          <div className="field" style={{gridColumn:'1/-1'}}><div className="fl">Notas</div><div className="fv">{emp.medicalNotes||'—'}</div></div>
        </div>}
        {tab==='sef'&&<div className="fg">
          <div className="field"><div className="fl">Validade Declaração SEF</div><div className={`fv ${expClass(daysTo(emp.sefExpiry))}`}>{fmtDate(emp.sefExpiry)} <ExpiryChip date={emp.sefExpiry}/></div></div>
          <FV label="Dias Restantes" val={emp.sefExpiry?daysTo(emp.sefExpiry)+'d':'—'}/>
          <div className="field"><div className="fl">Notif. SEF enviada</div><div className="fv" style={{color:emp.sefSentWhatsapp?'var(--green)':'var(--red)'}}>{emp.sefSentWhatsapp||emp.sefSentWhatsapp==='Sim'?'Sim':'Não'}</div></div>
          <div style={{gridColumn:'1/-1',background:'var(--blbg)',borderRadius:7,padding:'10px 12px',fontSize:'12px',color:'var(--blue)'}}>Validade de 1 ano. Alerta activado com 60 dias de antecedência.</div>
        </div>}
        {tab==='training'&&<div>
          <div className="fg" style={{marginBottom:14}}>
            <div className="field"><div className="fl">SHT (Seg. Hig. Trabalho)</div><div className="fv">{emp.training?.sht||'—'}</div></div>
            <div className="field"><div className="fl">Tacógrafos</div><div className="fv">{emp.training?.tacografo||'—'}</div></div>
            <div className="field"><div className="fl">Formação Interna</div><div className="fv">{emp.training?.interna||'—'}</div></div>
          </div>
          <div style={{background:'var(--grbg)',borderRadius:7,padding:'10px 12px',fontSize:'12px',color:'var(--green)'}}>Para certificados de formação, use o separador "Docs".</div>
        </div>}
        {tab==='diut'&&<div className="fg">
          <FV label="N.º Diuturnidades Actuais" val={String(calcDiut(emp))}/>
          <FV label="Data Admissão" val={fmtDate(emp.admissionDate)}/>
          <div className="field"><div className="fl">Próxima Diuturnidade</div><div className={`fv ${expClass(daysTo(nd))}`}>{fmtDate(nd)} <ExpiryChip date={nd}/></div></div>
          <FV label="Faltam" val={nd?daysTo(nd)+'d':'—'}/>
          <div style={{gridColumn:'1/-1',background:'var(--orbg)',borderRadius:7,padding:'10px 12px',fontSize:'12px',color:'var(--orange)'}}>Alerta activado antes do dia 15 do mês anterior ao vencimento. Ciclos de 3 anos.</div>
        </div>}
        {tab==='epi'&&<EpiTab emp={emp} readOnly={readOnly} user={user} onAudit={onAudit}/>}
        {tab==='farda'&&<FardaTab emp={emp} readOnly={readOnly} user={user} onAudit={onAudit}/>}
        {tab==='ausencias'&&<AusenciasTab emp={emp} absences={absences} readOnly={readOnly} user={user} onSaveAbsence={onSaveAbsence} onDelAbsence={onDelAbsence} onAudit={onAudit}/>}
        {tab==='evals'&&<div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div className="sec-t" style={{marginBottom:0}}>Registos de Avaliação e Conversas</div>
            {!readOnly&&<button className="btn bp btn-sm" onClick={()=>setShowEvalModal(true)}>+ Nova Entrada</button>}
          </div>
          {myEvals.length===0?<div className="empty">Sem registos</div>:
          myEvals.map(ev=>(
            <div key={ev.id} className="eval-item">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontWeight:700,color:'var(--blue)',fontSize:13}}>{ev.type}</span>
                {!readOnly&&<button className="btn bg btn-sm" style={{color:'var(--red)'}} onClick={()=>onDelEval(ev.id)}>Elim.</button>}
              </div>
              <div style={{fontSize:11,color:'var(--muted)',margin:'2px 0'}}>{fmtDate(ev.date)} · Registado por: {ev.by||'RH'}</div>
              <div style={{fontSize:13}}>{ev.notes}</div>
              {ev.nextAction&&<div style={{marginTop:5,fontSize:12,color:'var(--blue)',background:'var(--blbg)',borderRadius:5,padding:'4px 8px'}}>→ Acção: {ev.nextAction}{ev.nextDate?` (${fmtDate(ev.nextDate)})`:''}</div>}
            </div>
          ))}
          {showEvalModal&&(
            <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowEvalModal(false)}}>
              <div className="modal" style={{maxWidth:520}}>
                <div className="mh"><div className="mh-t">Nova Entrada — {emp.name}</div><button className="btn bg" onClick={()=>setShowEvalModal(false)}>✕</button></div>
                <div className="mb">
                  <div className="fg">
                    <div className="field"><div className="fl">Tipo</div>
                      <select className="fi" value={ef.type} onChange={e=>setEf(f=>({...f,type:e.target.value}))}>
                        <option value="">Seleccionar...</option>
                        {['Avaliação 1.º mês','Avaliação trimestral','Conversa de desempenho','Sensibilização comportamental','Advertência verbal','Advertência escrita','Elogio','Registo de ocorrência','Outra'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field"><div className="fl">Data</div><input type="date" className="fi" value={ef.date} onChange={e=>setEf(f=>({...f,date:e.target.value}))}/></div>
                    <div className="field" style={{gridColumn:'1/-1'}}><div className="fl">Notas / Conteúdo</div><textarea className="fi" rows={4} style={{resize:'vertical'}} value={ef.notes} onChange={e=>setEf(f=>({...f,notes:e.target.value}))}/></div>
                    <div className="field"><div className="fl">Acção seguinte</div><input className="fi" value={ef.nextAction} onChange={e=>setEf(f=>({...f,nextAction:e.target.value}))}/></div>
                    <div className="field"><div className="fl">Data da acção</div><input type="date" className="fi" value={ef.nextDate} onChange={e=>setEf(f=>({...f,nextDate:e.target.value}))}/></div>
                  </div>
                </div>
                <div className="mf">
                  <button className="btn bs" onClick={()=>setShowEvalModal(false)}>Cancelar</button>
                  <button className="btn bp" onClick={()=>{
                    if(!ef.type||!ef.notes){alert('Tipo e Notas são obrigatórios.');return;}
                    onSaveEval({...ef,empId:emp.id,empCompany:emp.company,id:Date.now().toString(),by:user?.name||'RH'});
                    onAudit&&onAudit(`Registou avaliação "${ef.type}" para ${emp.name}`, 'avaliacao');
                    setShowEvalModal(false);
                    setEf({type:'',date:new Date().toISOString().split('T')[0],notes:'',nextAction:'',nextDate:''});
                  }}>Guardar</button>
                </div>
              </div>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}

function BulkEditModal({count,onApply,onClose}){
  // Só os campos preenchidos são aplicados; o resto fica como está em
  // cada colaborador. Útil para mudanças em massa (salário, função…).
  const [f,setF]=useState({role:'',contractStatus:'',contractEndDate:'',baseSalary:'',availability:'',app:''});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const filled=Object.entries(f).filter(([k,v])=>v!=='').map(([k])=>k);
  function go(){
    if(filled.length===0){ onClose(); return; }
    if(!confirm(`Aplicar alterações a ${count} colaboradores? Esta acção sobrepõe os valores actuais nos campos preenchidos.`)) return;
    onApply(f);
  }
  return (
    <div className="ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal" style={{maxWidth:520}}>
        <div className="mh"><div className="mh-t">Editar {count} colaboradores</div><button className="btn bg" onClick={onClose}>✕</button></div>
        <div className="mb">
          <p style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Só os campos que preencheres são aplicados. Os restantes ficam como estão.</p>
          <div className="fg">
            <div className="field"><div className="fl">Função</div>
              <input className="fi" value={f.role} onChange={e=>set('role',e.target.value)} placeholder="(manter) — ex: Mot. Veic. Pesados"/></div>
            <div className="field"><div className="fl">Estado Contratual</div>
              <select className="fi" value={f.contractStatus} onChange={e=>set('contractStatus',e.target.value)}>
                <option value="">(manter)</option>
                <option>Ativo</option>
                <option>Inativo</option>
              </select></div>
            <div className="field"><div className="fl">Tipo Contrato</div>
              <select className="fi" value={f.contractEndDate} onChange={e=>set('contractEndDate',e.target.value)}>
                <option value="">(manter)</option>
                {['Efetivo','Termo Certo','Indeterminado'].map(o=><option key={o}>{o}</option>)}
              </select></div>
            <div className="field"><div className="fl">Disponibilidade</div>
              <select className="fi" value={f.availability} onChange={e=>set('availability',e.target.value)}>
                <option value="">(manter)</option>
                {['Disponível','Seguro','Baixa','Licença'].map(o=><option key={o}>{o}</option>)}
              </select></div>
            <div className="field"><div className="fl">Ordenado Base (€)</div>
              <input className="fi" value={f.baseSalary} onChange={e=>set('baseSalary',e.target.value)} placeholder="(manter) — ex: 1014.02"/></div>
            <div className="field"><div className="fl">Acesso à App</div>
              <select className="fi" value={f.app} onChange={e=>set('app',e.target.value)}>
                <option value="">(manter)</option>
                <option>SIM</option><option>NÃO</option>
              </select></div>
          </div>
          {filled.length>0 && (
            <div style={{background:'var(--blbg)',border:'1px solid var(--blue)',borderRadius:8,padding:'8px 12px',marginTop:14,fontSize:12,color:'var(--blue)'}}>
              Vai actualizar: <strong>{filled.join(', ')}</strong>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancelar</button>
          <button className="btn bp" disabled={filled.length===0} onClick={go}>Aplicar a {count}</button>
        </div>
      </div>
    </div>
  );
}

function EmpScreen({data,company,onUpdate,readOnly,user,onAudit,evals,onSaveEval,onDelEval,absences,onSaveAbsence,onDelAbsence,notes,onSaveNote,onDelNote,initSel,ferias,onRenameId,onNav}){
  const {employees=[],inactive=[]}=data;
  const [search,setSearch]=useState('');
  const [sf,setSf]=useState('all');
  // initSel pode vir de outro ecrã só com {id, company}, é preciso ir
  // buscar o registo completo senão a ficha abre vazia.
  const hydrate=(s)=>{
    if(!s) return null;
    if(s.name) return s;
    const src=s.goToArchive?inactive:employees;
    return src.find(e=>e.id===s.id&&e.company===s.company)
        || employees.find(e=>e.id===s.id&&e.company===s.company)
        || inactive.find(e=>e.id===s.id&&e.company===s.company)
        || s;
  };
  const [sel,setSel]=useState(()=>hydrate(initSel));
  const [showForm,setShowForm]=useState(false);
  const [editEmp,setEditEmp]=useState(null);
  const [archive,setArchive]=useState(initSel?.goToArchive||false);
  const [exitModal,setExitModal]=useState(null);
  const [returnModal,setReturnModal]=useState(null);
  const [bulkMode,setBulkMode]=useState(false);
  const [bulkSel,setBulkSel]=useState(()=>new Set());
  const [bulkModal,setBulkModal]=useState(false);
  const detailRef=useRef(null);
  function toggleBulk(empKey){
    setBulkSel(prev=>{const n=new Set(prev);if(n.has(empKey))n.delete(empKey);else n.add(empKey);return n;});
  }
  function exitBulk(){ setBulkMode(false); setBulkSel(new Set()); setBulkModal(false); }
  async function applyBulk(changes){
    const ne=employees.map(e=>{
      const k=e.id+'|'+e.company;
      if(!bulkSel.has(k)) return e;
      const next={...e};
      Object.entries(changes).forEach(([f,v])=>{ if(v!==''&&v!==null&&v!==undefined) next[f]=v; });
      return next;
    });
    await onUpdate({...data,employees:ne});
    if(onAudit){
      const fields=Object.keys(changes).filter(k=>changes[k]!==''&&changes[k]!==null&&changes[k]!==undefined).join(', ');
      onAudit(`Edição em massa de ${bulkSel.size} colaboradores: ${fields}`, 'colaborador');
    }
    exitBulk();
  }

  useEffect(()=>{
    if(!sel) return;
    if(detailRef.current) detailRef.current.scrollTop=0;
    document.querySelector('.content')?.scrollTo({top:0,behavior:'instant'});
  },[sel?.id,sel?.company]);

  // Quando o utilizador vem de outro ecrã (ex.: clicou num motorista), o
  // useState inicial já tinha disparado e o sel não acompanha. Este efeito
  // sincroniza sempre que o initSel muda.
  useEffect(()=>{
    if(!initSel) return;
    if(initSel.id === sel?.id && initSel.company === sel?.company) return;
    setSel(hydrate(initSel));
    if(initSel.goToArchive) setArchive(true);
  },[initSel?.id, initSel?.company, initSel?.goToArchive]);

  const compMap = COMPANY_NAME;
  const todayStr=new Date().toISOString().split('T')[0];
  const empCount=filterEmps(employees, company).length;
  const inactCount=filterEmps(inactive, company).length;
  const filtered=useMemo(()=>{
    let l=filterEmps(archive?inactive:employees, company);
    if(sf==='baixa')   l=l.filter(e=>(e.availability||'').toLowerCase()==='baixa');
    else if(sf==='seguro')  l=l.filter(e=>(e.availability||'').toLowerCase()==='seguro');
    else if(sf==='ferias')  l=l.filter(e=>isOnVacation(e, ferias, todayStr));
    else if(sf==='disponivel') l=l.filter(e=>{
      const av=(e.availability||'').toLowerCase();
      if(av==='baixa'||av==='seguro'||av==='licença'||av==='licenca') return false;
      if(isOnVacation(e, ferias, todayStr)) return false;
      return true;
    });
    else if(sf==='indisponivel') l=l.filter(e=>{
      const av=(e.availability||'').toLowerCase();
      if(av==='baixa'||av==='seguro'||av==='licença'||av==='licenca') return true;
      if(isOnVacation(e, ferias, todayStr)) return true;
      return false;
    });
    if(search){const s=search.trim();l=l.filter(e=>nameMatches(e.name,s)||e.id?.includes(s)||e.nif?.includes(s));}
    // Empresas fabris sempre por último; restantes pela ordem da config.
    const ORDER = Object.fromEntries(APP_COMPANIES.map((c,i) => [c.name, c.isFabril ? 99 : i+1]));
    l=[...l].sort((a,b)=>{
      const oa=ORDER[a.company]||50, ob=ORDER[b.company]||50;
      if(oa!==ob) return oa-ob;
      return (a.name||'').localeCompare(b.name||'');
    });
    return l;
  },[employees,inactive,company,search,sf,archive,ferias]);

  function handleSave(f){
    let ne=[...employees],ni=[...inactive];
    if(f.status==='inactive'){
      const i=ni.findIndex(e=>e.id===f.id&&e.company===f.company);
      if(i>=0) ni[i]=f; else ni.push(f);
    } else {
      const i=ne.findIndex(e=>e.id===f.id&&e.company===f.company);
      if(i>=0) ne[i]=f; else ne.push({...f,status:'active'});
    }
    onAudit(`${editEmp?.id==='new'?'Criou colaborador':'Editou colaborador'} ${f.name}`, 'colaborador');
    onUpdate({...data,employees:ne,inactive:ni});
    setShowForm(false); setEditEmp(null); setSel(f);
  }

  function confirmDeactivate(emp, exitData){
    const deactivated={...emp, status:'inactive', contractStatus:'Inativo',
      exitDate:exitData.exitDate, exitReason:exitData.exitReason,
      exitInitiative:exitData.exitInitiative, exitNotes:exitData.exitNotes||''};
    onUpdate({...data,
      employees:employees.filter(e=>!(e.id===emp.id&&e.company===emp.company)),
      inactive:[deactivated,...inactive]
    });
    onAudit(`Desativou colaborador ${emp.name} — ${exitData.exitReason||'motivo não especificado'} (iniciativa: ${exitData.exitInitiative})`, 'colaborador');
    setExitModal(null); setSel(null);
  }

  function confirmReturn(emp, returnData){
    const reactivated={...emp, status:'active', contractStatus:'Ativo',
      baseSalary:returnData.baseSalary||emp.baseSalary,
      iban:returnData.iban||emp.iban,
      admissionDate:returnData.readmissionDate,
      readmissionDate:returnData.readmissionDate,
      driverLicenseExpiry:returnData.driverLicenseExpiry||emp.driverLicenseExpiry,
      contractEndDate:returnData.contractEndDate||emp.contractEndDate,
      exitDate:null, exitReason:null, exitInitiative:null, exitNotes:null
    };
    onUpdate({...data,
      employees:[...employees, reactivated],
      inactive:inactive.filter(e=>!(e.id===emp.id&&e.company===emp.company))
    });
    onAudit(`Reintegrou colaborador ${emp.name} (readmissão em ${returnData.readmissionDate})`, 'colaborador');
    setReturnModal(null); setSel(reactivated); setArchive(false);
  }

  const isMobile=useMobile();
  return(
    <div className={`emp-layout${(isMobile&&sel)?" emp-detail-open":""}`}>
      <div className="card emp-list">
        <div style={{padding:'10px',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',gap:6,marginBottom:7}}>
            <button className={`btn btn-sm ${!archive?'bp':'bs'}`} onClick={()=>{setArchive(false);setSel(null);setSf('all');exitBulk();}}>Activos ({empCount})</button>
            <button className={`btn btn-sm ${archive?'bp':'bs'}`} onClick={()=>{setArchive(true);setSel(null);setSf('all');exitBulk();}}>Inativos ({inactCount})</button>
            {!readOnly&&!archive&&(
              bulkMode
                ? <button className="btn bs btn-sm" style={{marginLeft:'auto'}} onClick={exitBulk} title="Sair do modo de selecção">Cancelar</button>
                : <>
                    <button className="btn bs btn-sm" style={{marginLeft:'auto'}} onClick={()=>setBulkMode(true)} title="Seleccionar vários para editar em massa">☑</button>
                    <button className="btn bp btn-sm" onClick={()=>{setEditEmp({id:'new'});setShowForm(true);}}>+</button>
                  </>
            )}
          </div>
          {bulkMode && (
            <div style={{display:'flex',gap:6,alignItems:'center',padding:'6px 8px',background:'var(--blbg)',border:'1px solid var(--blue)',borderRadius:6,marginBottom:7,fontSize:12}}>
              <span style={{flex:1,color:'var(--blue)',fontWeight:600}}>{bulkSel.size} seleccionado{bulkSel.size===1?'':'s'}</span>
              <button className="btn bs btn-sm" style={{padding:'2px 8px'}} onClick={()=>{
                const all=new Set(filtered.map(e=>e.id+'|'+e.company));
                setBulkSel(bulkSel.size===all.size?new Set():all);
              }}>{bulkSel.size===filtered.length?'Nenhum':'Todos'}</button>
              <button className="btn bp btn-sm" disabled={bulkSel.size===0} onClick={()=>setBulkModal(true)}>Editar…</button>
            </div>
          )}
          <input className="fi" style={{marginBottom:6}} placeholder="Nome, NIF, n.º..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="emp-filter-bar">
            {archive
              ? <button className={`emp-filter-btn ${sf==='all'?'is-active':''}`} onClick={()=>setSf('all')}>Todos</button>
              : <>
                  {[['all','Todos'],['baixa','Baixa'],['seguro','Seguro'],['ferias','Férias']].map(([s,lbl])=>(
                    <button key={s} className={`emp-filter-btn ${sf===s?'is-active':''}`} onClick={()=>setSf(s)}>{lbl}</button>
                  ))}
                  <button className={`emp-filter-btn emp-filter-btn--ok ${sf==='disponivel'?'is-active':''}`}
                    onClick={()=>setSf('disponivel')}
                    title="Só os que estão activos e em função (sem baixa/seguro/férias)">
                    Disponível
                  </button>
                  <button className={`emp-filter-btn emp-filter-btn--warn ${sf==='indisponivel'?'is-active':''}`}
                    onClick={()=>setSf('indisponivel')}
                    title="Só os que estão activos mas em ausência (baixa, seguro, licença ou férias)">
                    Indisponível
                  </button>
                </>
            }
          </div>
        </div>
        <div className="list-body">
          {filtered.length===0?<div className="empty" style={{padding:24}}>Sem resultados</div>:
          filtered.map(emp=>{
            const k=emp.id+'|'+emp.company;
            const checked=bulkSel.has(k);
            return (
            <div key={k} className={`li ${sel?.id===emp.id&&sel?.company===emp.company?'sel':''}`}
              onClick={()=>{
                if(bulkMode){ toggleBulk(k); return; }
                setSel(emp);
                onAudit&&onAudit(`Consultou ficha de ${emp.name}`, 'consulta');
              }}>
              {bulkMode && (
                <input type="checkbox" checked={checked} readOnly
                  style={{marginRight:2,width:16,height:16,accentColor:'var(--blue)',flexShrink:0}}/>
              )}
              <div className="av" style={{background:COMP_COLORS[emp.company]||'#1a0d0d',fontSize:12}}>{initials(emp.name)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{emp.name}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{emp.company} · #{emp.id}</div>
              </div>
              {archive
                ? <span className="chip cgr" style={{fontSize:10}}>Inativo</span>
                : (emp.contractStatus&&emp.contractStatus!=='Ativo'&&emp.contractStatus!=='ativo')
                  ? <span className={`chip ${emp.contractStatus?.includes('baixa')?'co':'cgr'}`} style={{fontSize:10}}>{emp.contractStatus}</span>
                  : null
              }
            </div>
            );
          })}
        </div>
      </div>
      <div ref={detailRef} className="card" style={{padding:16,overflow:'auto'}}>
        {!sel?<div className="empty" style={{paddingTop:70}}>Seleccione um colaborador</div>:
        <>{isMobile&&<button className="btn-ghost" style={{marginBottom:8,padding:'5px 6px'}} onClick={()=>setSel(null)} title="Voltar à lista">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Voltar</span>
        </button>}
        <EmpDetail emp={sel} readOnly={readOnly} isInactive={archive} user={user} evals={evals} onSaveEval={onSaveEval} onDelEval={onDelEval} absences={absences} onSaveAbsence={onSaveAbsence} onDelAbsence={onDelAbsence} notes={notes} onSaveNote={onSaveNote} onDelNote={onDelNote} onAudit={onAudit} ferias={ferias}
          onRenameId={async(newId)=>{
            if(!onRenameId) return {ok:false,error:'Sem permissões'};
            const r = await onRenameId(sel.id, sel.company, newId);
            if(r.ok && String(newId).trim() && String(newId).trim()!==sel.id){
              setSel({...sel, id:String(newId).trim()});
            }
            return r;
          }}
          onEdit={!readOnly?()=>{setEditEmp(sel);setShowForm(true);}:null}
          onDeactivate={!readOnly&&!archive?()=>setExitModal(sel):null}
          onReturn={!readOnly&&archive?()=>setReturnModal(sel):null}
          onClose={()=>setSel(null)}/></>}
      </div>
      {showForm&&editEmp&&<EmpModal emp={editEmp} onSave={handleSave} onClose={()=>{setShowForm(false);setEditEmp(null);}} readOnly={false}/>}
      {bulkModal&&<BulkEditModal count={bulkSel.size} onApply={applyBulk} onClose={()=>setBulkModal(false)}/>}
      {exitModal&&<ExitModal emp={exitModal} onConfirm={confirmDeactivate} onClose={()=>setExitModal(null)}/>}
      {returnModal&&<ReturnModal emp={returnModal} onConfirm={confirmReturn} onClose={()=>setReturnModal(null)}/>}
    </div>
  );
}
