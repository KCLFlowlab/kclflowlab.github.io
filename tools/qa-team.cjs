// Team login QA: the vault decrypts only with valid credentials, nothing leaves the page, and Schedule/Notes render.
// Credentials come from the environment (TEAM_USER / TEAM_PASSWORD); nothing is stored in this file.
const {chromium}=require('./browser/node_modules/playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8769/';
const user=process.env.TEAM_USER, password=process.env.TEAM_PASSWORD;
if(!user||!password){console.error('Set TEAM_USER and TEAM_PASSWORD.');process.exit(2);}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox']});
 const errors=[],checks=[],requests=[];const note=m=>{checks.push(m);console.log('PASS: '+m);};
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});
 try{
  for(const [w,h,m] of [[1440,900,0],[390,844,1]]){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:!!m,hasTouch:!!m});page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.method()!=='GET')requests.push(r.method()+' '+r.url());});
   await page.goto(base);await page.locator('.login-link').click();await page.waitForURL('**/login.html');
   const vault=await page.evaluate(()=>fetch('members/vault.json').then(r=>r.text()));
   for(const word of [user,password,'Schedule','presenter','Winter'])assert.equal(vault.includes(word),false,`vault leaks ${word}`);
   await page.fill('[name=username]',user);await page.fill('[name=password]',password+'x');await page.click('button[type=submit]');
   await page.waitForFunction(()=>document.querySelector('#login-status').textContent==='Incorrect',null,{timeout:20000});
   assert.equal(await page.inputValue('[name=password]'),'');assert.equal(await page.locator('#team-panel').isHidden(),true);
   await page.fill('[name=username]',user.toUpperCase());await page.fill('[name=password]',password);await page.click('button[type=submit]');
   await page.waitForSelector('#team-panel:not([hidden]) .rota',{timeout:20000});
   assert.equal(await page.locator('[data-view="schedule"]').getAttribute('aria-selected'),'true');
   assert.ok(await page.locator('.rota li').count()>=6);assert.equal(await page.locator('.next-meeting').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${w}`);
   await page.screenshot({path:path.join(root,`qa/team-schedule-${w}.png`),fullPage:true});
   await page.locator('[data-view="notes"]').click();assert.ok(await page.locator('.team-items li').count()>=1);
   await page.locator('#sign-out').click();await page.waitForSelector('#login-form:not([hidden])');
   assert.equal(await page.evaluate(()=>sessionStorage.length+localStorage.length),0);
   await page.close();
  }
  assert.deepEqual(requests,[],'no credentials or data are sent');
  note('Wrong password is refused and cleared; valid login (case-insensitive name) decrypts Schedule and Notes; vault has no plaintext; nothing is sent or stored; sign-out clears the view; 390 and 1440 px fit');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(root,'qa/team-report.json'),JSON.stringify({status:'passed',url:base,checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
