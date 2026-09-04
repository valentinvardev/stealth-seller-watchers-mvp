import{c as l}from"./index-BR6lKv3N.js";/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M10.41 10.41a2 2 0 1 1-2.83-2.83",key:"1bzlo9"}],["line",{x1:"13.5",x2:"6",y1:"13.5",y2:"21",key:"1q0aeu"}],["line",{x1:"18",x2:"21",y1:"12",y2:"15",key:"5mozeu"}],["path",{d:"M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59",key:"mmje98"}],["path",{d:"M21 15V5a2 2 0 0 0-2-2H9",key:"43el77"}]],x=l("image-off",c);function y(t){return t.split(/\n\s*\n/).map(i=>i.trim()).filter(Boolean)}function u(t){const i=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,s=[];let n=0,e=i.exec(t);for(;e!==null;)e.index>n&&s.push({type:"text",text:t.slice(n,e.index)}),s.push({type:"link",text:e[1],url:e[2]}),n=e.index+e[0].length,e=i.exec(t);return n<t.length&&s.push({type:"text",text:t.slice(n)}),s}export{x as I,u as a,y as s};
