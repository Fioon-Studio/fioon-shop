async(page)=>{
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});
await page.goto('http://localhost:4173/v2.html');await page.locator('#store-grid .store-card').first().waitFor();
const cards=await page.locator('#store-grid .store-card').count();if(cards!==49)throw Error('Homepage catalog count '+cards);
await page.locator('.navigation nav a').first().click();await page.waitForURL('**/collections/all.html');
await page.goto('http://localhost:4173/v2.html');await page.locator('.collar-card').first().hover();await page.locator('#selected-detail').click();await page.waitForURL('**/products/*.html*');const productURL=page.url();
await page.goto('http://localhost:4173/v2.html#product/933548458065-v0');await page.waitForURL('**/products/933548458065-v0.html');
await page.goto('http://localhost:4173/v2.html');await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Homepage mobile overflow');
if(errors.length)throw Error(errors.join(';'));return {cards,collectionRoute:true,heroProductRoute:productURL,splitProductHashRoute:true,mobileOverflow:false,errors};}
