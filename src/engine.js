import {content} from './content.js';
import {parse,noun} from './parser.js';
const C=content;const contributions=['syrup','berries','rice','fish'];
const startingItems={tote:'kitchen',list:'kitchen',stick:'trail','temperature log':'weather',pail:'weather',support:'grove',notebook:'sugarhouse',basket:'summeredge',clip:'summeredge','water chart':'landing',tray:'shed',rod:'hut',line:'hut',mittens:'hut'};
export function newGame(){return {version:3,location:'kitchen',inventory:[],items:{...startingItems},flags:{},visited:['kitchen'],discoveries:[],journal:[],teachings:{},vocabulary:[],hintLevels:{},timeline:[],turns:0,ended:false};}
export const serialize=state=>JSON.stringify(state);
export function deserialize(raw){
  const s=JSON.parse(raw);const ids=Object.keys(C.items);
  if(s?.version===2&&s.items&&Array.isArray(s.inventory)&&s.flags){
    if('gasket' in s.items){s.items.support=s.items.gasket;delete s.items.gasket;}else if(!('support' in s.items))s.items.support='grove';
    s.inventory=s.inventory.map(id=>id==='gasket'?'support':id);
    if(s.flags.gasketTaken)s.flags.supportTaken=true;
    if(s.flags.repaired)s.flags.stabilized=true;
    if(s.flags.collected||s.flags.sapDelivered||s.flags.syrup)s.flags.sapNamed=true;
    delete s.flags.gasketTaken;delete s.flags.repaired;s.flags.historyCaption=true;s.timeline=[];s.version=3;
  }
  if(!s||s.version!==3||!C.locations[s.location]||!Array.isArray(s.inventory)||!Array.isArray(s.visited)||!Array.isArray(s.journal)||!Array.isArray(s.discoveries)||!Array.isArray(s.vocabulary)||!s.flags||typeof s.flags!=='object'||Array.isArray(s.flags)||!s.items||typeof s.items!=='object'||!s.teachings||typeof s.teachings!=='object'||!s.hintLevels||typeof s.hintLevels!=='object'||typeof s.ended!=='boolean'||!Number.isInteger(s.turns)||s.turns<0)throw Error('This save is not a compatible Four Seasons game.');
  if(s.inventory.some(id=>!ids.includes(id))||new Set(s.inventory).size!==s.inventory.length||s.visited.some(id=>!C.locations[id])||s.journal.some(j=>!j||typeof j.title!=='string'||typeof j.text!=='string')||s.discoveries.some(x=>typeof x!=='string')||s.vocabulary.some(x=>!C.vocabulary.some(v=>v.id===x))||Object.entries(s.items).some(([id,pos])=>!ids.includes(id)||(pos!==null&&pos!=='inventory'&&pos!=='delivered'&&!C.locations[pos]))||s.inventory.some(id=>s.items[id]!=='inventory')||Object.entries(s.items).some(([id,pos])=>pos==='inventory'&&!s.inventory.includes(id))||Object.entries(s.teachings).some(([name,done])=>!C.teachings[name]||done!==true)||Object.values(s.flags).some(v=>typeof v!=='boolean')||Object.values(s.hintLevels).some(v=>!Number.isInteger(v)||v<0||v>3))throw Error('This save contains invalid game state. Your current game was kept.');
  if(!Array.isArray(s.timeline)||s.timeline.some(t=>!t||!C.locations[t.from]||!C.locations[t.to]))throw Error('The saved trail history is invalid. Your current game was kept.');
  return structuredClone(s);
}
export function goalKey(s){
  const f=s.flags;if(s.ended)return 'ended';
  if(!f.intro||!f.listTaken||!f.toteTaken)return 'home';
  if(!f.historyCaption)return f.recordsCompared?'historyCaption':'historyRecords';
  if(!f.syrup){if(!f.weatherRead||!f.pailTaken||!f.logTaken)return 'springWeather';if(!f.stabilized)return 'springRepair';if(!f.collected)return 'springCollect';if(!f.sapNamed&&!f.sapDelivered)return 'springLabel';return 'springBoil';}
  if(!f.notebookFound)return 'springBoil';
  if(!f.berries){if(!f.share||!f.basketTaken||!f.clipTaken)return 'summerPlan';if(!f.ripeObserved||!f.clothObserved)return 'summerObserve';return 'summerPick';}
  if(!f.rice){if(!f.contextCompared||!f.evidenceCompared)return 'fallEvidence';return 'fallSort';}
  if(!f.fish){if(!f.conditions||!f.buddy||!f.wearingMittens||!f.rigged)return 'winterPlan';return 'winterFish';}
  return 'feast';
}
export function currentGoal(s){return C.stages[goalKey(s)].goal;}
function note(s,id,title,text){if(s.discoveries.includes(id))return;s.discoveries.push(id);s.journal.push({title,text});}
function learn(s,id){if(C.vocabulary.some(v=>v.id===id)&&!s.vocabulary.includes(id))s.vocabulary.push(id);}
const roomWords={kitchen:['grandma'],weather:['spring','sap'],grove:['spring','sap','water','sap basket','bark','maple tree'],sugarhouse:['sap','syrup','sugar camp','fire'],summeredge:['summer','berries'],patch:['summer','berries'],landing:['fall','water','rice'],shed:['fall','rice'],hut:['winter','fish'],shelter:['winter','fish']};
export function vocabularyAt(s){return (roomWords[s.location]||[]).map(id=>C.vocabulary.find(v=>v.id===id)).filter(v=>v?.ojibwe);}
function teaching(s,name){if(s.teachings[name])return '';s.teachings[name]=true;const t=C.teachings[name];note(s,'teaching:'+name,name,t.experience);return `\n${name} — ${t.explanation}\nJournal: ${t.experience}`;}
function award(s,id){s.flags[id]=true;s.items[id]='inventory';if(!s.inventory.includes(id))s.inventory.push(id);learn(s,id);}
function remove(s,id,pos=null){s.inventory=s.inventory.filter(x=>x!==id);s.items[id]=pos;}
function held(s,id){return s.inventory.includes(id);}
function visible(s,id){return held(s,id)||s.items[id]===s.location||C.locations[s.location].objects.includes(id);}
function missing(s,id){const pos=s.items[id];return pos&&C.locations[pos]?`You need ${C.items[id].name}. It is at ${C.locations[pos].name}; TAKE ${id.toUpperCase()} there.`:`You need ${C.items[id]?.name||id} first. Check your inventory and the current goal.`;}
const itemAliases=Object.entries(C.items).flatMap(([id,item])=>[[id,id],[noun(item.name),id],...(item.aliases||[]).map(alias=>[noun(alias),id])]);
for(const v of C.vocabulary){if(v.ojibwe&&(C.items[v.id]||v.id==='water'))for(const alias of [v.ojibwe,...(v.aliases||[])])itemAliases.push([noun(alias),v.id]);}
function resolveObject(s,name){
  const exact=itemAliases.filter(([alias])=>alias===name).map(([,id])=>id);if(exact.length)return [...new Set(exact)];
  const objects=C.locations[s.location].objects;if(objects.includes(name))return [name];
  if(s.location==='archive'){const a={map:'reservation map','boundary map':'reservation map',law:'restoration law',record:'land record',cards:'records','record cards':'records','family photo':'photo'};if(a[name])return [a[name]];}
  const localAliases={tap:'collection basket',spout:'collection basket',brace:'support',wedge:'support',stand:'basket stand',biskitenaagan:'collection basket',"sap bucket":'collection basket',"birch bark bucket":'collection basket',"birch-bark bucket":'collection basket','rice batch':'rice','fruit':'berries','ripe fruit':'markers','ripe berries':'markers','picnic cloth':'cloth','temperature':'temperature log','water graph':'water chart','fishing hole':'hole','float':'bobber','wash basin':'basin',wiigwaas:'birch bark',ininaatig:'tree'};
  if(localAliases[name])return [localAliases[name]];
  return [...new Set([...itemAliases.filter(([alias,id])=>alias.includes(name)&&visible(s,id)).map(([,id])=>id),...objects.filter(id=>id.includes(name))])];
}
function one(s,name){if(!name)return {error:'Which object do you mean? Try EXAMINE LOG or USE SUPPORT ON BASKET STAND.'};const ids=resolveObject(s,name);if(!ids.length)return {error:`I cannot find “${name}” here. LOOK lists the surroundings; INVENTORY lists what you carry.`};if(ids.length>1)return {error:`Do you mean ${ids.join(' or ')}? Add the object’s name to your command.`};return {id:ids[0]};}
function person(name){const match=Object.entries(C.characters).find(([id,c])=>[id,c.name,...(c.aliases||[])].some(alias=>noun(alias)===name));return match?.[0]||name;}
function withCharacter(s,name){return C.locations[s.location].characters.includes(name);}
const destinationAliases={home:'kitchen','grandmas kitchen':'kitchen','grandma':'kitchen',spring:'weather','weather station':'weather','station':'weather',grove:'grove','maple grove':'grove','sugar house':'sugarhouse','summer':'summeredge','picnic shelter':'summeredge','blueberry patch':'patch','blueberries':'patch',fall:'landing','field station':'landing','rice shed':'shed',winter:'hut','equipment hut':'hut','fishing shelter':'shelter','familiar trail':'trail',archive:'archive','records room':'archive','community records room':'archive','iskigamizigan':'grove'};
for(const [id,destination] of Object.entries({spring:'weather',summer:'summeredge',fall:'landing',winter:'hut'})){const v=C.vocabulary.find(v=>v.id===id);if(v?.ojibwe)destinationAliases[noun(v.ojibwe)]=destination;}
function gate(s,from,to){
  if(from==='kitchen'&&to==='trail'&&(!s.flags.intro||!held(s,'list')||!held(s,'tote')))return 'Talk to Nookomis and carry both the feast list and tote before heading out.';
  if(from==='kitchen'&&to==='trail'&&!s.flags.historyCaption)return 'Nookomis asks you to compare the cards in the records room east before captioning the family photo. Her present-day home is only one part of the story.';
  if(from==='trail'&&to==='summeredge'&&(!s.flags.syrup||!s.flags.notebookFound))return 'Spring comes first. Finish the syrup contribution and take Eli’s shoreline notebook.';
  if(from==='trail'&&to==='landing'&&!s.flags.berries)return 'Finish your summer contribution with Leena before taking the fall path.';
  if(from==='trail'&&to==='hut'&&!s.flags.rice)return 'Help with the fall rice contribution before taking the winter path.';
  if(from==='hut'&&to==='shelter'&&(!s.flags.conditions||!s.flags.buddy))return 'Tess stops you at the door. Ask her about CONDITIONS and HELP; you only follow her checked route together.';
  return '';
}
export function exits(s){return Object.entries(C.locations[s.location].exits).map(([direction,to])=>({direction,to,name:C.locations[to].name,locked:!!gate(s,s.location,to)}));}
export function look(s){const r=C.locations[s.location];const items=Object.entries(s.items).filter(([,pos])=>pos===s.location).map(([id])=>itemName(id));const words=vocabularyAt(s);return `${r.name} · ${r.season} · ${r.time}\n${r.description}\n${items.length?'Available: '+items.join(', ')+'.\n':''}Exits: ${exits(s).map(e=>`${e.direction} (${e.name}${e.locked?'; not yet':''})`).join(' · ')}.\n${words.length?'Word cards: '+words.map(v=>v.ojibwe+' — '+v.english).join(' · ')+'.\n':''}Goal: ${currentGoal(s)}`;}
function move(s,target){
  const current=C.locations[s.location];const direct=current.exits[target];const dest=direct||destinationAliases[target]||(C.locations[target]?target:null);
  if(!dest)return 'Where would you like to go? LOOK lists exits; MAP shows places you have visited. You can also GO SPRING, GO SUMMER, GO FALL, or GO WINTER.';
  if(dest===s.location)return 'You are already here. LOOK, EXAMINE something, or TALK TO someone.';
  const queue=[[s.location]],seen=new Set([s.location]);let route=null;
  while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===dest){route=path;break;}for(const to of Object.values(C.locations[last].exits)){if(!seen.has(to)&&!gate(s,last,to)){seen.add(to);queue.push([...path,to]);}}}
  if(!route){const blocked=direct&&gate(s,s.location,dest);return blocked||gate(s,'trail',dest)||gate(s,'hut',dest)||'That route is not open yet. Check the current goal before crossing to the next season.';}
  const crossings=[];let last=s.location;
  for(const id of route.slice(1)){
    if(C.locations[id].time.includes('1926')!==C.locations[last].time.includes('1926')&&id!=='trail'&&last!=='trail'){
      const message=`TIME CROSSING — ${timeLabel(last)} → ${timeLabel(id)}. The split pine is still there; the calendar is not. You arrive at ${C.locations[id].name}.`;
      crossings.push(message);s.timeline.push({from:last,to:id});
    }else if(last==='trail'&&id!=='kitchen'){
      crossings.push(`SEASON CROSSING — the ${C.locations[id].season.toLowerCase()} path opens into ${timeLabel(id)}. You arrive at ${C.locations[id].name}; this is the present-day side of the trail.`);s.timeline.push({from:last,to:id});
    }else if(id==='kitchen'&&dest==='kitchen'&&last!=='archive'){crossings.push('HOME AGAIN — present-day 2026, Nookomis’s kitchen. Only a few minutes have passed here; the tote brings your contributions safely through the fictional fold.');s.timeline.push({from:last,to:id});}
    s.location=id;if(!s.visited.includes(id))s.visited.push(id);last=id;
  }
  for(const v of vocabularyAt(s))learn(s,v.id);
  learn(s,'water');if(dest==='shed')learn(s,'rice');if(dest==='shelter')learn(s,'fish');
  return (crossings.length?crossings.join('\n')+'\n\n':'')+(route.length>2?`You retrace the connecting paths (${route.slice(1,-1).map(id=>C.locations[id].name).join(' → ')}).\n`:'')+look(s);
}
function talk(s,name,topic='default'){
  name=person(name);if(!withCharacter(s,name))return `${name||'That person'} is not here. People here: ${C.locations[s.location].characters.join(', ')||'just you and a very patient narrator'}.`;
  const character=C.characters[name];if(character?.word){learn(s,character.word);const entry=C.vocabulary.find(v=>v.id===character.word);note(s,'person:'+name,characterName(name),`${characterName(name)} is ${s.location==='grove'||s.location==='sugarhouse'||s.location==='shed'?'one of the ancestors in your family photo, in 1926':'with your contemporary family in 2026'}. Word note: ${entry.ojibwe} — ${entry.english}.`);}
  const raw=topic;topic=noun(topic);const word=wordFor(topic);if(word){learn(s,word.id);topic=word.id;}if(name==='grandma'){s.flags.intro=true;learn(s,'grandma');note(s,'intro','A family contribution','Grandma June needs four small contributions; the rest of the family is preparing the larger meal. The tote’s time folds preserve the story’s contributions without a food-storage simulation.');}
  if(name==='rose'&&/basket|wobbl|spill|mistake|support|honest/.test(topic)){s.flags.reported=true;return C.teachings.Honesty.invitation+'\n'+(C.dialogue.rose.basket||C.dialogue.rose.default)+teaching(s,'Honesty');}
  if(name==='rose'&&/tree|care|share/.test(topic)){s.flags.treeCare=true;note(s,'tree','Care for the grove',C.dialogue.rose.tree);return C.dialogue.rose.tree;}
  if(name==='rose'&&/weather|log|temperature/.test(topic))return C.teachings.Wisdom.invitation+'\n'+C.dialogue.rose.weather;
  if(name==='leena'&&/share|promise|plan|respect|love|berries/.test(topic)){s.flags.share=true;note(s,'share','Summer commitment','Follow the marked ripe share, leave the rest, and return the basket to Leena for packing.');return C.dialogue.leena.share+'\n'+C.teachings.Respect.invitation+'\n'+C.teachings.Love.invitation;}
  if(name==='dan'&&/water|habitat|ecolog/.test(topic)){note(s,'ecology','Water and habitat',C.rice.ecology);return C.rice.ecology;}
  if(name==='ada'&&/process|rice|team/.test(topic)){s.flags.processKnown=true;learn(s,'rice');note(s,'riceProcess','The team’s prepared rice',C.rice.process);return C.rice.process+'\n'+C.teachings.Humility.invitation;}
  if(name==='ada'&&/chart|evidence|truth|notebook/.test(topic))return C.teachings.Truth.invitation+'\n'+C.dialogue.ada.chart;
  if(name==='tess'&&/condition|safe|ice|route/.test(topic)){s.flags.conditions=true;note(s,'ice','Tess’s checked location',C.safety.ice);return C.safety.ice;}
  if(name==='tess'&&/help|new|plan|brave|courage|buddy/.test(topic)){s.flags.buddy=true;return C.teachings.Bravery.invitation+'\n'+C.dialogue.tess.help+teaching(s,'Bravery');}
  if(name==='tess'&&/bite|bobber|float/.test(topic)){if(s.location==='shelter'){s.flags.biteObserved=true;note(s,'bite','The bobber’s movement',C.objectText.bobber);}return C.dialogue.tess.bite;}
  if(name==='grandma'&&/^(home|house|housing|rent|rental)$/.test(topic))return C.dialogue.grandma.home;
  if(/history|land|treaty|allotment|nelson|ownership|displac|1855|1889|1948|1959|2020|2024|restor/.test(topic)&&C.dialogue[name].land){if(C.locations[s.location].time==='1926'&&/1948|1959|2020|2024/.test(topic))return 'This ancestor is living in 1926. The later events are in the present-day records; return through the marked crossing to examine them. This visit does not rewrite the historical record.';return C.dialogue[name].land;}
  if(word&&topic!=='default'){return `${word.ojibwe} — ${word.english}. ${C.dialogue[name][word.id]||C.dialogue[name].words||C.dialogue[name].default}`;}
  const d=C.dialogue[name];const match=Object.keys(d).find(t=>t===topic||topic.includes(t)&&t!=='default');return d[match||'default']+(raw!=='default'&&!match?`\nYou can ASK ${characterName(name).toUpperCase()} ABOUT ${Object.keys(d).filter(t=>t!=='default').join(', ').toUpperCase()}.`:'');
}
function examine(s,id){
  if(s.location==='archive'&&C.history.records[id]){const flag={'reservation map':'boundaryRead','land record':'landRead','restoration law':'restorationRead'}[id];if(flag)s.flags[flag]=true;note(s,'record:'+id,id,C.history.records[id]);return C.history.records[id];}
  if(id==='rental note'&&s.location==='kitchen')return C.objectText[id];
  if(!visible(s,id))return missing(s,id);
  if(id==='temperature log'){s.flags.weatherRead=true;note(s,'weather','Freezing nights, warmer days',C.items[id].description);return C.items[id].description+'\n'+C.teachings.Wisdom.invitation;}
  if(id==='markers'||id==='berries'&&s.location==='patch'){s.flags.ripeObserved=true;note(s,'ripe','Leena’s marked plot',C.safety.berries);return C.objectText.markers+'\n'+C.safety.berries;}
  if(id==='cloth'||id==='wind'){s.flags.clothObserved=true;note(s,'cloth','A flying rectangle',C.objectText.cloth);}
  if(id==='bobber'){s.flags.biteObserved=true;note(s,'bite','The bobber’s movement',C.objectText.bobber);}
  if(id==='labels'){return labelClues(s);}
  if(id==='notebook'){note(s,'oldNotes','Earlier observations',C.items.notebook.description);}
  if(id==='water chart'){note(s,'chart','Measured, not guessed',C.items[id].description);}
  // Scene objects can share an ID with the eventual contribution.
  if(C.locations[s.location].objects.includes(id)&&!held(s,id)&&C.objectText[id])return C.objectText[id];
  return C.items[id]?.description||C.objectText[id]||'You look carefully. Nothing new presents itself; try talking to the person here.';
}
function take(s,id){
  if(held(s,id))return `You already carry ${C.items[id]?.name||id}. Your pockets decline to duplicate it.`;
  if(s.items[id]!==s.location){if(id==='berries'&&s.location==='patch')return pick(s);if(id==='rice'&&s.location==='shed')return 'This is the team’s prepared batch. Help sort a small sample and give the tray to Ada for a shared check.';return C.locations[s.location].objects.includes(id)?`Leave ${id} in place. EXAMINE it or USE something appropriate on it.`:missing(s,id);}
  s.items[id]='inventory';s.inventory.push(id);const flags={list:'listTaken',tote:'toteTaken',pail:'pailTaken',support:'supportTaken','temperature log':'logTaken',basket:'basketTaken',clip:'clipTaken',notebook:'notebookFound'};if(flags[id])s.flags[flags[id]]=true;
  if(id==='notebook')note(s,'connection','A message across time','Eli’s earlier shoreline notebook may help Dan contextualize present-day water measurements.');
  if(id==='stick'){s.flags.stickTaken=true;return 'Taken: one unnecessary stick. Your tote now includes a résumé with no relevant experience.';}
  return `Taken: ${C.items[id].name}.`;
}
function repair(s){
  if(s.location!=='grove')return 'The tilted birch-bark sap bucket is in Waabigwan’s grove.';
  if(s.flags.stabilized)return 'The sap bucket is already steady. It has retired from its brief career as a sprinkler.';
  if(!held(s,'support'))return missing(s,'support');
  if(!s.flags.reported)return 'Waabigwan asks what you noticed before moving anything. ASK WAABIGWAN ABOUT BASKET; she can help you steady it.';
  s.flags.stabilized=true;remove(s,'support');
  return 'You brace the basket stand with the wooden support while Waabigwan holds the biskitenaagan, the birch-bark sap bucket. It sits level. The sap now stays in the bucket, a feature the bucket considers rather fundamental.';
}
function collect(s){
  if(s.location!=='grove')return 'Use the family’s established collection setup in Rose’s grove.';
  if(s.flags.collected)return 'Your agreed share has already been collected. Leave the remaining sap for the family’s ongoing work.';
  if(!s.flags.stabilized)return 'The sap bucket is tilted and spills. EXAMINE COLLECTION BASKET, then ask Waabigwan about it before adding a wooden support.';
  if(!s.flags.weatherCompared)return 'Rose asks to see Nora’s temperature log. GIVE TEMPERATURE LOG TO ROSE to compare observations.';
  if(!s.flags.treeCare)return 'Before collecting, ASK ROSE ABOUT TREE and follow the family’s existing plan.';
  if(!held(s,'pail'))return missing(s,'pail');s.flags.collected=true;remove(s,'pail');s.items.sap='inventory';s.inventory.push('sap');learn(s,'water');note(s,'sap','Sap is not syrup','You helped collect a small share from an adult-managed setup. Sap is watery; the family’s ongoing process takes time.');return 'With Waabigwan checking the setup, you transfer the agreed sap share into your pail. Its thin, watery look is a clue: it is not finished syrup. Name what you have using the labels, then take it east to Ishkode’s sugarhouse.'+teaching(s,'Wisdom');
}
function pick(s){
  if(s.location!=='patch')return 'Leena’s marked blueberry plot is east of the summer picnic shelter.';
  if(s.flags.picked)return 'You already collected the agreed share. Give the basket to Leena for packing.';
  if(!s.flags.share)return 'ASK LEENA ABOUT SHARE first; she knows the maintained plot and the amount to gather.';
  if(!held(s,'basket'))return missing(s,'basket');
  if(!s.flags.ripeObserved)return 'EXAMINE MARKERS. Leena identifies the known plants and marked ripe share; do not guess from a description.';
  if(!s.flags.secured)return 'The cloth keeps flapping across the basket area. EXAMINE CLOTH, then secure it with the clip.';
  s.flags.picked=true;note(s,'harvest','A modest summer share','You collected Leena’s marked ripe share and left the remaining and unripe fruit.');return 'You collect only the marked ripe share, leaving the rest. The basket is satisfyingly full without becoming a competitive sport. Give it to Leena as promised.'+teaching(s,'Respect');
}
function sort(s){if(s.location!=='shed')return 'The supervised sorting task is in Ada’s family rice shed.';if(s.flags.sorted)return 'The sample is already sorted. Give the tray to Ada for a second check.';if(!s.flags.evidenceCompared)return 'Ada asks about Dan’s comparison first. Use the earlier notebook on his water panel, then compare the modern water chart with the notebook here.';if(!s.flags.processKnown)return 'ASK ADA ABOUT PROCESS so you understand which work the family already completed.';if(!held(s,'tray'))return missing(s,'tray');if(!s.flags.trayClean)return 'Clean the tray in the basin before handling the sample: USE TRAY ON BASIN.';s.flags.sorted=true;return 'With Ada beside you, you inspect a small cooled sample and separate the stray bits she points out. The family did the long preparation; your useful part is this final inspection. Give the tray to Ada for a shared check.';}
function fish(s){if(s.location!=='shelter')return 'Follow Tess’s assessed route to the fishing shelter first. There is no fishing from an unassessed location.';if(s.flags.fish)return 'Your family contribution is already packed. Tess is handling the rest of the fishing plan; no need to collect more.';if(!s.flags.conditions||!s.flags.buddy)return 'Ask Tess about conditions and help. Fish only with your experienced partner.';if(!held(s,'rod'))return missing(s,'rod');if(!s.flags.wearingMittens||!s.flags.rigged)return 'Prepare the gear: USE MITTENS and USE LINE ON ROD. Tess can help.';if(!s.flags.biteObserved)return 'Observe the bobber with EXAMINE BOBBER or ASK TESS ABOUT BITE before fishing.';award(s,'fish');note(s,'fish','A shared winter catch','Tess guided the plan, gear, and catch, then handled and packed the family’s fish contribution. The family will finish cooking at home.');return 'You respond to the bobber’s dip with Tess guiding you. Together you land a fish; Tess handles and packs the contribution. It was a team effort, including the bobber, which insists it deserves a tiny certificate.';}
function compare(s){
  if(s.location!=='shed')return 'Compare the current chart and earlier notebook with Ada in the rice shed.';
  if(!held(s,'water chart'))return missing(s,'water chart');if(!held(s,'notebook'))return missing(s,'notebook');if(!s.flags.contextCompared)return 'Bring the earlier notebook to Dan’s modern water panel first: USE NOTEBOOK ON WATER PANEL.';
  if(s.flags.evidenceCompared)return 'You already distinguished historical observations from modern measurements. Continue helping with the prepared rice sample.';
  s.flags.evidenceCompared=true;note(s,'evidence','Two sources, different limits','Earlier shoreline sketches suggest questions about seasonal habitat; present-day measurements describe their recorded dates. Neither gives exact water depths for a different year.');return C.teachings.Truth.invitation+'\nYou compare the sources with Ada: the earlier notebook gives context, while the chart contains dated present-day measurements. You correct your first idea that the old sketch gives an exact depth. Ada appreciates both the evidence and the correction.'+teaching(s,'Truth');
}
function use(s,id,target){
  if(s.location==='archive'&&['reservation map','land record','restoration law'].includes(id)&&['reservation map','land record','restoration law','records'].includes(target))return compareRecords(s);
  if(id==='records'&&target==='photo')return captionPhoto(s);

  if(id==='support'&&(!target||['basket stand','collection basket'].includes(target)))return repair(s);
  if((id==='pail'||id==='sap')&&['collection basket','basket stand'].includes(target))return collect(s);
  if(id==='temperature log'&&(target==='rose'||target==='tree'))return give(s,id,'rose');
  if(id==='sap'&&(!target||target==='boiler'||target==='eli'))return give(s,id,'eli');
  if(id==='clip'&&(!target||target==='cloth')){if(s.location!=='patch')return 'The flapping cloth is at the blueberry plot.';if(!held(s,'clip'))return missing(s,'clip');if(!s.flags.clothObserved)return 'EXAMINE CLOTH first to see what makes it flap.';s.flags.secured=true;return 'Leena holds the stand while you clip the loose cloth in place. Physics has finally reported for work.';}
  if(id==='basket'&&target==='berries')return pick(s);
  if(id==='notebook'&&target==='water panel'){if(s.location!=='landing')return 'Dan’s water panel is at the modern lakeshore field station.';if(!held(s,'notebook'))return missing(s,'notebook');s.flags.contextCompared=true;note(s,'crossTime','Earlier notes help a modern graph',C.rice.ecology+' Dan used earlier observations to frame questions, not to invent missing measurements.');return 'Dan compares Eli’s earlier seasonal notes with current readings. The notes help him ask about seasonal habitat changes; his measurements add detail the sketches never supplied. Take the water chart back to Ada.\n'+C.rice.ecology;}
  if((id==='water chart'&&target==='notebook')||(id==='notebook'&&target==='water chart'))return compare(s);
  if(id==='tray'&&(!target||target==='basin')){if(s.location!=='shed')return 'The wash basin is in Ada’s shed.';if(!held(s,'tray'))return missing(s,'tray');s.flags.trayClean=true;return 'You wash the tray at the basin and Ada checks that the work surface is ready. Small preparation prevents large annoyance.';}
  if(id==='tray'&&target==='rice')return sort(s);
  if(id==='mittens'){if(!held(s,id))return missing(s,id);s.flags.wearingMittens=true;return 'Mittens on. Your fingers approve. This prepares you to handle gear; it is not an ice-safety assessment.';}
  if(id==='line'&&(!target||target==='rod')){if(!withCharacter(s,'tess')||!s.flags.buddy)return 'Ask Tess about help and prepare the line with her at the hut or shelter.';if(!held(s,'line'))return missing(s,'line');if(!held(s,'rod'))return missing(s,'rod');s.flags.rigged=true;return 'With Tess helping, you attach the prepared line to the rod. The equipment is ready; follow her assessed route and watch the bobber.';}
  if(id==='rod'&&(!target||target==='hole'||target==='bobber'))return fish(s);
  if(target==='grandma')return give(s,id,'grandma');
  if(!visible(s,id))return missing(s,id);return `Using ${id}${target?' on '+target:''} produces no useful result. EXAMINE the object or ask someone here; nobody loses their eyebrows over a reasonable experiment.`;
}
function give(s,id,name){
  name=person(name);if(!withCharacter(s,name))return `${name} is not here. You keep the object.`;
  if(name==='grandma'&&contributions.includes(id)&&s.flags['delivered:'+id])return 'Grandma already has that contribution. “You may deliver it twice verbally, but I only have one jar.”';
  if(!held(s,id))return missing(s,id);
  if(name==='rose'&&id==='temperature log'){if(!s.flags.weatherRead)return 'Read the temperature log first so you can discuss its pattern.';s.flags.weatherCompared=true;note(s,'comparison','Present-day science, earlier observations','You showed Nora’s measured night/day pattern to Rose; she compared it with her local observations. The fictional fold lets each person contribute knowledge.');return C.teachings.Wisdom.invitation+'\nRose reads the measured pattern with you and compares her own observations. She returns the log. Both periods have practical knowledge; neither person has to pretend to know everything.';}
  if(name==='eli'&&id==='sap'){if(!s.flags.sapNamed)return 'Ishkode points to three word labels beside the boiler. Name the contents before we add them: LABEL SAP AS SAP, or use the Ojibwe word. EXAMINE LABELS explains the choices.';remove(s,id);s.flags.sapDelivered=true;return 'Eli adds your share to the ongoing family work. Help tend the batch and WAIT through the narrated preparation. It will take time; the story can move through it.';}
  if(name==='leena'&&id==='basket'){if(!s.flags.picked)return 'The basket is still empty. Observe the markers, secure the cloth, and collect the agreed share.';if(s.flags.berries)return 'Leena already packed your contribution. Keep the basket; apparently it is now your responsibility.';award(s,'berries');return 'You return the basket as promised. Leena and you pack a modest blueberry contribution into the tote; the family’s meal will have plenty of other food. She hands the basket back.'+teaching(s,'Love');}
  if(name==='ada'&&id==='tray'){if(!s.flags.sorted)return 'Clean the tray and help sort the prepared sample first. Ada returns the tray.';if(s.flags.rice)return 'Ada already checked and packed your rice contribution.';award(s,'rice');return 'You credit the relatives’ preparation and ask Ada for the shared final check. She checks the small sample and packs the family’s prepared-rice contribution. “A team, yes. That word saves considerable trouble.”'+teaching(s,'Humility');}
  if(name==='ada'&&id==='water chart')return compare(s);
  if(name==='dan'&&id==='notebook')return use(s,id,'water panel');
  if(name==='grandma'&&contributions.includes(id)){remove(s,id,'delivered');s.flags['delivered:'+id]=true;note(s,'delivered:'+id,'At Grandma’s table',`You brought the ${C.items[id].name} to the family’s larger meal.`);const remaining=contributions.filter(x=>!s.flags['delivered:'+x]);if(remaining.length)return `Grandma takes the ${C.items[id].name}. “Good. Put your coat somewhere that is not my chair.” Still to bring to her: ${remaining.join(', ')}.`;s.ended=true;return ending(s);}
  return `${name} does not need ${C.items[id]?.name||id} right now. You keep it; try ASK ${name.toUpperCase()} ABOUT a relevant topic.`;
}
function ending(s){return 'THE TABLE IS READY\nThe trail folds back into Nookomis’s present-day home near Cass Lake in 2026. Cousins carry dishes; someone rescues the potatoes. June finishes the cooking with the family and sets your four small contributions among everyone else’s work.\n“Four seasons, and you still beat the cousin with the folding chairs,” Grandma says.\n'+(s.flags.reported?'Waabigwan’s steady sap bucket made the spring work possible. ':'')+(s.flags.contextCompared?'Eli’s notes and Dan’s measurements found a useful conversation across time. ':'')+'Leena remembers that you kept your promise; Ada and Tess know you worked with them, not instead of them.\n'+(s.flags.stickTaken?'June notices the unnecessary stick. “That is not a vegetable. Put it outside.”':'June gives you her good spoon. “You may stir. This is a promotion.”')+'\nNookomis places your carefully captioned photo beside the dishes. A home today, the community’s land loss, and its continuing restoration work all belong in the story. Helping with this meal has not magically undone that history. You helped bring people and a meal together. There is no authenticity score, only a table with room for you. JOURNAL keeps the record; RESTART begins another visit.';}
export function journalText(s){return `FEAST JOURNAL\nGoal: ${currentGoal(s)}\nContributions: ${contributions.map(id=>`${id}: ${s.flags['delivered:'+id]?'at the table':s.flags[id]?'gathered':'still needed'}`).join(' · ')}\n\n${s.journal.length?s.journal.map(j=>j.title+'\n'+j.text).join('\n\n'):'Your notebook is waiting for its first entry.'}\n\nVOCABULARY\n${s.vocabulary.map(id=>{const v=C.vocabulary.find(v=>v.id===id);return v.ojibwe?`${v.ojibwe} — ${v.english}${v.grammarNote?'\n'+v.grammarNote:''}\nSource: ${C.sources[v.source].title}${v.speakerContext?' · recorded speaker: '+v.speakerContext:''}\n${v.primaryEntry}`:`${v.english} — Ojibwe term pending verified local review`;}).join('\n')}\n\n${C.teachingNote}\n${C.languageNote}`;}
export function mapText(s){return 'EXPLORED MAP\n'+s.visited.map(id=>`${C.locations[id].name} [${C.locations[id].season} · ${C.locations[id].time}]\n  ${Object.entries(C.locations[id].exits).filter(([,to])=>s.visited.includes(to)).map(([dir,to])=>dir+' → '+C.locations[to].name).join(' · ')||'No explored connections yet.'}`).join('\n')+'\nGO plus a visited place retraces the connecting paths. LOOK reveals the exits from your current place.';}
export const helpText='COMMANDS\nLOOK / L · EXAMINE object / X object · TAKE object · DROP object · INVENTORY / I\nNORTH / N · SOUTH / S · EAST / E · WEST / W · SOUTHEAST / SE · NORTHWEST / NW · GO destination\nTALK TO character · ASK character ABOUT topic · USE object [ON target] · GIVE object TO character\nPICK BERRIES · COLLECT SAP · LABEL SAP AS SAP (or the Ojibwe word) · TRANSLATE word · SORT RICE · FISH · WAIT\nHINT (three levels per puzzle step) · JOURNAL · MAP · TIMELINE · COMPARE RECORDS · SAVE · LOAD · RESTART (asks first)\nEnglish commands and aliases work; no Ojibwe spelling is required. Arrow Up/Down recalls commands. GO a named place retraces connecting paths; locked seasons remain locked. Nothing dies, essential objects can be recovered, and mistakes can be repaired.';
function hint(s){
  const key=goalKey(s);const count=Math.min((s.hintLevels[key]||0)+1,3);s.hintLevels[key]=count;
  // Dropped essentials always retain a recoverable location, even after a puzzle is complete.
  const dropped=Object.entries(s.items).filter(([id,pos])=>startingItems[id]&&pos&&pos!=='inventory'&&pos!==startingItems[id]||contributions.includes(id)&&s.flags[id]&&pos&&pos!=='inventory'&&pos!=='delivered');
  const recovery=dropped.map(([id,pos])=>`Recover ${id} at ${C.locations[pos]?.name}: GO ${pos.toUpperCase()}; TAKE ${id.toUpperCase()}.`).join('\n');
  return `Hint ${count}/3 · ${C.stages[key].goal}\n${C.stages[key].hints[count-1]}${recovery?'\n'+recovery:''}`;
}
function dispatch(s,input){
  const p=parse(input);if(p.verb==='empty')return {text:'Type a command, or HELP to see the controls.'};s.turns++;
  const dir=['north','south','east','west','southeast','northwest'];if(dir.includes(p.verb))return {text:move(s,p.verb)};
  if(['save','load','restart'].includes(p.verb))return {effect:p.verb,text:''};
  switch(p.verb){
    case 'look':return {text:look(s)};
    case 'help':return {text:helpText};
    case 'inventory':return {text:'INVENTORY\n'+(s.inventory.length?s.inventory.map(id=>itemName(id)+(id==='basket'&&s.flags.picked?' (your collected share)':'')).join('\n'):'Your pockets are enjoying an unusually peaceful moment.')};
    case 'journal':return {text:journalText(s)};
    case 'map':return {text:mapText(s)};
    case 'hint':return {text:hint(s)};
    case 'go':return {text:move(s,p.object)};
    case 'talk':return {text:talk(s,p.object)};
    case 'ask':return {text:talk(s,p.object,p.target)};
    case 'repair':return {text:repair(s)};
    case 'label':return {text:labelSap(s,p.object,p.target)};
    case 'match':return {text:labelSap(s,p.target,p.object)};
    case 'translate':return {text:translate(s,p.object)};
    case 'say':{const w=wordFor(p.object);if(!w)return {text:'Which word? EXAMINE LABELS or JOURNAL has words with meanings. English works too.'};learn(s,w.id);return {text:`${w.ojibwe} — ${w.english}. ${C.locations[s.location].characters.length?'Your companion points to its place in the feast list.':'You add the meaning to your journal.'}`};}
    case 'report':return {text:talk(s,'rose','basket')};
    case 'collect':return {text:collect(s)};
    case 'pick':return {text:pick(s)};
    case 'sort':return {text:sort(s)};
    case 'wash':return {text:use(s,'tray','basin')};
    case 'compare':return {text:compare(s)};
    case 'records':return {text:compareRecords(s)};
    case 'caption':return {text:captionPhoto(s,p.target)};
    case 'timeline':return {text:'YOUR TIME CROSSINGS\n'+(travelHistory(s).join('\n')||'You are in your present-day home in 2026. The trail has not opened yet.')+'\n\nLAND-HISTORY TIMELINE\n'+C.history.events.map(e=>e.year+' — '+e.title+': '+e.text).join('\n')};
    case 'fish':return {text:fish(s)};
    case 'wait':if(s.location==='sugarhouse'&&s.flags.sapDelivered&&!s.flags.syrup){award(s,'syrup');note(s,'boiling','Hours of shared work','You helped tend an ongoing batch while the story moved through hours of work. Sap was concentrated into syrup by the family; the transformation was not instant.');return {text:'You help with the ongoing work as the story moves through hours of tending and preparation. When the family’s batch is finished, Eli packs a small syrup contribution. The notebook on the bench can connect this earlier spring with Dan’s modern water observations.'};}return {text:'You pause. There is no countdown and no penalty for taking your time. WAIT helps at the sugarhouse after delivering sap; elsewhere, observation or conversation is more useful.'};
    case 'clarify':return {text:p.object==='ask'?'Who and what topic? Try ASK WAABIGWAN ABOUT BASKET.':p.object==='give'?'Give what to whom? Try GIVE SAP TO ELI.':`What would you like to ${p.object}? Try ${p.object.toUpperCase()} plus an object, person, or destination.`};
    case 'unknown':return {text:'I did not catch that command. Try LOOK, EXAMINE an object, TALK TO someone, or HELP. Reasonable experiments do not cost you progress.'};
    default:{const o=one(s,p.object);if(o.error)return {text:o.error};const id=o.id;
      if(p.verb==='take')return {text:take(s,id)};
      if(p.verb==='examine')return {text:examine(s,id)};
      if(p.verb==='drop'){if(!held(s,id))return {text:missing(s,id)};remove(s,id,s.location);if(id==='mittens')s.flags.wearingMittens=false;return {text:`You set down ${C.items[id].name} here. It stays recoverable: TAKE ${id.toUpperCase()} in this location.`};}
      if(p.verb==='give')return {text:give(s,id,p.target)};
      if(p.verb==='use'){let target=p.target;if(target&&!['rose','eli','leena','ada','dan','tess','grandma'].includes(person(target))){const t=one(s,target);if(t.error)return {text:t.error};target=t.id;}else target=person(target);return {text:use(s,id,target)};}
      return {text:helpText};
    }
  }
}

