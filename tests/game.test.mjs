import test from 'node:test';
import assert from 'node:assert/strict';
import {content} from '../src/content.js';
import {newGame,execute,serialize,deserialize,goalKey,journalText,mapText,travelHistory,characterName} from '../src/engine.js';
import {parse} from '../src/parser.js';
import {saveState,loadState,clearSaves,AUTO_KEY,MANUAL_KEY} from '../src/storage.js';
import {route} from './route.mjs';

function run(commands,state=newGame()){for(const command of commands)execute(state,command);return state;}
function before(command){const i=route.indexOf(command);assert.notEqual(i,-1,`Missing route command: ${command}`);return run(route.slice(0,i));}
function memoryStorage(){const map=new Map();return {map,store:{setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k)}};}

test('complete journey investigates history, explores 12 locations, and practices all seven teachings',()=>{
  const s=run(route);
  assert.equal(s.ended,true);
  assert.equal(s.visited.length,12);
  assert.deepEqual(Object.keys(s.teachings).sort(),Object.keys(content.teachings).sort());
  assert.equal(s.flags.recordsCompared,true);
  assert.equal(s.flags.historyCaption,true);
  assert.equal(s.flags.sapNamed,true);
  for(const id of ['syrup','berries','rice','fish'])assert.equal(s.flags['delivered:'+id],true);
  assert.match(journalText(s),/asked (?:Giizhig|Ada) to check the tray/);
  assert.match(mapText(s),/1926/);
  assert.match(mapText(s),/2026/);
});

test('parser supports directions, natural object commands, history comparisons, and vocabulary labels',()=>{
  for(const [input,verb] of [
    [' N. ','north'],['I','inventory'],['Look at the cloth','examine'],
    ['pick up a clip','take'],['attach brace to stand','use'],
    ['offer sap to Ishkode','give'],['gather blueberries','pick'],
    ['collect the sap','collect'],['wash the tray','wash'],
    ['compare charts','compare'],['compare records','records'],
    ['speak to Nookomis','talk'],['name the pail as maple sap','label'],
    ['match ziinzibaakwadwaaboo to sap','match'],['what does nibi mean','translate']
  ])assert.equal(parse(input).verb,verb,input);
});

test('traditional-word names are primary and English character names remain accepted',()=>{
  const names={grandma:'Nookomis',nora:'Waaban',rose:'Waabigwan',eli:'Ishkode',leena:'Niibin',dan:'Aki',ada:'Giizhig',tess:'Biboon'};
  for(const [id,name] of Object.entries(names))assert.equal(characterName(id),name);
  const aliases={
    'talk to nookomis':'speak to Grandma June','talk to waaban':'talk to Nora',
    'ask waabigwan about basket':'ask Rose about basket',
    'give temperature log to waabigwan':'give temperature log to Rose',
    'ask waabigwan about tree':'ask Rose about tree','talk to ishkode':'talk to Eli',
    'give sap to ishkode':'give sap to Eli','ask niibin about share':'ask Leena about share',
    'give basket to niibin':'give basket to Leena','talk to aki':'talk to Dan',
    'ask giizhig about process':'ask Ada about process','give tray to giizhig':'give tray to Ada',
    'ask biboon about conditions':'ask Tess about conditions','ask biboon about help':'ask Tess about help',
    'give zhiiwaagamizigan to nookomis':'give syrup to Grandma',
    'give miinan to nookomis':'give berries to Grandma',
    'give manoomin to nookomis':'give rice to Grandma','give giigoonh to nookomis':'give fish to Grandma'
  };
  assert.equal(run(route.map(c=>aliases[c]||c)).ended,true);
});

test('alternate natural commands complete the same historical and seasonal puzzles',()=>{
  const aliases={
    'examine temperature log':'read weather log','take pail':'grab bucket',
    'take support':'pick up wooden brace','use support on basket stand':'steady the basket',
    'collect sap':'use bucket on collection basket','label sap as ziinzibaakwadwaaboo':'label pail as maple sap',
    'give sap to ishkode':'use full pail on boiler','examine markers':'inspect ripe fruit',
    'examine cloth':'look at picnic cloth','use clip on cloth':'apply clamp to picnic cloth',
    'pick berries':'gather blueberries','use tray on basin':'wash the tray',
    'sort rice':'sort wild rice','use mittens':'wear gloves',
    'use line on rod':'attach tackle to fishing rod','fish':'use fishing rod on fishing hole'
  };
  assert.equal(run(route.map(c=>aliases[c]||c)).ended,true);
});

