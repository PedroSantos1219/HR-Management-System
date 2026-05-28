// Centro de relatórios PDF (só admin). Construção do HTML embebido para
// cada tipo de PDF acontece toda dentro deste componente para facilitar
// ajustes de layout sem ter de mexer no PDF base.

function RelatoriosScreen({data, company, evals, user}) {
  if (!user || user.role !== 'ADMIN') {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:320,gap:10,color:'var(--muted)'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,color:'#bbb'}}>&#x1F512;</div>
        <div style={{fontWeight:700,fontSize:16,color:'var(--fg)'}}>Acesso Restrito</div>
        <div style={{fontSize:13}}>Este módulo é exclusivo para administradores.</div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayFmt = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
  const [diutFilter,  setDiutFilter]  = React.useState('all');
  const [medFilter,   setMedFilter]   = React.useState('all');
  const [sefFilter,   setSefFilter]   = React.useState('all');
  const [printOverlay,setPrintOverlay]= React.useState(null);
  const [pdfTitle,setPdfTitle]= React.useState('');
  const [showShareRel,setShowShareRel]= React.useState(false);
  const [copiedRel,setCopiedRel]= React.useState(false);
  const [generatingBackup,setGeneratingBackup]= React.useState(false);

  React.useEffect(()=>{
    if(!showShareRel) return;
    const t=setTimeout(()=>document.addEventListener('click',()=>setShowShareRel(false),{once:true}),0);
    return()=>clearTimeout(t);
  },[showShareRel]);

  const [colabMode,      setColabMode]      = React.useState('all');
  const [colabSearch,    setColabSearch]    = React.useState('');
  const [selectedIds,    setSelectedIds]    = React.useState(new Set());
  const [includeInactive,setIncludeInactive]= React.useState(false);

  function urgLabel(d) {
    if (d===null||d===undefined) return 'sem-data';
    if (d<0)    return 'vencido';
    if (d<=60)  return 'critico';
    if (d<=120) return 'atencao';
    return 'ok';
  }
  const urgMeta = {
    'vencido':  {bg:'#fdecea',color:'#c0392b',label:'Vencido'},
    'critico':  {bg:'#fff3e0',color:'#e67e22',label:'Urgente'},
    'atencao':  {bg:'#fffde7',color:'#b7950b',label:'Aten\u00e7\u00e3o'},
    'ok':       {bg:'#eafaf1',color:'#1d8348',label:'OK'},
    'sem-data': {bg:'#f5f5f5',color:'#888',   label:'Sem data'},
  };
  function urgBorderColor(d){return urgMeta[urgLabel(d)]?.color||'#ccc';}
  const filterUrgency=(rows,dKey,val)=>val==='all'?rows:rows.filter(r=>urgLabel(r[dKey])===val);
  function countUrg(rows,dKey){
    return {
      vencido:rows.filter(r=>urgLabel(r[dKey])==='vencido').length,
      critico:rows.filter(r=>urgLabel(r[dKey])==='critico').length,
      atencao:rows.filter(r=>urgLabel(r[dKey])==='atencao').length,
      ok:     rows.filter(r=>urgLabel(r[dKey])==='ok').length,
    };
  }

  const allActive   = data.employees||[];
  const allInactive = data.inactive||[];
  const emps   = allActive;
  const inEmps = allInactive;

  const withDiut = React.useMemo(()=>emps
    .map(e=>({...e,_nd:nextDiut(e),_ndDays:nextDiut(e)?daysTo(nextDiut(e)):null,_diutAtuais:calcDiut(e)}))
    .filter(e=>e._nd!==null)
    .sort((a,b)=>(a._ndDays??9999)-(b._ndDays??9999)),[emps]);

  const withMed = React.useMemo(()=>emps
    .map(e=>({...e,_nm:nextMed(e),_nmDays:nextMed(e)?daysTo(nextMed(e)):null}))
    .sort((a,b)=>(a._nmDays??9999)-(b._nmDays??9999)),[emps]);

  const withSef = React.useMemo(()=>emps
    .filter(e=>e.sefExpiry)
    .map(e=>({...e,_sd:daysTo(e.sefExpiry)}))
    .sort((a,b)=>(a._sd??9999)-(b._sd??9999)),[emps]);

  const diutRows = filterUrgency(withDiut,'_ndDays',diutFilter);
  const medRows  = filterUrgency(withMed, '_nmDays',medFilter);
  const sefRows  = filterUrgency(withSef, '_sd',    sefFilter);

  const dCnts = countUrg(withDiut,'_ndDays');
  const mCnts = countUrg(withMed, '_nmDays');
  const sCnts = countUrg(withSef, '_sd');

  const colabRows = React.useMemo(()=>{
    if (colabMode==='inactive') return inEmps;
    if (colabMode==='choose')   return emps.filter(e=>selectedIds.has(String(e.id)));
    return emps;
  },[colabMode,emps,inEmps,selectedIds]);

  const pickerList = React.useMemo(()=>emps
    .filter(e=>!colabSearch.trim()||
      (e.name||'').toLowerCase().includes(colabSearch.toLowerCase())||
      (e.company||'').toLowerCase().includes(colabSearch.toLowerCase())||
      String(e.id||'').includes(colabSearch))
    .sort((a,b)=>a.company.localeCompare(b.company)||a.name.localeCompare(b.name))
  ,[emps,colabSearch]);

  function toggleId(id){
    setSelectedIds(prev=>{const s=new Set(prev);s.has(String(id))?s.delete(String(id)):s.add(String(id));return s;});
  }
  function selectAll(){setSelectedIds(new Set(pickerList.map(e=>String(e.id))));}
  function clearAll(){setSelectedIds(new Set());}

  const baseUrl = window.location.href.replace(/\/[^\/]*(\?.*)?$/, '/');
  const logoUrl = baseUrl + 'css/assets/Logo-header.svg';
  const generatedBy = user?.name || 'RH';

  const _co = company !== 'all' ? APP_COMPANIES.find(c => c.key === company) : null;
  const _cm = _co ? {name:_co.name, color:_co.color, logo:''} : null;
  const _accent = _cm ? _cm.color : '#C0392B';
  const _compLabel = 'Todas as empresas';

  function pdfCompHeader() {
    return compLogoHtml(_cm, _accent, logoUrl);
  }

  function printCSS(){
    return `*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#2c2c2c;background:#fff;}
.pdf-header{display:flex;align-items:center;gap:18px;border-bottom:3px solid ${_accent};padding-bottom:14px;margin-bottom:18px;}
.pdf-header img{height:42px;}
.pdf-header-info h1{font-size:16px;font-weight:800;color:#1a0d0d;margin-bottom:3px;}
.pdf-header-info p{font-size:10px;color:#888;}
.pdf-meta{display:flex;gap:20px;margin-bottom:18px;background:#f9f9f9;border-radius:6px;padding:10px 14px;flex-wrap:wrap;}
.pdf-meta-item strong{color:#1a0d0d;font-size:11px;display:block;margin-bottom:1px;}
.pdf-meta-item{font-size:10px;color:#888;}
.section{margin-bottom:24px;}
.section-title{font-size:13px;font-weight:800;color:#1a0d0d;border-left:4px solid ${_accent};padding-left:10px;margin-bottom:8px;}
.section-note{font-size:10px;color:#888;margin-bottom:8px;font-style:italic;padding-left:14px;}
table{width:100%;border-collapse:collapse;margin-bottom:4px;}
th{background:#1a0d0d;color:#fff;padding:7px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;font-weight:700;}
td{padding:6px 8px;border-bottom:1px solid #ececec;font-size:11px;vertical-align:middle;}
tr:nth-child(even) td{background:#fafafa;}
.b-vencido td:first-child{border-left:4px solid #c0392b;}
.b-critico td:first-child{border-left:4px solid #e67e22;}
.b-atencao td:first-child{border-left:4px solid #b7950b;}
.b-ok td:first-child{border-left:4px solid #1d8348;}
.b-semdata td:first-child{border-left:4px solid #bbb;}
.badge{border-radius:10px;padding:2px 9px;font-size:10px;font-weight:700;display:inline-block;}
.badge-vencido{background:#fdecea;color:#c0392b;}
.badge-critico{background:#fff3e0;color:#e67e22;}
.badge-atencao{background:#fffde7;color:#b7950b;}
.badge-ok{background:#eafaf1;color:#1d8348;}
.badge-semdata{background:#f0f0f0;color:#888;}
.resumo{font-size:11px;color:#666;padding:8px 0 2px;}
.legend{display:flex;gap:12px;font-size:10px;flex-wrap:wrap;padding:6px 0 10px;}
hr.sep{border:none;border-top:1px solid #e8e8e8;margin:16px 0;}
.confidencial{background:#fdecea;color:#c0392b;font-weight:700;font-size:10px;border-radius:4px;padding:4px 10px;display:inline-block;margin-bottom:8px;}
.sec-sep{margin-top:28px;padding-top:16px;border-top:2px solid #e0e0e0;}
.footer-pdf{font-size:9px;color:#bbb;text-align:center;margin-top:20px;border-top:1px solid #eee;padding-top:8px;}
@media print{@page{margin:15mm 12mm;size:A4 landscape;}}`;
  }

  function badgeHtml(d){
    const k=urgLabel(d);
    const cls={vencido:'badge-vencido',critico:'badge-critico',atencao:'badge-atencao',ok:'badge-ok','sem-data':'badge-semdata'};
    const lbl={vencido:'Vencido',critico:'Urgente',atencao:'Aten\u00e7\u00e3o',ok:'OK','sem-data':'Sem data'};
    const suffix=(d!==null&&d!==undefined&&d>=0)?' ('+d+'d)':'';
    return '<span class="badge '+(cls[k]||'')+'">'+( lbl[k]||k)+suffix+'</span>';
  }
  function rowCls(d){const m={vencido:'b-vencido',critico:'b-critico',atencao:'b-atencao',ok:'b-ok','sem-data':'b-semdata'};return m[urgLabel(d)]||'';}

  function pdfWrap(title,subtitle,bodyHtml){
    const compName = _cm ? _cm.name : 'HR Management';
    return `<div class="pdf-header">
      ${pdfCompHeader()}
      <div class="pdf-header-info"><h1>${title}</h1><p>${subtitle || (compName + ' &middot; Gest\u00e3o RH')}</p></div>
    </div>
    <div class="pdf-meta">
      <div class="pdf-meta-item"><strong>${todayFmt}</strong>Data de gera\u00e7\u00e3o</div>
      <div class="pdf-meta-item"><strong>${generatedBy}</strong>Gerado por</div>
      <div class="pdf-meta-item"><strong>${_compLabel}</strong>Empresa</div>
    </div>
    ${bodyHtml}
    <div class="footer-pdf">Gerado em ${todayFmt} &middot; ${generatedBy} &middot; ${compName} &mdash; HR Management</div>`;
  }

  function pdfTable(cols,rows,urgDKey){
    if(!rows.length) return '<p style="color:#888;font-size:12px;padding:8px 0">Sem registos para o filtro seleccionado.</p>';
    const thead='<tr>'+cols.map(c=>'<th>'+c.h+'</th>').join('')+'</tr>';
    const tbody=rows.map(r=>'<tr class="'+rowCls(urgDKey?r[urgDKey]:null)+'">'+cols.map(c=>'<td>'+c.fn(r)+'</td>').join('')+'</tr>').join('');
    return '<table><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table>';
  }

  function pdfResumoUrg(cnts){
    return `<div class="resumo">
      <strong>Resumo:</strong> &nbsp;
      Vencidas: <strong style="color:#c0392b">${cnts.vencido}</strong> &nbsp;|&nbsp;
      Urgentes (&le;60d): <strong style="color:#e67e22">${cnts.critico}</strong> &nbsp;|&nbsp;
      Aten&ccedil;&atilde;o (&le;120d): <strong style="color:#b7950b">${cnts.atencao}</strong> &nbsp;|&nbsp;
      OK: <strong style="color:#1d8348">${cnts.ok}</strong>
    </div>`;
  }

  function pdfLegend(){
    return `<div class="legend">
      <span class="badge badge--expired">Vencido</span> prazo ultrapassado &nbsp;
      <span class="badge badge--urgent">Urgente</span> &le;60 dias &nbsp;
      <span class="badge badge--attention">Aten&ccedil;&atilde;o</span> &le;120 dias &nbsp;
      <span class="badge badge--ok">OK</span> &gt;120 dias
    </div>`;
  }

  function openPdf(html,title='Relatório'){
    setPdfTitle(title);
    setPrintOverlay(html);
  }

  function buildPdfEmpsGerais(rows,subtitle){
    const cols=[
      {h:'Nome',fn:r=>r.name||'&mdash;'},
      {h:'Empresa',fn:r=>r.company||'&mdash;'},
      {h:'Fun&ccedil;&atilde;o',fn:r=>r.role||'&mdash;'},
      {h:'Contrato',fn:r=>r.contractType||'&mdash;'},
      {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'&mdash;'},
      {h:'Estado',fn:r=>r.contractStatus||'Ativo'},
    ];
    return pdfWrap('Colaboradores &mdash; Dados Gerais',subtitle,
      `<div class="section">
         <div class="section-title">Lista de Colaboradores (${rows.length})</div>
         <div class="section-note">Dados de identifica&ccedil;&atilde;o e contrato.</div>
         ${pdfTable(cols,rows,null)}
       </div>`);
  }

  function buildPdfEmpsCombo(activeRows,inactiveRows){
    const cols=[
      {h:'Nome',fn:r=>r.name||'&mdash;'},
      {h:'Empresa',fn:r=>r.company||'&mdash;'},
      {h:'Fun&ccedil;&atilde;o',fn:r=>r.role||'&mdash;'},
      {h:'Contrato',fn:r=>r.contractType||'&mdash;'},
      {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'&mdash;'},
      {h:'Estado',fn:r=>r.contractStatus||'Ativo'},
    ];
    return pdfWrap('Colaboradores &mdash; Ativos e Inativos','Todos os colaboradores',
      `<div class="section">
        <div class="section-title">Colaboradores Ativos (${activeRows.length})</div>
        ${pdfTable(cols,activeRows,null)}
      </div>
      <div class="section sec-sep">
        <div class="section-title">Colaboradores Inativos (${inactiveRows.length})</div>
        ${pdfTable([...cols,{h:'Sa\u00edda',fn:r=>fmtDate(r.exitDate)||'&mdash;'},{h:'Motivo',fn:r=>r.exitReason||'&mdash;'}],inactiveRows,null)}
      </div>`);
  }

  function buildPdfEmpsFinanceiro(rows){
    const cols=[
      {h:'Nome',fn:r=>r.name||'&mdash;'},
      {h:'Empresa',fn:r=>r.company||'&mdash;'},
      {h:'Fun&ccedil;&atilde;o',fn:r=>r.role||'&mdash;'},
      {h:'NIF',fn:r=>r.nif||'&mdash;'},
      {h:'NISS',fn:r=>r.niss||'&mdash;'},
      {h:'IBAN',fn:r=>r.iban||'&mdash;'},
      {h:'Ordenado (&euro;)',fn:r=>r.baseSalary||'&mdash;'},
      {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'&mdash;'},
    ];
    return pdfWrap('Colaboradores &mdash; Dados Financeiros','CONFIDENCIAL &mdash; Restrito ao Departamento de RH',
      `<div class="section">
        <div class="confidencial">DOCUMENTO CONFIDENCIAL &mdash; N&atilde;o distribuir</div>
        <div class="section-title">Dados Financeiros (${rows.length} colaboradores)</div>
        <div class="section-note">NIF, NISS, IBAN e ordenado base. Utilizar exclusivamente para processamento salarial.</div>
        ${pdfTable(cols,rows,null)}
      </div>`);
  }

  function buildPdfDiut(rows,filterLabel){
    const cols=[
      {h:'Colaborador',fn:r=>r.name||'&mdash;'},
      {h:'Empresa',fn:r=>r.company||'&mdash;'},
      {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'&mdash;'},
      {h:'Diut. Atuais',fn:r=>calcDiut(r)},
      {h:'Pr&oacute;xima',fn:r=>fmtDate(r._nd)||'&mdash;'},
      {h:'Estado',fn:r=>badgeHtml(r._ndDays)},
    ];
    const fLabel=filterLabel==='all'?'Todos os registos':'Filtro: '+urgMeta[filterLabel]?.label;
    return pdfWrap('Diuturnidades',fLabel,
      `${pdfLegend()}
       <div class="section">
         <div class="section-title">Diuturnidades &mdash; ${fLabel} (${rows.length})</div>
         <div class="section-note">CCT ANTRAM-FECTRANS &mdash; ciclos de 3 anos a partir da data de admiss&atilde;o.</div>
         ${pdfTable(cols,rows,'_ndDays')}
       </div>
       <hr class="sep"/>
       ${pdfResumoUrg(dCnts)}`);
  }

  function buildPdfMed(rows,filterLabel){
    const cols=[
      {h:'Colaborador',fn:r=>r.name||'&mdash;'},
      {h:'Empresa',fn:r=>r.company||'&mdash;'},
      {h:'Data Nasc.',fn:r=>fmtDate(r.birthDate)||'&mdash;'},
      {h:'Periodicidade',fn:r=>(ageOf(r.birthDate)>=50?'Anual (&ge;50)':'Bienal (&lt;50)')},
      {h:'&Uacute;lt. Consulta',fn:r=>fmtDate(r.lastMedicalConsult)||'Sem registo'},
      {h:'Pr&oacute;xima',fn:r=>fmtDate(r._nm)||'&mdash;'},
      {h:'Estado',fn:r=>badgeHtml(r._nmDays)},
    ];
    const fLabel=filterLabel==='all'?'Todos os registos':'Filtro: '+urgMeta[filterLabel]?.label;
    return pdfWrap('Medicina do Trabalho',fLabel,
      `${pdfLegend()}
       <div class="section">
         <div class="section-title">Medicina do Trabalho &mdash; ${fLabel} (${rows.length})</div>
         <div class="section-note">Obrigat&oacute;rio por lei (Lei n.&ordm; 102/2009). Periodicidade: anual se &ge;50 anos, bienal se &lt;50 anos.</div>
         ${pdfTable(cols,rows,'_nmDays')}
       </div>
       <hr class="sep"/>
       ${pdfResumoUrg(mCnts)}`);
  }

  function buildPdfSef(rows,filterLabel){
    const cols=[
      {h:'Colaborador',fn:r=>r.name||'&mdash;'},
      {h:'Empresa',fn:r=>r.company||'&mdash;'},
      {h:'Nacionalidade',fn:r=>r.nationality||'&mdash;'},
      {h:'Validade SEF',fn:r=>fmtDate(r.sefExpiry)||'&mdash;'},
      {h:'Estado',fn:r=>badgeHtml(r._sd)},
    ];
    const fLabel=filterLabel==='all'?'Todos os registos':'Filtro: '+urgMeta[filterLabel]?.label;
    return pdfWrap('SEF / Autoriza\u00e7\u00f5es de Resid\u00eancia',fLabel,
      `${pdfLegend()}
       <div class="section">
         <div class="section-title">SEF / Autoriza&ccedil;&otilde;es de Resid&ecirc;ncia &mdash; ${fLabel} (${rows.length})</div>
         <div class="section-note">Trabalhadores com autoriza&ccedil;&atilde;o de resid&ecirc;ncia ou visto de trabalho.</div>
         ${pdfTable(cols,rows,'_sd')}
       </div>
       <hr class="sep"/>
       ${pdfResumoUrg(sCnts)}`);
  }

  async function buildPdfBackupCompleto(){
    setGeneratingBackup(true);
    try{
      let training=[];
      let allEpi={};
      try{ training = (await apiCall('get_training')) || []; }catch(e){}
      try{ allEpi   = (await loadAllEpi()) || {}; }catch(e){}

      const fer    = (data&&data.ferias)       ||[];
      const ferCfg = (data&&data.feriasConfig) ||[];
      const cy = new Date().getFullYear();

      const cTraining = company==='all'?training:training.filter(r=>r.empCompany===company);

      const withCartas = emps.map(e=>({
        ...e,
        _dL: e.driverLicenseExpiry?daysTo(e.driverLicenseExpiry):null,
        _dC: e.camExpiry?daysTo(e.camExpiry):null,
        _dT: e.tachographCardExpiry?daysTo(e.tachographCardExpiry):null,
        _dA: e.adrExpiry?daysTo(e.adrExpiry):null,
      })).filter(e=>e.driverLicense||e.camExpiry||e.tachographCardExpiry||e.adrExpiry)
        .sort((a,b)=>(a._dL??9999)-(b._dL??9999));

      const isCert=r=>r.certified===true||r.certified==='Sim';
      const catLbl=r=>{
        if(r.categoryLabel&&r.categoryLabel.trim())return r.categoryLabel.trim();
        const found=TRAIN_CATS.find(c=>c.id===r.category);
        return found?found.label:(r.category||'—');
      };

      const sections=[];
      let n=1;

      sections.push({
        n:n++, icon:'\u{1F465}', title:'Colaboradores Ativos',
        desc:'Identificação, função e estado contratual de cada colaborador ativo.',
        count:emps.length,
        body:pdfTable([
          {h:'Nome',fn:r=>r.name||'—'},
          {h:'Empresa',fn:r=>r.company||'—'},
          {h:'Fun&ccedil;&atilde;o',fn:r=>r.role||'—'},
          {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'—'},
          {h:'Estado',fn:r=>r.contractStatus||'—'},
          {h:'Telefone',fn:r=>r.personalPhone||'—'},
        ],emps,null)
      });

      if(inEmps.length){
        sections.push({
          n:n++, icon:'\u{1F4C1}', title:'Arquivo de Inativos',
          desc:'Colaboradores que j&aacute; sa&iacute;ram da empresa.',
          count:inEmps.length,
          body:pdfTable([
            {h:'Nome',fn:r=>r.name||'—'},
            {h:'Empresa',fn:r=>r.company||'—'},
            {h:'Fun&ccedil;&atilde;o',fn:r=>r.role||'—'},
            {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'—'},
            {h:'Sa&iacute;da',fn:r=>fmtDate(r.exitDate)||'—'},
            {h:'Motivo',fn:r=>r.exitReason||'—'},
          ],inEmps,null)
        });
      }

      sections.push({
        n:n++, icon:'\u{1F4D1}', title:'Contratos',
        desc:'Tipo de contrato (Efetivo, Termo Certo, Indeterminado) e estado actual.',
        count:emps.length,
        body:pdfTable([
          {h:'Nome',fn:r=>r.name||'—'},
          {h:'Empresa',fn:r=>r.company||'—'},
          {h:'Tipo Contrato',fn:r=>r.contractEndDate||'—'},
          {h:'Estado',fn:r=>r.contractStatus||'Ativo'},
          {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'—'},
        ],emps,null)
      });

      sections.push({
        n:n++, icon:'\u{1F4BC}', title:'Dados Financeiros',
        desc:'<span class="confidencial">CONFIDENCIAL &mdash; Restrito ao Departamento de RH</span>&nbsp;NIF, NISS, IBAN e ordenado base. Utilizar exclusivamente para processamento salarial.',
        count:emps.length,
        body:pdfTable([
          {h:'Nome',fn:r=>r.name||'—'},
          {h:'Empresa',fn:r=>r.company||'—'},
          {h:'NIF',fn:r=>r.nif||'—'},
          {h:'NISS',fn:r=>r.niss||'—'},
          {h:'IBAN',fn:r=>r.iban||'—'},
          {h:'Ordenado (&euro;)',fn:r=>r.baseSalary?parseFloat(r.baseSalary).toFixed(2):'—'},
          {h:'Diut.',fn:r=>calcDiut(r)},
        ],emps,null)
      });

      sections.push({
        n:n++, icon:'\u{1F4C8}', title:'Diuturnidades',
        desc:'CCT ANTRAM-FECTRANS &mdash; ciclos de 3 anos a partir da data de admiss&atilde;o. M&aacute;ximo: 15 diuturnidades. Valor unit&aacute;rio: 24,63 &euro;/m&ecirc;s.',
        count:withDiut.length,
        body:pdfTable([
          {h:'Nome',fn:r=>r.name||'—'},
          {h:'Empresa',fn:r=>r.company||'—'},
          {h:'Admiss&atilde;o',fn:r=>fmtDate(r.admissionDate)||'—'},
          {h:'Atuais',fn:r=>calcDiut(r)},
          {h:'Pr&oacute;xima',fn:r=>fmtDate(r._nd)||'—'},
          {h:'Estado',fn:r=>badgeHtml(r._ndDays)},
        ],withDiut,'_ndDays')
      });

      sections.push({
        n:n++, icon:'\u{1FA7A}', title:'Medicina do Trabalho',
        desc:'Lei n.&ordm; 102/2009. Anual para &ge;50 anos, bienal para &lt;50 anos. A pr&oacute;xima consulta &eacute; calculada a partir da &uacute;ltima registada.',
        count:withMed.length,
        body:pdfTable([
          {h:'Nome',fn:r=>r.name||'—'},
          {h:'Empresa',fn:r=>r.company||'—'},
          {h:'Periodicidade',fn:r=>(ageOf(r.birthDate)>=50?'Anual':'Bienal')},
          {h:'&Uacute;lt. Consulta',fn:r=>fmtDate(r.lastMedicalConsult)||'Sem registo'},
          {h:'Pr&oacute;xima',fn:r=>fmtDate(r._nm)||'—'},
          {h:'Estado',fn:r=>badgeHtml(r._nmDays)},
        ],withMed,'_nmDays')
      });

      if(withSef.length){
        sections.push({
          n:n++, icon:'\u{1F6C2}', title:'SEF / Autorizações de Residência',
          desc:'Trabalhadores com autoriza&ccedil;&atilde;o de resid&ecirc;ncia ou visto de trabalho.',
          count:withSef.length,
          body:pdfTable([
            {h:'Nome',fn:r=>r.name||'—'},
            {h:'Empresa',fn:r=>r.company||'—'},
            {h:'Nacionalidade',fn:r=>r.nationality||'—'},
            {h:'Validade SEF',fn:r=>fmtDate(r.sefExpiry)||'—'},
            {h:'Estado',fn:r=>badgeHtml(r._sd)},
          ],withSef,'_sd')
        });
      }

      if(withCartas.length){
        sections.push({
          n:n++, icon:'\u{1F69B}', title:'Cartas de Condução',
          desc:'Validades da carta, CAM/CQC, tac&oacute;grafo e ADR para condutores profissionais.',
          count:withCartas.length,
          body:pdfTable([
            {h:'Nome',fn:r=>r.name||'—'},
            {h:'Empresa',fn:r=>r.company||'—'},
            {h:'Carta',fn:r=>r.driverLicense||'—'},
            {h:'Val. Carta',fn:r=>fmtDate(r.driverLicenseExpiry)||'—'},
            {h:'CAM/CQC',fn:r=>fmtDate(r.camExpiry)||'—'},
            {h:'Tac&oacute;grafo',fn:r=>fmtDate(r.tachographCardExpiry)||'—'},
            {h:'ADR',fn:r=>fmtDate(r.adrExpiry)||'—'},
            {h:'Estado',fn:r=>badgeHtml(r._dL)},
          ],withCartas,'_dL')
        });
      }

      if(cTraining.length){
        sections.push({
          n:n++, icon:'\u{1F393}', title:'Formação Contínua',
          desc:'A&ccedil;&otilde;es de forma&ccedil;&atilde;o interna e externa registadas, conforme exig&ecirc;ncia do Relat&oacute;rio &Uacute;nico.',
          count:cTraining.length,
          body:pdfTable([
            {h:'Colaborador',fn:r=>r.empName||'—'},
            {h:'Empresa',fn:r=>r.empCompany||'—'},
            {h:'Tipo',fn:r=>r.type==='interna'?'Interna':r.type==='externa'?'Externa':'—'},
            {h:'Categoria',fn:r=>catLbl(r)},
            {h:'Forma&ccedil;&atilde;o',fn:r=>r.trainingName||r.description||'—'},
            {h:'Entidade Formadora',fn:r=>r.entity||'—'},
            {h:'Data',fn:r=>fmtDate(r.date)||'—'},
            {h:'Horas',fn:r=>r.hours||'—'},
            {h:'Cert.',fn:r=>isCert(r)?'Sim':'N&atilde;o'},
          ],cTraining,null)
        });
      }

      const epiRows=[];
      emps.forEach(e=>{
        const eData = allEpi[(e.id||'')+'|'+(e.company||'')] || {};
        EPI_ITEMS.forEach(item=>{
          const hist=(eData[item.id]||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
          if(hist.length){
            const last=hist[0];
            const days=daysTo(last.date);
            const estado=(days!==null&&days<-365)?'H&aacute; mais de 1 ano':'Em dia';
            epiRows.push({empName:e.name,empCompany:e.company,item:item.label,lastDate:fmtDate(last.date),count:hist.length,estado});
          }
        });
      });
      if(epiRows.length){
        epiRows.sort((a,b)=>(a.empName||'').localeCompare(b.empName||'')||(a.item||'').localeCompare(b.item||''));
        sections.push({
          n:n++, icon:'\u{1F9BA}', title:'EPIs &mdash; Equipamentos de Proteção Individual',
          desc:'Hist&oacute;rico de entregas registadas (capacete, colete, botas, luvas, &oacute;culos, prote&ccedil;&atilde;o auricular, fato).',
          count:epiRows.length,
          body:pdfTable([
            {h:'Colaborador',fn:r=>r.empName||'—'},
            {h:'Empresa',fn:r=>r.empCompany||'—'},
            {h:'EPI',fn:r=>r.item||'—'},
            {h:'&Uacute;ltima Entrega',fn:r=>r.lastDate||'—'},
            {h:'N.&ordm; Entregas',fn:r=>r.count},
            {h:'Estado',fn:r=>r.estado},
          ],epiRows,null)
        });
      }

      const ferYear    = fer.filter(f=>Number(f.year)===cy);
      const ferCfgYear = ferCfg.filter(c=>Number(c.year)===cy);
      if(ferYear.length||ferCfgYear.length){
        const ferRows = emps.map(e=>{
          const periods = ferYear.filter(p=>p.empId===e.id&&p.empCompany===e.company);
          const cfg = ferCfgYear.find(c=>c.empId===e.id&&c.empCompany===e.company)||{estado:'Por Fechar'};
          const used = periods.reduce((s,p)=>s+(p.days||0),0);
          return {
            name:e.name, company:e.company,
            used, disponivel: 22-used, estado: cfg.estado,
            periodos: periods.length
              ? periods.map(p=>`${fmtDate(p.startDate)||p.startDate} → ${fmtDate(p.endDate)||p.endDate} (${p.days}d)`).join(' | ')
              : 'Sem per&iacute;odos'
          };
        });
        sections.push({
          n:n++, icon:'\u{1F3D6}️', title:`Férias — ${cy}`,
          desc:'Mapa de f&eacute;rias do ano em curso: dias gozados, dispon&iacute;veis, estado e per&iacute;odos marcados.',
          count:ferRows.length,
          body:pdfTable([
            {h:'Nome',fn:r=>r.name||'—'},
            {h:'Empresa',fn:r=>r.company||'—'},
            {h:'Gozados',fn:r=>r.used},
            {h:'Dispon&iacute;veis',fn:r=>r.disponivel},
            {h:'Estado',fn:r=>r.estado},
            {h:'Per&iacute;odos Marcados',fn:r=>r.periodos},
          ],ferRows,null)
        });
      }

      const evalsLocal = company==='all' ? (evals||[]) : (evals||[]).filter(ev=>ev.empCompany===company);
      if(evalsLocal.length){
        sections.push({
          n:n++, icon:'⭐', title:'Avaliações de Desempenho',
          desc:'Registos de avalia&ccedil;&otilde;es com tipo, notas e pr&oacute;ximas a&ccedil;&otilde;es definidas pelo respons&aacute;vel.',
          count:evalsLocal.length,
          body:pdfTable([
            {h:'Colaborador',fn:r=>{const e=allActive.find(x=>x.id===r.empId&&x.company===r.empCompany)||allInactive.find(x=>x.id===r.empId&&x.company===r.empCompany); return e?e.name:(r.empName||r.empId||'—');}},
            {h:'Empresa',fn:r=>r.empCompany||'—'},
            {h:'Tipo',fn:r=>r.type||'—'},
            {h:'Data',fn:r=>fmtDate(r.date)||'—'},
            {h:'Notas',fn:r=>(r.notes||'').replace(/[<>]/g,'').slice(0,120)},
            {h:'Pr&oacute;xima A&ccedil;&atilde;o',fn:r=>r.nextAction?(r.nextAction+(r.nextDate?` (${fmtDate(r.nextDate)})`:'')):'—'},
            {h:'Por',fn:r=>r.by||'—'},
          ],evalsLocal,null)
        });
      }

      const summaryHtml = sections.map(s=>`
        <tr>
          <td style="padding:5px 8px;font-weight:700;width:32px;color:${_accent}">${s.n}</td>
          <td style="padding:5px 8px">${s.icon||''} ${s.title}</td>
          <td style="padding:5px 8px;text-align:right;font-weight:700">${s.count}</td>
        </tr>`).join('');

      const sectionsBody = sections.map(s=>`
        <div class="section sec-sep">
          <div class="section-title">${s.icon||''} ${s.n}. ${s.title} <span style="float:right;font-size:11px;color:#888;font-weight:600">${s.count} registo${s.count===1?'':'s'}</span></div>
          <div class="section-note">${s.desc}</div>
          ${s.body}
        </div>`).join('');

      const html = pdfWrap('Backup Completo da Base de Dados',
        `Snapshot integral RH — ${todayFmt}`,
        `<div class="section">
           <div class="section-title">Sum&aacute;rio do Backup</div>
           <div class="section-note">${sections.length} sec&ccedil;&otilde;es inclu&iacute;das. Cada sec&ccedil;&atilde;o corresponde a um m&oacute;dulo do HR Management.</div>
           <table>
             <thead><tr><th style="width:32px">#</th><th>M&oacute;dulo</th><th style="text-align:right;width:90px">Registos</th></tr></thead>
             <tbody>${summaryHtml}</tbody>
           </table>
         </div>
         ${sectionsBody}`);

      openPdf(html,'Backup Completo da Base de Dados');
    }finally{
      setGeneratingBackup(false);
    }
  }

  if (printOverlay!==null){
    const shareText=`${pdfTitle}\nEmpresa: ${_compLabel}\nGerado em ${todayFmt} por ${generatedBy}\n\nHR Management`;
    const enc=encodeURIComponent(shareText);
    return(
      <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:9999,background:'white',overflowY:'auto'}}>
        <style dangerouslySetInnerHTML={{__html:`@media print{.rh-noprint{display:none!important;}.rh-printbody{padding:0!important;}}`}}/>
        <div className="rh-noprint" style={{position:'sticky',top:0,zIndex:10,background:'white',borderBottom:'3px solid '+_accent,padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,.12)'}}>
          <span style={{fontWeight:800,fontSize:14,color:'#1a0d0d'}}>{pdfTitle}</span>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button onClick={()=>window.print()}
              style={{display:'flex',alignItems:'center',gap:8,background:`linear-gradient(135deg,${_accent} 0%,${_accent}cc 100%)`,color:'white',border:'none',padding:'9px 22px',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:`0 3px 12px ${_accent}55`,letterSpacing:'.3px',transition:'filter .15s'}} onMouseOver={e=>e.currentTarget.style.filter='brightness(1.12)'} onMouseOut={e=>e.currentTarget.style.filter='none'}>
              Transferir PDF
            </button>
            <button onClick={()=>generateAndSharePdf(printOverlay,pdfTitle,'share').catch(()=>{})}
              style={{display:'flex',alignItems:'center',gap:7,background:'white',border:'1.5px solid #ddd',padding:'9px 18px',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',color:'#333',transition:'border-color .15s,color .15s'}} onMouseOver={e=>{e.currentTarget.style.borderColor=_accent;e.currentTarget.style.color=_accent;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#ddd';e.currentTarget.style.color='#333';}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Partilhar
            </button>
            <button onClick={()=>{setPrintOverlay(null);setShowShareRel(false);}}
              style={{display:'flex',alignItems:'center',gap:6,background:'white',border:'1.5px solid #ddd',padding:'9px 18px',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',color:'#555',transition:'border-color .15s,color .15s'}} onMouseOver={e=>{e.currentTarget.style.borderColor='#999';e.currentTarget.style.color='#222';}} onMouseOut={e=>{e.currentTarget.style.borderColor='#ddd';e.currentTarget.style.color='#555';}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Fechar
            </button>
          </div>
        </div>
        <div className="rh-printbody" style={{maxWidth:960,margin:'0 auto',padding:'24px 28px'}}>
          <style dangerouslySetInnerHTML={{__html:printCSS()}}/>
          <div dangerouslySetInnerHTML={{__html:printOverlay}}/>
        </div>
      </div>
    );
  }

  function UrgBadge({d}){
    const k=urgLabel(d);
    const cls={'vencido':'urgency-badge--expired','critico':'urgency-badge--urgent','atencao':'urgency-badge--attention','ok':'urgency-badge--ok','sem-data':'urgency-badge--no-date'};
    const label={vencido:'Vencido',critico:'Urgente',atencao:'Atenção',ok:'OK','sem-data':'Sem data'};
    return <span className={`urgency-badge ${cls[k]||''}`}>{label[k]}{d!==null&&d!==undefined&&d>=0?' ('+d+'d)':''}</span>;
  }

  function UrgBar({value,onChange,counts}){
    const opts=[
      {k:'all',    label:'Todos',   cnt:counts.vencido+counts.critico+counts.atencao+counts.ok},
      {k:'vencido',label:'Vermelho',cnt:counts.vencido},
      {k:'critico',label:'Laranja', cnt:counts.critico},
      {k:'atencao',label:'Amarelo', cnt:counts.atencao},
      {k:'ok',     label:'Verde',   cnt:counts.ok},
    ];
    return(
      <div className="urgency-filter-bar">
        {opts.map(o=>(
          <button key={o.k} onClick={()=>onChange(o.k)} data-type={o.k}
            className={`urgency-filter-btn ${value===o.k?'active active--'+o.k:''}`}>
            {o.label}
            <span className="urgency-counter">{o.cnt}</span>
          </button>
        ))}
      </div>
    );
  }

  function MiniTable({rows,cols,urgKey,emptyMsg}){
    if(!rows.length) return <div style={{color:'var(--muted)',fontSize:13,padding:'10px 0'}}>{emptyMsg||'Sem registos.'}</div>;
    return(
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr>{cols.map(c=><th key={c.key} style={{textAlign:'left',padding:'5px 8px',borderBottom:'2px solid var(--bdr)',color:'var(--muted)',fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'.5px'}}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{borderLeft:'3px solid '+urgBorderColor(r[urgKey]),background:i%2===0?'transparent':'rgba(0,0,0,.02)'}}>
                {cols.map(c=><td key={c.key} style={{padding:'6px 8px',borderBottom:'1px solid var(--bdr)',verticalAlign:'middle'}}>
                  {c.key===urgKey
                    ? <UrgBadge d={r[c.key]}/>
                    : (['_nd','_nm','admissionDate','lastMedicalConsult','sefExpiry','birthDate'].includes(c.key)
                        ? fmtDate(r[c.key])
                        : (r[c.key]!=null?r[c.key]:'—'))
                  }
                </td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function SecCard({title,description,icon,children}){
    return(
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:800,fontSize:14,color:'var(--fg)',marginBottom:description?4:12,paddingBottom:description?0:8,borderBottom:description?'none':'1px solid var(--bdr)'}}>
          {icon&&<span style={{fontSize:18}}>{icon}</span>}
          {title}
        </div>
        {description&&<div style={{fontSize:11.5,color:'var(--muted)',marginBottom:12,paddingBottom:10,borderBottom:'1px solid var(--bdr)',lineHeight:1.55}}>{description}</div>}
        {children}
      </div>
    );
  }

  function PdfBtn({label,onClick,color}){
    const [hov,setHov]=React.useState(false);
    const c=color||_accent;
    return(
      <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{display:'flex',alignItems:'center',gap:7,padding:'8px 16px',borderRadius:7,
          border:'1.5px solid '+c,background:hov?c:'transparent',
          color:hov?'white':c,fontWeight:700,fontSize:12,cursor:'pointer',
          transition:'all .15s',whiteSpace:'nowrap'}}>
        {label}
      </button>
    );
  }

  function FilterNote({filter}){
    if(filter==='all') return null;
    const m=urgMeta[filter];
    return <div style={{fontSize:11,marginBottom:8,display:'flex',alignItems:'center',gap:6,color:'var(--muted)'}}>
      <span style={{background:m?.bg,color:m?.color,borderRadius:8,padding:'2px 9px',fontWeight:700,fontSize:11}}>{m?.label}</span>
      O PDF irá incluir apenas estes registos
    </div>;
  }

  return(
    <div style={{padding:'0 0 32px'}}>

      {/* Intro */}
      <div className="card" style={{marginBottom:16,padding:'14px 18px',borderLeft:`4px solid ${_accent}`}}>
        <div style={{fontWeight:800,fontSize:15,color:'var(--fg)',marginBottom:6}}>Centro de Relatórios</div>
        <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
          Visualize, filtre e exporte os dados RH organizados por módulo. Use o seletor de <strong>Empresa</strong> no topo da aplicação para restringir os dados a uma empresa específica.
          Cada secção tem uma <strong>tabela interactiva</strong> com filtros de urgência (vermelho = vencido, laranja = ≤60d, amarelo = ≤120d, verde = OK) e botões para gerar <strong>PDFs prontos a partilhar</strong>. No final encontra a opção de fazer um <strong>Backup Completo</strong> da base de dados em PDF (legível) ou JSON (técnico).
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:18}}>
        {[
          {label:'Colaboradores Ativos',    val:emps.length,                  color:'var(--blue)'},
          {label:'Inativos',                val:inEmps.length,                color:'var(--muted)'},
          {label:'Diut. Urgentes/Vencidas', val:dCnts.vencido+dCnts.critico, color:'#e67e22'},
          {label:'Med. Expiradas/Urgentes', val:mCnts.vencido+mCnts.critico, color:'#c0392b'},
          {label:'SEF Urgente/Vencido',     val:sCnts.vencido+sCnts.critico, color:'#8e44ad'},
        ].map(kpi=>(
          <div key={kpi.label} className="card" style={{padding:'6px 10px',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:800,color:kpi.color,lineHeight:1.1}}>{kpi.val}</div>
            <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.3}}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Colaboradores */}
      <SecCard title="Colaboradores" icon="👥"
        description="Lista detalhada dos colaboradores da empresa seleccionada. Permite gerar três tipos de PDF: Dados Gerais (nome, função, contrato), Dados Financeiros (NIF, NISS, IBAN, ordenado — confidencial) e listagem combinada de Ativos + Inativos. Pode ainda escolher manualmente um subconjunto de colaboradores.">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:8,marginBottom:14}}>
          {companyNames().map(c=>{
            const n=allActive.filter(e=>e.company===c).length, tot=allActive.length||1;
            return(
              <div key={c} style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:90,fontSize:12,fontWeight:600,color:'var(--fg)'}}>{c}</span>
                <div style={{flex:1,background:'var(--bg)',borderRadius:4,height:10}}>
                  <div style={{width:`${(n/tot)*100}%`,background:COMP_COLORS[c],height:'100%',borderRadius:4}}/>
                </div>
                <span style={{fontWeight:700,fontSize:13,minWidth:22,textAlign:'right'}}>{n}</span>
              </div>
            );
          })}
        </div>

        <div style={{borderTop:'1px solid var(--bdr)',paddingTop:12,marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:8}}>Seleção para exportação</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
            {[['all','Todos Ativos'],['choose','Selecionar Colaboradores'],['inactive','Inativos']].map(([k,l])=>(
              <button key={k} onClick={()=>{setColabMode(k);setSelectedIds(new Set());}}
                style={{padding:'6px 14px',borderRadius:20,border:'2px solid '+(colabMode===k?'var(--blue)':'transparent'),
                  background:colabMode===k?'var(--blbg)':'var(--bg)',color:colabMode===k?'var(--blue)':'var(--muted)',
                  fontWeight:700,fontSize:12,cursor:'pointer',transition:'all .15s'}}>
                {l}{k==='choose'&&selectedIds.size>0?' ('+selectedIds.size+')':''}
              </button>
            ))}
          </div>

          {colabMode==='all'&&(
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',marginBottom:8,color:'var(--muted)'}}>
              <input type="checkbox" checked={includeInactive} onChange={e=>setIncludeInactive(e.target.checked)} style={{width:14,height:14,cursor:'pointer'}}/>
              Incluir tabela de inativos no PDF
            </label>
          )}

          {colabMode==='choose'&&(
            <div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',marginBottom:8}}>
              <div style={{padding:'8px 10px',borderBottom:'1px solid var(--bdr)',display:'flex',gap:8,alignItems:'center',background:'var(--bg)'}}>
                <input value={colabSearch} onChange={e=>setColabSearch(e.target.value)}
                  placeholder="Pesquisar por nome, empresa ou n.º..."
                  className="fi" style={{flex:1,padding:'5px 10px',fontSize:12}}/>
                <button className="btn bs btn-sm" onClick={selectAll}>Todos</button>
                <button className="btn bg btn-sm" onClick={clearAll}>Limpar</button>
              </div>
              <div style={{maxHeight:220,overflowY:'auto'}}>
                {pickerList.map(e=>(
                  <label key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 12px',cursor:'pointer',borderBottom:'1px solid var(--bdr)',background:selectedIds.has(String(e.id))?'var(--blbg)':'transparent',transition:'background .1s'}}>
                    <input type="checkbox" checked={selectedIds.has(String(e.id))} onChange={()=>toggleId(e.id)} style={{width:14,height:14,cursor:'pointer',flexShrink:0}}/>
                    <span style={{width:8,height:8,borderRadius:'50%',background:COMP_COLORS[e.company]||'#ccc',flexShrink:0}}/>
                    <span style={{flex:1,fontSize:12,fontWeight:600}}>{e.name}</span>
                    <span style={{fontSize:11,color:'var(--muted)'}}>{e.company}</span>
                    <span style={{fontSize:11,color:'var(--muted)'}}>#{e.id}</span>
                  </label>
                ))}
                {!pickerList.length&&<div style={{padding:'12px',color:'var(--muted)',fontSize:12,textAlign:'center'}}>Nenhum colaborador encontrado.</div>}
              </div>
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap',borderTop:'1px solid var(--bdr)',paddingTop:10}}>
          {colabMode==='all'&&!includeInactive&&(
            <>
              <PdfBtn label="PDF Dados Gerais" color="#1a5276"
                onClick={()=>openPdf(buildPdfEmpsGerais(emps,'Colaboradores ativos'),'Colaboradores — Dados Gerais')}/>
              <PdfBtn label="PDF Dados Financeiros" color="#6c3483"
                onClick={()=>openPdf(buildPdfEmpsFinanceiro(emps),'Colaboradores — Dados Financeiros')}/>
            </>
          )}
          {colabMode==='all'&&includeInactive&&(
            <>
              <PdfBtn label="PDF Ativos + Inativos" color="#1a5276"
                onClick={()=>openPdf(buildPdfEmpsCombo(emps,inEmps),'Colaboradores — Ativos e Inativos')}/>
              <PdfBtn label="PDF Dados Financeiros" color="#6c3483"
                onClick={()=>openPdf(buildPdfEmpsFinanceiro(emps),'Colaboradores — Dados Financeiros')}/>
            </>
          )}
          {colabMode==='choose'&&(
            <>
              <PdfBtn
                label={selectedIds.size>0?`PDF Dados Gerais (${selectedIds.size} selecionados)`:'Selecione colaboradores acima'}
                color={selectedIds.size>0?'#1a5276':'#bbb'}
                onClick={()=>selectedIds.size>0&&openPdf(buildPdfEmpsGerais(colabRows,'Seleção personalizada'),'Colaboradores — Seleção Personalizada')}/>
              {selectedIds.size>0&&(
                <PdfBtn label={`PDF Dados Financeiros (${selectedIds.size} selecionados)`} color="#6c3483"
                  onClick={()=>openPdf(buildPdfEmpsFinanceiro(colabRows),'Colaboradores — Dados Financeiros (Seleção)')}/>
              )}
            </>
          )}
          {colabMode==='inactive'&&(
            <PdfBtn label="PDF Colaboradores Inativos" color="#555"
              onClick={()=>openPdf(buildPdfEmpsGerais(inEmps,'Colaboradores inativos'),'Colaboradores — Inativos')}/>
          )}
        </div>
      </SecCard>

      {/* Diuturnidades */}
      <SecCard title="Diuturnidades" icon="📈"
        description={<>Próximos ciclos de diuturnidades por colaborador. Calculado segundo o <strong>CCT ANTRAM-FECTRANS</strong> — ciclos de 3 anos a partir da data de admissão, máximo de 15 diuturnidades. Valor unitário: <strong>24,63 €/mês</strong>. Filtre por estado de urgência abaixo.</>}>
        <UrgBar value={diutFilter} onChange={setDiutFilter} counts={dCnts}/>
        <FilterNote filter={diutFilter}/>
        <MiniTable rows={diutRows} urgKey="_ndDays" cols={[
          {key:'name',         label:'Colaborador'},
          {key:'company',      label:'Empresa'},
          {key:'admissionDate',label:'Admissão'},
          {key:'_diutAtuais',  label:'Diut. Atuais'},
          {key:'_nd',          label:'Próxima'},
          {key:'_ndDays',      label:'Estado'},
        ]} emptyMsg="Nenhum colaborador com diuturnidade pendente."/>
        <div style={{display:'flex',gap:8,marginTop:10,borderTop:'1px solid var(--bdr)',paddingTop:10}}>
          <PdfBtn
            label={`PDF Diuturnidades${diutFilter!=='all'?' — '+urgMeta[diutFilter]?.label:' — Todas'}`}
            onClick={()=>openPdf(buildPdfDiut(diutRows,diutFilter),'Diuturnidades')}/>
        </div>
      </SecCard>

      {/* Medicina */}
      <SecCard title="Medicina do Trabalho" icon="🩺"
        description={<>Controlo de exames médicos obrigatórios por lei (<strong>Lei n.º 102/2009</strong>). Periodicidade: <strong>anual</strong> para colaboradores com 50 ou mais anos, <strong>bienal</strong> para os restantes. A próxima consulta é calculada automaticamente a partir da última registada.</>}>
        <UrgBar value={medFilter} onChange={setMedFilter} counts={mCnts}/>
        <FilterNote filter={medFilter}/>
        <MiniTable rows={medRows} urgKey="_nmDays" cols={[
          {key:'name',               label:'Colaborador'},
          {key:'company',            label:'Empresa'},
          {key:'lastMedicalConsult', label:'Última Consulta'},
          {key:'_nm',                label:'Próxima'},
          {key:'_nmDays',            label:'Estado'},
        ]} emptyMsg="Sem dados de medicina do trabalho registados."/>
        <div style={{display:'flex',gap:8,marginTop:10,borderTop:'1px solid var(--bdr)',paddingTop:10}}>
          <PdfBtn
            label={`PDF Medicina${medFilter!=='all'?' — '+urgMeta[medFilter]?.label:' — Todas'}`}
            onClick={()=>openPdf(buildPdfMed(medRows,medFilter),'Medicina do Trabalho')}/>
        </div>
      </SecCard>

      {/* SEF */}
      {withSef.length>0&&(
        <SecCard title="SEF / Autorizações de Residência" icon="🛂"
          description={<>Trabalhadores com <strong>autorização de residência</strong> ou <strong>visto de trabalho</strong>. Apenas inclui colaboradores com data de validade preenchida ({withSef.length} de {emps.length} ativos). Notificação por WhatsApp pode ser registada na ficha individual.</>}>
          <UrgBar value={sefFilter} onChange={setSefFilter} counts={sCnts}/>
          <FilterNote filter={sefFilter}/>
          <MiniTable rows={sefRows} urgKey="_sd" cols={[
            {key:'name',       label:'Colaborador'},
            {key:'company',    label:'Empresa'},
            {key:'nationality',label:'Nacionalidade'},
            {key:'sefExpiry',  label:'Validade'},
            {key:'_sd',        label:'Estado'},
          ]} emptyMsg="Sem registos SEF."/>
          <div style={{display:'flex',gap:8,marginTop:10,borderTop:'1px solid var(--bdr)',paddingTop:10}}>
            <PdfBtn
              label={`PDF SEF${sefFilter!=='all'?' — '+urgMeta[sefFilter]?.label:' — Todos'}`}
              onClick={()=>openPdf(buildPdfSef(sefRows,sefFilter),'SEF / Autorizações de Residência')}/>
          </div>
        </SecCard>
      )}

      {/* Backup */}
      <SecCard title="Backup da Base de Dados" icon="💾"
        description={<>Snapshot integral de todos os módulos RH. <strong>PDF</strong> — backup legível, organizado por módulo, ideal para arquivo físico ou partilha. <strong>JSON</strong> — backup técnico para migração ou restauro do sistema.</>}>

        <div style={{background:'var(--bg)',borderRadius:8,padding:'14px 16px',marginBottom:14,border:'1px solid var(--bdr)'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--fg)',marginBottom:6}}>📄 Backup Completo em PDF</div>
          <div style={{fontSize:11.5,color:'var(--muted)',marginBottom:10,lineHeight:1.5}}>
            Gera um único PDF organizado por secções: Colaboradores Ativos e Inativos, Contratos, Dados Financeiros (confidencial), Diuturnidades, Medicina do Trabalho, SEF, Cartas de Condução, Formação Contínua, EPIs, Férias e Avaliações. Inclui sumário inicial e estatísticas.
          </div>
          <button className="btn bp"
            disabled={generatingBackup}
            onClick={()=>buildPdfBackupCompleto().catch(err=>{console.error(err);alert('Erro ao gerar backup: '+(err?.message||'tente novamente.'));setGeneratingBackup(false);})}
            style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:12.5,fontWeight:700,padding:'7px 18px',background:`linear-gradient(135deg,${_accent} 0%,${_accent}cc 100%)`,boxShadow:`0 3px 10px ${_accent}44`}}>
            {!generatingBackup&&<img src="css/assets/PDF_file_icon.svg.png" alt="" style={{height:20,width:'auto',display:'block'}}/>}
            {generatingBackup?'A preparar backup…':'Gerar Backup Completo'}
          </button>
        </div>

        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:8}}>Exportações JSON (técnico)</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[
            {label:'BD Completa',fn:()=>{const b=new Blob([JSON.stringify({...data,evaluations:evals},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='roupeta_backup_'+today+'.json';a.click();}},
            {label:'Só Ativos',  fn:()=>{const b=new Blob([JSON.stringify(data.employees||[],null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='roupeta_ativos_'+today+'.json';a.click();}},
            {label:'Só Inativos',fn:()=>{const b=new Blob([JSON.stringify(data.inactive||[],null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='roupeta_inativos_'+today+'.json';a.click();}},
          ].map(({label,fn})=>(
            <button key={label} className="btn bs btn-sm" style={{fontSize:11.5}} onClick={fn}>{label} (JSON)</button>
          ))}
        </div>
      </SecCard>

    </div>
  );
}
