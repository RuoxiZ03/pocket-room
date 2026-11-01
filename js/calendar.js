import { dateMessage, errorMessage, msg, setLocalizedAttribute } from "./i18n.js";
import { today, dateKey, validDate, uid, categories } from './model.js';
import { el, text, button, field, value, toolbar, panel, empty, routeLink, openEditor, confirmAction, notify } from './ui.js';

export function taskEditor(ctx, date, existing = null) {
  if (existing) existing = ctx.world.tasks.find(task => task.id === existing.id) || existing;
  openEditor(existing ? msg("calendar.editPlan") : msg("calendar.addAPlan"), [
    field(msg("common.date"), 'date', existing?.date || date, { type: 'date', required: true, min: '0100-01-01', max: '9999-12-31' }),
    field(msg("calendar.yourPlan"), 'title', existing?.title || '', { required: true, maxlength: 100 }),
    el('div', { class: 'form-row' }, field(msg("calendar.timeOptional"), 'time', existing?.time || '', { type: 'time' }), field(msg("calendar.category"), 'category', existing?.category || 'study', { choices: categories.map(v => [v,msg('categories.'+v)]) })),
    field(msg("calendar.aLittleNoteOptional"), 'notes', existing?.notes || '', { type: 'textarea', maxlength: 500 }),
  ], async form => {
    const task = { id: existing?.id || uid(), date: value(form, 'date'), title: value(form, 'title'), time: value(form, 'time'), category: value(form, 'category'), notes: value(form, 'notes'), done: existing?.done || false };
    await ctx.upsert('tasks', task);
    notify(msg("calendar.planSaved"));
  });
}
export function taskRows(ctx, tasks) {
  return el('div', { class: 'task-list' }, tasks.map(task => {
    const checkbox = el('input', { type: 'checkbox', checked: task.done, 'aria-label': msg("calendar.complete", {p1: task.title}), onchange: async () => {
      checkbox.disabled = true;
      const latest = ctx.world.tasks.find(record => record.id === task.id) || task;
      try {
        await ctx.upsert('tasks', { ...latest, done: checkbox.checked });
        checkbox.closest('.task').classList.toggle('finished', checkbox.checked);
        if(checkbox.checked)ctx.feedback?.('task',checkbox);
      }
      catch (error) { checkbox.checked = latest.done; notify(errorMessage(error), true); }
      finally { checkbox.disabled = false; }
    } });
    return el('div', { class: `task ${task.done ? 'finished' : ''}` }, checkbox,
      el('div', { class: 'task-info' }, text('strong', task.title), text('small', msg("calendar.value", {p1: (task.time || msg("calendar.anyTime")), p2: msg('categories.'+task.category)}), task.category), task.notes ? text('p', task.notes) : null),
      el('div', { class: 'task-actions' }, button(msg("common.edit"), () => taskEditor(ctx, task.date, task)), button(msg("common.delete"), async () => {
        if (await confirmAction(msg("calendar.deleteThisPlan"), msg("calendar.willBeRemovedThisCannotBeUndone", {p1: task.title}))) {
          await ctx.remove('tasks', task.id);
          dayDetails(ctx, task.date);
        }
      })));
  }));
}
export function dayDetails(ctx, date) {
  const plans = ctx.world.tasks.filter(t => t.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const diary = ctx.world.diary.filter(r => r.date === date);
  const memories = ctx.world.memories.filter(r => r.date === date);
  const mood = ctx.world.moods.find(r => r.date === date);
  openEditor(msg("calendar.yourDay", {p1: dateMessage(date)}), [
    panel(msg("calendar.plans"), plans.length ? taskRows(ctx, plans) : text('p', msg("calendar.noPlansForThisDayYet"), 'help'), button(msg("calendar.addAPlan"), () => taskEditor(ctx, date), 'primary')),
    panel(msg("calendar.aLittleMoreOfThisDay"),
      el('div', { class: 'day-connections' },
        routeLink(msg('calendar_extra.diaryCount',{count:diary.length}), 'diary', { date }),
        routeLink(mood ? msg("calendar.moodGarden", {p1: msg('moods.'+mood.mood)}) : msg("calendar.moodGardenChooseAFeeling"), 'moods', { date }),
        routeLink(msg('calendar_extra.memoryCount',{count:memories.length}), 'memories', { date })),
      toolbar(routeLink(msg("calendar.writeADiaryEntry"), 'diary', { date, new: '1' }, 'pill'), routeLink(msg("calendar.recordAMood"), 'moods', { date, new: '1' }, 'pill'), routeLink(msg("calendar.addAMemory"), 'memories', { date, new: '1' }, 'pill'))),
  ]);
}
export function calendarPage(ctx, params) {
  const date = validDate(params.get('date')) ? params.get('date') : '';
  const requested = params.get('month');
  const monthKey = requested && validDate(`${requested}-01`) ? requested : (date || today()).slice(0, 7);
  const month = new Date(`${monthKey}-01T12:00:00`);
  const year = month.getFullYear();
  const index = month.getMonth();
  const move = offset => {
    const next = new Date(year, index + offset, 1, 12);
    if (next.getFullYear() < 100 || next.getFullYear() > 9999) return;
    location.hash = `/calendar?month=${dateKey(next).slice(0, 7)}`;
  };
  const cells = el('div', { class: 'calendar', 'aria-label': msg("calendar.monthlyCalendar") });
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(year, index + 1, 0).getDate();
  for (let i = 0; i < Math.ceil((offset + days) / 7) * 7; i++) {
    const current = new Date(year, index, 1 - offset + i, 12);
    const key = dateKey(current);
    const plans = ctx.world.tasks.filter(t => t.date === key).sort((a, b) => a.time.localeCompare(b.time));
    const extras = ctx.world.diary.some(r => r.date === key) || ctx.world.memories.some(r => r.date === key) || ctx.world.moods.some(r => r.date === key);
    const day = button('', () => {
      const hash = `#/calendar?month=${monthKey}&date=${key}`;
      if (location.hash === hash) dayDetails(ctx, key);
      else location.hash = hash;
    });
    day.className = `day${current.getMonth() !== index ? ' outside' : ''}${key === today() ? ' current' : ''}`;
    setLocalizedAttribute(day, 'aria-label', msg("calendar.plans2", {p1: dateMessage(key), p2: plans.length, p3: extras ? msg("calendar.personalEntries") : ''}));
    day.setAttribute('aria-pressed', String(key === date));
    if (key === today()) day.setAttribute('aria-current', 'date');
    day.append(text('span', current.getDate(), 'number'));
    plans.slice(0, 2).forEach(t => day.append(text('span', msg("calendar.value3", {p1: t.time ? msg("calendar.value2", {p1: t.time}) : '', p2: t.title}), `event ${t.category}${t.done ? ' done' : ''}`)));
    if (plans.length > 2) day.append(text('span', msg("calendar.more", {p1: plans.length - 2}), 'more'));
    if (extras) day.append(text('span', msg("calendar.entries2"), 'day-entry-marker'));
    cells.append(day);
  }
  const plans = ctx.world.tasks.filter(t => t.date.startsWith(monthKey));
  const done = plans.filter(t => t.done).length;
  return el('div', {class:'calendar-sheet','data-month':monthKey},
    toolbar(text('h3', dateMessage(month, { month: 'long', year: 'numeric' }), 'month-title'),
      el('div', { class: 'month-nav' }, el('button',{type:'button',class:'month-prev','aria-label':msg('calendar_extra.previous'),onclick:()=>move(-1)},'‹'), routeLink(msg("calendar.today"), 'calendar', { date: today() }, 'pill'), el('button',{type:'button',class:'month-next','aria-label':msg('calendar_extra.next'),onclick:()=>move(1)},'›'))),
    text('p', msg('calendar_extra.summary',{count:plans.length,done}), 'help'),
    el('progress', { value: done, max: Math.max(1, plans.length), 'aria-label': msg("calendar.monthlyPlanCompletion") }),
    el('div', { class: 'legend' }, categories.map(c => text('span', msg("calendar.value4", {p1: msg('categories.'+c)}), c))),
    el('div', { class: 'weekdays', 'aria-hidden': 'true' }, Array.from({length:7},(_,i)=>text('span',dateMessage(new Date(2026,0,5+i,12),{weekday:'short'})))), cells,
    text('p', msg("calendar.pinkDateTodayBlueFrameSelectedDateEntriesDiary"), 'help'));
}
