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
const COMP_COLORS={'Roupeta':'#9b2335','Roupeta II':'#9b2335','Arlize':'#1A5276','Pit Evolution':'#4B5320'};
const COMPANY_NAME={roupeta:'Roupeta',roupeta2:'Roupeta II',arlize:'Arlize',pit:'Pit Evolution'};

// Pit Evolution é uma empresa separada — os técnicos dela não contam como escritório.
const isOffice = emp => {
  if(emp.company==='Pit Evolution') return false;
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
const expClass = d => d===null?'':d<0?'exp-red':d<=60?'exp-orange':'exp-green';

const _ROUPETA_LOGO_B64 = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMjk1Ljc0IDkzLjI3Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIxMDAuMjEiIHkxPSI2My4wNyIgeDI9IjgzLjc3IiB5Mj0iMjAuMjQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMyYjI1MjMiPjwvc3RvcD48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNkOWQ5ZGEiPjwvc3RvcD48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9IjEwMC4wOCIgeTE9IjYyLjM5IiB4Mj0iODQuMjQiIHkyPSIyMS4xMyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzlhOTk5YSI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmZiI+PC9zdG9wPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjIiB4MT0iMTA5LjkyIiB5MT0iNDQuMTQiIHgyPSI3NS45MSIgeTI9IjM5LjM3IiB4bGluazpocmVmPSIjYiI+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImQiIHgxPSI5OS4zMSIgeTE9IjU4LjU2IiB4Mj0iODYuMzkiIHkyPSIyNC45MiIgeGxpbms6aHJlZj0iI2EiPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJlIiB4MT0iOTkuMTYiIHkxPSI1Ny45IiB4Mj0iODYuNjYiIHkyPSIyNS4zNSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzJiMjUyMyI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC40OCIgc3RvcC1jb2xvcj0iI2VkZWRlZSI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzVlNWI1YyI+PC9zdG9wPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJmIiB4MT0iOTkuMSIgeTE9IjU3LjYzIiB4Mj0iODYuODUiIHkyPSIyNS43NCIgeGxpbms6aHJlZj0iI2EiPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iOTguOTciIHkxPSI1Ny4wOCIgeDI9Ijg3LjA4IiB5Mj0iMjYuMTMiIHhsaW5rOmhyZWY9IiNiIj48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iaCIgeDE9Ijk4LjQzIiB5MT0iNTQuOTYiIHgyPSI4OC4yNiIgeTI9IjI4LjQ4IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjODg4NTg3Ij48L3N0b3A+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIj48L3N0b3A+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImkiIHgxPSI5Ny4xNSIgeTE9IjI4LjM4IiB4Mj0iODkuNDgiIHkyPSI1NS4xMiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2M1YzRjNSI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC4xMiIgc3RvcC1jb2xvcj0iI2ZmZiI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC4yNCIgc3RvcC1jb2xvcj0iIzJlMjcyNSI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC40MSIgc3RvcC1jb2xvcj0iI2ZmZiI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC41MyIgc3RvcC1jb2xvcj0iI2ZiZmJmYyI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC42MiIgc3RvcC1jb2xvcj0iIzc2NzQ3NiI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC42OSIgc3RvcC1jb2xvcj0iI2ZmZiI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMC43OCIgc3RvcC1jb2xvcj0iIzM4MzIzMSI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2Q5ZDlkYSI+PC9zdG9wPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJqIiB4MT0iMTAyLjQ0IiB5MT0iNTIuNjYiIHgyPSI5Mi4xNCIgeTI9IjI1LjgzIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMmIyNTIzIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIwLjExIiBzdG9wLWNvbG9yPSIjOWE5OTlhIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIwLjQ3IiBzdG9wLWNvbG9yPSIjZmZmIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIwLjc0IiBzdG9wLWNvbG9yPSIjZGNkYmRlIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIwLjkiIHN0b3AtY29sb3I9IiM4ZDhjOGQiPjwvc3RvcD48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMyYjI1MjMiPjwvc3RvcD48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iayIgeDE9Ijg2LjI0IiB5MT0iNjUuOTYiIHgyPSI3MS44MSIgeTI9IjI4LjM3IiB4bGluazpocmVmPSIjaiI+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHRpdGxlPlNpdGUgUm91cGV0YSAtIFZGPC90aXRsZT48cGF0aCBkPSJNNjcuNTUsMjkuMzZhNDQuOTMsNDQuOTMsMCwwLDEtMS4xMyw3LDI0Ljg3LDI0Ljg3LDAsMCwxLTIuNzQsNi43OSwxMC43NiwxMC43NiwwLDAsMS00Ljg0LDQuNTZBMTguNTMsMTguNTMsMCwwLDEsNTkuNTksNTNhMjguNjMsMjguNjMsMCwwLDEtMiw5LjgxSDQ1LjA3YTQ3Ljc1LDQ3Ljc1LDAsMCwwLC44MS03LjYzLDEyLjc5LDEyLjc5LDAsMCwwLTEtNS4zNmMtLjU1LDEuNTQtMS4xLDIuOTMtMS42Myw0LjE3cy0xLjEzLDIuNTMtMS44LDMuODQtMS42LDMtMi43Nyw1SDI1LjU3YTY3LjIyLDY3LjIyLDAsMCwwLDUuNzEtMTIuMTVBMTE4LjY0LDExOC42NCwwLDAsMCwzNS44LDM1LjMyLDkwLjIxLDkwLjIxLDAsMCwwLDM4LDIwLjYzcTE1LDAsMjIuNTMtLjA3YTYuNTEsNi41MSwwLDAsMSwzLjczLDEuMDgsNi43Nyw2Ljc3LDAsMCwxLDIuNDYsMy4wNUExMS43MiwxMS43MiwwLDAsMSw2Ny41NSwyOS4zNlptLTEuNDcsMUE4LjM2LDguMzYsMCwwLDAsNjQuNTIsMjVhNC45NCw0Ljk0LDAsMCwwLTQuMDctMnEtNy41OC4wNi0yMC4xNi4wNUE3MS41NSw3MS41NSwwLDAsMSwzOSwzMi43MlEzOCwzOCwzNi40Myw0My40NFQzMi45NCw1My42YTQ5Ljg4LDQ5Ljg4LDAsMCwxLTMuODQsNy43OGg5LjI4YTYzLjI0LDYzLjI0LDAsMCwwLDMuMzgtNi40OHExLjE3LTIuNzEsMi41Ni02LjkybDEuMDYsMGMuMzgsMCwuNzYsMCwxLjE1LDBhMTEuNzksMTEuNzksMCwwLDEsMiw3LjE1LDM2LjE1LDM2LjE1LDAsMCwxLS42NSw2LjNsNC41NCwwLDQuNTgsMGExOS40OCwxOS40OCwwLDAsMCwxLjItNi42MiwyMi44NSwyMi44NSwwLDAsMC0xLjQ1LTcuNjNxNC45MS0uNzMsNy02LjM2QTM1LDM1LDAsMCwwLDY2LjA4LDMwLjM4Wm0tOS44Niw1LjJhMi41NCwyLjU0LDAsMCwwLS4xNi41Myw0LjM1LDQuMzUsMCwwLDEtMS4zMSwyLjMxLDMuMjksMy4yOSwwLDAsMS0yLjI3Ljg3Yy0xLjQ1LDAtMy4zOCwwLTUuOC4xMi41NC0xLjk0LDEuMDctNC4xMiwxLjYxLTYuNTRxNC4zNy0uMSw2LS4xYTEuNjYsMS42NiwwLDAsMSwxLjM5LjcyQTMuNTQsMy41NCwwLDAsMSw1Ni4yMiwzNS41OFptLTIuNTguMTFhMi40NSwyLjQ1LDAsMCwwLC4xLS43NGMwLS40Ny0uMTYtLjctLjUtLjctMS42NSwwLTMsMC00LDAtLjIyLDEtLjQ0LDEuNzktLjY1LDIuNWgzLjk0YTEuMzIsMS4zMiwwLDAsMCwuNy0uMjRBMS41NSwxLjU1LDAsMCwwLDUzLjY0LDM1LjY5WiIgc3R5bGU9ImZpbGw6I2MyMTcxOCI+PC9wYXRoPjxwYXRoIGQ9Ik0xNTQuNDEsMjAuNjFxLS4xLDQuNTItLjU5LDguNzdhNzcuMjYsNzcuMjYsMCwwLDEtMS40Myw4LjQzLDY2LjkyLDY2LjkyLDAsMCwxLTIuNDgsOC4zMyw2MC41LDYwLjUsMCwwLDEtMy43Miw4LjEyLDE3LjMzLDE3LjMzLDAsMCwxLTUuNjYsNi4xNCwxMi43OCwxMi43OCwwLDAsMS03LjEsMi40MkgxMTcuMjdxLTQuODcsMC00Ljg3LTQuMjNhMTIuNjIsMTIuNjIsMCwwLDEsMS4zMi01LjA3cTEuNDctMy4yNCwyLjgxLTdjLjg5LTIuNTEsMS43Mi01LjIxLDIuNS04LjA4czEuNDEtNS44MSwxLjkyLTguODFhNzguMjUsNzguMjUsMCwwLDAsMS04Ljg1YzItLjA1LDQuMzEtLjA4LDctLjA5czQuOSwwLDYuNjEtLjA2cS0uNDIsNC0uODYsNy4zdC0xLjA2LDYuNTNjLS40MiwyLjE5LS45Miw0LjM3LTEuNTIsNi41NXMtMS4zLDQuNC0yLjEyLDYuNjZhNC42OSw0LjY5LDAsMCwwLS4zOCwxLjExYzAsLjE4LjEzLjI3LjM4LjI3aDQuNGExLjY3LDEuNjcsMCwwLDAsLjg4LS41LDMuNCwzLjQsMCwwLDAsLjkyLTEuNDFjLjc3LTIuMTcsMS40My00LjMyLDItNi40M3MxLTQuMTUsMS4yOC02LjEyLjYxLTQuMTMuODYtNi40Ni40Ny00LjguNjctNy40cTMuMTMsMCw3LjA3LS4wNUMxNTAuNywyMC42MiwxNTIuODEsMjAuNjEsMTU0LjQxLDIwLjYxWm0tMS44NSwyLjY0LTQuNTgsMC00LjU0LDBjLS4yNCwzLS41Miw1Ljc2LS44NCw4LjI5cy0uNzksNS4xNy0xLjQxLDcuOWE3My4yNyw3My4yNywwLDAsMS0yLjQ2LDguMzgsNi4zNCw2LjM0LDAsMCwxLTEuOCwyLjYzLDMuODksMy44OSwwLDAsMS0yLjYsMS4xNmgtNC4zOWMtMS4yMSwwLTEuODEtLjQ3LTEuODEtMS40MmE3LjM4LDcuMzgsMCwwLDEsLjQ3LTIuMDZjLjgxLTIuMTksMS41LTQuMzYsMi4wOC02LjQ4czEuMDYtNC4xMywxLjQzLTYsLjcxLTMuOTEsMS02LjExLjU3LTQuMzEuNzktNi4zM2MtMS4xNiwwLTIuNzguMDctNC44NS4xcy0zLjcuMDctNC44NS4xYTcwLjM1LDcwLjM1LDAsMCwxLTEsNy43OWMtLjUsMi43OC0xLjEyLDUuNTEtMS44NCw4LjIxcy0xLjU0LDUuMzMtMi40NSw3LjkzLTEuODQsNS0yLjgsNy4wOUExMC43MywxMC43MywwLDAsMCwxMTUsNTguNDlxMCwyLjksMy4zOSwyLjloMTYuMTVhMTAuMzgsMTAuMzgsMCwwLDAsNS43NC0yLDE0LjE1LDE0LjE1LDAsMCwwLDQuNjUtNS4wOFExNTIuMDYsNDEuMjksMTUyLjU2LDIzLjI1WiIgc3R5bGU9ImZpbGw6I2MyMTcxOCI+PC9wYXRoPjxwYXRoIGQ9Ik0xODQuNjIsNDFxLTIuNjksNy4zNC0xMSw3LjQybC0zLDAtMS43MiwwaC0xLjc1bC0yLjM2LDBhOTMuNjUsOTMuNjUsMCwwLDEtNy4yOCwxNC4zMnEtMi4yMiwwLTUuNTUtLjA2dC02Ljg3LS4wNXEyLjYzLTUuMTksNC43Mi0xMC4yN3QzLjc0LTEwLjM2YTk2LjMxLDk2LjMxLDAsMCwwLDIuNy0xMC44LDc2LjQsNzYuNCwwLDAsMCwxLjMxLTEwLjY4cTMuMzIsMCw4LjA1LDBoOC42OXEzLjkzLDAsNi40NiwwLDYuNjguMDksNi42Nyw3LjcxUTE4Ny40LDMzLjM4LDE4NC42Miw0MVpNMTg2LDI5LjY2YTcuNiw3LjYsMCwwLDAtMS4zOS01QTQuODIsNC44MiwwLDAsMCwxODAuNjUsMjNxLTcuNTksMC0yMC43NSwwYTYzLjM4LDYzLjM4LDAsMCwxLTEuMjMsOS40NCw5Ny4yNyw5Ny4yNywwLDAsMS0yLjU5LDEwYy0xLjA1LDMuMzctMi4yNCw2LjY2LTMuNTQsOS44N3MtMi42NSw2LjE4LTQsOC44OWMxLjExLDAsMi41NSwwLDQuMzQuMDVzMy4yMywwLDQuMzIsMGMxLjEyLTEuODUsMi4zNy00LjE4LDMuNzctN2E1OC43NSw1OC43NSwwLDAsMCwzLjExLTcuMzJsMy4zMywwLDMuMzgsMCwzLjkyLDBBOS44NSw5Ljg1LDAsMCwwLDE4MCw0NS42M2E4LjI0LDguMjQsMCwwLDAsMy4yLTQuMjlBNDAuNSw0MC41LDAsMCwwLDE4NiwyOS42NlptLTkuNzcsNS43NWExLjksMS45LDAsMCwxLS4wNy4yOGMwLC4xLS4wNi4yLS4wOC4zYTQsNCwwLDAsMS0xLjMxLDIuMjgsMy41LDMuNSwwLDAsMS0yLjMzLjg3Yy0yLjUzLDAtNC41MSwwLTUuOTMsMCwuMDgtLjI1LjI2LS44NS41NS0xLjhzLjUtMS43LjY1LTIuMjguMy0xLjM2LjQ3LTIuMzRjMi45LS4wNyw1LS4xMSw2LjEyLS4xMWExLjY2LDEuNjYsMCwwLDEsMS40MS43MkEzLjM4LDMuMzgsMCwwLDEsMTc2LjIxLDM1LjQxWk0xNzMuNzgsMzVhMS4wNywxLjA3LDAsMCwwLS4xNy0uNTkuNTEuNTEsMCwwLDAtLjQ0LS4yNmMtMS42NSwwLTMsMC00LDAtLjIuODUtLjQyLDEuNjctLjY3LDIuNDksMSwwLDIuNC0uMDUsNC4wNi0uMDUuNTYsMCwuOTMtLjM1LDEuMTEtMS4wNloiIHN0eWxlPSJmaWxsOiNjMjE3MTgiPjwvcGF0aD48cGF0aCBkPSJNMjE5LjQ3LDIwLjcyYTExMCwxMTAsMCwwLDEtMS4xNiwxMy43MnEtOS0uMjctMTMuODUtLjI3Yy0uMDguMzQtLjE3LjctLjI5LDEuMDZzLS4yMi43MS0uMzEsMS4wNXE1LjgsMCwxMi41Mi4xLTEuNCw1LjE1LTMuNTYsMTFIMjAwLjM3bC0uNjcsMS43Myw0LDAsMy42MSwwLDYuMjYsMGMtMS41NSwzLTIuODUsNS40MS0zLjg3LDcuMThzLTIuMzksNC00LjEsNi42OGwtOC40MiwwLTUuODgsMEgxODZsLTguNTMsMGE4OC42Niw4OC42NiwwLDAsMCw2LjcxLTEzLjQ4LDExMi41MSwxMTIuNTEsMCwwLDAsNC44Ny0xNSw3OCw3OCwwLDAsMCwyLjIyLTEzLjY1bDcuNTYsMGg2LjMxbDcuMywwUTIxNywyMC42OSwyMTkuNDcsMjAuNzJabS0xLjY2LDIuNDctNi44MywwSDIwMGwtNi4xMSwwYTU5LDU5LDAsMCwxLTEuMzEsOC42NXEtMS4wOCw1LTIuODMsMTAuNDhjLTEuMTcsMy42My0yLjQ2LDcuMDktMy45LDEwLjRhNjguMDUsNjguMDUsMCwwLDEtNC40Myw4LjY2YzQuNDYsMCw4LjE5LDAsMTEuMTksMGgxMi43M2MyLjA1LTMuMTYsNC02LjQ0LDUuNzYtOS44N3EtNiwuMDYtMTMuNTYuMDVjLjY1LTEuNzksMS4zMi0zLjY3LDItNS42M3E0LjcxLDAsMTIuNTMsMGE2OC4xMSw2OC4xMSwwLDAsMCwyLjMyLTdxLTUuNjUsMC0xMi41Ny0uMDUsMS4wOS0zLjcsMS43MS02LDcuNTksMCwxMy42My4xNkE3NC41OCw3NC41OCwwLDAsMCwyMTcuODEsMjMuMTlaIiBzdHlsZT0iZmlsbDojYzIxNzE4Ij48L3BhdGg+PHBhdGggZD0iTTI1OS42NSwyMC43YzAsLjM5LjA2Ljk1LjA2LDEuNjlhMzguMTQsMzguMTQsMCwwLDEtMi4zMiwxMi4xNmMtMS43Mi0uMDctMy41Ny0uMS01LjU3LS4xbC0yLjM5LDBjLTEsMC0xLjgyLDAtMi40MywwLS43NSwyLjU0LTEuNjIsNS0yLjU5LDcuNHMtMiw0Ljc3LTMuMjMsNy4xLTIuNDMsNC42NC0zLjc3LDctMi43Myw0LjU3LTQuMTYsNi44MUgyMTguMDljMi4xMy0zLjYyLDQtNyw1LjYxLTEwczMuMDYtNi4wNyw0LjM1LTkuMWE5NC41Myw5NC41MywwLDAsMCwzLjM2LTlxLTUuODEsMC0xMC40NC4zMWMuMzgtMi4xMi43LTMuODMuOTQtNS4xM3MuNDQtMi42Ni41OS00LjA4YTUwLjY2LDUwLjY2LDAsMCwwLC4yMy01LjIxbDguMzksMGMzLjMyLDAsNi42MiwwLDkuOSwwaDguMzZabS0xLjcxLDIuNDlxLTYsMC0xNi4xLDBjLTYuNywwLTEyLjA4LDAtMTYuMTEsMGEyOC40MSwyOC40MSwwLDAsMS0uMTksMy4zNGMtLjEyLDEtLjMsMi4wNy0uNTIsMy4xNXMtLjQ4LDIuMzQtLjc2LDMuNzVjMS4wNi0uMDUsMi43OS0uMDgsNS4yLS4wOXM0LjI0LDAsNS41LS4wN2E5OC43OCw5OC43OCwwLDAsMS0zLjQ4LDkuODVxLTEuOTIsNC42NS00LjE5LDkuMDZ0LTUuMSw5LjI1aDEwLjU2cTkuNTYtMTUuMDgsMTMuMTUtMjguMjZjMS4yNiwwLDIuNjgsMCw0LjI1LS4wOFMyNTMsMzMsMjUzLjg5LDMzYzEuMDcsMCwxLjkyLDAsMi41Ny4wNS41OS0yLjE2LDEtMy43NSwxLjIxLTQuNzhhMTguMTEsMTguMTEsMCwwLDAsLjMzLTMuNzNjMC0uMTMsMC0uMzQsMC0uNjRTMjU3Ljk0LDIzLjM1LDI1Ny45NCwyMy4xOVoiIHN0eWxlPSJmaWxsOiNjMjE3MTgiPjwvcGF0aD48cGF0aCBkPSJNMjgwLjg4LDIwLjZBNDYuNDcsNDYuNDcsMCwwLDEsMjgyLjE0LDI2cS41NCwyLjk0LjgzLDYuMjJ0LjMsNi42OWE3NC42Nyw3NC42NywwLDAsMS0uNDYsOC4xNiw1OS44MSw1OS44MSwwLDAsMS0xLjQ4LDguMTMsNDguNDEsNDguNDEsMCwwLDEtMi42Miw3LjY3SDI2Ni4xOWEyNS44NSwyNS44NSwwLDAsMSwxLjUxLTQuNTFsLTQuNzMsMC00LjY2LDBxLTMsMy41LTMuNzgsNC41NkgyNDEuMDlxNC4wOC01LDcuODktMTAuNTR0Ny0xMS4yMnEzLjIzLTUuNjYsNS41OS0xMC44OWE2Ny4wNiw2Ny4wNiwwLDAsMCwzLjU1LTkuNTdabS0xLjI1LDIuNTVIMjY3LjA4YTYyLjM4LDYyLjM4LDAsMCwxLTMuMzMsOC42OHEtMi4yNiw0LjkyLTUuMzIsMTAuMjhjLTIuMDUsMy41OC00LjE3LDctNi4zOSwxMC4zcy00LjQxLDYuMjgtNi42LDloOC45M2EyNy43NiwyNy43NiwwLDAsMSwyLTIuMzgsMjMuODUsMjMuODUsMCwwLDAsMS44OS0yLjIzcTQuNTEuMDYsMTIuNTUsMGExMC42OSwxMC42OSwwLDAsMS0uNzksMi4zMSwxNS4wOCwxNS4wOCwwLDAsMC0uODYsMi4yNWg5QTM3Ljk0LDM3Ljk0LDAsMCwwLDI4MC4yMyw1NWE1NC43Niw1NC43NiwwLDAsMCwxLjIxLTcsNzIuNjYsNzIuNjYsMCwwLDAsLjM3LTcuMjcsNzQuNyw3NC43LDAsMCwwLS41OS05LjQ4QTU1LDU1LDAsMCwwLDI3OS42MywyMy4xNVptLTcuMDUsOS4xM2E1NS40MSw1NS40MSwwLDAsMSwuNzMsOC44NSwzNy4xNSwzNy4xNSwwLDAsMS0uODksOC40M2gtOS4zM2E3NS45Miw3NS45MiwwLDAsMCw1LjI1LTguNTEsNTguNSw1OC41LDAsMCwwLDMuODgtOC43N1pNMjcwLjUsMzlhNjcuNDIsNjcuNDIsMCwwLDEtNC4zNiw4bDQuMS4wNWEzNy40OCwzNy40OCwwLDAsMCwuNDctNS4xOUExNi40OSwxNi40OSwwLDAsMCwyNzAuNSwzOVoiIHN0eWxlPSJmaWxsOiNjMjE3MTgiPjwvcGF0aD48cGF0aCBkPSJNMTAwLjQzLDYxLjE4YTE4LjE1LDE4LjE1LDAsMCwxLTcuMDUsMS41OHYtOC42QTEwLjksMTAuOSwwLDAsMCw5OCw1My40MmExMS4zNSwxMS4zNSwwLDAsMCw2LjMxLTYuMzIsMTMuNDIsMTMuNDIsMCwwLDAtNS4yLTE2LjNBMTEuNiwxMS42LDAsMCwwLDkzLjM4LDI5VjIwLjczYzMuMTQuMzQsNi4wNSwyLjA1LDguNjUsMy43OGEyMS43NCwyMS43NCwwLDAsMSw4LjY0LDExLjYsMjIuNTQsMjIuNTQsMCwwLDEsMSw2LjE0djEuMTdhMjIsMjIsMCwwLDEtMS40MSw3LjE0QTE4Ljc5LDE4Ljc5LDAsMCwxLDEwMC40Myw2MS4xOFptLTcuMDUsMS41OEExOS4zNywxOS4zNywwLDAsMSw4NC45MSw2MWEyMS45MSwyMS45MSwwLDAsMS05LjY0LTMwLjM0Qzc4LDI1LjkxLDgyLjU4LDIyLDg3LjgyLDIxYTE4LjY4LDE4LjY4LDAsMCwxLDUuNTYtLjIzVjI5YTEwLjkyLDEwLjkyLDAsMCwwLTMuMS4zQTExLjE2LDExLjE2LDAsMCwwLDgzLDM1YTEzLjM5LDEzLjM5LDAsMCwwLDUuNjYsMTcuOSwxMiwxMiwwLDAsMCw0LjY5LDEuMjVaIiBzdHlsZT0iZmlsbDp1cmwoI2EpIj48L3BhdGg+PHBhdGggZD0iTTEwMC4yNiw2MC42N2ExNy43OCwxNy43OCwwLDAsMS02Ljg4LDEuNTF2LThBMTAuOSwxMC45LDAsMCwwLDk4LDUzLjQyYTExLjM1LDExLjM1LDAsMCwwLDYuMzEtNi4zMiwxMy40MiwxMy40MiwwLDAsMC01LjItMTYuM0ExMS42LDExLjYsMCwwLDAsOTMuMzgsMjl2LTcuMmExOC45MywxOC45MywwLDAsMSw4LjQ2LDMuMTIsMjEuNDYsMjEuNDYsMCwwLDEsOC40NywxMS4zNSwyMS44OCwyMS44OCwwLDAsMSwxLDUuOTV2MS4xOGEyMC44OSwyMC44OSwwLDAsMS0xLjM5LDdBMTguMzMsMTguMzMsMCwwLDEsMTAwLjI2LDYwLjY3Wm0tNi44OCwxLjUxYTE4LjQ3LDE4LjQ3LDAsMCwxLTguMjEtMS43NywyMS4zNiwyMS4zNiwwLDAsMS05LjM2LTI5LjVBMTguMTIsMTguMTIsMCwwLDEsODgsMjJhMTcuNCwxNy40LDAsMCwxLDUuNDEtLjI0VjI5YTEwLjkyLDEwLjkyLDAsMCwwLTMuMS4zQTExLjE2LDExLjE2LDAsMCwwLDgzLDM1YTEzLjM5LDEzLjM5LDAsMCwwLDUuNjYsMTcuOSwxMiwxMiwwLDAsMCw0LjY5LDEuMjVaIiBzdHlsZT0iZmlsbDp1cmwoI2IpIj48L3BhdGg+PHBhdGggZD0iTTk5LjI1LDU3LjQ4YTE0LjY5LDE0LjY5LDAsMCwxLTUuODcsMS4xNFY1NC4xNkExMC45LDEwLjksMCwwLDAsOTgsNTMuNDJhMTEuMzUsMTEuMzUsMCwwLDAsNi4zMS02LjMyLDEzLjQyLDEzLjQyLDAsMCwwLTUuMi0xNi4zQTExLjYsMTEuNiwwLDAsMCw5My4zOCwyOVYyNC45MWExNS43NiwxNS43NiwwLDAsMSw3LjI2LDIuNTUsMTcuOTUsMTcuOTUsMCwwLDEsOCwxNC40M3YxLjE4YTE3LjI4LDE3LjI4LDAsMCwxLTEuMjIsNS44N0ExNS4yMSwxNS4yMSwwLDAsMSw5OS4yNSw1Ny40OFptLTUuODcsMS4xNGExNS42NywxNS42NywwLDAsMS02LjY1LTEuNTdBMTcuODQsMTcuODQsMCwwLDEsNzksMzIuNzQsMTUuMDYsMTUuMDYsMCwwLDEsODksMjUuMmExNC41OCwxNC41OCwwLDAsMSw0LjM5LS4yOVYyOWExMC45MiwxMC45MiwwLDAsMC0zLjEuM0ExMS4xNiwxMS4xNiwwLDAsMCw4MywzNWExMy4zOSwxMy4zOSwwLDAsMCw1LjY2LDE3LjksMTIsMTIsMCwwLDAsNC42OSwxLjI1WiIgc3R5bGU9ImZpbGw6dXJsKCNjKSI+PC9wYXRoPjxwYXRoIGQ9Ik05OS4xNSw1Ny4xNWExNC4zOCwxNC4zOCwwLDAsMS01Ljc3LDEuMVY1NC4xNkExMC45LDEwLjksMCwwLDAsOTgsNTMuNDJhMTEuMzUsMTEuMzUsMCwwLDAsNi4zMS02LjMyLDEzLjQyLDEzLjQyLDAsMCwwLTUuMi0xNi4zQTExLjYsMTEuNiwwLDAsMCw5My4zOCwyOVYyNS4yNGExNS41NSwxNS41NSwwLDAsMSw3LjE0LDIuNSwxNy4zNywxNy4zNywwLDAsMSw3LDkuMzQsMTcuMTUsMTcuMTUsMCwwLDEsLjgzLDQuNzhWNDNhMTYuODIsMTYuODIsMCwwLDEtMS4xOSw1Ljc2QTE1LDE1LDAsMCwxLDk5LjE1LDU3LjE1Wm0tNS43NywxLjFBMTUuMiwxNS4yLDAsMCwxLDg2LjksNTYuN2ExNy40NCwxNy40NCwwLDAsMS03LjUyLTIzLjc4LDE0LjcyLDE0LjcyLDAsMCwxLDkuNzItNy4zOCwxNC41MiwxNC41MiwwLDAsMSw0LjI4LS4zVjI5YTEwLjkyLDEwLjkyLDAsMCwwLTMuMS4zQTExLjE2LDExLjE2LDAsMCwwLDgzLDM1YTEzLjM5LDEzLjM5LDAsMCwwLDUuNjYsMTcuOSwxMiwxMiwwLDAsMCw0LjY5LDEuMjVaIiBzdHlsZT0iZmlsbDp1cmwoI2QpIj48L3BhdGg+PHBhdGggZD0iTTk5LDU2LjY0YTEzLjc2LDEzLjc2LDAsMCwxLTUuNiwxVjU0LjE2QTEwLjksMTAuOSwwLDAsMCw5OCw1My40MmExMS4zNSwxMS4zNSwwLDAsMCw2LjMxLTYuMzIsMTMuNDIsMTMuNDIsMCwwLDAtNS4yLTE2LjNBMTEuNiwxMS42LDAsMCwwLDkzLjM4LDI5VjI1Ljc0YTE0Ljc0LDE0Ljc0LDAsMCwxLDYuOTQsMi40MUExNywxNywwLDAsMSwxMDgsNDEuOFY0M2ExNi4yMSwxNi4yMSwwLDAsMS0xLjE4LDUuNTZBMTQuNCwxNC40LDAsMCwxLDk5LDU2LjY0Wm0tNS42LDFhMTQuODQsMTQuODQsMCwwLDEtNi4yMi0xLjUxLDE2LjkxLDE2LjkxLDAsMCwxLTcuMjktMjNBMTQuMjYsMTQuMjYsMCwwLDEsODkuMjUsMjZhMTQuOTMsMTQuOTMsMCwwLDEsNC4xMy0uM1YyOWExMC45MiwxMC45MiwwLDAsMC0zLjEuM0ExMS4xNiwxMS4xNiwwLDAsMCw4MywzNWExMy4zOSwxMy4zOSwwLDAsMCw1LjY2LDE3LjksMTIsMTIsMCwwLDAsNC42OSwxLjI1WiIgc3R5bGU9ImZpbGw6dXJsKCNlKSI+PC9wYXRoPjxwYXRoIGQ9Ik05OC44Nyw1Ni4zM2ExMy4yOSwxMy4yOSwwLDAsMS01LjQ5LDFWNTQuMTZBMTAuOSwxMC45LDAsMCwwLDk4LDUzLjQyYTExLjM1LDExLjM1LDAsMCwwLDYuMzEtNi4zMiwxMy40MiwxMy40MiwwLDAsMC01LjItMTYuM0ExMS42LDExLjYsMCwwLDAsOTMuMzgsMjlWMjYuMDZhMTQuNDEsMTQuNDEsMCwwLDEsNi44MSwyLjMzLDE2LjUzLDE2LjUzLDAsMCwxLDYuNzQsOC45LDE1Ljg1LDE1Ljg1LDAsMCwxLC43OSw0LjUxdjEuMTRhMTYuMTUsMTYuMTUsMCwwLDEtMS4xNSw1LjQ4QTE0LjE1LDE0LjE1LDAsMCwxLDk4Ljg3LDU2LjMzWm0tNS40OSwxYTE0LjMsMTQuMywwLDAsMS02LjA3LTEuNDksMTYuNTQsMTYuNTQsMCwwLDEtNy4xNC0yMi40NywxNCwxNCwwLDAsMSw5LjE5LTcsMTMuNDQsMTMuNDQsMCwwLDEsNC0uMjhWMjlhMTAuOTIsMTAuOTIsMCwwLDAtMy4xLjNBMTEuMTYsMTEuMTYsMCwwLDAsODMsMzVhMTMuMzksMTMuMzksMCwwLDAsNS42NiwxNy45LDEyLDEyLDAsMCwwLDQuNjksMS4yNVoiIHN0eWxlPSJmaWxsOnVybCgjZikiPjwvcGF0aD48cGF0aCBkPSJNOTguODMsNTYuMTZhMTQuMDYsMTQuMDYsMCwwLDEtNS40NSwxdi0zQTEwLjksMTAuOSwwLDAsMCw5OCw1My40MmExMS4zNSwxMS4zNSwwLDAsMCw2LjMxLTYuMzIsMTMuNDIsMTMuNDIsMCwwLDAtNS4yLTE2LjNBMTEuNiwxMS42LDAsMCwwLDkzLjM4LDI5VjI2LjIzYTE0LjE2LDE0LjE2LDAsMCwxLDYuNzUsMi4zMSwxNi4yNCwxNi4yNCwwLDAsMSw2LjY3LDguOCwxNS44NywxNS44NywwLDAsMSwuNzcsNC40NHYxLjE0YTE1Ljc1LDE1Ljc1LDAsMCwxLTEuMTUsNS40MUExNCwxNCwwLDAsMSw5OC44Myw1Ni4xNlptLTUuNDUsMWExNSwxNSwwLDAsMS02LTEuNDksMTYuNDQsMTYuNDQsMCwwLDEtNy0yMi4yMSwxMy44OSwxMy44OSwwLDAsMSw5LjA2LTYuOTUsMTMuMTYsMTMuMTYsMCwwLDEsNC0uM1YyOWExMC45MiwxMC45MiwwLDAsMC0zLjEuM0ExMS4xNiwxMS4xNiwwLDAsMCw4MywzNWExMy4zOSwxMy4zOSwwLDAsMCw1LjY2LDE3LjksMTIsMTIsMCwwLDAsNC42OSwxLjI1WiIgc3R5bGU9ImZpbGw6IzJiMjUyMyI+PC9wYXRoPjxwYXRoIGQ9Ik05OC43NCw1NS45YTEzLjQsMTMuNCwwLDAsMS01LjM2LDFWNTQuMTZBMTAuOSwxMC45LDAsMCwwLDk4LDUzLjQyYTExLjM1LDExLjM1LDAsMCwwLDYuMzEtNi4zMiwxMy40MiwxMy40MiwwLDAsMC01LjItMTYuM0ExMS42LDExLjYsMCwwLDAsOTMuMzgsMjlWMjYuNDlBMTQuMDksMTQuMDksMCwwLDEsMTAwLDI4Ljc1YTE1LjkzLDE1LjkzLDAsMCwxLDYuNTcsOC42NSwxNi42NiwxNi42NiwwLDAsMSwuNzcsNC4zNlY0Mi45YTE1LjgxLDE1LjgxLDAsMCwxLTEuMTQsNS4zMkExMy43MSwxMy43MSwwLDAsMSw5OC43NCw1NS45Wm0tNS4zNiwxYTE0LjE5LDE0LjE5LDAsMCwxLTUuODgtMS40NCwxNi4xNSwxNi4xNSwwLDAsMS02LjkxLTIxLjgsMTMuNjEsMTMuNjEsMCwwLDEsOC45LTYuODQsMTMuMjcsMTMuMjcsMCwwLDEsMy44OS0uM1YyOWExMC45MiwxMC45MiwwLDAsMC0zLjEuM0ExMS4xNiwxMS4xNiwwLDAsMCw4MywzNWExMy4zOSwxMy4zOSwwLDAsMCw1LjY2LDE3LjksMTIsMTIsMCwwLDAsNC42OSwxLjI1WiIgc3R5bGU9ImZpbGw6dXJsKCNnKSI+PC9wYXRoPjxwYXRoIGQ9Ik05OC4xNiw1NC4wOWExMS4yNSwxMS4yNSwwLDAsMS00Ljc4Ljgydi0uNzVBMTAuOSwxMC45LDAsMCwwLDk4LDUzLjQyYTExLjM1LDExLjM1LDAsMCwwLDYuMzEtNi4zMiwxMy40MiwxMy40MiwwLDAsMC01LjItMTYuM0ExMS42LDExLjYsMCwwLDAsOTMuMzgsMjl2LS42OWExMi41MiwxMi41MiwwLDAsMSw2LDEuOTQsMTQuMzMsMTQuMzMsMCwwLDEsNi40OCwxMS40M3YxLjA2YTEzLjM2LDEzLjM2LDAsMCwxLTEsNC43QTExLjkyLDExLjkyLDAsMCwxLDk4LjE2LDU0LjA5Wm0tNC43OC44MmExMi40LDEyLjQsMCwwLDEtNS0xLjMyLDE0LjExLDE0LjExLDAsMCwxLTYtMTksMTEuOTQsMTEuOTQsMCwwLDEsNy43MS02LDExLjc1LDExLjc1LDAsMCwxLDMuMzItLjNWMjlhMTAuOTIsMTAuOTIsMCwwLDAtMy4xLjNBMTEuMTYsMTEuMTYsMCwwLDAsODMsMzVhMTMuMzksMTMuMzksMCwwLDAsNS42NiwxNy45LDEyLDEyLDAsMCwwLDQuNjksMS4yNVoiIHN0eWxlPSJmaWxsOnVybCgjaCkiPjwvcGF0aD48cGF0aCBkPSJNOTgsNTMuNjhhMTEuMzMsMTEuMzMsMCwwLDEtNC42Ni43OHYtLjNBMTAuOSwxMC45LDAsMCwwLDk4LDUzLjQyYTExLjM1LDExLjM1LDAsMCwwLDYuMzEtNi4zMiwxMy40MiwxMy40MiwwLDAsMC01LjItMTYuM0ExMS42LDExLjYsMCwwLDAsOTMuMzgsMjl2LS4yOGExMiwxMiwwLDAsMSw1Ljc5LDEuODgsMTMuNzksMTMuNzksMCwwLDEsNi4yOCwxMS4wNnYxYTEyLjU3LDEyLjU3LDAsMCwxLTEsNC41OUExMS42LDExLjYsMCwwLDEsOTgsNTMuNjhabS00LjY2Ljc4YTExLjc0LDExLjc0LDAsMCwxLTQuODEtMS4zLDEzLjIyLDEzLjIyLDAsMCwxLTYuNjctNy45MywxMy40NywxMy40NywwLDAsMS44NS0xMC4zNywxMS4zMSwxMS4zMSwwLDAsMSwxMC42My02LjE3VjI5YTEwLjkyLDEwLjkyLDAsMCwwLTMuMS4zQTExLjE2LDExLjE2LDAsMCwwLDgzLDM1YTEzLjM5LDEzLjM5LDAsMCwwLDUuNjYsMTcuOSwxMiwxMiwwLDAsMCw0LjY5LDEuMjVaIiBzdHlsZT0iZmlsbDp1cmwoI2kpIj48L3BhdGg+PHBhdGggZD0iTTk4LDUzLjQyYTEwLjQyLDEwLjQyLDAsMCwxLTIsLjU4LDEzLjEsMTMuMSwwLDAsMCwzLjY1LTYuMjcsMTMuNTUsMTMuNTUsMCwwLDAtNS4xNy0xNC4yNSwxMi42OSwxMi42OSwwLDAsMC04LTIuNCwxMC44NywxMC44NywwLDAsMSwzLjkxLTEuODEsMTEuNCwxMS40LDAsMCwxLDguNzgsMS41MywxMy40MiwxMy40MiwwLDAsMSw1LjIsMTYuM0ExMS41MSwxMS41MSwwLDAsMSw5OCw1My40MloiIHN0eWxlPSJmaWxsOnVybCgjaikiPjwvcGF0aD48cGF0aCBkPSJNODAuMDgsNjEuMzFhMTQuODQsMTQuODQsMCwwLDEtMi4zNy0uNzVjLTQtMi4yMi02LjY5LTYuMDgtOC4zMi0xMS4xOS0yLjM1LTcuNC0xLjA3LTE1LDQuMzgtMjAuNDRsNy4wOC00LjQyYTIyLjQzLDIyLjQzLDAsMCwwLTIuNjMsMi4yMmwtLjExLjExYy00Ljc5LDUtNi43MSwxMy4zOS00LjI3LDIxLjE1YTIxLjc5LDIxLjc5LDAsMCwwLDkuMzQsMTIuMDcsMTkuMjgsMTkuMjgsMCwwLDAsOC42NCwyLjYzWiIgc3R5bGU9ImZpbGw6dXJsKCNrKSI+PC9wYXRoPjxwYXRoIGQ9Ik00NC4wOSwxMi40OGEuNDkuNDksMCwwLDEtLjU2LjU0SDQxLjU5djQuMzVjMCwuMzUtLjE5LjUyLS41Ni41MnMtLjU2LS4xNy0uNTYtLjUyVjEzSDM4LjUzYS40OS40OSwwLDAsMSwuNTYtLjU0czAtLjUzLjU2LS41M2g1QzQzLjksMTIsNDQuMDksMTIuMTMsNDQuMDksMTIuNDhaIiBzdHlsZT0iZmlsbDojYzIxNzE4Ij48L3BhdGg+PHBhdGggZD0iTTUwLjYzLDE1YzAsLjM1LS4xOS41My0uNTYuNTNhLjY5LjY5LDAsMCwxLS4yNy0uMWwwLDBoLS45NGMxLjIsMSwxLjgsMS42NywxLjgsMS45YS40OS40OSwwLDAsMSwtLjIuNC42Ni42NiwwLDAsMS0uMzguMTRjLS4xNywwLS42Mi0uMzQtMS4zNy0xYTE2LjIsMTYuMiwwLDAsMS0xLjM4LTEuNDFINDUuNjR2MS45MmMwLC4zNS0uMTkuNTItLjU3LjUycy0uNTYtLjE3LS41Ni0uNTJWMTIuNDhhMy4zOSwzLjM5LDAsMCwxLC4xNC0uMzlsLjQyLS4xNGg1bC40MS4xNHEuMTQuMzMuMTUuMzlabS0xLjEzLS42NVYxM0g0NS42NHYxLjM3WiIgc3R5bGU9ImZpbGw6I2MyMTcxOCI+PC9wYXRoPjxwYXRoIGQ9Ik01Ny41NCwxNy4zN2MwLC4zNS0uMTguNTItLjU2LjUycy0uNTYtLjE3LS41Ni0uNTJWMTUuNDVINTIuNTV2MS45MmMwLC4zNS0uMTkuNTItLjU2LjUycy0uNTYtLjE3LS41Ni0uNTJWMTIuNDhhMS43MywxLjczLDAsMCwxLC4xNS0uMzlBMy43LDMuNywwLDAsMSw1MiwxMmg1YTMuNywzLjcsMCwwLDEsLjQxLjE0cS4xMy4zMy4xNS4zOVptLTEuMTItM1YxM0g1Mi41NXYxLjM3WiIgc3R5bGU9ImZpbGw6I2MyMTcxOCI+PC9wYXRoPjxwYXRoIGQ9Ik02NC40NiwxNy4zOGMwLC40MS0uMTkuNjEtLjU4LjYxcy0xLjQ3LTEuMS0zLjU4LTMuMjlsLS44NC0uODd2My41NGMwLC4zNS0uMTguNTItLjU2LjUycy0uNTYtLjE3LS41Ni0uNTJWMTIuNDVsLjE2LS4zNmEzLjIyLDMuMjIsMCwwLDEsLjQtLjE0cS4zMywwLDQuMTEsMy44NWwuMzIuMzNWMTIuNDhhLjQ4LjQ4LDAsMCwxLC41NS0uNTNjLjM5LDAsLjU4LjE4LjU4LjUzWiIgc3R5bGU9ImZpbGw6I2MyMTcxOCI+PC9wYXRoPjxwYXRoIGQ9Ik03MS40LDE3LjM3YS41NS41NSwwLDAsMSwtLjA2LjE5bC0uMDkuMmEzLjA5LDMuMDksMCwwLDEsLS40MS4xM2gtNWMtLjM3LDAtLjU2LS4xOC0uNTYtLjUzcy4xOS0uNTMuNTYtLjUzaDQuNDNWMTUuNDdINjYuMTlhLjc1Ljc1LDAsMCwxLS4zNS4wOGMtLjM3LDAtLjU2LS4xNy0uNTYtLjUyVjEyLjQ3YzAtLjA2LjA2LS4xOS4xNC0uMzhsLjQyLS4xNGg1Yy4zNywwLC41Ni4xOC41Ni41M2EuNDkuNDksMCwwLDEtLjU2LjU0SDY2LjQxdjEuMzloNC4wOGEuNTMuNTMsMCwwLDEsLjM1LS4xMmMuMzcsMCwuNTYuMTguNTYuNTJaIiBzdHlsZT0iZmlsbDojYzIxNzE4Ij48L3BhdGg+PHBhdGggZD0iTTc3LjYzLDEybC40MS4xNGMuMDkuMjIuMTQuMzQuMTUuMzhWMTVjMCwuMzUtLjE5LjUyLS41Ni41MmEuNjYuNjYsMCwwLDEsLS4zNC0uMWgtNC4xdjEuOTJjMCwuMzUtLjE4LjUyLS41Ni41MnMtLjU2LS4xNy0uNTYtLjUyVjEyLjQ4YTMuMzksMy4zOSwwLDAsMSwuMTQtLjM5bC40Mi0uMTRabS0uNTcsMi40NFYxM0g3My4xOXYxLjM3WiIgc3R5bGU9ImZpbGw6I2MyMTcxOCI+PC9wYXRoPjxwYXRoIGQ9Ik04NC43OCwxNy4zN2EuNTUuNTUsMCwwLDEtLjA2LjE5bC0uMDkuMmEzLjA5LDMuMDksMCwwLDEtLjQxLjEzaC01YTMuMDksMy4wOSwwLDAsMS0uNDEtLjEzLDMuMywzLjMsMCwwLDEtLjE1LS4zOVYxMi40OGEzLjM5LDMuMzksMCwwLDEsLjE0LS4zOWwuNDItLjE0aDVsLjQxLjE0cS4xNC4zMy4xNS4zOVptLTEuMTMtLjU0VjEzSDc5Ljc5djMuODFaIiBzdHlsZT0iZmlsbDojYzIxNzE4Ij48L3BhdGg+PHBhdGggZD0iTTkxLjcyLDE1YzAsLjM1LS4xOS41My0uNTYuNTNhLjY5LjY5LDAsMCwxLS4yNy0uMWwwLDBoLS45NGMxLjIsMSwxLjgsMS42NywxLjgsMS45YS40OS40OSwwLDAsMS0uMi40LjY2LjY2LDAsMCwxLS4zOC4xNGMtLjE3LDAtLjYyLS4zNC0xLjM3LTFhMTYuMiwxNi4yLDAsMCwxLTEuMzgtMS40MUg4Ni43M3YxLjkyYzAsLjM1LS4xOS41Mi0uNTcuNTJzLS41Ni0uMTctLjU2LS41MlYxMi40OGEzLjM5LDMuMzksMCwwLDEsLjE0LS4zOWwuNDItLjE0aDVsLjQxLjE0cS4xNC4zMy4xNS4zOVptLTEuMTMtLjY1VjEzSDg2LjczdjEuMzdaIiBzdHlsZT0iZmlsbDojYzIxNzE4Ij48L3BhdGg+PHBhdGggZD0iTTk4LjYzLDEyLjQ4YzAsLjM2LS4xOC41NC0uNTYuNTRIOTYuMTR2NC4zNWMwLC4zNS0uMTkuNTItLjU3LjUycy0uNTYtLjE3LS41Ni0uNTJWMTNIOTMuMDhjLS4zOCwwLS41Ni0uMTgtLjU2LS41NHMuMTgtLjUzLjU2LS41M2g1Qzk4LjQ1LDEyLDk4LjYzLDEyLjEzLDk4LjYzLDEyLjQ4WiIgc3R5bGU9ImZpbGw6I2MyMTcxOCI+PC9wYXRoPjxwYXRoIGQ9Ik0xMDUuMTcsMTcuMzZjMCwuMzUtLjE4LjUzLS41Ni41M2gtNWEyLjY2LDIuNjYsMCwwLDEtLjQxLS4xMywzLjMsMy4zLDAsMCwxLS4xNS0uMzlWMTIuNDhhMi44LDIuOCwwLDAsMSwuMTMtLjM5bC40My0uMTRoNWMuMzgsMCwuNTYuMTguNTYuNTNzLS4xOC41NC0uNTYuNTRoLTQuNDN2MS4zN2g0LjQzYy4zOCwwLC41Ni4xOC41Ni41M3MtLjE4LjUzLS41Ni41M2gtNC40M3YxLjM4aDQuNDNDMTA1LDE2LjgzLDEwNS4xNywxNywxMDUuMTcsMTcuMzZaIiBzdHlsZT0iZmlsbDojYzIxNzE4Ij48L3BhdGg+PHBhdGggZD0iTTExMS43MSwxNy4zN2EuNTUuNTUsMCwwLDEtLjA2LjE5bC0uMDkuMmEyLjY2LDIuNjYsMCwwLDEtLjQxLjEzaC01Yy0uMzgsMC0uNTYtLjE4LS41Ni0uNTNzLjE4LS41My41Ni0uNTNoNC40M1YxNS40N2gtNC4wOGEuNzguNzgsMCwwLDEtLjM1LjA4Yy0uMzgsMC0uNTYtLjE3LS41Ni0uNTJWMTIuNDdhMy40LDMuNCwwLDAsMSwuMTMtLjM4bC40My0uMTRoNWMuMzgsMCwuNTYuMTguNTYuNTNzLS4xOC41NC0uNTYuNTRoLTQuNDN2MS4zOWg0LjA4YS41NS41NSwwLDAsMSwuMzUtLjEyYy4zOCwwLC41Ni4xOC41Ni41MloiIHN0eWxlPSJmaWxsOiNjMjE3MTgiPjwvcGF0aD48cGF0aCBkPSJNNjIuODIsNjYuNDdIMjUuNzZjLS4xMi4zNy0uNjIuNzQsNiwuODdzMjAtLjE1LDMzLjQzLS4xMkg3M2EyLjQzLDIuNDMsMCwwLDEsMS41Ni42NkEyLDIsMCwwLDEsNzUuMTcsNjlhMi4wOSwyLjA5LDAsMCwxLS4zNCwxLjQ4LDEuMywxLjMsMCwwLDEtLjE4LjIzTDY4LjU1LDc4YTIuMDksMi4wOSwwLDAsMC0uMy44MSwyLjEzLDIuMTMsMCwwLDAsLjMzLDEuNDksMS45NCwxLjk0LDAsMCwwLC42Ni42MSwyLjgsMi44LDAsMCwwLDEuMzQuMzNIODkuNDRsMTkzLjg3LjExdi0uNzRMOTEsODAuNDdoMEw4MCw4MC40NWEyLjU3LDIuNTcsMCwwLDEtMS41OS0uNSwxLjk0LDEuOTQsMCwwLDEtLjc0LTEuMzIsMi4wOCwyLjA4LDAsMCwxLC4wNy0uOSwxLjg0LDEuODQsMCwwLDEsLjIzLS41Mkw4NC4xMSw3MGEyLjEyLDIuMTIsMCwwLDAsLjU0LTEuMzgsMiwyLDAsMCwwLS41Mi0xLjQxLDIuMzksMi4zOSwwLDAsMC0xLjc1LS43NEg2Mi44MiIgc3R5bGU9ImZpbGw6IzQ2M2UzOSI+PC9wYXRoPjxwYXRoIGQ9Ik03NS42NSw2NS4wNkgxOS44MWMtLjEyLjM3LS4yNC43NCw5LjQ3Ljg2czI5LjI3LS4xNiw0OC44Mi0uMTJsOCwwYTIuNDksMi40OSwwLDAsMSwxLjYuNjYsMiwyLDAsMCwxLC41OCwxLjE0LDIsMiwwLDAsMSwtLjM0LDEuNDgsMi4zMSwyLjMxLDAsMCwxLS4xOC4yM0w4MS41LDc2LjU2YTIuMTksMi4xOSwwLDAsMC0uMy44MiwyLjE0LDIuMTQsMCwwLDAsLjMzLDEuNDksMi4yMywyLjIzLDAsMCwwLC42OC42MSwyLjc4LDIuNzgsMCwwLDAsMS4zNi4zMkgyODMuMzF2LS43NEgxMDQuNDFMOTMuMjQsNzlhMi42NCwyLjY0LDAsMCwxLTEuNjMtLjUsMi4wNSwyLjA1LDAsMCwxLS42OC0yLjIxLDIuMjQsMi4yNCwwLDAsMSwuMjMtLjUzbDYuMjQtNy4yMkEyLjEzLDIuMTMsMCwwLDAsOTgsNjcuMmEyLjEsMi4xLDAsMCwwLS41My0xLjQxLDIuNDUsMi40NSwwLDAsMC0xLjc5LS43M2gtMjAiIHN0eWxlPSJmaWxsOiM0NjNlMzkiPjwvcGF0aD48cGF0aCBkPSJNMTIuNDUsNjMuNzFjLS4xMi4zNy0uMjQuNzQsMTIuNzMuODZzMzktLjE2LDY1LjEtLjEybDkuMDgsMGEyLjY0LDIuNjQsMCwwLDEsMS42Ny42NiwyLDIsMCwwLDEsLjI1LDIuNjIsMS4wNiwxLjA2LDAsMCwxLS4xOS4yM2wtNi41LDcuMjJhMi4yMSwyLjIxLDAsMCwwLS4zMS44MiwyLDIsMCwwLDAsLjM1LDEuNDksMi4xNywyLjE3LDAsMCwwLDEuMzUuODQsMy4yNywzLjI3LDAsMCwwLC43OC4wOUgyODMuMzFWNzcuN0gxMTcuNzFsLTEwLjg4LDBhMi43OCwyLjc4LDAsMCwxLTEuNy0uNWwtLjIzLS4yYTIsMiwwLDAsMS0uNDgtMiwyLDIsMCwwLDEsLjI1LS41M2w2LjUtNy4yMmEyLjA2LDIuMDYsMCwwLDAsLjU0LTEuMDgsMiwyLDAsMCwwLS41My0xLjcxLDIuNiwyLjYsMCwwLDAtMS44Ni0uNzNIODcuNzMiIHN0eWxlPSJmaWxsOiM0NjNlMzkiPjwvcGF0aD48L3N2Zz4g';
function compLogoHtml(cm, accent, lUrl) {
  if (!cm || cm.logo === 'roupeta') {
    // html2canvas não renderiza SVG dentro de <img>, daí o inline
    try {
      const svgRaw = atob(_ROUPETA_LOGO_B64);
      const svgInline = svgRaw
        .replace(/<\?xml[^?]*\?>\s*/g, '')
        .replace(/<svg /, '<svg width="133" height="42" ');
      return svgInline;
    } catch(e) {
      return `<img src="data:image/svg+xml;base64,${_ROUPETA_LOGO_B64}" alt="Roupeta" style="height:42px"/>`;
    }
  }
  if (cm.logo === 'arlize') {
    return `<svg width="120" height="42" viewBox="0 0 120 42" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="120" height="42" rx="4" fill="${accent}"/><text x="60" y="18" font-family="Arial,sans-serif" font-size="11" font-weight="900" fill="white" text-anchor="middle" letter-spacing="2">ARLIZE</text><text x="60" y="32" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="1">TRANSPORTES</text></svg>`;
  }
  if (cm.logo === 'pit') {
    return `<svg width="120" height="42" viewBox="0 0 120 42" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="120" height="42" rx="4" fill="${accent}"/><text x="60" y="18" font-family="Arial,sans-serif" font-size="11" font-weight="900" fill="white" text-anchor="middle" letter-spacing="2">PIT</text><text x="60" y="32" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="1">EVOLUTION</text></svg>`;
  }
  return `<div style="border-left:5px solid ${accent};padding-left:12px"><div style="font-size:18px;font-weight:900;color:${accent}">${cm.name}</div></div>`;
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