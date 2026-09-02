import{c as r}from"./index-DdxKDiGD.js";import{a as s}from"./vendor-DfXjsB5x.js";/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],i=r("bell",c),o="sidebar-collapsed";let t=typeof window<"u"&&localStorage.getItem(o)==="true";const a=new Set;function n(e){return a.add(e),()=>{a.delete(e)}}function u(){t=!t;try{localStorage.setItem(o,String(t))}catch{}a.forEach(e=>e())}function p(){return s.useSyncExternalStore(n,()=>t,()=>!1)}export{i as B,u as t,p as u};
