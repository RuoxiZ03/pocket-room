// Original 32px CD artwork. Static geometry; only real audio events rotate it.
export function discArt() {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('class','pixel-cd');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  svg.innerHTML='<g shape-rendering="crispEdges"><path fill="#49665e" d="M10 0h12v2h4v2h2v2h2v4h2v12h-2v4h-2v2h-2v2h-4v2H10v-2H6v-2H4v-2H2v-4H0V10h2V6h2V4h2V2h4z"/><path fill="#d5e6dc" d="M10 2h12v2h4v2h2v4h2v12h-2v4h-2v2h-4v2H10v-2H6v-2H4v-4H2V10h2V6h2V4h4z"/><path fill="#fff8e5" d="M10 4h10v2h-8v2H8v4H6v8H4V10h2V6h4zM22 24h4v2h-4v2h-8v-2h8z"/><path fill="#a2c8c5" d="M22 4h2v4h2v4h2v8h-2v4h-4v2h-4v-2h4v-4h2V10h-2z"/><path fill="#ddb5c4" d="M12 9h8v2h3v3h1v6h-3v3H11v-2H9v-9h3z"/><path fill="#fff8e5" d="M13 12h7v8h-7z"/></g>';
  return svg;
}
