(() => {
  'use strict';

  const D = window.MANIFEST_DATA;
  if (!D) return;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clp = new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 });
  const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits:1 });

  const categoryMap = {
    M01:['field','institution'], M02:['field'], M03:['field'], M04:['field','institution'],
    M05:['economic'], M06:['economic'], M07:['economic','institution'], M08:['field'],
    M09:['economic','institution'], M10:['institution']
  };

  const roleById = Object.fromEntries(D.roles.map(r => [r.id, r]));
  const moduleById = Object.fromEntries(D.modules.map(m => [m.id, m]));

  function renderMeta(){
    $('#premiseText').textContent = D.meta.premise;
    $('#heroArticles').textContent = D.articles.length;
    $('#heroParagraphs').textContent = D.articles.reduce((a,x) => a + x.paras.length, 0);
    $('#heroModules').textContent = D.modules.length;
    $('#heroProfiles').textContent = D.roles.length;
  }

  function renderManifesto(){
    const toc = $('#articleToc');
    const body = $('#manifestBody');
    toc.innerHTML = '';
    body.innerHTML = '';

    D.articles.forEach(article => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#art-${article.n}" data-toc="${article.n}"><span>${article.n}</span><span>${article.title}</span></a>`;
      toc.appendChild(li);

      const el = document.createElement('article');
      el.className = 'manifest-article';
      el.id = `art-${article.n}`;
      el.dataset.article = article.n;
      el.innerHTML = `<span class="article-number">ART. ${article.n}</span><h3>${article.title}</h3>`;

      article.paras.forEach(p => {
        const paragraph = document.createElement('div');
        paragraph.className = 'manifest-paragraph';
        paragraph.id = `p-${p.id.replace('.', '-')}`;
        paragraph.dataset.ref = p.id;
        paragraph.innerHTML = `<a class="par-id" href="#${paragraph.id}">§${p.id}</a><p>${p.text}</p>`;
        el.appendChild(paragraph);
      });
      body.appendChild(el);
    });
  }

  function moduleRoles(m){
    const ids = new Set([
      ...Object.keys(m.fixedRoleMonths || {}),
      ...Object.keys(m.cellRoleMonths || {}),
      ...(m.sampleRole ? [m.sampleRole] : [])
    ]);
    return [...ids];
  }

  function renderModules(){
    const grid = $('#moduleGrid');
    const dep = $('#dependencyMap');
    grid.innerHTML = '';
    dep.innerHTML = '';

    D.modules.forEach(m => {
      const deps = m.depends.length ? m.depends.join(' + ') : 'BASE';
      const flow = document.createElement('button');
      flow.type = 'button';
      flow.className = 'flow-node';
      flow.dataset.module = m.id;
      flow.innerHTML = `<span>${m.id} / ${m.duration}</span><h3>${m.name}</h3><small>DEP / ${deps}<br>GATE / ${m.gate}</small>`;
      flow.addEventListener('click', () => document.getElementById(`module-${m.id}`).scrollIntoView({behavior:'smooth', block:'center'}));
      dep.appendChild(flow);

      const card = document.createElement('article');
      card.className = 'module-card';
      card.id = `module-${m.id}`;
      card.dataset.categories = (categoryMap[m.id] || []).join(' ');
      const refs = m.refs.map(ref => `<a class="module-ref" href="#p-${ref.replace('.', '-')}">§${ref}</a>`).join('');
      const roles = moduleRoles(m).map(id => `${id} ${roleById[id].name}`).join(' · ');
      card.innerHTML = `
        <div class="module-code"><strong>${m.id}</strong>${m.duration}<br>DEP / ${deps}<br><span id="cost-${m.id}">COST / —</span></div>
        <div class="module-body">
          <h3>${m.name}</h3>
          <p><b>GATE</b> / ${m.gate}</p>
          <p><b>OUTPUT</b> / ${m.outputs.join(' · ')}</p>
          <div class="module-meta"><div><b>Perfiles</b><p>${roles}</p></div><div><b>Dependencias</b><p>${deps}</p></div></div>
          <div class="module-ref-list">${refs}</div>
        </div>`;
      grid.appendChild(card);
    });

    $$('.filter').forEach(btn => btn.addEventListener('click', () => {
      $$('.filter').forEach(x => x.classList.toggle('is-active', x === btn));
      const f = btn.dataset.filter;
      $$('.module-card').forEach(card => {
        card.hidden = f !== 'all' && !card.dataset.categories.split(' ').includes(f);
      });
    }));
  }

  function renderProfiles(){
    const tbody = $('#profileRows');
    tbody.innerHTML = D.roles.map(r => `
      <tr>
        <td>${r.id}</td><td>${r.name}</td><td>${r.type}</td><td>${r.wage.toFixed(1)}</td>
        <td>${r.skills}</td><td>${r.output}</td><td>${r.depends.join(' · ') || '—'}</td>
      </tr>`).join('');
  }

  function renderWaves(){
    $('#waveGrid').innerHTML = D.waves.map(w => `
      <article class="wave">
        <span>${w.id} / ${w.span}</span><h3>${w.name}</h3>
        <div class="wave-modules">${w.modules.map(id => `<a href="#module-${id}">${id}</a>`).join('')}</div>
        <small>CRITERIO DE SALIDA</small><p>${w.exit}</p>
      </article>`).join('');
  }

  function bindDefaults(){
    const map = {
      population:'population', participants:'participants', cellPopulation:'cellPopulation', marginError:'marginError',
      minWage:'minWage', loadPct:'loadPct', overheadPct:'overheadPct', contingencyPct:'contingencyPct'
    };
    Object.entries(map).forEach(([id,key]) => { const el = document.getElementById(id); el.value = D.defaults[key]; });
    $('#budgetForm').addEventListener('input', calculateBudget);
  }

  function inputNumber(id, fallback){
    const value = Number(document.getElementById(id).value);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function finiteSample(N,e,z=1.96,p=.5){
    const n0 = (z*z*p*(1-p))/(e*e);
    return Math.ceil(n0/(1+((n0-1)/N)));
  }

  function calculateBudget(){
    const N = inputNumber('population', D.defaults.population);
    const participants = inputNumber('participants', D.defaults.participants);
    const cellPopulation = inputNumber('cellPopulation', D.defaults.cellPopulation);
    const margin = inputNumber('marginError', D.defaults.marginError) / 100;
    const wage = inputNumber('minWage', D.defaults.minWage);
    const load = 1 + inputNumber('loadPct', D.defaults.loadPct)/100;
    const overheadPct = inputNumber('overheadPct', D.defaults.overheadPct)/100;
    const contingencyPct = inputNumber('contingencyPct', D.defaults.contingencyPct)/100;
    const sample = finiteSample(N, margin, D.defaults.confidenceZ, D.defaults.responseP);
    const cells = Math.max(1, Math.ceil(N/cellPopulation));

    const roleMonths = Object.fromEntries(D.roles.map(r => [r.id,0]));
    const roleCosts = Object.fromEntries(D.roles.map(r => [r.id,0]));
    const moduleDirectCosts = {};
    let operations = 0;

    D.modules.forEach(m => {
      const localMonths = {};
      Object.entries(m.fixedRoleMonths || {}).forEach(([id,months]) => { localMonths[id] = (localMonths[id] || 0) + months; });
      Object.entries(m.cellRoleMonths || {}).forEach(([id,months]) => { localMonths[id] = (localMonths[id] || 0) + months*cells; });
      if (m.sampleRole && m.samplePerRoleMonth) localMonths[m.sampleRole] = (localMonths[m.sampleRole] || 0) + sample/m.samplePerRoleMonth;

      let modulePersonnel = 0;
      Object.entries(localMonths).forEach(([id,months]) => {
        roleMonths[id] += months;
        const cost = months * roleById[id].wage * wage * load;
        roleCosts[id] += cost;
        modulePersonnel += cost;
      });

      const moduleOps = ((m.opsW || 0) + (m.cellOpsW || 0)*cells + (m.participantOpsW || 0)*participants) * wage;
      operations += moduleOps;
      moduleDirectCosts[m.id] = modulePersonnel + moduleOps;
    });

    const personnel = Object.values(roleCosts).reduce((a,b) => a+b,0);
    const tech = D.defaults.techW * wage;
    const direct = personnel + operations + tech;
    const overhead = direct * overheadPct;
    const contingency = direct * contingencyPct;
    const total = direct + overhead + contingency;
    const totalRoleMonths = Object.values(roleMonths).reduce((a,b) => a+b,0);

    $('#sampleSize').textContent = num.format(sample);
    $('#cells').textContent = num.format(cells);
    $('#personMonths').textContent = num.format(totalRoleMonths);
    $('#totalCost').textContent = clp.format(total);
    $('#costParticipant').textContent = clp.format(total/participants);
    $('#costCapita').textContent = clp.format(total/N);

    $('#costBreakdown').innerHTML = [
      ['Personal', personnel],['Operación de módulos', operations],['Tecnología / datos', tech],
      ['Overhead', overhead],['Contingencia', contingency],['TOTAL', total]
    ].map(([label,value]) => `<div class="cost-row"><span>${label}</span><span>${clp.format(value)}</span></div>`).join('');

    Object.entries(moduleDirectCosts).forEach(([id,cost]) => {
      const el = document.getElementById(`cost-${id}`);
      if (el) el.textContent = `DIRECT / ${clp.format(cost)}`;
    });

    renderAllocation(roleMonths, roleCosts);
  }

  function renderAllocation(roleMonths, roleCosts){
    const max = Math.max(...Object.values(roleMonths),1);
    $('#allocationRows').innerHTML = D.roles.map(r => {
      const months = roleMonths[r.id] || 0;
      const width = Math.max(1,(months/max)*100);
      return `<div class="allocation-row"><span>${r.id}</span><span>${r.name}</span><div class="allocation-bar"><i style="width:${width}%"></i></div><strong>${num.format(months)} m</strong><strong>${clp.format(roleCosts[r.id] || 0)}</strong></div>`;
    }).join('');
  }

  function renderReadiness(){
    const root = $('#readinessControls');
    root.innerHTML = D.readiness.map(d => `
      <div class="readiness-row">
        <label for="ready-${d.id}">${d.name} <small>×${d.weight.toFixed(2)}</small></label>
        <input id="ready-${d.id}" data-readiness="${d.id}" type="range" min="0" max="100" step="1" value="65">
        <span class="readiness-value" id="ready-value-${d.id}">65</span>
        <span class="readiness-hint">${d.prompt}${d.gate ? ` / gate ${d.gate}` : ''}</span>
      </div>`).join('');
    $$('[data-readiness]').forEach(el => el.addEventListener('input', updateReadiness));
    updateReadiness();
  }

  function updateReadiness(){
    const values = {};
    D.readiness.forEach(d => {
      const v = Number(document.getElementById(`ready-${d.id}`).value);
      values[d.id] = v;
      document.getElementById(`ready-value-${d.id}`).textContent = v;
    });

    const score = D.readiness.reduce((sum,d) => sum + values[d.id]*d.weight,0);
    const gateFails = D.readiness.filter(d => d.gate > 0 && values[d.id] < d.gate);
    const allOptimal = D.readiness.every(d => values[d.id] >= d.optimal);

    let state, explanation;
    if (gateFails.length){
      state = 'BLOQUEADO / PREPARACIÓN';
      explanation = 'El promedio no habilita ejecución cuando falla una compuerta crítica. Hay que corregir primero las dimensiones marcadas.';
    } else if (score >= 85 && allOptimal){
      state = 'VENTANA ÓPTIMA';
      explanation = 'Las dimensiones críticas superan sus umbrales óptimos. El sistema admite despliegue integral con monitoreo normal.';
    } else if (score >= 75){
      state = 'IMPLEMENTACIÓN VIABLE';
      explanation = 'Las compuertas están satisfechas y el índice permite implementar, conservando revisión trimestral y capacidad de corrección.';
    } else if (score >= 60){
      state = 'PILOTO CONTROLADO';
      explanation = 'La base permite un piloto acotado. No corresponde escalar capital, contratación o propiedad hasta validar resultados.';
    } else if (score >= 45){
      state = 'PREPARACIÓN';
      explanation = 'La intervención debe concentrarse en diagnóstico, legitimidad, datos, mediación y capacidad institucional.';
    } else {
      state = 'DIAGNÓSTICO INSUFICIENTE';
      explanation = 'No existe una base mínima para ejecutar el programa. Sólo corresponde levantar evidencia y reducir incertidumbre.';
    }

    $('#readinessScore').textContent = Math.round(score);
    $('#readinessState').textContent = state;
    $('#readinessExplanation').textContent = explanation;
    $('#gateList').innerHTML = D.readiness.filter(d => d.gate > 0).map(d => {
      const pass = values[d.id] >= d.gate;
      return `<div class="gate-item ${pass?'pass':'fail'}"><span>${d.name} / min ${d.gate}</span><span>${values[d.id]} ${pass?'✓':'×'}</span></div>`;
    }).join('');
  }

  function setupScroll(){
    const progress = $('.reading-progress');
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${max > 0 ? (scrollY/max)*100 : 0}%`;
    };
    addEventListener('scroll', update, {passive:true});
    update();

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const n = entry.target.dataset.article;
        $$('[data-toc]').forEach(a => a.classList.toggle('active', a.dataset.toc === n));
      });
    }, {rootMargin:'-20% 0px -70% 0px'});
    $$('.manifest-article').forEach(a => observer.observe(a));
  }

  function highlightTarget(){
    $$('.manifest-paragraph.is-target').forEach(x => x.classList.remove('is-target'));
    if (!location.hash.startsWith('#p-')) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.classList.add('is-target');
  }

  function init(){
    renderMeta();
    renderManifesto();
    renderModules();
    renderProfiles();
    renderWaves();
    bindDefaults();
    renderReadiness();
    calculateBudget();
    setupScroll();
    highlightTarget();
    addEventListener('hashchange', highlightTarget);
  }

  init();
})();
