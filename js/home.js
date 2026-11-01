import { today, moods } from './model.js';
import { el, text, panel, routeLink, icon, sections } from './ui.js';
import { nickname } from './personal.js';
import { picture } from './media.js';

export function homePage(ctx) {
  const day = today();
  const plans = ctx.world.tasks.filter(t => t.date === day).sort((a, b) => a.time.localeCompare(b.time));
  const mood = ctx.world.moods.find(m => m.date === day);
  const recent = [...ctx.world.diary.map(r => ({ ...r, section: 'diary' })), ...ctx.world.memories.map(r => ({ ...r, section: 'memories' }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const p = ctx.world.profile;
  return el('div', {},
    el('div', { class: 'home-welcome' }, text('p', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), 'eyebrow'),
      text('h3', `Welcome home, ${nickname(ctx)}.`), text('p', 'A day for plans, a place for feelings, a box for memories.'),
      !p.nickname ? routeLink('Make this space yours →', 'about', {}, 'text-link') : null),
    el('div', { class: 'home-summary' },
      panel('Today, in little pieces', text('p', `${plans.filter(t => t.done).length} of ${plans.length} plans completed`, 'help'),
        plans.length ? el('ul', { class: 'today-plans' }, plans.slice(0, 4).map(t => el('li', { class: t.done ? 'done' : '' }, text('span', t.time || 'Any time'), text('strong', t.title)))) : text('p', 'No plans for today yet. Leave room for something good.', 'help'),
        routeLink(plans.length ? 'Open today’s plans' : 'Add today’s first plan', 'calendar', { date: day }, 'pill')),
      panel('A feeling for today', mood ? text('p', moods[mood.mood].label, 'mood-word') : text('p', 'How does today feel?', 'mood-word'),
        text('p', mood?.note || 'Every feeling belongs in your garden.', 'help'), routeLink(mood ? 'Visit today’s flower' : 'Plant today’s feeling', 'moods', { date: day, ...(mood ? {} : { new: '1' }) }, 'pill'))),
    text('h3', 'Around my little world', 'section-label'),
    el('div', { class: 'portal-grid' }, sections.map(([key, label, description]) => {
      const a = routeLink('', key, {}, `portal portal-${key}`);
      a.append(icon(key), el('div', {}, text('strong', label), text('span', description)), text('span', '↗', 'portal-arrow'));
      return a;
    })),
    el('div', { class: 'home-lower' },
      panel('Recently tucked away', recent.length ? el('div', { class: 'recent-list' }, recent.map(r => {
        const a = routeLink('', r.section, { id: r.id }, 'recent-entry');
        a.append(r.photos.length ? picture(r.photos[0], r.title) : icon('diary'), el('div', {}, text('small', `${r.date} · ${r.section === 'diary' ? 'Diary' : 'Memory'}`), text('strong', r.title)));
        return a;
      })) : el('div', {}, text('p', 'Your first page is still unwritten.', 'help'), routeLink('Write a little diary entry', 'diary', { date: day, new: '1' }, 'pill'))),
      panel('Currently…', ...['learning', 'reading', 'listening'].filter(k => p[k]).map(k => el('p', {}, text('strong', `${k[0].toUpperCase() + k.slice(1)}: `), p[k])),
        !p.learning && !p.reading && !p.listening ? text('p', 'What has your attention lately?', 'help') : null,
        ctx.world.player ? routeLink(`Now Playing · ${ctx.world.player.title}`, 'player', {}, 'text-link') : routeLink('Set your soundtrack', 'player', {}, 'text-link'),
        routeLink('Update Currently…', 'about', {}, 'text-link'))));
}
