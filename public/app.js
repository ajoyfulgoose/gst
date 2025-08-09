
function escapeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
const STORAGE_KEY='ost_living_tree_v1';
function saveState(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){ try{ const s=localStorage.getItem(STORAGE_KEY); return s?JSON.parse(s):null;}catch{ return null; } }
function renderTree(treeObj){ const tree=(treeObj&&treeObj.themes)||[]; const c=document.getElementById('treeContainer'); c.innerHTML=''; const ul=document.createElement('ul'); ul.className='tree';
  tree.forEach(t=>{ const li=document.createElement('li'); const h=document.createElement('div'); const count=(t.opportunities||[]).reduce((a,b)=>a+(b.quotes?b.quotes.length:0),0); h.innerHTML=`<strong>Theme:</strong> ${escapeHtml(t.name||'')} <span class="pill">${count} opportunities</span>`; li.appendChild(h);
    const meta=document.createElement('div'); meta.className='meta'; (t.keywords||[]).forEach(k=>{ const s=document.createElement('span'); s.className='kw'; s.textContent=k; meta.appendChild(s);}); li.appendChild(meta);
    const subUL=document.createElement('ul'); subUL.className='branch';
    (t.opportunities||[]).forEach(o=>{ const sli=document.createElement('li'); const hd=document.createElement('div'); hd.innerHTML=`<strong>Opportunity:</strong> ${escapeHtml(o.name||'')} <span class="pill">${(o.quotes||[]).length}</span>`; sli.appendChild(hd);
      const sm=document.createElement('div'); sm.className='meta'; (o.keywords||[]).forEach(k=>{ const s=document.createElement('span'); s.className='kw'; s.textContent=k; sm.appendChild(s);}); sli.appendChild(sm);
      (o.quotes||[]).forEach(q=>{ const p=document.createElement('div'); p.className='quote'; p.textContent='“'+q+'”'; sli.appendChild(p);}); subUL.appendChild(sli); });
    li.appendChild(subUL); ul.appendChild(li); });
  c.appendChild(ul);
}
function simpleExtract(text){ // naive heuristic fallback
  const sentences = text.split(/(?<=[\.\?\!])\s+/).map(s=>s.trim()).filter(Boolean);
  const cues=['i need','i want','i wish',"it's hard","it's difficult",'struggle','frustrated','takes too long',"can't find",'worried','concerned','too slow','too expensive','not sure','painful','prefer','it would be'];
  const opp=sentences.filter(s=>s.length>40 && cues.some(c=>s.toLowerCase().includes(c)));
  const theme={name:'Auto Theme', keywords:[], opportunities:[{name:'Auto Opportunity', keywords:[], quotes:opp}]};
  return { themes:[theme] };
}
async function processAndRender(){
  const st=loadState()||{ outcome:'', corpus:[], tree:{themes:[]} };
  const useGPT=document.getElementById('useGPT')?.checked;
  let tree;
  if(useGPT){
    const desiredOutcome=document.getElementById('desiredOutcome').value;
    const newText=st.corpus.join('\n');
    const res=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({desiredOutcome,newText,previousTree:st.tree})});
    if(!res.ok){ alert('API error'); return; }
    tree=await res.json();
  }else{
    tree=simpleExtract(st.corpus.join('\n'));
  }
  st.tree=tree; saveState(st); renderTree(tree);
}
function init(){
  let st=loadState(); if(!st){ st={ outcome:'', corpus:[], tree:{themes:[]} }; saveState(st); }
  document.getElementById('desiredOutcome').value=st.outcome||'';
  renderTree(st.tree||{themes:[]});
  document.getElementById('desiredOutcome').addEventListener('input', e=>{ const s=loadState(); s.outcome=e.target.value; saveState(s); });
  document.getElementById('btnProcess').addEventListener('click', ()=>{ const t=document.getElementById('inputText').value.trim(); if(!t) return; const s=loadState(); s.corpus.push(t); saveState(s); document.getElementById('inputText').value=''; processAndRender(); });
  document.getElementById('btnClear').addEventListener('click', ()=>{ if(!confirm('Clear tree?')) return; saveState({ outcome:'', corpus:[], tree:{themes:[]} }); document.getElementById('desiredOutcome').value=''; renderTree({themes:[]}); });
  document.getElementById('btnExport').addEventListener('click', ()=>{ const s=loadState(); const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ost_state.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
  document.getElementById('btnImport').addEventListener('click', ()=>document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const p=JSON.parse(r.result); saveState(p); document.getElementById('desiredOutcome').value=p.outcome||''; processAndRender(); }catch{ alert('Import failed'); } }; r.readAsText(f); });
  document.getElementById('useGPT').addEventListener('change', processAndRender);
}
document.addEventListener('DOMContentLoaded', init);