function wordFor(text){const name=noun(text);return C.vocabulary.find(v=>[v.id,v.ojibwe,v.english,v.lemma,...(v.aliases||[])].filter(Boolean).some(a=>noun(a)===name));}
function itemName(id){const item=C.items[id];const w=C.vocabulary.find(v=>v.id===id);return w?.ojibwe?`${w.ojibwe} (${item.name})`:item.name;}
export function characterName(id){return C.characters[id]?.name||id;}
function timeLabel(id){const r=C.locations[id];return `${r.season} ${r.time.includes('1926')?'1926 · 100 years earlier':r.time.includes('2026')?'2026 · present day':'between seasons'}`;}
export function travelHistory(s){return (s.timeline||[]).map(t=>`${timeLabel(t.from)} → ${timeLabel(t.to)} · ${C.locations[t.to].name}`);}
function labelClues(s){for(const id of ['water','sap','syrup'])learn(s,id);const task=C.languageTasks?.spring;return (task?.prompt||'The pail holds raw maple sap, not water or finished syrup.')+'\n'+['water','sap','syrup'].map(id=>{const w=C.vocabulary.find(v=>v.id===id);return `${w.ojibwe} — ${w.english}`;}).join('\n')+'\nTry LABEL SAP AS SAP or LABEL SAP AS ZIINZIBAAKWADWAABOO. The English meaning is accepted.';}
function labelSap(s,container,text){
  if(!['grove','sugarhouse'].includes(s.location))return 'The spring sap labels are beside the collection basket and sugarhouse boiler.';
  if(!s.flags.collected||!held(s,'sap'))return 'Collect the agreed share into the pail first; then we can name what it holds.';
  if(!['sap','pail','bucket','full pail','pail of sap'].includes(noun(container)))return 'Which container? Try LABEL SAP AS SAP, or name the full pail.';
  if(s.flags.sapNamed)return 'Your pail is already labeled ziinzibaakwadwaaboo — maple sap. It is ready for Ishkode’s ongoing batch.';
  const word=wordFor(text);if(!word)return 'The labels use nibi (water), ziinzibaakwadwaaboo (maple sap), and zhiiwaagamizigan (syrup). Choose the contents; English works too.';
  learn(s,word.id);if(word.id!=='sap')return C.languageTasks?.spring?.retry||'It came from the maple and has not been concentrated yet. It is maple sap; EXAMINE LABELS to compare the words. Nothing is lost.';
  s.flags.sapNamed=true;learn(s,'sap');note(s,'sapLabel','Naming the contribution','You connected ziinzibaakwadwaaboo with raw maple sap, rather than nibi (water) or zhiiwaagamizigan (syrup).');return C.languageTasks?.spring?.success||'You label the pail ziinzibaakwadwaaboo — maple sap. Ishkode can add the correct contribution to the ongoing work.';
}
function translate(s,text){const w=wordFor(text);if(!w)return 'That word is not in this adventure’s verified vocabulary. JOURNAL lists the words you have encountered.';learn(s,w.id);return `${w.ojibwe} — ${w.english}.${w.grammarNote?' '+w.grammarNote:''} This meaning is also saved in your word journal.`;}
function displayNames(text){if(!text)return text;const legacy={Nora:'nora',Rose:'rose',Eli:'eli',Leena:'leena',Dan:'dan',Ada:'ada',Tess:'tess'};for(const [old,id] of Object.entries(legacy)){text=text.replace(new RegExp(String.raw`\b${old}\b`,'g'),characterName(id)).replace(new RegExp(String.raw`\b${old.toUpperCase()}\b`,'g'),characterName(id).toUpperCase());}return text;}
export function execute(s,input){const result=dispatch(s,input);if(result.text)result.text=displayNames(result.text);return result;}

