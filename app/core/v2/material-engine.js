(function(){
  'use strict';
  const VERSION='2.0.1';
  const materials={
    powderSteel:{id:'powderSteel',label:'분체도장 철판',family:'metal',baseColor:'#b8bec2',metalness:.45,roughness:.62,opacity:1},
    galvanizedSteel:{id:'galvanizedSteel',label:'아연도금 철',family:'metal',baseColor:'#aeb6ba',metalness:.65,roughness:.48,opacity:1},
    copper:{id:'copper',label:'동',family:'metal',baseColor:'#b96c35',metalness:.82,roughness:.36,opacity:1},
    pvc:{id:'pvc',label:'PVC',family:'polymer',baseColor:'#c9ced0',metalness:0,roughness:.88,opacity:1},
    bakelite:{id:'bakelite',label:'베크라이트',family:'insulator',baseColor:'#d4a629',metalness:0,roughness:.72,opacity:1},
    acrylic:{id:'acrylic',label:'투명 아크릴',family:'transparent',baseColor:'#d9f4ff',metalness:0,roughness:.12,opacity:.38,transmission:.78},
    rubber:{id:'rubber',label:'고무 패킹',family:'rubber',baseColor:'#24282b',metalness:0,roughness:.94,opacity:1}
  };
  function defaultFor(object){
    const t=String(object?.type||'').toLowerCase(),v=String(object?.variant||object?.option||'').toLowerCase();
    if(t.includes('ground'))return v.includes('iron')||v.includes('steel')?'galvanizedSteel':'copper';
    if(t.includes('plate')){if(v.includes('pvc'))return'pvc';if(v.includes('bak')||v.includes('베크'))return'bakelite';return'powderSteel';}
    if(t.includes('window')||t.includes('acrylic'))return'acrylic';
    return'powderSteel';
  }
  function normalizeObject(o){if(!o)return o;o.materialId=o.materialId||defaultFor(o);return o;}
  function resolve(id){return materials[id]||materials.powderSteel;}
  function register(m){if(!m?.id)throw new Error('material id required');materials[m.id]={...m};return materials[m.id];}
  window.KENC_MATERIAL_ENGINE={version:VERSION,materials,resolve,register,defaultFor,normalizeObject};
})();
