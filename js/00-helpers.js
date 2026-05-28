const {useState,useEffect,useMemo,useRef,useCallback} = React;

const fmtDate = s => {
  if(!s||s==='Efetivo') return s||'—';
  const d=new Date(s); if(isNaN(d)) return s;
  return d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
};
const daysTo = s => {
  if(!s) return null;
  const d=new Date(s); if(isNaN(d)) return null;
  const t=new Date(); t.setHours(0,0,0,0);
  return Math.round((d-t)/86400000);
};
const daysToBirthday = s => {
  if(!s) return null;
  const d=new Date(s); if(isNaN(d)) return null;
  const t=new Date(); t.setHours(0,0,0,0);
  const thisYr=new Date(t.getFullYear(),d.getMonth(),d.getDate());
  const diff=Math.round((thisYr-t)/86400000);
  if(diff>=0) return diff;
  const nextYr=new Date(t.getFullYear()+1,d.getMonth(),d.getDate());
  return Math.round((nextYr-t)/86400000);
};
const ageOf = s => {
  if(!s) return null;
  const d=new Date(s); if(isNaN(d)) return null;
  const t=new Date();
  let a=t.getFullYear()-d.getFullYear();
  if(t<new Date(t.getFullYear(),d.getMonth(),d.getDate())) a--;
  return a;
};
const initials = name => {
  if(!name) return '?';
  const p=name.trim().split(' ');
  return p.length===1?p[0][0].toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();
};
// Companies são carregadas em runtime via initCompanies() — populadas pelo
// servidor a partir de config.php. Objects mutáveis (Object.assign) para que
// referências feitas noutros ficheiros JS continuem válidas.
const COMP_COLORS = {};
const COMPANY_NAME = {};
let APP_COMPANIES = [];
function initCompanies(arr){
  APP_COMPANIES = Array.isArray(arr) ? arr : [];
  Object.keys(COMP_COLORS).forEach(k => delete COMP_COLORS[k]);
  Object.keys(COMPANY_NAME).forEach(k => delete COMPANY_NAME[k]);
  for(const c of APP_COMPANIES){
    if(c && c.name) COMP_COLORS[c.name] = c.color || '#999';
    if(c && c.key)  COMPANY_NAME[c.key] = c.name;
  }
}
function companyNames(){ return APP_COMPANIES.map(c => c.name); }
function isFabrilCompany(name){ return !!APP_COMPANIES.find(c => c.name === name && c.isFabril); }
function fabrilCompanyName(){ const c = APP_COMPANIES.find(c => c.isFabril); return c ? c.name : ''; }

// Empresas marcadas como fabris têm staff operativo — não contam como escritório.
const isOffice = emp => {
  if(isFabrilCompany(emp.company)) return false;
  const r=(emp.role||'').toLowerCase();
  if(!r||r.startsWith('mot')) return false;
  return /gestor|diretor|gerent|chef|escrit|t[ée]cnic|operador|tr[áa]fego|financ|contab|admin|recursos? humanos?|\brh\b|qualidad/.test(r);
};
const HIDABLE_MODULES = [
  {k:'sef',    l:'SEF'},
  {k:'cartas', l:'Cartas de Condução'},
  {k:'epi',    l:'EPIs'},
];

// emp.hidden pode ser undefined (fallback isOffice), bool (legacy, aplica-se a tudo)
// ou {sef:true, cartas:false, ...} por módulo.
const isHidden = (emp, moduleKey) => {
  const h = emp.hidden;
  if(h && typeof h==='object' && moduleKey && (moduleKey in h)) return h[moduleKey];
  if(typeof h==='boolean') return h;
  return isOffice(emp);
};
// 'escritorio' agrupa todos os ocultos (em qualquer módulo).
function matchesCompany(obj, company, key){
  if(company==='all') return true;
  if(company==='escritorio') return isHidden(obj);
  return obj[key||'company']===COMPANY_NAME[company];
}
function filterEmps(list, company){
  return company==='all' ? list : list.filter(e=>matchesCompany(e, company));
}

// Pesquisa por tokens, tolerante a acentos. Cada palavra que o utilizador
// escrever tem de aparecer no campo — assim "Diogo Martins" encontra
// "Diogo Filipe Dias Martins", e "Filipe Dias" também.
function _stripAccents(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}
function nameMatches(name, query){
  if(!query) return true;
  if(!name) return false;
  const n = _stripAccents(name);
  const tokens = _stripAccents(query).split(/\s+/).filter(Boolean);
  return tokens.every(t => n.includes(t));
}
const expClass = d => d===null?'':d<0?'exp-red':d<=60?'exp-orange':'exp-green';

