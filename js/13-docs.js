// Tab de documentos do colaborador: upload, listagem e download via api.php.

const DOC_TYPES=[
  {id:'cc',label:'Cartão Cidadão / BI'},
  {id:'nif',label:'Documento NIF'},
  {id:'iban',label:'Comprovativo IBAN'},
  {id:'morada',label:'Declaração de Morada'},
  {id:'carta',label:'Carta de Condução'},
  {id:'cam',label:'Certificado CAM/CQC'},
  {id:'tac',label:'Cartão Condutor Tac.'},
  {id:'contrato',label:'Contrato'},
  {id:'baixa',label:'Baixa por Doença'},
  {id:'acidente',label:'Acidente de Trabalho'},
  {id:'formcert',label:'Certificado Formação'},
  {id:'recibo',label:'Recibo de Vencimento'},
  {id:'rend',label:'Declaração Rendimentos'},
  {id:'sef',label:'Declaração SEF/Porto'},
  {id:'outro',label:'Outro'},
];
function DocsTab({empId, empCompany, empName, readOnly, user, onAudit}) {
  const [docs, setDocs]       = useState([]);
  const [dtype, setDtype]     = useState('cc');
  const [dnote, setDnote]     = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fref = useRef();

  useEffect(() => {
    let active = true;
    loadDocs(empId, empCompany).then(d => { if (active) setDocs(d); });
    return () => { active = false; };
  }, [empId, empCompany]);

  async function save(d) {
    setDocs(d);
    await saveDocs(empId, empCompany, d);
  }

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload  = e => resolve(e.target.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const docId  = Date.now().toString();
      const result = await uploadDoc(empId, empCompany, docId, file.name, file.type, dataUrl);
      const doc = {
        id:    docId,
        type:  dtype,
        label: DOC_TYPES.find(d => d.id === dtype)?.label || dtype,
        icon:  DOC_TYPES.find(d => d.id === dtype)?.label || dtype,
        note:  dnote,
        name:  file.name,
        date:  new Date().toISOString().split('T')[0],
        size:  file.size,
        mime:  file.type,
        path:  result.path,
      };
      await save([...docs, doc]);
      onAudit && onAudit(`Adicionou documento "${doc.label}" a ${empName}`, 'doc');
      setDnote('');
    } catch (e) {
      alert('Erro ao carregar ficheiro: ' + (e.message || 'Tente novamente.'));
    } finally {
      setUploading(false);
      if (fref.current) fref.current.value = '';
    }
  }

  async function del(id) {
    if (!confirm('Tem a certeza que quer eliminar este documento?')) return;
    const doc = docs.find(d => d.id === id);
    if (doc?.path) await deleteDoc(doc.path);
    await save(docs.filter(d => d.id !== id));
    onAudit && onAudit(`Eliminou documento de ${empName}`, 'doc');
  }

  // Documentos antigos têm base64 inline; novos têm path no disco.
  function docSrc(doc) {
    if (doc.path) return `${API_URL}?action=serve_doc&path=${encodeURIComponent(doc.path)}`;
    return doc.data || '';
  }

  function download(doc) {
    const a = document.createElement('a');
    a.href = docSrc(doc);
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function print(doc) {
    const url = docSrc(doc);
    const w = window.open('', '_blank');
    if (!w) return;
    if (doc.mime?.includes('image')) {
      w.document.write(`<html><body style="margin:0"><img src="${url}" style="max-width:100%"/></body></html>`);
    } else {
      w.document.write(`<html><body><embed src="${url}" width="100%" height="600" type="${doc.mime}"/></body></html>`);
    }
    w.document.close();
    setTimeout(() => w.print(), 800);
  }

  return (
    <div>
      {!readOnly && (
        <div className="container-filter">
          <div className="field" style={{flex:'1',minWidth:'150px'}}>
            <div className="fl">Tipo de Documento</div>
            <select className="fi" value={dtype} onChange={e => setDtype(e.target.value)}>
              {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="field" style={{flex:'2',minWidth:'180px'}}>
            <div className="fl">Nota</div>
            <input className="fi" value={dnote} onChange={e => setDnote(e.target.value)} placeholder="ex: Válido até ..., Jan 2026"/>
          </div>
          <button className="btn bp" onClick={() => fref.current?.click()} disabled={uploading}>
            {uploading ? 'A carregar...' : 'Adicionar Documento'}
          </button>
          <input ref={fref} type="file" style={{display:'none'}} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => upload(e.target.files[0])}/>
        </div>
      )}

      {docs.length === 0
        ? <div className="empty"><div>Sem documentos adicionados</div></div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'8px'}}>
            {docs.map(doc => (
              <div key={doc.id} className="container-doc-item" onMouseOver={e => e.currentTarget.style.borderColor='var(--red)'} onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>
                
                <div style={{fontWeight:600,fontSize:11}}>{doc.label}</div>
                {doc.note && <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{doc.note}</div>}
                <div style={{fontSize:10,color:'var(--muted)'}}>{fmtDate(doc.date)}</div>
                <div style={{display:'flex',justifyContent:'center',gap:3,marginTop:7}}>
                  <button className="btn bs btn-sm" title="Visualizar" onClick={() => { setViewDoc(doc); onAudit && onAudit(`Visualizou documento "${doc.label}" de ${empName}`, 'doc'); }}>Ver</button>
                  <button className="btn bs btn-sm" title="Download" onClick={() => download(doc)}>Download</button>
                  <button className="btn bs btn-sm" title="Imprimir" onClick={() => print(doc)}>Imprimir</button>
                  {!readOnly && <button className="btn bg btn-sm" style={{color:'var(--red)'}} title="Eliminar" onClick={() => del(doc.id)}>Elim.</button>}
                </div>
              </div>
            ))}
          </div>
      }

      {/* Visualizador de documento */}
      {viewDoc && (
        <div className="ov" onClick={e => { if (e.target === e.currentTarget) setViewDoc(null); }}>
          <div className="modal" style={{maxWidth:'90vw',width:'auto'}}>
            <div className="mh">
              <div className="mh-t">{viewDoc.label} — {empName}</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <button className="btn bs btn-sm" onClick={() => download(viewDoc)}>Download</button>
                <button className="btn bs btn-sm" onClick={() => print(viewDoc)}>Imprimir</button>
                <button className="btn bg" onClick={() => setViewDoc(null)}>✕</button>
              </div>
            </div>
            <div style={{padding:16,overflow:'auto',flex:1,display:'flex',alignItems:'center',justifyContent:'center',minHeight:400,minWidth:500}}>
              {viewDoc.mime?.includes('image')
                ? <img src={docSrc(viewDoc)} style={{maxWidth:'100%',maxHeight:'65vh'}} alt={viewDoc.label}/>
                : viewDoc.mime?.includes('pdf')
                  ? <embed src={docSrc(viewDoc)} type="application/pdf" width="700px" height="580px"/>
                  : <div style={{textAlign:'center',color:'var(--muted)'}}>
                      
                      <div>{viewDoc.name}</div>
                      <button className="btn bp" style={{marginTop:12}} onClick={() => download(viewDoc)}>Download</button>
                    </div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
