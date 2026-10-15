import {content} from './content.js';
import {newGame,execute,look,exits,currentGoal,vocabularyAt,travelHistory,characterName} from './engine.js';
import {mountSourceViewer} from './source-viewer.js';
import {mountSceneView} from './scene-view.js';
import {mountMapView} from './map-view.js';
import {itemIcon} from './illustration-icons.js';
import {saveState,loadState,clearSaves} from './storage.js';
const $=id=>document.getElementById(id);let state=newGame();let storageAvailable=true;let startup='';let history=[],historyIndex=0,draft='';
try{const saved=loadState(localStorage);if(saved){state=saved;startup='Your autosaved journey has been restored.';}}catch{startup='Saved progress could not be read. A new playable session is open; the old save has not been erased.';storageAvailable=false;}
const sourceViewer=mountSourceViewer({library:content.sourceLibrary,getLocation:()=>state.location});
const sceneView=mountSceneView({container:$('scene-view'),content,onCommand:runSceneCommand,onSource:inspectSceneSource});
const mapView=mountMapView({content,onCommand:run});
function runSceneCommand(command){run(command);if(!/^take\s/i.test(command)&&window.matchMedia('(max-width:760px)').matches)document.querySelector('.terminal').scrollIntoView({block:'start',behavior:'auto'});}
function inspectSceneSource(id){
  // On the records table, opening an original also examines its paired readable
  // exhibit card, exactly as a typed EXAMINE does. General source browsing stays
  // separate from puzzle progress.
  const exhibit={treaty1855:'reservation map',nelson1889:'land record',restoration2020:'restoration law'}[id];
  if(state.location==='archive'&&exhibit){const opener=document.activeElement;run('examine '+exhibit);if(opener?.isConnected)opener.focus({preventScroll:true});}
  sourceViewer.open(id);
}
function append(text,type='story'){if(!text)return;const log=$('transcript'),start=log.scrollHeight;const p=document.createElement('p');p.className='entry '+type;p.textContent=text;log.append(p);log.scrollTop=start;}
function renderInventory(container){
  container.replaceChildren();
  if(!state.inventory.length){const empty=document.createElement('p');empty.className='inventory-empty';empty.innerHTML=itemIcon('tote');empty.append(document.createTextNode('Your tote is waiting for its first contribution.'));container.append(empty);return;}
  for(const id of state.inventory){const b=document.createElement('button');b.type='button';b.className='inventory-item';b.dataset.item=id;b.innerHTML=itemIcon(id);const label=document.createElement('span');label.textContent=content.items[id].name;b.append(label);b.onclick=()=>{if($('inventory-dialog').open)$('inventory-dialog').close();run('examine '+id);};container.append(b);}
}
function renderJournal(){
  const detail=$('journal-detail');detail.replaceChildren();
  const section=(title)=>{const s=document.createElement('section');s.className='journal-section';const h=document.createElement('h3');h.textContent=title;s.append(h);detail.append(s);return s;};
  const notes=section('Observations & discoveries');
  if(!state.journal.length){const p=document.createElement('p');p.textContent='Your first page is waiting. Talk with Nookomis and examine the family photo to begin.';notes.append(p);}
  for(const note of state.journal){const article=document.createElement('article');article.className='journal-note';const h=document.createElement('h4');h.textContent=note.title;const p=document.createElement('p');p.textContent=note.text;article.append(h,p);notes.append(article);}
  const words=section('Words encountered'),grid=document.createElement('div');grid.className='journal-word-grid';words.append(grid);
  for(const id of state.vocabulary){const v=content.vocabulary.find(v=>v.id===id);if(!v?.ojibwe)continue;const card=document.createElement('div');card.className='journal-word';const term=document.createElement('strong');term.lang='oj';term.textContent=v.ojibwe;const meaning=document.createElement('span');meaning.textContent=v.english;const a=document.createElement('a');a.href=v.primaryEntry;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Ojibwe People’s Dictionary ↗';card.append(term,meaning,a);if(v.speakerContext){const p=document.createElement('p');p.className='small';p.textContent='Recorded speaker: '+v.speakerContext;card.append(p);}grid.append(card);}
  if(!grid.children.length){const p=document.createElement('p');p.textContent='Words will collect here as you explore.';grid.append(p);}
  const teachings=section('Reflections encountered'),tags=document.createElement('div');tags.className='teaching-tags';teachings.append(tags);
  for(const name of Object.keys(state.teachings)){const tag=document.createElement('span');tag.textContent=name;tags.append(tag);}
  const p=document.createElement('p');p.className='small';p.textContent=content.teachingNote;teachings.append(p);
}
function showNotebook(id){const dialog=$(id);if(id==='journal-dialog')renderJournal();if(id==='inventory-dialog')renderInventory($('inventory-detail'));if(!dialog.open){dialog.returnFocus=document.activeElement;dialog.showModal();$(id==='journal-dialog'?'journal-close':'inventory-close').focus({preventScroll:true});}}
function autosave(){try{saveState(localStorage,state);storageAvailable=true;}catch{storageAvailable=false;}storageStatus();}
function storageStatus(){ $('storage-status').textContent=storageAvailable?'Autosaved on this browser. SAVE creates a separate checkpoint; LOAD restores it.':'Browser storage is unavailable or could not be read. You can keep playing this session.'; }
function commandButton(text,command){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>run(command);return b;}
function refresh(){const room=content.locations[state.location];document.body.dataset.season=room.season;$('location').textContent=room.name;$('season').textContent=room.season;$('period').textContent=room.time==='1926'?'1926 · 100 years before home':room.time==='2026'?'2026 · present day':room.time;$('objective').textContent=currentGoal(state);$('contributions').replaceChildren();for(const id of ['syrup','berries','rice','fish']){const li=document.createElement('li');const mark=document.createElement('span');mark.textContent=state.flags['delivered:'+id]?'✓':state.flags[id]?'◆':'○';const meaning={syrup:'maple syrup',berries:'blueberries',rice:'prepared wild rice',fish:'a fish'}[id];const term=content.vocabulary.find(v=>v.id===id)?.ojibwe;const name=term+' — '+meaning;li.append(mark,document.createTextNode(`${name} · ${state.flags['delivered:'+id]?'at table':state.flags[id]?'gathered':'needed'}`));$('contributions').append(li);}
  $('story-chapter').textContent=room.chapter;sceneView.refresh(state);mapView.refresh(state);renderInventory($('inventory-items'));$('inventory-count').textContent=state.inventory.length;if($('inventory-dialog').open)renderInventory($('inventory-detail'));if($('journal-dialog').open)renderJournal();
  for(const [i,id] of ['syrup','berries','rice','fish'].entries()){const li=$('contributions').children[i];li.dataset.state=state.flags['delivered:'+id]?'delivered':state.flags[id]?'gathered':'needed';const icon=document.createElement('span');icon.className='contribution-icon';icon.innerHTML=itemIcon(id);li.prepend(icon);}
  $('exit-controls').replaceChildren();for(const e of exits(state)){const b=commandButton(`${e.direction.toUpperCase()}${e.locked?' · later':''}`,e.direction);b.setAttribute('aria-label',`Go ${e.direction} to ${e.name}${e.locked?' (not open yet)':''}`);$('exit-controls').append(b);}
  $('nearby').replaceChildren();const suggestions=['LOOK',...(state.location==='archive'?['COMPARE RECORDS']:[]),...(state.location==='grove'||state.location==='sugarhouse'?['EXAMINE LABELS']:[]),...room.characters.map(p=>`TALK TO ${characterName(p).toUpperCase()}`),...room.objects.slice(0,4).map(o=>`EXAMINE ${o.toUpperCase()}`)];for(const c of suggestions)$('nearby').append(commandButton(c,c));
  $('time-context').textContent=room.time==='1926'?'You are with ancestors in 1926. The marked crossing returns you to relatives and home in 2026.':state.location==='trail'?'This trail is the hub. Seasonal paths stay in 2026; the marked pine and dock crossings lead to 1926.':'Your kitchen and contemporary relatives are in 2026. The land-history cards describe earlier events; reading a card does not move you through time.';
  $('crossing-history').replaceChildren();for(const line of travelHistory(state).slice(-3)){const li=document.createElement('li');li.textContent=line;$('crossing-history').append(li);}
  sourceViewer.refresh();
  $('word-cards').replaceChildren();for(const v of vocabularyAt(state)){const div=document.createElement('div');div.className='word-card';const word=document.createElement('strong');word.lang='oj';word.textContent=v.ojibwe;const link=document.createElement('a');link.href=v.primaryEntry;link.target='_blank';link.rel='noopener';link.textContent='Dictionary entry';div.append(word,document.createTextNode(' — '+v.english),document.createElement('br'),link);$('word-cards').append(div);}storageStatus();
}
function run(input){const text=input.trim();if(!text)return;history.push(text);historyIndex=history.length;draft='';$('command').value='';append('> '+text,'command');const result=execute(state,text);
  if(result.effect==='sources'){sourceViewer.open(result.sourceId);autosave();return;}
  if(result.effect==='restart'){$('restart-dialog').showModal();refresh();return;}
  if(result.effect==='save'){try{saveState(localStorage,state,true);storageAvailable=true;append('Checkpoint saved. LOAD returns to this moment; autosave continues separately.','system');}catch{storageAvailable=false;append('The browser could not save. Keep playing here; no progress was erased.','system');}}
  else if(result.effect==='load'){try{const loaded=loadState(localStorage,true)||loadState(localStorage);if(loaded){state=loaded;append('Saved checkpoint restored.\n'+look(state));}else append('No saved journey exists yet. SAVE creates a checkpoint.','system');}catch{storageAvailable=false;append('That save could not be loaded. Your current journey was kept.','system');}}
  else append(result.text);
  refresh();if(result.effect!=='load'||storageAvailable)autosave();$('command').focus({preventScroll:true});if(/^map$/i.test(text))mapView.open(state);
}
$('command-form').onsubmit=e=>{e.preventDefault();run($('command').value);};
$('command').onkeydown=e=>{if(e.key==='ArrowUp'){e.preventDefault();if(historyIndex===history.length)draft=e.target.value;historyIndex=Math.max(0,historyIndex-1);e.target.value=history[historyIndex]||draft;}else if(e.key==='ArrowDown'){e.preventDefault();historyIndex=Math.min(history.length,historyIndex+1);e.target.value=historyIndex===history.length?draft:history[historyIndex];}};
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>run(b.dataset.command));$('source-open').onclick=()=>sourceViewer.open();$('map-open').onclick=()=>mapView.open(state);$('inventory-open').onclick=()=>showNotebook('inventory-dialog');$('journal-open').onclick=()=>{const opener=document.activeElement;run('journal');showNotebook('journal-dialog');$('journal-dialog').returnFocus=opener;};
for(const type of ['inventory','journal']){const dialog=$(type+'-dialog');$(type+'-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{const target=dialog.returnFocus;if(target?.isConnected)target.focus({preventScroll:true});else $('command').focus({preventScroll:true});});}
$('restart').onclick=()=>run('RESTART');$('cancel-restart').onclick=()=>{$('restart-dialog').close();$('command').focus();};$('confirm-restart').onclick=()=>{try{clearSaves(localStorage);}catch{storageAvailable=false;}state=newGame();history=[];historyIndex=0;draft='';$('transcript').replaceChildren();$('restart-dialog').close();append('A new visit to Nookomis’s kitchen.\n'+look(state));refresh();autosave();$('command').focus();$('transcript').scrollTop=0;};
$('framing').textContent=content.framing;$('language-note').textContent=content.languageNote;append(content.title,'system');if(startup)append(startup,'system');append(look(state));append('Try TALK TO NOOKOMIS, EXAMINE PHOTO, or HELP. You can also click the illustrated objects and people.','system');refresh();$('transcript').scrollTop=0;
