// Original small stickers. SVG markup is fixed; user text never enters it.
export function diarySticker(kind) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','diary-sticker');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('shape-rendering','crispEdges');
  const shapes={
    flower:'<path d="M9 2h6v3h4v4h3v6h-3v4h-4v3H9v-3H5v-4H2V9h3V5h4Z" fill="#6c856d"/><path d="M10 4h4v3h4v3h2v4h-2v3h-4v3h-4v-3H6v-3H4v-4h2V7h4Z" fill="#e0b0c2"/><path d="M9 8h6v2h2v5h-2v2H9v-2H7v-5h2Z" fill="#fff4d7"/><path d="M10 10h4v4h-4Z" fill="#d8bd7d"/>',
    star:'<path d="M10 1h4v6h6v3h3v4h-6v6h-3v3h-4v-6H4v-3H1v-4h6V4h3Z" fill="#6c856d"/><path d="M11 4h2v5h6v2h2v2h-6v6h-2v2h-2v-6H5v-2H3v-2h6V5h2Z" fill="#e7cb92"/><path d="M10 9h3v4h-3Z" fill="#fff5df"/>',
    bow:'<path d="M2 4h7v3h6V4h7v13h-6v5h-4v-7h-1v7H7v-5H2Z" fill="#806779"/><path d="M4 6h4v3h3v4H8v2H4Zm12 0h4v9h-4v-2h-3V9h3Z" fill="#deb0c2"/><path d="M5 7h2v4H5Zm12 0h2v4h-2Z" fill="#fae2de"/><path d="M10 9h4v5h-4ZM9 15h2v5H9Zm4 0h2v5h-2Z" fill="#c588a3"/>'
  };
  svg.innerHTML=shapes[kind]||'';return svg;
}