test('three-tier hints guide every required history and adventure stage to the ending',()=>{
  const s=newGame();let stages=0;
  while(!s.ended&&stages++<30){
    const key=goalKey(s);
    for(let i=0;i<3;i++)assert.match(execute(s,'hint').text,new RegExp(`Hint ${i+1}/3`));
    for(const command of content.stages[key].hints[2].split(';'))execute(s,command);
    assert.notEqual(goalKey(s),key,`Hints stalled at ${key}`);
  }
  assert.equal(s.ended,true);
  assert.equal(s.flags.recordsCompared,true);
  assert.equal(s.flags.historyCaption,true);
  assert.equal(Object.keys(s.teachings).length,7);
});

test('family records must be read and compared before correcting the family-photo caption',()=>{
  const s=before('examine reservation map');
  assert.equal(goalKey(s),'historyRecords');
  execute(s,'compare records');assert.equal(s.flags.recordsCompared,undefined);
  execute(s,'use records on photo');assert.equal(s.flags.historyCaption,undefined);
  execute(s,'examine reservation map');execute(s,'examine land record');
  execute(s,'compare records');assert.equal(s.flags.recordsCompared,undefined);
  execute(s,'examine restoration law');
  const comparison=execute(s,'compare records').text;
  assert.equal(s.flags.recordsCompared,true);
  assert.equal(goalKey(s),'historyCaption');
  assert.match(comparison,/boundar/i);
  assert.match(comparison,/owner|title|landhold/i);
  const caption=execute(s,'use records on photo').text;
  assert.equal(s.flags.historyCaption,true);
  assert.notEqual(goalKey(s),'historyCaption');
  assert.match(caption,/house|home|housing/i);
  assert.ok(s.journal.some(entry=>/boundar/i.test(entry.text)&&/owner|title|landhold/i.test(entry.text)));
});

test('history distinguishes the 1855 treaty, 1889 allotment, and limited 2020 land restoration',()=>{
  const s=before('go trail');
  const evidence=[
    execute(s,'examine reservation map').text,
    execute(s,'examine land record').text,
    execute(s,'examine restoration law').text,
    execute(s,'compare records').text,
    execute(s,'use records on photo').text,
    journalText(s),execute(s,'timeline').text,content.history.setting
  ].join('\n');
  for(const date of ['1855','1889','2020'])assert.match(evidence,new RegExp(date));
  assert.match(evidence,/Leech Lake/i);
  assert.match(evidence,/Nelson|allotment/i);
  assert.match(evidence,/11[,.]?760|partial|limited|some .*land|not all/i);
  assert.match(evidence,/displace|dispossess|land loss|lost land/i);
  assert.match(evidence,/house|housing|home/i);
  assert.doesNotMatch(evidence,/(?:all land (?:was |has been )?restored|displacement (?:was |is )?over|restoration (?:ended|erased) displacement)/i);
  const physical=execute(s,'take restoration law');
  assert.equal(s.inventory.includes('restoration law'),false);
  assert.match(physical.text,/leave|in place|examine/i);
});

test('history is required before the trail and future seasons remain gated',()=>{
  const s=run(['talk to nookomis','take list','take tote']);
  execute(s,'north');assert.equal(s.location,'kitchen');
  execute(s,'go spring');assert.equal(s.location,'kitchen');
  const t=before('go spring');
  for(const destination of ['summer','fall','winter','shed','shelter']){
    const old=t.location;execute(t,'go '+destination);assert.equal(t.location,old);
  }
  const winter=before('ask biboon about conditions');
  execute(winter,'east');assert.equal(winter.location,'hut');
  assert.match(execute(winter,'fish').text,/assessed/);
});

test('sap requires a reported stability problem, weather comparison, and tree care',()=>{
  const s=before('ask waabigwan about basket');
  assert.match(execute(s,'collect sap').text,/tilt|spill/i);
  execute(s,'take support');
  assert.match(execute(s,'steady basket').text,/ASK WAABIGWAN/);
  execute(s,'ask waabigwan about basket');execute(s,'steady basket');
  assert.match(execute(s,'collect sap').text,/temperature log/);
  execute(s,'give temperature log to waabigwan');
  assert.match(execute(s,'collect sap').text,/TREE/);
  execute(s,'wait');assert.equal(s.flags.syrup,undefined);
  assert.equal(s.flags.stabilized,true);
  assert.equal('gasket' in content.items,false);
  assert.equal(content.locations.grove.objects.includes('joint'),false);
});

