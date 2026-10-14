import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {AUTO_KEY,MANUAL_KEY} from '../src/storage.js';
import {newGame,execute} from '../src/engine.js';
import {route} from './route.mjs';

const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}
catch{throw Error('Browser checks need optional Playwright test tooling. Install it outside the application or provide it through your development environment.');}
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'8011'},stdio:['ignore','pipe','pipe']});
let browser;const errors=[];
try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Test server did not start')),10000);
    server.stdout.once('data',()=>{clearTimeout(timer);resolve();});
    server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited '+code)));
  });
  const executablePath=process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
  browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
  const p=await browser.newPage({viewport:{width:1366,height:768}});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8011/');await p.locator('#command').waitFor();
  assert.match(await p.locator('#word-cards').textContent(),/nookomis.*my grandmother/);
  assert.match(await p.locator('#time-context').textContent(),/2026/);
  const command=async(text,page=p)=>{await page.locator('#command').fill(text);await page.locator('#command').press('Enter');};
  const savedState=()=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),AUTO_KEY);
  mkdirSync('test-results',{recursive:true});

  await command('talk to nookomis');await command('save');await command('take list');await command('load');
  assert.equal((await savedState()).inventory.includes('list'),false);
  await command('restart');await p.locator('#cancel-restart').click();
  assert.equal(await p.locator('#restart-dialog').isVisible(),false);
  await p.locator('#command').fill('new draft');await p.locator('#command').press('ArrowUp');
  assert.equal(await p.locator('#command').inputValue(),'restart');
  await p.locator('#command').press('ArrowDown');assert.equal(await p.locator('#command').inputValue(),'new draft');

  for(const c of route){
    await command(c);
    if(c==='go archive'){
      assert.match(await p.locator('#period').textContent(),/^2026\b/);
      assert.match(await p.locator('#time-context').textContent(),/reading a card does not move you/i);
      await p.screenshot({path:'test-results/history-records.png',fullPage:true});
    }
    if(c==='use records on photo'){
      assert.equal((await savedState()).flags.historyCaption,true);
      assert.match(await p.locator('#transcript').textContent(),/partial remedy/);
    }
    if(c==='use support on basket stand'){
      assert.match(await p.locator('#period').textContent(),/^1926\b/);
      assert.match(await p.locator('#time-context').textContent(),/ancestors in 1926/);
      assert.match(await p.locator('#crossing-history').textContent(),/2026.*1926/);
      await p.screenshot({path:'test-results/spring-1926.png',fullPage:true});
    }
    if(c==='collect sap'){
      await command('label sap as nibi');
      assert.equal((await savedState()).flags.sapNamed,undefined);
      assert.ok((await savedState()).inventory.includes('sap'));
    }
    if(c==='label sap as ziinzibaakwadwaaboo')assert.equal((await savedState()).flags.sapNamed,true);
    if(c==='take notebook'){
      await p.reload();assert.match(await p.locator('#transcript').textContent(),/autosaved journey has been restored/);
      assert.match(await p.locator('#period').textContent(),/^1926\b/);
    }
    if(['go summer','go fall','go winter','go kitchen'].includes(c))assert.match(await p.locator('#period').textContent(),/^2026\b/);
    if(c==='use water chart on notebook'){
      assert.match(await p.locator('#period').textContent(),/^1926\b/);
      assert.match(await p.locator('#crossing-history').textContent(),/2026.*1926/);
    }
  }
  assert.match(await p.locator('#transcript').textContent(),/THE TABLE IS READY/);
  const saved=await savedState();assert.equal(saved.ended,true);
  assert.equal(Object.keys(saved.teachings).length,7);assert.equal(saved.visited.length,12);
  await p.getByRole('button',{name:'Journal',exact:true}).click();
  for(const teaching of ['Wisdom','Love','Respect','Bravery','Honesty','Humility','Truth'])assert.match(await p.locator('#transcript').textContent(),new RegExp(teaching));
  await p.getByRole('button',{name:'Time & history',exact:true}).click();
  const timeline=await p.locator('#transcript .entry').last().textContent();
  assert.match(timeline,/YOUR TIME CROSSINGS/);assert.match(timeline,/LAND-HISTORY TIMELINE/);
  for(const year of ['1855','1889','2020','1926','2026'])assert.match(timeline,new RegExp(year));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const box=await p.locator('#command').boundingBox();
  assert.ok(box.y+box.height<768,'Chromebook command input should be visible');
  await p.screenshot({path:'test-results/chromebook.png',fullPage:true});
  await p.setViewportSize({width:390,height:844});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await p.screenshot({path:'test-results/phone.png',fullPage:true});
  await command('restart');await p.locator('#confirm-restart').click();
  assert.match(await p.locator('#location').textContent(),/Kitchen/);
  assert.equal(await p.evaluate(key=>localStorage.getItem(key),MANUAL_KEY),null);

  // Real old saves have neither the new timeline nor the historical flags.
  const legacy=newGame();for(const c of route.slice(0,route.indexOf('give sap to ishkode')))execute(legacy,c);
  legacy.version=2;delete legacy.timeline;delete legacy.items.support;legacy.items.gasket=null;
  legacy.flags.repaired=true;delete legacy.flags.stabilized;delete legacy.flags.sapNamed;
  for(const key of Object.keys(legacy.flags))if(/history|record|reservation|restoration/i.test(key))delete legacy.flags[key];
  const migratedContext=await browser.newContext();
  await migratedContext.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:AUTO_KEY,state:legacy});
  const migratedPage=await migratedContext.newPage();migratedPage.on('pageerror',e=>errors.push(e.message));
  await migratedPage.goto('http://127.0.0.1:8011/');
  assert.match(await migratedPage.locator('#transcript').textContent(),/autosaved journey has been restored/);
  await command('give sap to ishkode',migratedPage);await command('wait',migratedPage);
  const migrated=await migratedPage.evaluate(key=>JSON.parse(localStorage.getItem(key)),AUTO_KEY);
  assert.equal(migrated.version,3);assert.equal(migrated.flags.syrup,true);
  assert.equal('gasket' in migrated.items,false);await migratedContext.close();

  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});
  const b=await blocked.newPage();b.on('pageerror',e=>errors.push(e.message));
  await b.goto('http://127.0.0.1:8011/');await command('talk to nookomis',b);
  assert.match(await b.locator('#storage-status').textContent(),/unavailable/);
  assert.match(await b.locator('#objective').textContent(),/list.*tote/);await blocked.close();
  const corrupt=await browser.newContext();
  await corrupt.addInitScript(key=>localStorage.setItem(key,'not valid JSON'),AUTO_KEY);
  const q=await corrupt.newPage();q.on('pageerror',e=>errors.push(e.message));
  await q.goto('http://127.0.0.1:8011/');
  assert.match(await q.locator('#transcript').textContent(),/could not be read/);await corrupt.close();
  assert.deepEqual(errors,[]);
  console.log('PASS browser: history records and caption, sap-label wrong answer and recovery, complete feast and seven teachings, 1926/2026 crossings and time control, autosave/reload, v2 migration, manual checkpoint, restart, command history, blocked/corrupt storage, Chromebook and phone layouts.');
}finally{await browser?.close();server.kill();}
