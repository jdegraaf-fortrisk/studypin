// Vraagt de AdSense-advertentie in #adSlot op. Dit gebeurt hier (i.p.v. een inline
// <script> in index.html) omdat de CSP (script-src zonder 'unsafe-inline') inline
// scripts blokkeert. Werkt pas zodra de placeholder-ID's in index.html zijn
// vervangen door je eigen AdSense client- en ad-slot-ID (zie het commentaar bij #adSlot);
// tot die tijd blijft de advertentie leeg en blijft de "Advertentieruimte"-tekst zichtbaar.
export function initAds(){
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* adsbygoogle.js nog niet geladen of geblokkeerd (bv. adblocker), negeren */ }
}