test('vocabulary is part of the task: a wrong sap label preserves the pail and allows correction',()=>{
  const s=before('examine labels');const inventory=[...s.inventory];
  assert.equal(goalKey(s),'springLabel');
  const clues=execute(s,'examine labels').text;
  for(const word of ['nibi','ziinzibaakwadwaaboo','zhiiwaagamizigan'])assert.match(clues,new RegExp(word));
  for(const guess of ['nibi','zhiiwaagamizigan','unknown word']){
    execute(s,'label sap as '+guess);
    assert.equal(s.flags.sapNamed,undefined);
    assert.deepEqual(s.inventory,inventory);
  }
  execute(s,'go sugarhouse');
  assert.match(execute(s,'give sap to ishkode').text,/label|name/i);
  assert.equal(s.flags.sapDelivered,undefined);
  assert.ok(s.inventory.includes('sap'));
  execute(s,'label sap as maple sap');
  assert.equal(s.flags.sapNamed,true);
  execute(s,'give sap to ishkode');assert.equal(s.flags.sapDelivered,true);
  assert.equal(s.inventory.includes('sap'),false);
  assert.match(journalText(s),/ziinzibaakwadwaaboo.*maple sap/);
});

test('English label, Ojibwe match, translations and clue aliases explain the same vocabulary',()=>{
  for(const label of ['label full pail as maple sap','match ziinzibaakwadwaaboo to sap','label sap as sap']){
    const s=before('examine labels');execute(s,label);assert.equal(s.flags.sapNamed,true,label);
  }
  const s=before('examine labels');
  assert.match(execute(s,'translate nibi').text,/water/);
  assert.match(execute(s,'what does ziinzibaakwadwaaboo mean').text,/maple sap/);
  assert.match(execute(s,'ask waabigwan about sap').text,/ziinzibaakwadwaaboo/);
  assert.match(execute(s,'examine biskitenaagan').text,/birch.bark|bucket/i);
});

test('forward and reverse crossings explain the date and record the connecting path',()=>{
  const s=before('east');assert.equal(s.location,'weather');
  const forward=execute(s,'east').text;
  assert.equal(s.location,'grove');assert.match(forward,/TIME CROSSING/);
  assert.match(forward,/2026/);assert.match(forward,/1926/);assert.match(forward,/100 years earlier/);
  const backward=execute(s,'west').text;
  assert.equal(s.location,'weather');assert.match(backward,/TIME CROSSING/);
  assert.deepEqual(s.timeline.slice(-2),[{from:'weather',to:'grove'},{from:'grove',to:'weather'}]);
  const history=travelHistory(s).join('\n');assert.match(history,/2026.*→.*1926/);assert.match(history,/1926.*→.*2026/);
  const autumn=before('use water chart on notebook');
  assert.equal(autumn.location,'shed');assert.deepEqual(autumn.timeline.at(-1),{from:'landing',to:'shed'});
  const home=execute(autumn,'go kitchen').text;
  assert.equal(autumn.location,'kitchen');assert.match(home,/1926.*2026/);assert.match(home,/HOME AGAIN/);
  assert.ok(autumn.timeline.some(t=>t.from==='shed'&&t.to==='landing'));
  assert.match(home,/present.day 2026/i);
  assert.match(execute(autumn,'timeline').text,/1926|2026/);
});

test('summer observation and thoughtful share are required, with recovery after failed attempts',()=>{
  const s=before('ask niibin about share');execute(s,'take basket');execute(s,'take clip');execute(s,'east');
  assert.match(execute(s,'pick berries').text,/SHARE/);
  execute(s,'ask niibin about share');assert.match(execute(s,'pick berries').text,/MARKERS/);
  execute(s,'examine markers');assert.match(execute(s,'pick berries').text,/cloth/);
  execute(s,'examine cloth');execute(s,'use clip on cloth');execute(s,'pick berries');
  execute(s,'give basket to niibin');assert.equal(s.flags.berries,true);
});

test('rice requires contextual evidence, a clean tray, and a shared check',()=>{
  const s=before('use water chart on notebook');assert.match(execute(s,'take rice').text,/team/);
  execute(s,'use water chart on notebook');assert.match(execute(s,'sort rice').text,/PROCESS/);
  execute(s,'ask giizhig about process');execute(s,'take tray');
  assert.match(execute(s,'sort rice').text,/Clean the tray/);
  execute(s,'use tray on basin');execute(s,'sort rice');assert.equal(s.flags.rice,undefined);
  execute(s,'give tray to giizhig');assert.equal(s.flags.rice,true);
});

