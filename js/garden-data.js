import { LocalizedError, msg } from "./i18n.js";
// Append-only reward/care ledgers: inventory and growth are derived, never saved
// separately. The containing world transaction commits mood + reward, or care +
// consumption, together. Deleting/editing a mood never rewrites these snapshots.
export const resources = { water: 'Water', nutrients: 'Nutrients', sunlight: 'Sunlight', moonlight: 'Moonlight', stardust: 'Stardust' };
export const feelingResources = { happy: 'water', sad: 'nutrients', calm: 'sunlight', peaceful: 'sunlight', tired: 'moonlight', mixed: 'stardust', other: 'stardust', hopeful: 'stardust', anxious: 'stardust' };
export const initialGarden = (moods = []) => ({ version: 1, retiredDates: moods.map(r => r.date), grants: [], care: [], plants: [] });
const unique = values => new Set(values).size === values.length;
export function validGarden(g, validDate, moodKeys) {
  const id = v => typeof v === 'string' && v.length > 0 && v.length <= 100;
  if (!g || g.version !== 1 || !['retiredDates','grants','care','plants'].every(k => Array.isArray(g[k]) && g[k].length <= 10000)) return false;
  if (!g.retiredDates.every(validDate) || !unique(g.retiredDates)) return false;
  if (!g.grants.every(r => r && id(r.id) && validDate(r.date) && moodKeys.includes(r.mood) && resources[r.resource] && feelingResources[r.mood] === r.resource)) return false;
  if (!unique(g.grants.map(r => r.id)) || !unique([...g.retiredDates,...g.grants.map(r => r.date)])) return false;
  if (!g.plants.every(p => p && id(p.id) && Number.isInteger(p.position) && p.position >= 0 && p.position < 3 && validDate(p.plantedOn) && typeof p.name === 'string' && p.name.length <= 80 && typeof p.collected === 'boolean')) return false;
  if (!unique(g.plants.map(p => p.id)) || g.plants.filter(p => !p.collected).length > 1) return false;
  const grants=new Set(g.grants.map(r=>r.id)),plants=new Set(g.plants.map(p=>p.id)),counts=new Map();
  if (!g.care.every(c => c && id(c.id) && validDate(c.date) && grants.has(c.grantId) && plants.has(c.plantId))) return false;
  if (!unique(g.care.map(c => c.id)) || !unique(g.care.map(c => c.grantId))) return false;
  g.care.forEach(c=>counts.set(c.plantId,(counts.get(c.plantId)||0)+1));
  return g.plants.every(p => { const count=counts.get(p.id)||0; return count <= 5 && (!p.collected || count === 5 && p.name.trim().length > 0); });
}
export function inventory(g, resource) {
  const used = new Set(g.care.map(c => c.grantId));
  return g.grants.filter(r => r.resource === resource && !used.has(r.id));
}
export const growth = (g, plant) => g.care.filter(c => c.plantId === plant.id).length;
export const stage = points => ['Seed','Sprout','Leaves','Bud','Bud','Bloom'][points];
export function recordFeeling(world, record, previousId = record.id) {
  const g=world.garden;
  const eligible=!g.retiredDates.includes(record.date) && !g.grants.some(r => r.date === record.date);
  const reward=eligible ? {id:crypto.randomUUID(),date:record.date,mood:record.mood,resource:feelingResources[record.mood]} : null;
  return { ...world, moods:[...world.moods.filter(r => r.id !== previousId && r.date !== record.date),record],
    garden:reward ? {...g,grants:[...g.grants,reward]} : g };
}
export function plantSeed(world, position, date) {
  if(world.garden.plants.some(p => !p.collected))throw new LocalizedError(msg("garden_data.finishAndCollectYourCurrentFlowerFirst"));
  if(!Number.isInteger(position)||position<0||position>2)throw new LocalizedError(msg("garden_data.chooseOneOfTheThreePlantingPlaces"));
  return {...world,garden:{...world.garden,plants:[...world.garden.plants,{id:crypto.randomUUID(),position,plantedOn:date,name:'',collected:false}]}};
}
export function careForPlant(world, resource, date) {
  const g=world.garden,plant=g.plants.find(p => !p.collected),grant=inventory(g,resource)[0];
  if(!plant)throw new LocalizedError(msg("garden_data.plantYourSeedFirst"));
  if(growth(g,plant)>=5)throw new LocalizedError(msg("garden_data.yourFlowerHasBloomedCollectItBeforePlantingAgain"));
  if(!grant)throw new LocalizedError(msg("garden_data.noLeftRecordAFeelingOnAnotherDateTo", {p1: resources[resource]?msg('resources.'+resource):msg("garden_data.resource")}));
  return {...world,garden:{...g,care:[...g.care,{id:crypto.randomUUID(),plantId:plant.id,grantId:grant.id,date}]}};
}
export function collectPlant(world, name) {
  const g=world.garden,plant=g.plants.find(p => !p.collected);
  if(!plant||growth(g,plant)!==5)throw new LocalizedError(msg("garden_data.fiveCareVisitsAreNeededBeforeCollectingAFlower"));
  if(!name.trim()||name.trim().length>80)throw new LocalizedError(msg("garden_data.giveYourFlowerANameUpTo80Characters"));
  return {...world,garden:{...g,plants:g.plants.map(p => p.id===plant.id?{...p,name:name.trim(),collected:true}:p)}};
}
