(function(){
  'use strict';
  function uuid(){
    if(window.crypto?.randomUUID)return window.crypto.randomUUID();
    const bytes=new Uint8Array(16);window.crypto?.getRandomValues?.(bytes);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    return [...bytes].map((b,i)=>([4,6,8,10].includes(i)?'-':'')+b.toString(16).padStart(2,'0')).join('');
  }
  window.KENC_UUID={version:'2.0.0',create:uuid,ensure:(o,key='uuid')=>{if(o&& !o[key])o[key]=uuid();return o?.[key]||null;}};
})();