test('winter gear, partner and bite observation are meaningful prerequisites',()=>{
  const s=before('examine bobber');assert.match(execute(s,'fish').text,/bobber/);
  execute(s,'drop mittens');assert.match(execute(s,'fish').text,/MITTENS/);
  execute(s,'take mittens');execute(s,'wear mittens');execute(s,'ask biboon about bite');
  execute(s,'fish');assert.equal(s.flags.fish,true);
});

test('dropped support at another location can be found, recovered and used',()=>{
  const s=before('take support');execute(s,'take support');execute(s,'go weather station');execute(s,'drop support');
  execute(s,'go grove');assert.match(execute(s,'steady basket').text,/Weather Station/);
  execute(s,'go weather station');execute(s,'take brace');execute(s,'east');
  execute(s,'steady basket');assert.equal(s.flags.stabilized,true);
});

test('dropped contribution is named in hints and recovery still reaches the ending',()=>{
  const s=before('take notebook');execute(s,'drop syrup');
  run(route.slice(route.indexOf('take notebook')),s);assert.equal(s.ended,false);
  assert.match(execute(s,'hint').text,/Recover syrup/);
  execute(s,'go sugarhouse');execute(s,'take syrup');execute(s,'go kitchen');
  execute(s,'give syrup to nookomis');assert.equal(s.ended,true);
});

test('all carried essentials can be dropped and recovered without permanent loss',()=>{
  const s=newGame();
  for(const c of route){execute(s,c);for(const id of [...s.inventory]){
    execute(s,'drop '+id);assert.equal(s.items[id],s.location);
    execute(s,'take '+id);assert.ok(s.inventory.includes(id));
    if(id==='mittens'&&s.flags.buddy)execute(s,'wear mittens');
  }}
  assert.equal(s.ended,true);
});

test('wrong-object experiments and unneeded gifts preserve objects',()=>{
  const s=before('use support on basket stand');const inventory=[...s.inventory];
  execute(s,'use support on tree');execute(s,'give support to waabigwan');execute(s,'drop fish');
  assert.deepEqual(s.inventory,inventory);
  execute(s,'take basket stand');assert.equal(s.flags.stabilized,undefined);
});

test('manual checkpoint remains separate from autosave and clearing erases both',()=>{
  const {map,store}=memoryStorage();const s=before('take support');
  saveState(store,s,true);execute(s,'take support');saveState(store,s);
  assert.ok(map.has(AUTO_KEY));assert.ok(map.has(MANUAL_KEY));
  assert.ok(loadState(store).inventory.includes('support'));
  assert.ok(!loadState(store,true).inventory.includes('support'));
  clearSaves(store);assert.equal(map.size,0);assert.equal(loadState(store),null);
});

test('legacy v2 save migration preserves inventory, solved tasks, contributions and manual checkpoints',()=>{
  const legacy=structuredClone(before('give sap to ishkode'));
  legacy.version=2;delete legacy.timeline;
  delete legacy.items.support;legacy.items.gasket='inventory';legacy.inventory.push('gasket');
  delete legacy.flags.stabilized;delete legacy.flags.supportTaken;delete legacy.flags.sapNamed;
  for(const key of Object.keys(legacy.flags))if(/history|record|reservation|restoration/i.test(key))delete legacy.flags[key];
  legacy.flags.repaired=true;legacy.flags.gasketTaken=true;
  const raw=JSON.stringify(legacy);const migrated=deserialize(raw);
  assert.equal(migrated.version,3);assert.equal(migrated.location,legacy.location);
  assert.equal(migrated.items.support,'inventory');assert.ok(migrated.inventory.includes('support'));
  assert.equal('gasket' in migrated.items,false);assert.equal(migrated.inventory.includes('gasket'),false);
  assert.equal(migrated.flags.stabilized,true);assert.equal(migrated.flags.supportTaken,true);
  assert.equal(migrated.flags.sapNamed,true);assert.deepEqual(migrated.timeline,[]);
  assert.deepEqual(migrated.teachings,legacy.teachings);
  const {store}=memoryStorage();store.setItem(MANUAL_KEY,raw);store.setItem(AUTO_KEY,serialize(newGame()));
  assert.equal(loadState(store,true).flags.collected,true);
  assert.equal(loadState(store).flags.collected,undefined);
  execute(migrated,'give sap to ishkode');assert.equal(migrated.flags.sapDelivered,true);
  for(const c of route.slice(route.indexOf('wait')))execute(migrated,c);
  assert.equal(migrated.ended,true);
});

