import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {route} from './route.mjs';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{throw Error('Browser checks need optional Playwright test tooling. Install it outside the application or provide it through your development environment.');}
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'8011'},stdio:['ignore','pipe','pipe']});
let browser;let errors=[];
try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Test server did not start')),10000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited '+code)));});
  const executablePath=process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
  browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
  const p=await browser.newPage({viewport:{width:1366,height:768}});p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8011/');await p.locator('#command').waitFor();
  const command=async text=>{await p.locator('#command').fill(text);await p.locator('#command').press('Enter');};
  await command('talk to grandma');await command('save');await command('take list');await command('load');
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('four-seasons-autosave-v2')).inventory.includes('list')),false);
  await command('restart');await p.locator('#cancel-restart').click();assert.equal(await p.locator('#restart-dialog').isVisible(),false);
  await p.locator('#command').fill('new draft');await p.locator('#command').press('ArrowUp');assert.equal(await p.locator('#command').inputValue(),'restart');await p.locator('#command').press('ArrowDown');assert.equal(await p.locator('#command').inputValue(),'new draft');
  for(const c of route){await command(c);if(c==='take notebook'){await p.reload();assert.match(await p.locator('#transcript').textContent(),/autosaved journey has been restored/);}}
  assert.match(await p.locator('#transcript').textContent(),/THE TABLE IS READY/);
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('four-seasons-autosave-v2')));assert.equal(saved.ended,true);assert.equal(Object.keys(saved.teachings).length,7);
  await p.getByRole('button',{name:'Journal',exact:true}).click();for(const teaching of ['Wisdom','Love','Respect','Bravery','Honesty','Humility','Truth'])assert.match(await p.locator('#transcript').textContent(),new RegExp(teaching));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const box=await p.locator('#command').boundingBox();assert.ok(box.y+box.height<768,'Chromebook command input should be visible');
  mkdirSync('test-results',{recursive:true});await p.screenshot({path:'test-results/chromebook.png',fullPage:true});
  await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'test-results/phone.png',fullPage:true});
  await command('restart');await p.locator('#confirm-restart').click();assert.match(await p.locator('#location').textContent(),/Kitchen/);assert.equal(await p.evaluate(()=>localStorage.getItem('four-seasons-manual-save-v2')),null);
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});const b=await blocked.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto('http://127.0.0.1:8011/');await b.locator('#command').fill('talk to grandma');await b.locator('#command').press('Enter');assert.match(await b.locator('#storage-status').textContent(),/unavailable/);assert.match(await b.locator('#objective').textContent(),/take the feast list/);await blocked.close();
  const corrupt=await browser.newContext();await corrupt.addInitScript(()=>localStorage.setItem('four-seasons-autosave-v2','not valid JSON'));const q=await corrupt.newPage();q.on('pageerror',e=>errors.push(e.message));await q.goto('http://127.0.0.1:8011/');assert.match(await q.locator('#transcript').textContent(),/could not be read/);await corrupt.close();
  assert.deepEqual(errors,[]);console.log('PASS browser: complete feast, all seven teachings, autosave/reload, manual checkpoint, restart confirmation, command history, blocked/corrupt storage, Chromebook and phone layouts.');
}finally{await browser?.close();server.kill();}
