const DATA = window.PROTOTYPE_DATA;
const icons = {
 route:'<path d="M5 4v12a4 4 0 0 0 4 4h7"/><circle cx="5" cy="4" r="2"/><path d="m13 17 3 3-3 3M11 4h8M11 9h5"/>',
 plane:'<path d="m22 2-8 20-3-9-9-3Z"/><path d="m22 2-11 11"/>',
 checklist:'<path d="M9 4h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m7 12 2 2 4-4M7 18h10"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-12 4h2m4 0h2m-8 3h2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 memo:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h4"/>',
 comment:'<path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9Z"/><path d="M7 8h10M7 12h6"/>',
 camera:'<path d="M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10m-11 13h4"/>',
 shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="white"/><circle cx="16" cy="17" r="3" fill="white"/>',
 logout:'<path d="M9 4H3v16h6m5-13 5 5-5 5M8 12h12"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const navs = [{id:'itinerary',label:'行程',icon:'route'},{id:'flights',label:'我的航班',icon:'plane'},{id:'checklist',label:'行前清單',icon:'checklist'},{id:'me',label:'我的',icon:'user'}];
const state = { view:'itinerary',date:'2026-11-02',role:'public',flights:{},packed:new Set(),openCategories:new Set(['必帶']),memos:{},comments:{},photography:true };
const joined = () => state.role !== 'public';
const day = () => DATA.days.find(item => item.date === state.date) || DATA.days[0];
const dateText = date => date ? new Intl.DateTimeFormat('zh-TW',{month:'long',day:'numeric',weekday:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')) : '日期待補';
const shortDate = date => date ? `${Number(date.slice(5,7))}/${Number(date.slice(8,10))}` : '日期待補';
const week = date => new Intl.DateTimeFormat('zh-TW',{weekday:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')).replace('週','');
function centerSelectedDate(){ const ribbon=document.querySelector('.date-ribbon');const selected=ribbon?.querySelector('[aria-selected="true"]');if(ribbon&&selected)ribbon.scrollTo({left:selected.offsetLeft-(ribbon.clientWidth-selected.offsetWidth)/2,behavior:'instant'}); }
window.addEventListener('resize',centerSelectedDate);
const announce = text => { document.querySelector('#announcement').textContent = text; };
function navMarkup(){ return navs.map(n=>`<button class="nav-item" data-view="${n.id}" ${state.view===n.id?'aria-current="page"':''}>${icon(n.icon)}<span>${n.label}</span></button>`).join(''); }
function render(options={}){
 const scroll = document.querySelector('.date-ribbon')?.scrollLeft || 0;
 document.querySelector('#desktop-nav').innerHTML=navMarkup();document.querySelector('#mobile-nav').innerHTML=navMarkup();
 document.querySelector('#account-button').innerHTML=`<span class="account-label">${joined()?'我的旅程':'旅伴登入'}</span><span class="avatar">${joined()?'旅':icon('user')}</span>`;
 document.querySelector('#account-button').dataset.action=joined()?'account':'login';
 document.querySelector('#main').innerHTML=({itinerary:itineraryView,flights:flightsView,checklist:checklistView,me:meView}[state.view])();
 document.title=`${navs.find(n=>n.id===state.view).label} · TravelMate 設計預覽`;
 if(state.view==='itinerary'){
  const ribbon=document.querySelector('.date-ribbon');ribbon.scrollLeft=scroll;
  if(options.centerDate)centerSelectedDate();
 }
 if(options.focusDate)document.querySelector(`[data-date="${state.date}"]`)?.focus({preventScroll:true});
}
function intro(title,caption,eyebrow='LONDON → ICELAND · 2026'){
 return `<div class="intro"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="caption">${caption}</p></div><div class="intro-side">${state.view==='itinerary'?`<span class="chip">${icon('route')}15 天</span><button class="text-button" data-action="dates" aria-label="查看所有行程日期">${icon('calendar')}所有日期</button>`:''}</div></div>`;
}
function guestCard(){return `<section class="aside-card"><div class="route-marker">${icon('user')}<h3>和旅伴一起規劃</h3></div><p>已受邀的旅伴登入後，可以選擇航班、寫下共用筆記，一起編輯這趟旅程。</p><button class="primary-button full" data-action="login">旅伴登入 ${icon('arrow')}</button><p class="tiny">一般訪客也能自由查看公開行程。</p></section>`;}
function itineraryView(){
 const d=day();const index=DATA.days.filter(x=>x.region===d.region).findIndex(x=>x.date===d.date)+1;
 const dates=DATA.days.map(x=>`<button class="date-button" role="tab" aria-label="${esc(dateText(x.date))} ${x.region}" aria-selected="${x.date===state.date}" aria-controls="selected-day-content" tabindex="${x.date===state.date?0:-1}" data-date="${x.date}"><span class="weekday">${week(x.date)}</span><strong>${shortDate(x.date)}</strong><span class="region-dot"></span></button>`).join('');
 const cards=d.items.map((item,i)=>`<li class="activity"><span class="activity-number">${String(i+1).padStart(2,'0')}</span><article class="activity-body"><div class="activity-top"><h3>${esc(item.name)}</h3>${item.plannedStart?`<time>${esc(item.plannedStart.slice(11,16))}</time>`:''}</div>${item.notes?`<p class="activity-note">${esc(item.notes)}</p>`:''}<div class="activity-actions"><a class="text-button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.navigationTerm||item.name)}" target="_blank" rel="noreferrer">${icon('pin')}開啟導航 ${icon('external')}</a></div>${joined()?`<div class="private-tools"><button data-action="memo" data-item="${esc(item.id)}">${icon('memo')}共用 Memo${state.memos[item.id]?' · 已填寫':''}</button><button data-action="comments" data-item="${esc(item.id)}">${icon('comment')}旅伴留言${state.comments[item.id]?' · 1':''}</button>${state.photography?`<button data-action="photography" data-item="${esc(item.id)}">${icon('camera')}攝影建議</button>`:''}</div>`:''}</article></li>`).join('');
 return `${intro('一起去倫敦・冰島','10 月 24 日 – 11 月 7 日 · 15 天的旅行')}<div class="date-ribbon" role="tablist" aria-label="行程日期">${dates}</div><div class="main-grid"><div id="selected-day-content" role="tabpanel" aria-label="${esc(dateText(d.date))}"><div class="day-heading"><div><p class="caption">${dateText(d.date)} · ${d.region}第 ${index} 天</p><h2>${esc(d.title)}</h2><div class="day-meta"><span>${icon('pin')}</span><span>${d.region}</span><i class="dot"></i><span>${d.items.length} 個行程</span><i class="dot"></i><span>${joined()?'旅伴共同行程':'公開行程'}</span></div></div>${joined()?`<button class="small-icon" data-action="edit" aria-label="編輯當日行程">${icon('settings')}</button>`:''}</div>${d.pace?`<div class="pace-note">${icon('info')}<p>${esc(d.pace.keep)}</p></div>`:''}<ol class="timeline">${cards}</ol>${d.pace?`<details class="quiet-link"><summary>如果時間或天氣有變</summary><p>${esc(d.pace.skip)}</p></details>`:''}</div><aside class="aside">${joined()?`<section class="aside-card"><p class="eyebrow">這趟旅程，由我們一起完成</p><h3>出發前，再確認一下</h3><p>你的行李清單已完成 ${state.packed.size}/45 項。每個人都能保留自己的準備進度。</p><button class="outline-button full" data-view="checklist">查看我的清單 ${icon('arrow')}</button></section>`:guestCard()}<section class="aside-card"><h3>沿途實用</h3><p>開車前查看天氣與道路狀況，行程保留彈性。</p><div class="aside-links"><a href="https://safetravel.is/" target="_blank" rel="noreferrer">SafeTravel 安全提醒 ${icon('external')}</a><a href="https://umferdin.is/en" target="_blank" rel="noreferrer">即時道路狀況 ${icon('external')}</a><a href="https://en.vedur.is/" target="_blank" rel="noreferrer">冰島天氣 ${icon('external')}</a></div></section><p class="tiny">時間依活動票券與航空公司通知核對；未確認的時段維持待補。</p></aside></div>`;
}
const groups=[['outbound-taipei','從台灣出發'],['to-iceland','前往冰島'],['from-iceland','離開冰島'],['return-europe','從歐洲回程'],['return-asia','亞洲轉機']];
function flightsView(){
 return `${intro('我的航班',joined()?'選擇自己的班次，和旅伴核對會合時間。':'查看這趟旅程的航班方案，時間以起降當地為準。')}<div class="main-grid"><div>${!joined()?`<section class="guest-banner"><div><h3>讓旅伴知道你搭哪班</h3><p>受邀加入後，就能選擇自己的航班。</p></div><button class="outline-button" data-action="login">旅伴登入</button></section>`:''}${groups.map(([group,title])=>`<div class="section-label"><h2>${title}</h2><span>${joined()?(state.flights[group]?'已選擇':'尚未選擇'):'航班方案'}</span></div>${DATA.flights.filter(f=>f.group===group).map(f=>{const selected=state.flights[group]===f.id;return `<article class="flight-card"><div class="flight-top"><strong>${esc(f.name)}</strong><span class="flight-tag ${selected?'chosen':''}">${selected?'我搭這班':esc(shortDate(f.date))}</span></div><div class="flight-route"><div class="flight-end"><strong>${f.departure}</strong><span class="airport">${f.from}</span></div><div class="flight-path">${icon('plane')}</div><div class="flight-end end"><strong>${f.arrival}</strong><span class="airport">${f.to}</span></div></div><div class="flight-bottom"><span>起降當地時間${!f.arrivalDate?' · 抵達日期待補':f.arrivalDate!==f.date?` · ${shortDate(f.arrivalDate)} 抵達`:''}</span>${joined()?`<button class="flight-choice" data-flight="${f.id}" aria-pressed="${selected}"><span class="radio"></span>${selected?'取消選擇':'選擇此航班'}</button>`:''}</div>${f.reminder?`<details class="quiet-link flight-note"><summary>報到與銜接提醒</summary><p>${esc(f.reminder)}</p></details>`:''}</article>`}).join('')}`).join('')}<p class="prototype-foot">這裡的選班僅用於原型預覽，不會更新正式旅程。</p></div><aside class="aside"><section class="aside-card"><h3>各自出發，一起會合</h3><p>每個航段分別選擇，不會預設所有旅伴都搭同一班。抵達時間與轉機日期以票券為準。</p><button class="text-button" data-view="itinerary">回到每日行程 ${icon('arrow')}</button></section></aside></div>`;
}
function checklistView(){
 return `${intro('行前清單','少一點臨出門的慌張，把要帶的東西一項項準備好。')}<div class="main-grid"><div><section class="progress-box"><div class="progress-line"><div><p class="tiny">我的準備進度</p><strong>${state.packed.size} <small>/ 45 項</small></strong></div><span>${state.packed.size===45?'準備完成':'慢慢準備，就快好了'}</span></div><div class="progress-track" role="progressbar" aria-label="準備進度" aria-valuemin="0" aria-valuemax="45" aria-valuenow="${state.packed.size}"><i style="width:${state.packed.size/45*100}%"></i></div></section>${DATA.packing.map(group=>`<details class="packing-category" data-category="${group.category}" ${state.openCategories.has(group.category)?'open':''}><summary>${group.category}<span>${group.items.filter(item=>state.packed.has(item)).length}/${group.items.length}</span></summary><div class="packing-items">${group.items.map((item,index)=>`<label class="packing-row"><input type="checkbox" data-packing="${esc(item)}" aria-label="${esc(item)}" ${state.packed.has(item)?'checked':''}/><span>${esc(item)}</span></label>`).join('')}</div></details>`).join('')}<p class="helper-line">${icon('info')}原型勾選只在這次預覽有效，重新整理會重設。</p></div><aside class="aside"><section class="aside-card"><h3>你的清單，你的進度</h3><p>旅伴使用同一份行李範本，各自保存勾選。攝影、離線與通知設定集中放在「我的」。</p><button class="text-button" data-view="me">前往我的設定 ${icon('arrow')}</button></section>${!joined()?guestCard():''}</aside></div>`;
}
function settingsRow(title,description,name,action,extra=''){return `<button class="settings-row" data-action="${action}">${icon(name)}<div><strong>${title}</strong><p>${description}</p></div>${extra||icon('chevron')}</button>`;}
function meView(){
 return `${intro('我的','把個人偏好與帳號設定放在一起。')}<div class="main-grid"><div>${joined()?`<div class="profile-head"><div class="avatar">旅</div><div><h2>${state.role==='admin'?'建立者預覽':'旅伴預覽'}</h2><p class="caption">已加入倫敦＋冰島旅程 · 示意狀態</p></div></div><div class="settings-group"><h3>我的旅程</h3>${settingsRow('身分與帳號','認領身分、Google 帳號與切換帳號','user','identity')}${settingsRow('攝影偏好',state.photography?'顯示拍攝建議與我的收藏':'已隱藏拍攝建議','camera','photo-settings')}</div><div class="settings-group"><h3>出發前設定</h3>${settingsRow('離線行程','事先下載，弱訊號時也能查看','download','offline')}${settingsRow('通知與提醒','行前提醒、極光與裝置推播','bell','notifications')}</div>${state.role==='admin'?`<div class="settings-group"><h3>建立者專區</h3>${settingsRow('旅伴管理','邀請連結、認領狀態與存取權限','shield','admin')}</div>`:''}<div class="settings-group">${settingsRow('登出','回到公開行程','logout','logout')}</div>`:`<section class="profile-login">${icon('user')}<h2>旅程，和旅伴一起準備。</h2><p>公開行程可以隨時查看。受邀旅伴用 Google 登入後，就能選擇自己的航班、編輯共用筆記，保存個人準備進度。</p><button class="primary-button full" data-action="login">旅伴登入 ${icon('arrow')}</button><p class="tiny" style="margin:16px 0 0">還沒加入？請向建立者索取私人邀請連結。</p></section>`}<p class="prototype-foot">TravelMate · 倫敦＋冰島 2026<br>本頁帳號與權限為設計示意，未載入任何真實個人資料。</p></div><aside class="aside"><section class="aside-card"><h3>一份旅程，六個人的節奏</h3><p>行程一起編輯，航班、行李與攝影偏好各自選擇。公開分享始終只顯示可公開的內容。</p><a href="https://travel-mate-nine-rho.vercel.app/iceland" target="_blank" rel="noreferrer" class="text-button">開啟目前正式站 ${icon('external')}</a></section></aside></div>`;
}
const sheet=document.querySelector('#sheet');
function showSheet(title,body){document.querySelector('#sheet-content').innerHTML=`<div class="sheet-top"><h2 id="sheet-title">${esc(title)}</h2><button class="close-button" data-action="close" aria-label="關閉">${icon('close')}</button></div><div class="sheet-body">${body}</div>`;if(!sheet.open)sheet.showModal();}
function itemById(id){return DATA.days.flatMap(d=>d.items).find(item=>item.id===id);}
function changeView(view){if(!navs.some(n=>n.id===view))return;state.view=view;render({centerDate:true});window.scrollTo({top:0,behavior:'instant'});announce(`已切換到${navs.find(n=>n.id===view).label}`);}
function changeRole(role){state.role=role;state.flights={};state.packed.clear();state.memos={};state.comments={};state.photography=true;document.querySelector('#role-select').value=role;if(sheet.open)sheet.close();render({centerDate:true});announce(`已切換${role==='public'?'公開訪客':role==='member'?'旅伴':'建立者'}預覽`);}
function handleAction(action,target){
 const item=target.dataset.item?itemById(target.dataset.item):null;
 if(action==='close'){sheet.close();return;}
 if(action==='account'){changeView('me');return;}
 if(action==='dates'){showSheet('選擇行程日期',`<div class="sheet-days">${DATA.days.map(d=>`<button data-jump-date="${d.date}" aria-selected="${state.date===d.date}">${shortDate(d.date)}（${week(d.date)}）</button>`).join('')}</div>`);return;}
 if(action==='login'){showSheet('旅伴登入',`<p>受邀旅伴使用 Google 帳號登入後，回到同一份旅程。</p><p class="tiny">這是設計原型，不會登入你的 Google 帳號。下方按鈕可切換到旅伴畫面，看看加入後的操作。</p><button class="primary-button full" data-action="demo-login">預覽登入後畫面 ${icon('arrow')}</button>`);return;}
 if(action==='demo-login'){changeRole('member');return;}
 if(action==='logout'){changeRole('public');changeView('itinerary');return;}
 if(action==='memo'&&item){showSheet('共用 Memo',`<p><strong>${esc(item.name)}</strong></p><p>這份筆記由旅伴共同編輯，和下方的個人留言分開。</p><label class="field-label">一起記下這一站的安排<textarea id="memo-input" maxlength="2000" placeholder="例如：集合地點、需要一起確認的事…">${esc(state.memos[item.id]||'')}</textarea></label><button class="primary-button full" data-save-memo="${esc(item.id)}">套用至原型</button><p class="tiny">僅示範編輯互動，不會寫入正式旅程。</p>`);return;}
 if(action==='comments'&&item){showSheet('旅伴留言',`<p><strong>${esc(item.name)}</strong></p>${state.comments[item.id]?`<div class="pace-note" style="margin-top:16px">${esc(state.comments[item.id])}</div>`:'<p class="tiny">目前沒有原型留言。</p>'}<label class="field-label">寫下想和旅伴討論的事<textarea id="comment-input" maxlength="2000" placeholder="留個訊息給旅伴…"></textarea></label><button class="primary-button full" data-save-comment="${esc(item.id)}">預覽送出留言</button><p class="tiny">這裡的留言只存在這次原型預覽。</p>`);return;}
 if(action==='photography'){showSheet('攝影建議',`<p>拍攝點、手機與相機建議集中在這一站裡，收藏各自保存。</p><p class="tiny">原型使用公開行程，未載入私人攝影內容。顯示開關可以到「我的 → 攝影偏好」試用。</p>`);return;}
 if(action==='edit'){showSheet('編輯這一天',`<p>活動名稱、導航位置與排序，沿用目前的共同編輯功能。</p><p>這一輪先確認閱讀與操作層級；正式編輯資料會在原型確認後接回。</p><button class="outline-button full" data-action="close" style="margin-top:20px">回到行程</button>`);return;}
 if(action==='identity'){showSheet('身分與帳號',`<p>這個位置顯示你已認領的身分與 Google 帳號。</p><p>已加入旅伴再次登入直接回到私人旅程，不必重選名字。選錯身分時，由建立者協助解除。</p><p class="tiny">目前是預覽身分，沒有載入真實帳號。</p>`);return;}
 if(action==='photo-settings'){showSheet('攝影偏好',`<label class="settings-row"><div><strong>顯示拍攝建議</strong><p>開關只影響自己的閱讀畫面。</p></div><input id="photo-toggle" type="checkbox" ${state.photography?'checked':''}/></label><p class="tiny">手機與相機收藏各自保留，正式版沿用目前個人偏好。</p>`);return;}
 if(action==='offline'||action==='notifications'){showSheet(action==='offline'?'離線行程':'通知與提醒',`<p>${action==='offline'?'下載旅程後，在弱訊號時也能查日期、地點與行程。':'設定行前與極光提醒，並在自己的裝置測試通知。'}</p><p class="tiny">原型只展示設定入口，沒有下載或要求裝置通知權限。</p><a class="outline-button full" href="https://travel-mate-nine-rho.vercel.app/iceland?section=more" target="_blank" rel="noreferrer" style="margin-top:20px">到正式站設定 ${icon('external')}</a>`);return;}
 if(action==='admin'){showSheet('旅伴管理',`<p>邀請與帳號管理放在建立者專區，和日常行程分開。</p><div class="member-row"><span>我（建立者）</span><small>已認領 · 示意</small></div>${[2,3,4,5,6].map(n=>`<div class="member-row"><span>旅伴 ${n}</span><small>未認領 · 示意</small></div>`).join('')}<a class="outline-button full" style="margin-top:20px" href="https://travel-mate-nine-rho.vercel.app/iceland?section=more" target="_blank" rel="noreferrer">到正式後台管理 ${icon('external')}</a><p class="tiny">原型不產生或撤銷真實邀請連結。</p>`);}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.view){changeView(button.dataset.view);return;}
 if(button.dataset.date){state.date=button.dataset.date;render({centerDate:true,focusDate:true});announce(dateText(state.date));return;}
 if(button.dataset.jumpDate){state.date=button.dataset.jumpDate;sheet.close();changeView('itinerary');return;}
 if(button.dataset.flight){const flight=DATA.flights.find(f=>f.id===button.dataset.flight);state.flights[flight.group]=state.flights[flight.group]===flight.id?null:flight.id;const y=window.scrollY;render();window.scrollTo({top:y});document.querySelector(`[data-flight="${flight.id}"]`)?.focus({preventScroll:true});announce('原型航班選擇已更新');return;}
 if(button.dataset.saveMemo){state.memos[button.dataset.saveMemo]=document.querySelector('#memo-input').value;sheet.close();render();document.querySelector(`[data-action="memo"][data-item="${button.dataset.saveMemo}"]`)?.focus({preventScroll:true});announce('Memo 已套用至原型，不會更新正式旅程');return;}
 if(button.dataset.saveComment){const value=document.querySelector('#comment-input').value.trim();if(!value){document.querySelector('#comment-input').focus();return;}state.comments[button.dataset.saveComment]=value;sheet.close();render();document.querySelector(`[data-action="comments"][data-item="${button.dataset.saveComment}"]`)?.focus({preventScroll:true});announce('留言已在原型顯示');return;}
 if(button.dataset.action)handleAction(button.dataset.action,button);
});
document.addEventListener('change',event=>{
 const target=event.target;
 if(target.id==='role-select'){changeRole(target.value);return;}
 if(target.dataset.packing){const item=target.dataset.packing;target.checked?state.packed.add(item):state.packed.delete(item);const y=window.scrollY;render();window.scrollTo({top:y});[...document.querySelectorAll('[data-packing]')].find(input=>input.dataset.packing===item)?.focus({preventScroll:true});announce(`原型已完成 ${state.packed.size}/45 項`);return;}
 if(target.id==='photo-toggle'){state.photography=target.checked;render();announce(state.photography?'顯示攝影建議':'隱藏攝影建議');}
});
document.addEventListener('toggle',event=>{const target=event.target;if(target.classList?.contains('packing-category')){target.open?state.openCategories.add(target.dataset.category):state.openCategories.delete(target.dataset.category)}},true);
document.addEventListener('keydown',event=>{
 const target=event.target.closest('[data-date]');if(!target||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const i=DATA.days.findIndex(d=>d.date===state.date);const next=event.key==='Home'?0:event.key==='End'?DATA.days.length-1:(i+(event.key==='ArrowRight'?1:-1)+DATA.days.length)%DATA.days.length;
 state.date=DATA.days[next].date;render({centerDate:true,focusDate:true});announce(dateText(state.date));
});
sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const rect=sheet.getBoundingClientRect();if(event.clientY<rect.top||event.clientY>rect.bottom||event.clientX<rect.left||event.clientX>rect.right)sheet.close();});
render({centerDate:true});