test('legacy completed and dropped-item saves retain their recoverable contribution state',()=>{
  const legacy=run(route);legacy.version=2;delete legacy.timeline;
  legacy.items.gasket=null;delete legacy.items.support;
  legacy.flags.repaired=true;delete legacy.flags.stabilized;delete legacy.flags.sapNamed;
  const migrated=deserialize(serialize(legacy));assert.equal(migrated.ended,true);
  for(const id of ['syrup','berries','rice','fish'])assert.equal(migrated.items[id],'delivered');
  assert.equal(migrated.flags.sapNamed,true);
  const dropped=before('take support');dropped.version=2;delete dropped.timeline;
  dropped.items.gasket='weather';delete dropped.items.support;
  const recovered=deserialize(serialize(dropped));execute(recovered,'go weather station');execute(recovered,'take support');
  assert.ok(recovered.inventory.includes('support'));
});

test('save/load round trips preserve crossings throughout the journey without duplicate contributions',()=>{
  let s=newGame();for(const c of route){execute(s,c);s=deserialize(serialize(s));}
  assert.equal(s.ended,true);assert.ok(s.timeline.length>4);
  execute(s,'give fish to nookomis');assert.equal(s.items.fish,'delivered');
  assert.equal(s.inventory.includes('fish'),false);
});

test('invalid saves and invalid crossing records are rejected; blocked storage propagates errors',()=>{
  for(const raw of ['{','null','{}',
    JSON.stringify({...newGame(),location:'moon'}),JSON.stringify({...newGame(),inventory:['fish']}),
    JSON.stringify({...newGame(),journal:[{}]}),JSON.stringify({...newGame(),timeline:[{from:'moon',to:'kitchen'}]})
  ])assert.throws(()=>deserialize(raw));
  assert.throws(()=>saveState({setItem(){throw Error('blocked');}},newGame()));
});

test('ambiguous and incomplete commands ask useful questions',()=>{
  const s=newGame();assert.match(execute(s,'ask').text,/Who and what topic/);
  assert.match(execute(s,'use').text,/What would/);assert.match(execute(s,'go').text,/destination/);
  assert.match(execute(s,'take').text,/object/);assert.match(execute(s,'examine strange rock').text,/LOOK/);
});

test('map reveals explored locations and vocabulary preserves source and grammar context',()=>{
  const s=newGame();assert.equal(s.visited.length,1);assert.doesNotMatch(mapText(s),/Rice Shed/);
  for(const v of content.vocabulary){
    assert.ok(v.ojibwe);assert.ok(content.sources[v.source].url);
    assert.match(v.primaryEntry,/ojibwe.lib.umn.edu\/main-entry\//);
    assert.match(v.status,/local review pending/);
  }
  execute(s,'talk to nookomis');assert.match(journalText(s),/nookomis — my grandmother/);
  assert.match(journalText(s),/First-person possessed singular: my grandmother/);
  assert.match(journalText(s),/June remains her personal name/);
});

test('live language verification records dictionary links, dates, speaker context, and local review limits',()=>{
  for(const v of content.vocabulary){
    assert.equal(content.sources[v.source].title,'Ojibwe People’s Dictionary');
    assert.match(v.status,/verified against live dictionary/);
    assert.match(v.verifiedDate,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok('speakerContext' in v);
    assert.ok(v.speakerContext===null||typeof v.speakerContext==='string');
    assert.ok(v.partOfSpeech||v.grammarNote||v.sourceLine);
    assert.match(v.status,/local review pending/);
  }
  assert.match(content.namingNote,/fictional/);
  assert.match(content.namingNote,/does not claim.*traditionally bestowed/i);
  for(const event of content.history.events){
    assert.ok(content.sources[event.source]?.url,`Missing source for ${event.year}`);
    assert.match(content.sources[event.source].status,/consulted|accessed/i);
  }
});

test('Ojibwe food and season aliases complete the path without exact spelling gates',()=>{
  const aliases={
    'go spring':'go ziigwan','go summer':'go niibin','go fall':'go dagwaagin','go winter':'go biboon',
    'ask niibin about share':'ask niibin about miinan','pick berries':'pick miinan',
    'ask giizhig about process':'ask giizhig about manoomin','give sap to ishkode':'give ziinzibaakwadwaaboo to ishkode'
  };
  const s=run(route.map(c=>aliases[c]||c));assert.equal(s.ended,true);
  for(const id of ['spring','summer','fall','winter','sap'])assert.ok(s.vocabulary.includes(id));
  assert.match(journalText(s),/ziigwan — it is spring/);
  assert.match(journalText(s),/miinan — blueberries/);
  assert.match(journalText(s),/miinan is the recorded plural of miin/);
});
