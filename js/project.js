import { msg } from "./i18n.js";
import { el, text } from './ui.js';
import { pixelIcon } from './pixel-icons.js';
export function projectPage() {
  return el('article',{class:'project-file'},pixelIcon('room'),text('p',msg("project.aboutThisProject"),'app-kicker'),
    text('h3','Pocket Room'),text('p',msg("project.aPersonalSpaceForPlansFeelingsAndLittleMemories"),'project-tagline'),
    text('p',msg("project.createdByRuoxiZhang"),'project-credit'),
    text('p',msg("project.iBuiltPocketRoomToBringPlanningJournalingAnd"),'prose'),
    text('p',msg("project.yourContentIsStoredInThisBrowserExportA"),'project-storage'));
}