const _APP_LOGO_B64 = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDI1MCA2MCI+PGc+PHJlY3QgeD0iOCIgeT0iMTIiIHdpZHRoPSIzNiIgaGVpZ2h0PSI0MCIgZmlsbD0iIzliMjMzNSIgcng9IjIiLz48cmVjdCB4PSIxNCIgeT0iMTgiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIyNCIgeT0iMTgiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIzNCIgeT0iMTgiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIxNCIgeT0iMjgiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIyNCIgeT0iMjgiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIzNCIgeT0iMjgiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIxNCIgeT0iMzgiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIyNCIgeT0iMzgiIHdpZHRoPSI1IiBoZWlnaHQ9IjE0IiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMzQiIHk9IjM4IiB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIi8+PC9nPjx0ZXh0IHg9IjU4IiB5PSIzOCIgZm9udC1mYW1pbHk9IkFyaWFsLEhlbHZldGljYSxzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjMWEwZDBkIj5IUiBNYW5hZ2VtZW50PC90ZXh0Pjwvc3ZnPg==';
function compLogoHtml(cm, accent, lUrl) {
  const c = accent || (cm && cm.color) || '#1a0d0d';
  const name = (cm && cm.name) || '';
  return `<div style="border-left:5px solid ${c};padding-left:12px"><div style="font-size:18px;font-weight:900;color:${c}">${name}</div></div>`;
}
async function generateAndSharePdf(htmlStr, title, mode) {
  const safeTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s\u2014\u2013\/\\]+/g,'_');
  const isFullDoc = /^\s*<!DOCTYPE|^\s*<html/i.test(htmlStr);
  let blob;
  try {
    if (isFullDoc) {
      blob = await new Promise((res, rej) => {
        const fr = document.createElement('iframe');
        fr.style.cssText = 'position:fixed;top:0;left:-9999px;width:820px;height:3000px;border:none;';
        document.body.appendChild(fr);
        fr.onload = async () => {
          try {
            await new Promise(r => setTimeout(r, 400));
            const b = await html2pdf().from(fr.contentDocument.body).set({
              margin:0, filename:safeTitle+'.pdf',
              jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
              html2canvas:{scale:2,useCORS:true,allowTaint:true,logging:false}
            }).outputPdf('blob');
            res(b);
          } catch(e) { rej(e); }
          finally { if (document.body.contains(fr)) document.body.removeChild(fr); }
        };
        fr.srcdoc = htmlStr;
      });
    } else {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlStr, 'text/html');
      const styleHtml = Array.from(doc.head.querySelectorAll('style')).map(s=>s.outerHTML).join('');
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:820px;background:white;';
      container.innerHTML = styleHtml + '<style>.pdf-footer{position:relative!important;}</style>' + doc.body.innerHTML;
      document.body.appendChild(container);
      try {
        blob = await html2pdf().from(container).set({
          margin:0, filename:safeTitle+'.pdf',
          jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
          html2canvas:{scale:2,useCORS:true,logging:false}
        }).outputPdf('blob');
      } finally { if (document.body.contains(container)) document.body.removeChild(container); }
    }
    const file = new File([blob], safeTitle+'.pdf', {type:'application/pdf'});
    if (navigator.canShare && navigator.canShare({files:[file]})) {
      await navigator.share({files:[file], title});
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 2000);
    }
  } catch(err) { console.error('generateAndSharePdf:',err); }
}
function Chip({label,type='gr'}){
  const m={gr:'cgr',green:'cg',red:'cr',orange:'co',blue:'cb2'};
  return <span className={`chip ${m[type]||'cgr'}`}>{label}</span>;
}
// Só motoristas contam para validação de carta/CAM/tacógrafo/ADR.
const isDriver = emp => /^mot/i.test(((emp&&emp.role)||'').trim());

// Está actualmente de férias? Olha para o array de períodos com (empId, empCompany, startDate, endDate).
// Considera "hoje" inclusivo nas duas pontas. Aceita ferias undefined.
function isOnVacation(emp, ferias, today){
  if(!emp || !ferias || !ferias.length) return false;
  const t = today || new Date().toISOString().split('T')[0];
  return ferias.some(f =>
    f.empId === emp.id && f.empCompany === emp.company &&
    f.startDate && f.startDate <= t &&
    (!f.endDate || f.endDate >= t)
  );
}

// Disponibilidade efectiva: férias sobrepõem-se a tudo (mesmo "Disponível"),
// senão devolve o que está no campo. Devolve '' se nada se aplicar.
function effectiveAvailability(emp, ferias){
  if(isOnVacation(emp, ferias)) return 'Férias';
  return emp.availability || '';
}
function ExpiryChip({date}){
  const d=daysTo(date);
  if(d===null||!date) return <span className="badge badge--neutral">—</span>;
  if(d<0) return <span className="badge badge--expired">Vencido</span>;
  if(d<=30) return <span className="badge badge--expired">{d}d</span>;
  if(d<=90) return <span className="badge badge--urgent">{d}d</span>;
  return <span className="badge badge--ok">OK</span>;
}

