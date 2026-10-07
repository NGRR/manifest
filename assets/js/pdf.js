(() => {
  'use strict';

  const D = window.MANIFEST_DATA;
  const button = document.getElementById('downloadPdf');
  if (!D || !button) return;

  const money = new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 });
  const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits:1 });
  const roleById = Object.fromEntries((D.roles || []).map(r => [r.id, r]));

  function finiteSample(N, e, z = 1.96, p = 0.5){
    const n0 = (z*z*p*(1-p))/(e*e);
    return Math.ceil(n0/(1+((n0-1)/N)));
  }

  function baseline(){
    const cfg = D.defaults;
    const N = cfg.population;
    const participants = cfg.participants;
    const cells = Math.max(1, Math.ceil(N/cfg.cellPopulation));
    const sample = finiteSample(N, cfg.marginError/100, cfg.confidenceZ, cfg.responseP);
    const wage = cfg.minWage;
    const load = 1 + cfg.loadPct/100;
    const overheadPct = cfg.overheadPct/100;
    const contingencyPct = cfg.contingencyPct/100;

    const roleMonths = Object.fromEntries((D.roles || []).map(r => [r.id,0]));
    let personnel = 0;
    let operations = 0;

    (D.modules || []).forEach(m => {
      const local = {};
      Object.entries(m.fixedRoleMonths || {}).forEach(([id, months]) => { local[id] = (local[id] || 0) + months; });
      Object.entries(m.cellRoleMonths || {}).forEach(([id, months]) => { local[id] = (local[id] || 0) + months*cells; });
      if (m.sampleRole && m.samplePerRoleMonth) local[m.sampleRole] = (local[m.sampleRole] || 0) + sample/m.samplePerRoleMonth;
      Object.entries(local).forEach(([id, months]) => {
        roleMonths[id] += months;
        const role = roleById[id];
        if (role) personnel += months * role.wage * wage * load;
      });
      operations += ((m.opsW || 0) + (m.cellOpsW || 0)*cells + (m.participantOpsW || 0)*participants) * wage;
    });

    const tech = (cfg.techW || 0) * wage;
    const direct = personnel + operations + tech;
    const overhead = direct * overheadPct;
    const contingency = direct * contingencyPct;
    const total = direct + overhead + contingency;
    const totalRoleMonths = Object.values(roleMonths).reduce((a,b) => a+b,0);

    return {N, participants, cells, sample, personnel, operations, tech, overhead, contingency, total, totalRoleMonths};
  }

  function label(text){
    return {text, style:'label'};
  }

  function rule(){
    return {canvas:[{type:'line', x1:0, y1:0, x2:495, y2:0, lineWidth:0.5, lineColor:'#3b3e43'}], margin:[0,8,0,12]};
  }

  function buildDocument(){
    const b = baseline();
    const articleCount = (D.articles || []).length;
    const paragraphCount = (D.articles || []).reduce((sum,a) => sum + a.paras.length, 0);

    const manifesto = [];
    (D.articles || []).forEach((article, index) => {
      manifesto.push({
        stack:[
          {text:`ART. ${article.n}`, style:'articleNumber'},
          {text:article.title, style:'articleTitle'},
          ...article.paras.map(p => ({
            columns:[
              {width:46, text:`§${p.id}`, style:'paragraphId'},
              {width:'*', text:p.text, style:'body'}
            ],
            columnGap:10,
            margin:[0,0,0,10]
          }))
        ],
        margin:[0,0,0,18],
        pageBreak: index === 0 ? undefined : undefined
      });
      manifesto.push(rule());
    });

    const modules = (D.modules || []).map(m => ({
      stack:[
        {columns:[
          {width:62, text:m.id, style:'moduleCode'},
          {width:'*', stack:[
            {text:m.name, style:'moduleTitle'},
            {text:`DURACIÓN / ${m.duration}    DEP / ${m.depends.length ? m.depends.join(' + ') : 'BASE'}`, style:'meta'},
            {text:`GATE / ${m.gate}`, style:'bodyStrong', margin:[0,5,0,4]},
            {text:`OUTPUT / ${(m.outputs || []).join(' · ')}`, style:'smallBody'},
            {text:`REFERENCIAS / ${(m.refs || []).map(x => `§${x}`).join(' · ')}`, style:'meta', margin:[0,5,0,0]}
          ]}
        ]}
      ],
      margin:[0,0,0,13]
    }));

    const profiles = (D.roles || []).map(r => ({
      columns:[
        {width:32, text:r.id, style:'profileId'},
        {width:118, text:r.name, style:'profileName'},
        {width:46, text:`×${r.wage.toFixed(1)} IMM`, style:'meta'},
        {width:'*', text:`${r.skills}\nENTREGA / ${r.output}`, style:'smallBody'}
      ],
      columnGap:8,
      margin:[0,0,0,8]
    }));

    const readiness = (D.readiness || []).map(r => ({
      columns:[
        {width:150, text:r.name, style:'profileName'},
        {width:58, text:`peso ${(r.weight*100).toFixed(0)}%`, style:'meta'},
        {width:70, text:r.gate ? `gate ${r.gate}` : 'sin gate', style:'meta'},
        {width:'*', text:r.prompt, style:'smallBody'}
      ],
      columnGap:8,
      margin:[0,0,0,7]
    }));

    const waves = (D.waves || []).map(w => ({
      stack:[
        {text:`${w.id} / ${w.span}`, style:'articleNumber'},
        {text:w.name, style:'moduleTitle'},
        {text:`MÓDULOS / ${w.modules.join(' · ')}`, style:'meta', margin:[0,3,0,3]},
        {text:`CRITERIO DE SALIDA / ${w.exit}`, style:'smallBody'}
      ],
      margin:[0,0,0,12]
    }));

    return {
      info:{
        title:D.meta.title,
        subject:'Manifiesto y mapa técnico de implementación',
        author:'NGRR / manifest',
        keywords:'tejido social, riqueza, autonomía, implementación, planificación'
      },
      pageSize:'A4',
      pageMargins:[50,54,50,50],
      background:(currentPage, pageSize) => ({
        canvas:[{type:'rect', x:0, y:0, w:pageSize.width, h:pageSize.height, color:'#0b0c0e'}]
      }),
      header:(currentPage) => currentPage === 1 ? null : ({
        margin:[50,22,50,0],
        columns:[
          {text:'MANIFEST / IMPLEMENTATION NODE', style:'running'},
          {text:`V${D.meta.version}`, style:'running', alignment:'right'}
        ]
      }),
      footer:(currentPage, pageCount) => ({
        margin:[50,0,50,18],
        columns:[
          {text:'tejido social · cultura · riqueza · autonomía', style:'running'},
          {text:`${String(currentPage).padStart(2,'0')} / ${String(pageCount).padStart(2,'0')}`, style:'running', alignment:'right'}
        ]
      }),
      defaultStyle:{font:'Roboto', fontSize:9.5, color:'#f3f4f5', lineHeight:1.35},
      styles:{
        running:{fontSize:6.5, color:'#777c84', characterSpacing:1.1},
        label:{fontSize:7, color:'#8f949c', bold:true, characterSpacing:1.2},
        coverTitle:{fontSize:44, bold:false, color:'#ffffff', lineHeight:0.95},
        coverArrow:{fontSize:44, color:'#b9bec6', lineHeight:0.95},
        coverLead:{fontSize:14, color:'#d6d8dc', lineHeight:1.35},
        sectionTitle:{fontSize:25, color:'#ffffff', margin:[0,0,0,12]},
        sectionDeck:{fontSize:10.5, color:'#b9bdc4', lineHeight:1.45},
        articleNumber:{fontSize:7, bold:true, color:'#8f949c', characterSpacing:1.1},
        articleTitle:{fontSize:18, color:'#ffffff', margin:[0,4,0,10]},
        paragraphId:{fontSize:7, color:'#777c84', margin:[0,2,0,0]},
        body:{fontSize:10.5, color:'#eeeeef', lineHeight:1.45},
        bodyStrong:{fontSize:9.5, bold:true, color:'#ffffff'},
        smallBody:{fontSize:8.3, color:'#c7cacf', lineHeight:1.35},
        meta:{fontSize:6.8, color:'#858a92', characterSpacing:0.35},
        moduleCode:{fontSize:9, bold:true, color:'#ffffff'},
        moduleTitle:{fontSize:13, color:'#ffffff'},
        profileId:{fontSize:7, bold:true, color:'#ffffff'},
        profileName:{fontSize:8, bold:true, color:'#eceef0'},
        metric:{fontSize:16, color:'#ffffff'},
        metricLabel:{fontSize:6.5, color:'#8f949c', characterSpacing:0.8}
      },
      content:[
        {margin:[0,110,0,0], stack:[
          label('SYS.MNF // PDF EDITION // TRACEABLE'),
          {text:'riqueza', style:'coverTitle', margin:[0,24,0,0]},
          {text:'→ autonomía', style:'coverArrow', margin:[0,-2,0,24]},
          {text:D.meta.title, style:'coverLead', margin:[0,0,0,22]},
          {text:D.meta.premise, style:'sectionDeck', margin:[0,0,0,28]},
          {columns:[
            {stack:[{text:String(articleCount), style:'metric'}, {text:'ARTÍCULOS', style:'metricLabel'}]},
            {stack:[{text:String(paragraphCount), style:'metric'}, {text:'PÁRRAFOS', style:'metricLabel'}]},
            {stack:[{text:String((D.modules || []).length), style:'metric'}, {text:'MÓDULOS', style:'metricLabel'}]},
            {stack:[{text:String((D.roles || []).length), style:'metric'}, {text:'PERFILES', style:'metricLabel'}]}
          ], columnGap:18},
          {text:`VERSIÓN ${D.meta.version} / ${D.meta.updated}`, style:'meta', margin:[0,50,0,0]}
        ], pageBreak:'after'},

        label('01 / NORMATIVE LAYER'),
        {text:'Manifiesto', style:'sectionTitle'},
        {text:'Los artículos fijan el criterio. Cada párrafo conserva su identificador para mantener trazabilidad entre norma, módulo técnico y decisión de implementación.', style:'sectionDeck', margin:[0,0,0,22]},
        ...manifesto,

        {text:'Mapa técnico', style:'sectionTitle', pageBreak:'before'},
        label('02 / IMPLEMENTATION LAYER'),
        {text:'Los módulos convierten el articulado en una secuencia operativa con dependencias, compuertas, perfiles y productos verificables.', style:'sectionDeck', margin:[0,8,0,22]},
        ...modules,

        {text:'Cálculo y aplicabilidad', style:'sectionTitle', pageBreak:'before'},
        label('03 / PARAMETRIC MODEL'),
        {text:'El cálculo hace visibles los supuestos. Esta edición utiliza la configuración base incluida en el modelo; no constituye una tarifa universal ni una cotización.', style:'sectionDeck', margin:[0,8,0,18]},
        {table:{widths:['*','*'], body:[
          [{text:'POBLACIÓN OBJETIVO', style:'metricLabel'}, {text:number.format(b.N), style:'metric', alignment:'right'}],
          [{text:'PARTICIPANTES DIRECTOS', style:'metricLabel'}, {text:number.format(b.participants), style:'metric', alignment:'right'}],
          [{text:'MUESTRA MÍNIMA', style:'metricLabel'}, {text:number.format(b.sample), style:'metric', alignment:'right'}],
          [{text:'CÉLULAS TERRITORIALES', style:'metricLabel'}, {text:number.format(b.cells), style:'metric', alignment:'right'}],
          [{text:'MESES-PERSONA', style:'metricLabel'}, {text:number.format(b.totalRoleMonths), style:'metric', alignment:'right'}],
          [{text:'COSTO TOTAL BASE', style:'metricLabel'}, {text:money.format(b.total), style:'metric', alignment:'right'}]
        ]}, layout:{hLineColor:'#34373c', vLineColor:'#34373c', paddingTop:()=>8, paddingBottom:()=>8, paddingLeft:()=>8, paddingRight:()=>8}, margin:[0,0,0,18]},
        {text:'C = [Σ(meses_r × multiplicador_r × IMM × carga) + operación + tecnología] × (1 + overhead + contingencia)', style:'smallBody', margin:[0,0,0,7]},
        {text:'Muestra: n0 = z²·p(1-p)/e²; n = n0 / [1 + (n0-1)/N].', style:'smallBody'},

        {text:'Índice de preparación', style:'sectionTitle', pageBreak:'before'},
        label('04 / READINESS & GATES'),
        {text:'El promedio no habilita ejecución cuando falla una compuerta crítica. Una ventana óptima exige índice igual o superior a 85 y todas las dimensiones críticas sobre sus umbrales.', style:'sectionDeck', margin:[0,8,0,18]},
        ...readiness,

        {text:'Ruta crítica', style:'sectionTitle', pageBreak:'before'},
        label('05 / 365D'),
        {text:'La secuencia ordena instalación, línea base, capacidad social, capacidad económica y capitalización institucional. Cada onda termina con un criterio de salida verificable.', style:'sectionDeck', margin:[0,8,0,18]},
        ...waves,

        {text:'Perfiles y dependencia', style:'sectionTitle', pageBreak:'before'},
        label('06 / PEOPLE DEPENDENCIES'),
        {text:'El trabajo se define por competencias, entregables y dependencia operativa. Los multiplicadores salariales son unidades de planificación, no tarifas profesionales.', style:'sectionDeck', margin:[0,8,0,18]},
        ...profiles,

        {text:'Método y límites', style:'sectionTitle', pageBreak:'before'},
        label('07 / METHOD'),
        {text:'NORMA', style:'articleNumber', margin:[0,12,0,3]},
        {text:'El artículo declara qué tiene que ocurrir y qué condición no es aceptable.', style:'body'},
        {text:'EVIDENCIA', style:'articleNumber', margin:[0,12,0,3]},
        {text:'El diagnóstico demuestra si el problema existe, su escala y quiénes están involucrados.', style:'body'},
        {text:'CÁLCULO', style:'articleNumber', margin:[0,12,0,3]},
        {text:'Recursos, muestra, personal y costos se producen mediante fórmulas con supuestos visibles.', style:'body'},
        {text:'DECISIÓN', style:'articleNumber', margin:[0,12,0,3]},
        {text:'La compuerta define implementar, pilotear, preparar o no ejecutar.', style:'body'},
        rule(),
        {text:'La condición perfecta no se trata como una certeza teórica. Se operacionaliza como una ventana óptima: datos, legitimidad, capacidad institucional, factibilidad legal, manejo de conflicto y recursos superan umbrales previamente definidos. Si una compuerta crítica falla, el sistema no recomienda ejecución aunque el promedio general sea alto.', style:'sectionDeck'},
        {text:'manifest / ngrr.github.io/manifest/', style:'meta', margin:[0,32,0,0]}
      ]
    };
  }

  function download(){
    if (!window.pdfMake){
      window.print();
      return;
    }
    const original = button.innerHTML;
    button.disabled = true;
    button.classList.add('is-working');
    button.textContent = 'generando PDF…';
    try {
      const doc = buildDocument();
      window.pdfMake.createPdf(doc).download(`manifest-v${D.meta.version}.pdf`, () => {
        button.disabled = false;
        button.classList.remove('is-working');
        button.innerHTML = original;
      });
    } catch (error){
      console.error('PDF generation failed', error);
      button.disabled = false;
      button.classList.remove('is-working');
      button.innerHTML = original;
      window.print();
    }
  }

  button.addEventListener('click', download);
})();
