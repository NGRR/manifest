(() => {
  'use strict';

  const button = document.getElementById('downloadPdf');
  if (!button) return;

  const SOURCE = 'docs/manifiesto-completo.md';
  const FILE = 'manifesto-restauracion-tejido-social.pdf';

  function inline(text){
    const out = [];
    let rest = text;
    while (rest.length){
      const start = rest.indexOf('**');
      if (start < 0){ out.push({text:rest}); break; }
      if (start > 0) out.push({text:rest.slice(0,start)});
      const end = rest.indexOf('**', start + 2);
      if (end < 0){ out.push({text:rest.slice(start)}); break; }
      out.push({text:rest.slice(start + 2, end), bold:true});
      rest = rest.slice(end + 2);
    }
    return out.length ? out : [{text}];
  }

  function parseMarkdown(md){
    const lines = md.replace(/\r/g,'').split('\n');
    const content = [];
    let seenMajor = false;

    for (let i=0;i<lines.length;i++){
      const raw = lines[i];
      const line = raw.trim();
      if (!line) continue;

      if (line.startsWith('# ')) continue;

      if (line.startsWith('## ')){
        const title = line.slice(3).trim();
        content.push({text:title, style:'h1', pageBreak:seenMajor ? 'before' : undefined});
        seenMajor = true;
        continue;
      }

      if (line.startsWith('### ')){
        const title = line.slice(4).trim();
        const match = title.match(/^((?:ART\.|M)\s*[^—-]+)[—-]\s*(.+)$/);
        if (match){
          content.push({text:match[1].trim(), style:'code'});
          content.push({text:match[2].trim(), style:'h2'});
        } else {
          content.push({text:title, style:'h2'});
        }
        continue;
      }

      if (line.startsWith('- ')){
        content.push({ul:[{text:inline(line.slice(2))}], style:'bullet'});
        continue;
      }

      content.push({text:inline(line), style:'body'});
    }
    return content;
  }

  function docDefinition(md){
    const parsed = parseMarkdown(md);
    const title = 'Manifiesto para la restauración del tejido social y la transformación democrática de la riqueza';
    const premise = 'La riqueza tiene que producir autonomía; la autonomía tiene que distribuir capacidad de decisión sin convertir la diferencia en dominación.';

    return {
      info:{
        title,
        subject:'Criterios, programática y mapa técnico de implementación',
        author:'NGRR / manifest',
        keywords:'tejido social, riqueza, autonomía, implementación, planificación'
      },
      pageSize:'A4',
      pageMargins:[52,64,52,52],
      defaultStyle:{font:'Roboto', fontSize:10.3, lineHeight:1.42, color:'#111111'},
      header:(page) => page === 1 ? null : ({
        margin:[52,24,52,0],
        columns:[
          {text:'MANIFEST / RESTAURACIÓN DEL TEJIDO SOCIAL', style:'running'},
          {text:'EDICIÓN COMPLETA / 2026', style:'running', alignment:'right'}
        ]
      }),
      footer:(page,count) => ({
        margin:[52,0,52,20],
        columns:[
          {text:'tejido social · cultura · riqueza · autonomía', style:'running'},
          {text:`${String(page).padStart(2,'0')} / ${String(count).padStart(2,'0')}`, style:'running', alignment:'right'}
        ]
      }),
      styles:{
        running:{fontSize:6.6, color:'#777777', characterSpacing:0.7},
        kicker:{fontSize:7.2, bold:true, color:'#666666', characterSpacing:1.1},
        coverTitle:{fontSize:38, lineHeight:0.98, color:'#000000'},
        coverSubtitle:{fontSize:16, lineHeight:1.25, color:'#222222'},
        coverPremise:{fontSize:11.5, lineHeight:1.45, color:'#222222'},
        h1:{fontSize:23, lineHeight:1.08, color:'#000000', margin:[0,0,0,15]},
        h2:{fontSize:16, lineHeight:1.12, color:'#000000', margin:[0,3,0,9]},
        code:{fontSize:7.2, bold:true, color:'#666666', characterSpacing:0.8, margin:[0,12,0,3]},
        body:{fontSize:10.3, lineHeight:1.48, color:'#111111', margin:[0,0,0,9]},
        bullet:{fontSize:9.3, lineHeight:1.4, color:'#111111', margin:[0,0,0,5]}
      },
      content:[
        {margin:[0,120,0,0], stack:[
          {text:'SYS.MNF / EDICIÓN COMPLETA / DOCUMENTO PROGRAMÁTICO', style:'kicker'},
          {text:'riqueza → autonomía', style:'coverTitle', margin:[0,26,0,18]},
          {text:title, style:'coverSubtitle', margin:[0,0,0,24]},
          {text:premise, style:'coverPremise', margin:[0,0,0,28]},
          {canvas:[{type:'line',x1:0,y1:0,x2:490,y2:0,lineWidth:0.5,lineColor:'#B8B8B8'}], margin:[0,0,0,12]},
          {columns:[
            {stack:[{text:'25',fontSize:16},{text:'ARTÍCULOS',style:'running'}]},
            {stack:[{text:'10',fontSize:16},{text:'MÓDULOS',style:'running'}]},
            {stack:[{text:'14',fontSize:16},{text:'PERFILES',style:'running'}]},
            {stack:[{text:'365',fontSize:16},{text:'DÍAS',style:'running'}]}
          ]},
          {canvas:[{type:'line',x1:0,y1:0,x2:490,y2:0,lineWidth:0.5,lineColor:'#B8B8B8'}], margin:[0,12,0,0]},
          {text:'Papel blanco · texto negro · fuente completa versionada en el repositorio', style:'running', margin:[0,56,0,0]}
        ], pageBreak:'after'},
        ...parsed
      ]
    };
  }

  async function download(){
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'preparando PDF…';
    try{
      if (!window.pdfMake) throw new Error('pdfmake no disponible');
      const response = await fetch(SOURCE, {cache:'no-store'});
      if (!response.ok) throw new Error(`fuente ${response.status}`);
      const md = await response.text();
      window.pdfMake.createPdf(docDefinition(md)).download(FILE);
      button.textContent = 'PDF descargado';
      setTimeout(() => { button.textContent = old; button.disabled = false; }, 1400);
    } catch (error){
      console.error('PDF:', error);
      button.textContent = 'usar impresión / PDF';
      window.print();
      setTimeout(() => { button.textContent = old; button.disabled = false; }, 1400);
    }
  }

  button.addEventListener('click', download);
})();