function compareRecords(s){
  if(s.location!=='archive')return 'The land-history cards are in the community records room east of Nookomis’s kitchen.';
  if(!s.flags.boundaryRead||!s.flags.landRead||!s.flags.restorationRead)return 'Read the reservation map, land record, and restoration law first. The dates and purposes of those records are the clues.';
  s.flags.recordsCompared=true;note(s,'historyComparison','Boundaries, ownership, and a partial remedy',C.history.comparison);return C.history.comparison+'\nUse these records to caption the photo, instead of treating the picture as a property deed: USE RECORDS ON PHOTO.';
}
function captionPhoto(s,claim=''){
  if(s.location!=='archive')return 'The copied family photo and the records are in the community records room.';
  if(!s.flags.recordsCompared)return 'Compare the three records before adding a caption. A photo by itself cannot establish the land’s title history.';
  if(claim&&/all.*restor|no.*displac|never.*lost|no.*land.*lost|every.*returned/i.test(claim))return 'That caption says more than the evidence supports. The law concerns a partial remedy, and the records do not establish every family’s path. Try a caption that recognizes a present home alongside community land loss.';
  if(claim&&!(/home.*(?:loss|lost|dispossess)|(?:loss|lost|dispossess).*home|both|boundar.*(?:not|different).*ownership/i.test(claim)))return 'What can the records support? A present home and a history of land loss can both be true. USE RECORDS ON PHOTO attaches that grounded caption without a spelling puzzle.';
  s.flags.historyCaption=true;note(s,'historyCaption','The photo’s grounded caption',C.history.caption);return 'You attach the sourced caption: '+C.history.caption+'\nThe photo can now join the feast table without pretending the family’s roof settles the history. Nookomis is pleased that this caption will not require correction over dessert. Return west, or GO TRAIL.';
}