// Commit só no blur/Enter para não re-ordenar a tabela a meio da edição. ESC reverte.
function DateEdit({value, onCommit, disabled, className, style}){
  const [local,setLocal]=useState(value||'');
  useEffect(()=>{ setLocal(value||''); },[value]);
  const commit=()=>{ if(local!==(value||'')) onCommit(local); };
  return <input type="date" className={className||'fi'} style={style} disabled={disabled}
    value={local}
    onChange={e=>setLocal(e.target.value)}
    onBlur={commit}
    onKeyDown={e=>{
      if(e.key==='Enter'){ commit(); e.currentTarget.blur(); }
      else if(e.key==='Escape'){ setLocal(value||''); e.currentTarget.blur(); }
    }}/>;
}
function TextEdit({value, onCommit, disabled, className, style, placeholder}){
  const [local,setLocal]=useState(value||'');
  useEffect(()=>{ setLocal(value||''); },[value]);
  const commit=()=>{ if(local!==(value||'')) onCommit(local); };
  return <input className={className||'fi'} style={style} disabled={disabled} placeholder={placeholder}
    value={local}
    onChange={e=>setLocal(e.target.value)}
    onBlur={commit}
    onKeyDown={e=>{
      if(e.key==='Enter'){ commit(); e.currentTarget.blur(); }
      else if(e.key==='Escape'){ setLocal(value||''); e.currentTarget.blur(); }
    }}/>;
}

// Aberto ao clicar numa linha em SEF/Cartas/EPIs: data do módulo, ficha do colaborador
// e checkboxes para ocultar nos vários módulos.
function RowActionsModal({emp, moduleKey, moduleLabel, dateField, dateLabel,
                          onClose, onUpdateField, onToggleHiddenIn, onGotoFicha}){
  if(!emp) return null;
  return (
    <div className="ov" onClick={e=>{if(e.target===e.currentTarget) onClose();}}>
      <div className="modal row-actions">
        <div className="mh">
          <div>
            <div className="mh-t">{emp.name}</div>
            <div className="row-actions__sub">{emp.role||'—'} · {emp.company} · #{emp.id}</div>
          </div>
          <button className="btn bg" onClick={onClose}>✕</button>
        </div>
        <div className="mb">
          {dateField && (
            <div className="field row-actions__date">
              <div className="fl">{dateLabel}</div>
              <DateEdit value={emp[dateField]} onCommit={v=>onUpdateField(dateField, v)}/>
            </div>
          )}

          {onGotoFicha && (
            <button className="row-actions__item" onClick={()=>{ onGotoFicha(emp); onClose(); }}>
              <span className="row-actions__icon">👤</span>
              <span>Ir para a ficha completa</span>
              <span className="row-actions__arrow">→</span>
            </button>
          )}

          {onToggleHiddenIn && (
            <div className="row-actions__more">
              <div className="row-actions__more-label">Ocultar nos módulos</div>
              <div className="row-actions__modules">
                {HIDABLE_MODULES.map(m=>(
                  <label key={m.k} className="row-actions__module">
                    <input type="checkbox" checked={isHidden(emp, m.k)}
                      onChange={()=>onToggleHiddenIn(m.k)}/>
                    <span>{m.l}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 1 ano se ≥50, 2 anos caso contrário (lei portuguesa).
const nextMed = emp => {
  const a=ageOf(emp.birthDate), last=emp.lastMedicalConsult;
  if(!last) return null;
  const y=a&&a>=50?1:2, d=new Date(last);
  d.setFullYear(d.getFullYear()+y);
  return d.toISOString().split('T')[0];
};
// 1 diuturnidade a cada 3 anos desde a admissão, máximo 5 (aplica-se a todos).
const DIUT_MAX = 5;
const calcDiut = emp => {
  if(!emp.admissionDate) return 0;
  const start=new Date(emp.admissionDate);
  const end=emp.endDate?new Date(emp.endDate):new Date();
  const years=(end-start)/(365.25*24*3600*1000);
  return Math.min(DIUT_MAX, Math.max(0,Math.floor(years/3)));
};
const nextDiut = emp => {
  if(!emp.admissionDate) return null;
  const n=calcDiut(emp);
  if(n>=DIUT_MAX) return null;
  const d=new Date(emp.admissionDate);
  d.setFullYear(d.getFullYear()+(n+1)*3);
  return d.toISOString().split('T')[0];
};