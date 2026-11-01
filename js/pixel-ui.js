// Small, state-free pieces for the opt-in pixel UI kit. No content/storage access.
import { button, text } from './ui.js';
import { setLocalizedAttribute } from './i18n.js';

export function pixelTooltip(label) {
  const tip=text('span',label,'px-tooltip');
  // The parent control must already have a translated accessible name.
  tip.setAttribute('aria-hidden','true');
  return tip;
}

export function arrowButton(label, action, direction='next') {
  const control=button('',action,'px-arrow');
  setLocalizedAttribute(control,'aria-label',label);
  const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');
  arrow.setAttribute('viewBox','0 0 8 8');
  arrow.setAttribute('aria-hidden','true');arrow.setAttribute('focusable','false');
  arrow.setAttribute('shape-rendering','crispEdges');
  const path=document.createElementNS(arrow.namespaceURI,'path');
  path.setAttribute('fill','currentColor');
  path.setAttribute('d',direction==='previous'
    ? 'M5 0h2v2H5v1H3v2h2v1h2v2H5V7H3V6H1V2h2V1h2Z'
    : 'M1 0h2v1h2v1h2v4H5v1H3v1H1V6h2V5h2V3H3V2H1Z');
  arrow.append(path);control.append(arrow,pixelTooltip(label));
  return control;
}
