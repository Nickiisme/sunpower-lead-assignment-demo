const $=id=>document.getElementById(id), DAY=86400000, KEY='sunpower-lead-demo-v3';
const people={sophie:{name:'Sophie Martin',role:'sales',accountType:'regular'},lucas:{name:'Lucas Bernard',role:'sales',accountType:'regular'},emma:{name:'Emma Dubois',role:'sales',accountType:'regular'},marc:{name:'Marc Laurent',role:'manager',accountType:'admin'}};
const names=['Thomas Petit','Camille Robert','Nicolas Moreau','Julie Laurent','Antoine Lefebvre','Léa Michel','Hugo Garcia','Chloé Roux','Emma Bernard','Pierre Moreau','Sarah Dubois','Noah Laurent'];
const ALL_STAGES=['Draft','Pending Assign RSM','Pending Follow-Up','Pending Claim','Claimed','Rejected','Qualified','Disqualified','Converted'];
const PORTAL_STAGES=new Set(['Pending Claim','Claimed','Rejected','Qualified','Disqualified','Converted']);
const ACTIVE_STAGES=new Set(['Pending Claim','Claimed','Qualified']);
const ASSIGNMENT_EVENTS=new Set(['Lead assigned','Added to shared pool','Claimed from shared pool','Lead reassigned','Automatically reassigned','Automatically returned to shared pool']);
const CANCEL_REASONS=['Constrained Resources / Priorities Re-Adjusted','Duplicate','Lead did not want to be contacted','Lead not responsive','Not Competitive on Non-Price Attributes','Not Price Competitive','Not Strongest Relationship','Opportunity Acquired by Competitor','SunPower Abandon Project / Development'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fresh(){const now=Date.UTC(2026,9,21,9),stages=['Pending Claim','Claimed','Qualified','Pending Claim','Claimed','Qualified','Rejected','Disqualified','Converted','Pending Follow-Up','Pending Assign RSM','Draft'],owners=['sophie','lucas','emma',null,'marc',null,'lucas','sophie','emma',null,null,null],ages=[2,4,1,1,6,2,3,1,8,2,3,1];return{now,policy:{mode:'random',users:['sophie','lucas','emma'],permission:'owner',recycle:true,claimed:7},leads:names.map((name,i)=>{const stage=stages[i],owner=owners[i],age=ages[i],followUps=i===0||i===2?[{actorId:'sophie',note:'Called customer',at:now-DAY}]:[];return{id:'LD202610'+String(210033-i),name,email:name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(' ','.')+'@example.com',source:i%3?'Web':'Email',owner,stage,stageAt:now-age*DAY,assignedAt:now-age*DAY,followUps,history:[...followUps.map(x=>({title:'Follow-up recorded',detail:x.note+' · By '+people[x.actorId].name,at:x.at})),{title:owner?'Lead assigned':'Added to shared pool',detail:owner?'Assigned to '+people[owner].name+' · Initial assignment':'No owner · Available to all authorized users',at:now-age*DAY}]}})}}
let state;try{state=JSON.parse(localStorage.getItem(KEY))||fresh()}catch{state=fresh()}let tab='all',role=new URLSearchParams(window.location.search).get('persona')==='regular'?'regular':'admin',lastFocus,toastTimer,actionMenu=null,actionMenuTrigger=null;
function ensureLeadFields(l,i){l.telephone??=`+33 6 20 40 60 ${String(i+1).padStart(2,'0')}`;l.leadType??='Residential';l.country??='France';l.salesRepresentative??=['Élodie Durand','Paul Morel','Claire Bernard'][i%3];l.createdAt??=l.stageAt-DAY;l.createdBy??=l.source==='Web'?'Web form':'Email intake';l.lastUpdatedAt??=l.stageAt;l.lastUpdatedBy??='System'}
state.leads.forEach(ensureLeadFields);
// Migrate the stored policy in place; saved leads and their history are untouched.
state.policy??=fresh().policy;
const legacyPolicy=state.policy;
const oldPolicy=JSON.stringify(legacyPolicy);
if(legacyPolicy.mode==='specified')legacyPolicy.users=[legacyPolicy.user].filter(id=>people[id]);
if(legacyPolicy.mode==='specified'||legacyPolicy.mode==='roundrobin')legacyPolicy.mode='random';
if(!['random','shared'].includes(legacyPolicy.mode))legacyPolicy.mode='random';
legacyPolicy.users=[...new Set((Array.isArray(legacyPolicy.users)?legacyPolicy.users:['sophie','lucas','emma']).filter(id=>people[id]))];
if(legacyPolicy.mode==='random'&&!legacyPolicy.users.length)legacyPolicy.users=['sophie','lucas','emma'];
legacyPolicy.claimed=Number.isInteger(+legacyPolicy.claimed)&&+legacyPolicy.claimed>0?+legacyPolicy.claimed:7;
delete legacyPolicy.user;delete legacyPolicy.initialNext;delete legacyPolicy.pending;delete legacyPolicy.recycleNext;delete legacyPolicy.recycleRole;
if(JSON.stringify(legacyPolicy)!==oldPolicy){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function currentUserId(){return role==='admin'?'marc':'sophie'}
function hasFollowed(l,actorId=currentUserId()){return(l.followUps||[]).some(x=>x.actorId===actorId)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}render()}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000)}
function formatModal(){const root=$('modalContent');const form=root.querySelector('form');const header=document.createElement('header');header.className='modal-head';const body=document.createElement('div');body.className='modal-body';const footer=document.createElement('footer');footer.className='modal-foot';const buttons=root.querySelector('.buttonrow');if(buttons)footer.append(buttons);for(const child of [...root.children]){if(child===form)continue;if(child.tagName==='H2'||child.classList.contains('eyebrow'))header.append(child);else body.append(child)}if(form){for(const child of [...form.children])body.append(child);form.append(body,footer);root.replaceChildren(header,form)}else root.replaceChildren(header,body,footer)}
function open(id){if(id==='modalOverlay')formatModal();lastFocus=document.activeElement;$(id).classList.add('open');document.body.style.overflow='hidden';document.querySelector('main').inert=true;document.querySelector('nav').inert=true;setTimeout(()=>$(id).querySelector('button,input,select')?.focus(),50)}
function close(id){$(id).classList.remove('open');if(id==='modalOverlay')document.querySelector('#modalOverlay .modal').classList.remove('wide');if(id==='settingsOverlay')closeUserPicker();document.body.style.overflow='';document.querySelector('main').inert=false;document.querySelector('nav').inert=false;lastFocus?.focus()}
function showModal(html,wide=false){$('modalContent').innerHTML=html;document.querySelector('#modalOverlay .modal').classList.toggle('wide',wide);open('modalOverlay');$('cancelModal')?.addEventListener('click',()=>close('modalOverlay'))}
function date(t){return new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}
function parseDisplayDate(value){
 const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
 if(!match)return'';
 const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);
 const actual=new Date(Date.UTC(year,month-1,day));
 if(actual.getUTCFullYear()!==year||actual.getUTCMonth()!==month-1||actual.getUTCDate()!==day)return'';
 return`${match[3]}-${match[2]}-${match[1]}`;
}
function displayDateFromIso(iso){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);return match?`${match[3]}/${match[2]}/${match[1]}`:''}
function dateControlMarkup(id,label,required=false){return`<div class="date-control"><input type="text" id="${id}" inputmode="numeric" maxlength="10" placeholder="DD/MM/YYYY" aria-label="${label}" ${required?'required':''}><button type="button" class="date-picker-button" data-date-picker="${id}" aria-label="Choose ${label.toLowerCase()}" title="Choose date"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" fill="none" stroke="currentColor" stroke-width="1.7"/></svg></button><input type="date" id="${id}Picker" class="date-native-picker" tabindex="-1" aria-hidden="true"></div>`}
function initDateControl(id,updateResults=false){
 const input=$(id),picker=$(id+'Picker'),button=document.querySelector(`[data-date-picker="${id}"]`);
 const syncText=()=>{
  const raw=input.value.trim(),iso=raw?parseDisplayDate(raw):'';
  picker.value=iso;
  input.setCustomValidity(raw&&!iso?'Enter a valid date as DD/MM/YYYY.':'');
  if(updateResults)render();
 };
 input.addEventListener('input',syncText);
 input.addEventListener('change',syncText);
 picker.addEventListener('change',()=>{input.value=displayDateFromIso(picker.value);input.setCustomValidity('');if(updateResults)render()});
 button.addEventListener('click',()=>{try{picker.showPicker()}catch{picker.focus();picker.click()}});
 return{input,picker};
}
function clearDateControl(id){$(id).value='';$(id).setCustomValidity('');$(id+'Picker').value=''}
function nextOwner(exclude=null){
 const ids=[...new Set(state.policy.users.filter(id=>people[id]))];
 if(!ids.length)return null;
 const candidates=ids.filter(id=>id!==exclude);
 if(!candidates.length)return ids.includes(exclude)?exclude:null;
 return candidates[Math.floor(Math.random()*candidates.length)];
}
function runRecycling(){
 let reassigned=0,shared=0,disqualified=0;
 for(const l of state.leads){
  if(remaining(l)===null||remaining(l)>0)continue;
  const previous=l.owner,next=state.policy.mode==='shared'?null:nextOwner(previous);
  if(state.policy.mode!=='shared'&&!next)continue;
  if(!next){l.owner=null;l.assignedAt=state.now;log(l,'Automatically returned to shared pool',people[previous].name+' → Unassigned · Initial assignment: Shared pool');shared++}
  else if(next===previous){l.stage='Disqualified';l.stageAt=state.now;l.cancelReason='Automatic recycling returned the current owner';log(l,'Automatically disqualified',people[previous].name+' remained the only eligible owner · System · All leads only');disqualified++}
  else{l.owner=next;l.assignedAt=state.now;log(l,'Automatically reassigned',people[previous].name+' → '+people[next].name+' · Initial assignment: Random assignment');reassigned++}
  l.lastUpdatedBy='System';
 }
 return{reassigned,shared,disqualified};
}
function inPool(l,pool){return pool==='all'||(l.stage!=='Disqualified'&&(pool==='mine'?l.owner===currentUserId():!l.owner))}
function canWorkFor(l,actorId){return ACTIVE_STAGES.has(l.stage)&&l.owner===actorId}
function canWork(l){return canWorkFor(l,currentUserId())}
function canAccept(l){return l.stage==='Pending Claim'&&(!l.owner||l.owner===currentUserId())}
function canReject(l){return l.stage==='Pending Claim'&&(!l.owner||l.owner===currentUserId())}
function canReassign(l){return ACTIVE_STAGES.has(l.stage)&&(role==='admin'||(state.policy.permission==='owner'&&l.owner===currentUserId()))}
function log(l,title,detail){l.history.unshift({title,detail,at:state.now});l.lastUpdatedAt=state.now;l.lastUpdatedBy=people[currentUserId()].name}
function saveFollowUp(leadId,actorId,note){
 const live=state.leads.find(x=>x.id===leadId);
 if(!live)return{status:'missing'};
 if(!canWorkFor(live,actorId))return{status:'unavailable'};
 live.followUps??=[];live.followUps.push({actorId,note,at:state.now});log(live,'Follow-up recorded',note+' · By '+people[actorId].name);
 return{status:'saved'};
}
function age(l){return Math.floor((state.now-l.stageAt)/DAY)}
function dateTime(t){return new Date(t).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})}
function nameParts(name){const [first,...rest]=String(name).trim().split(/\s+/);return[first,rest.join(' ')||'—']}
function remaining(l){if(!state.policy.recycle||!l.owner||l.stage!=='Claimed')return null;return state.policy.claimed-Math.floor((state.now-Math.max(l.stageAt,l.assignedAt))/DAY)}
function visibleLeads(){return state.leads.filter(l=>PORTAL_STAGES.has(l.stage))}
function assignmentEvents(l){return(l.history||[]).filter(h=>ASSIGNMENT_EVENTS.has(h.title))}
function filtered(){const no=$('leadNoFilter').value.trim().toLowerCase(),type=$('leadTypeFilter').value,start=$('creationStartPicker').value,end=$('creationEndPicker').value,status=$('statusFilter').value,source=$('leadSourceFilter').value;const startAt=start?Date.parse(start+'T00:00:00Z'):null,endAt=end?Date.parse(end+'T23:59:59.999Z'):null;return visibleLeads().filter(l=>inPool(l,tab)&&(!no||l.id.toLowerCase().includes(no))&&(type==='all'||l.leadType===type)&&(startAt===null||l.createdAt>=startAt)&&(endAt===null||l.createdAt<=endAt)&&(status==='all'||l.stage===status)&&(source==='all'||l.source===source))}
function assignedToCell(l){const owner=people[l.owner];if(l.stage==='Disqualified'&&!owner)return '<span class="secondary">— Unassigned</span>';if(!owner)return'<span class="unassigned">— Unassigned</span><div class="time">Shared pool</div>';const initials=owner.name.split(' ').map(x=>x[0]).join('');return`<div class="person"><span class="avatar">${esc(initials)}</span>${esc(owner.name)}</div>`}
function stageTimeCell(l){const days=age(l),rem=remaining(l);return`${days} ${days===1?'day':'days'}${rem===null?'':`<div class="time ${rem<=1?'overdue':''}">${rem<=0?'Recycling due':`Recycles in ${rem}d`}</div>`}`}
const ACTION_LABELS={accept:'Accept',reject:'Reject',qualify:'Qualify',edit:'Edit',cancel:'Cancel',detail:'Detail',reassign:'Reassign'};
function actionPolicy(l){
 const work=canWork(l),transfer=canReassign(l),direct=[],menu=[];
 if(l.stage==='Pending Claim'){
  if(canAccept(l))direct.push('accept');
  if(canReject(l))direct.push('reject');
  direct.push('detail');
  if(transfer)menu.push('reassign');
 }else if(l.stage==='Claimed'){
  if(work){direct.push('qualify','edit');menu.push('cancel','detail')}
  else direct.push('detail');
  if(transfer)menu.push('reassign');
 }else if(l.stage==='Qualified'){
  if(work)direct.push('edit','cancel');
  direct.push('detail');
  if(transfer)menu.push('reassign');
 }else direct.push('detail');
 return{direct,menu};
}
function actionButton(action,l){return`<button data-action="${action}" data-id="${esc(l.id)}">${ACTION_LABELS[action]}</button>`}
function closeActionMenu(){actionMenu?.remove();actionMenu=null;actionMenuTrigger?.setAttribute('aria-expanded','false');actionMenuTrigger=null}
function openActionMenu(trigger,l){
 if(actionMenuTrigger===trigger){closeActionMenu();return}
 closeActionMenu();
 const actions=actionPolicy(l).menu;
 if(!actions.length)return;
 const menu=document.createElement('div');
 menu.className='action-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','More actions for '+l.name);
 menu.innerHTML=actions.map(action=>`<button type="button" role="menuitem" data-action="${action}">${ACTION_LABELS[action]}</button>`).join('');
 document.body.append(menu);
 const rect=trigger.getBoundingClientRect(),width=menu.offsetWidth,height=menu.offsetHeight;
 menu.style.left=Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8))+'px';
 menu.style.top=(rect.bottom+height+8<=window.innerHeight?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';
 menu.onclick=e=>{const item=e.target.closest('button[data-action]');if(!item)return;const action=item.dataset.action;closeActionMenu();if(actionPolicy(l).menu.includes(action))handleLeadAction(action,l)};
 actionMenu=menu;actionMenuTrigger=trigger;trigger.setAttribute('aria-expanded','true');menu.querySelector('button')?.focus();
}
document.addEventListener('pointerdown',e=>{if(actionMenu&&!actionMenu.contains(e.target)&&!actionMenuTrigger?.contains(e.target))closeActionMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&actionMenu){const trigger=actionMenuTrigger;closeActionMenu();trigger?.focus()}});
function leadRow(l){
 const [firstName,lastName]=nameParts(l.name);
 const stageClass=({'Pending Claim':'pending','Claimed':'claimed','Qualified':'qualified','Rejected':'rejected','Disqualified':'cancelled','Converted':'converted'}[l.stage]||'pending');
 const {direct,menu}=actionPolicy(l);
 const actions=direct.map(action=>actionButton(action,l)).join('')+(menu.length?`<button class="more" data-action="more" data-id="${esc(l.id)}" aria-label="More actions for ${esc(l.name)}" aria-haspopup="menu" aria-expanded="false">⋯</button>`:'');
 return `<tr><td>${esc(firstName)}</td><td>${esc(lastName)}</td><td>${esc(l.email)}</td><td>${esc(l.telephone)}</td><td><span class="leadno">${esc(l.id)}</span></td><td>${esc(l.leadType)}</td><td>${esc(l.source)}</td><td>${esc(l.country)}</td><td>${esc(l.salesRepresentative)}</td><td>${assignedToCell(l)}</td><td>${esc(l.createdBy)}</td><td>${esc(dateTime(l.createdAt))}</td><td>${esc(l.lastUpdatedBy)}</td><td>${esc(dateTime(l.lastUpdatedAt))}</td><td><button class="assignment-history-link" data-action="assignment-history" data-id="${l.id}" aria-label="Assignment history for ${esc(l.name)}">View history (${assignmentEvents(l).length})</button></td><td>${stageTimeCell(l)}</td><td><span class="pill ${stageClass}">${esc(l.stage)}</span></td><td><div class="actions">${actions}</div></td></tr>`;
}
function render(){
 closeActionMenu();
 const ls=visibleLeads(),pending=ls.filter(l=>l.stage==='Pending Claim').length,claimed=ls.filter(l=>l.stage==='Claimed').length,qualified=ls.filter(l=>l.stage==='Qualified').length;
 $('stats').innerHTML=[['Portal leads',ls.length,'','▦'],['Pending claim',pending,'Awaiting a first response','◷'],['In progress',claimed,'Claimed by your team','↗'],['Qualified',qualified,'Ready for the next step','✓']].map(([label,n,sub,icon])=>`<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon}</span></div><div class="stat-bottom"><span class="number">${n.toString().padStart(2,'0')}</span>${sub?`<small>${sub}</small>`:''}</div></div>`).join('');
 $('allCount').textContent=ls.length;$('mineCount').textContent=ls.filter(l=>inPool(l,'mine')).length;$('poolCount').textContent=ls.filter(l=>inPool(l,'pool')).length;$('settingsButton').hidden=role!=='admin';$('advanceDay').hidden=role!=='admin';$('permissionNote').hidden=role==='admin';$('newLead').hidden=role!=='admin';$('settingsButton').title='Configure lead assignment';
 for(const b of document.querySelectorAll('.tab')){b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',b.dataset.tab===tab)}
 const rows=filtered();$('empty').hidden=rows.length>0;$('resultCount').textContent=`Showing ${rows.length} of ${ls.length} Portal leads`;
 $('leads').innerHTML=rows.slice(0,10).map(leadRow).join('');
}
function selectedUserIds(){return[...$('targetUserMenu').querySelectorAll('input[type=checkbox]:checked')].map(input=>input.value)}
function syncUserPicker(){const ids=selectedUserIds(),names=ids.map(id=>people[id].name);$('targetUserSummary').textContent=names.length?names.join(', '):'Select company users';$('targetUserTrigger').title=names.join(', ')}
function closeUserPicker(){$('targetUserMenu').hidden=true;$('targetUserTrigger').setAttribute('aria-expanded','false')}
$('targetUserTrigger').onclick=()=>{const menu=$('targetUserMenu');menu.hidden=!menu.hidden;$('targetUserTrigger').setAttribute('aria-expanded',String(!menu.hidden))};
document.addEventListener('pointerdown',e=>{if(!$('userPicker').contains(e.target))closeUserPicker()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('targetUserMenu').hidden){closeUserPicker();$('targetUserTrigger').focus()}});
function syncForm(){const p=state.policy;document.querySelector(`[name=mode][value=${p.mode}]`).checked=true;document.querySelector(`[name=permission][value=${p.permission}]`).checked=true;for(const input of $('targetUserMenu').querySelectorAll('input[type=checkbox]'))input.checked=p.users.includes(input.value);syncUserPicker();closeUserPicker();$('recycle').checked=p.recycle;$('claimedDays').value=p.claimed;syncFields()}
function syncFields(){$('userField').hidden=document.querySelector('[name=mode]:checked').value==='shared';if($('userField').hidden)closeUserPicker();$('recycleFields').hidden=!$('recycle').checked;$('claimedDays').disabled=!$('recycle').checked}
function settings(){if(role!=='admin')return;syncForm();open('settingsOverlay')}
$('settingsButton').onclick=settings;
$('settingsForm').onchange=()=>{syncFields();syncUserPicker()};$('settingsForm').onsubmit=e=>{
 e.preventDefault();if(role!=='admin')return;
 const mode=document.querySelector('[name=mode]:checked').value,users=selectedUserIds();
 if(mode==='random'&&!users.length){toast('Select at least one user for random assignment.');$('targetUserTrigger').focus();return}
 state.policy={mode,users,permission:document.querySelector('[name=permission]:checked').value,recycle:$('recycle').checked,claimed:+$('claimedDays').value};
 persist();close('settingsOverlay');toast('Assignment settings saved. Recycling now follows the initial assignment mode.')
};
$('advanceDay').onclick=()=>{if(role!=='admin')return;state.now+=DAY;const result=runRecycling();persist();toast(date(state.now)+' · '+result.reassigned+' reassigned · '+result.shared+' to shared pool · '+result.disqualified+' disqualified')};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>close(b.dataset.close));document.querySelectorAll('.overlay').forEach(el=>el.onclick=e=>{if(e.target===el)close(el.id)});document.addEventListener('keydown',e=>{const el=document.querySelector('.overlay.open');if(!el)return;if(e.key==='Escape')close(el.id);if(e.key==='Tab'){const nodes=[...el.querySelectorAll('button,input,select')].filter(x=>!x.disabled&&x.tabIndex!==-1&&x.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});['leadNoFilter','leadTypeFilter','statusFilter','leadSourceFilter'].forEach(id=>$(id).addEventListener(id==='leadNoFilter'?'input':'change',render));initDateControl('creationStart',true);initDateControl('creationEnd',true);
function confirmPendingDecision(l,action){
 const accept=action==='accept';
 if(!(accept?canAccept(l):canReject(l)))return;
 const ownerAtOpen=l.owner;
 const shared=accept&&!ownerAtOpen,verb=accept?'accept':'reject';
 const message=shared?'Accepting will assign this shared lead to you and move it to Claimed.':'Please confirm whether to '+verb+' this record?';
 showModal(`<h2 id="modalTitle">${accept?'Accept':'Reject'} Confirmation</h2><p>${message}</p><div class="buttonrow"><button class="btn" id="cancelModal">Cancel</button><button class="btn primary" id="confirmDecision">Confirm</button></div>`);
 $('confirmDecision').onclick=()=>{
  const live=state.leads.find(x=>x.id===l.id);
  if(!live||live.owner!==ownerAtOpen||!(accept?canAccept(live):canReject(live))){close('modalOverlay');render();toast('This lead is no longer available for this action.');return}
  if(shared){live.owner=currentUserId();live.assignedAt=state.now;log(live,'Claimed from shared pool','Assigned to '+people[live.owner].name+' · Accept')}
  live.stage=accept?'Claimed':'Rejected';live.stageAt=state.now;
  log(live,accept?'Lead accepted':'Lead rejected',(accept?'Accepted':'Rejected')+' by '+people[currentUserId()].name);
  persist();close('modalOverlay');toast(shared?'Lead accepted and assigned to you.':'Lead moved to '+live.stage+'.')
 };
}
function productRow(index){return`<div class="product-row"><span>${index}</span><select class="product-model" required aria-label="Product model ${index}"><option value="">Please select</option><option value="Demo product model A">Demo product model A</option><option value="Demo product model B">Demo product model B</option></select><input class="product-quantity" type="number" min="1" step="1" required placeholder="Please input" aria-label="Quantity ${index}"><button type="button" class="add-product">Add</button></div>`}
function openQualification(l){
 if(l.stage!=='Claimed'||!canWork(l))return;
 showModal(`<h2 id="modalTitle">Qualification Confirmation</h2><form id="qualifyForm"><div class="qualify-dates"><div class="field"><label for="proposalDate">Proposal accepted date <span class="required">*</span></label>${dateControlMarkup('proposalDate','Proposal accepted date',true)}</div><div class="field"><label for="installationDate">Installation planned date <span class="required">*</span></label>${dateControlMarkup('installationDate','Installation planned date',true)}</div></div><h3 class="product-heading">Product Info</h3><div class="product-head"><span>No.</span><span>Product Model <b>*</b></span><span>Quantity <b>*</b></span><span>Operation</span></div><div id="productRows">${productRow(1)}</div><div class="buttonrow"><button type="button" class="btn" id="cancelModal">Cancel</button><button type="submit" class="btn primary">Confirm</button></div></form>`,true);
 initDateControl('proposalDate');initDateControl('installationDate');
 $('productRows').onclick=e=>{if(!e.target.closest('.add-product'))return;const index=$('productRows').querySelectorAll('.product-row').length+1;$('productRows').insertAdjacentHTML('beforeend',productRow(index))};
 $('qualifyForm').onsubmit=e=>{e.preventDefault();if(l.stage!=='Claimed'||!canWork(l)){close('modalOverlay');toast('This lead is no longer available for qualification.');return}const products=[...$('productRows').querySelectorAll('.product-row')].map(row=>({model:row.querySelector('.product-model').value,quantity:+row.querySelector('.product-quantity').value}));if(!products.length||products.some(x=>!x.model||!Number.isInteger(x.quantity)||x.quantity<1))return;l.qualification={proposalAcceptedDate:parseDisplayDate($('proposalDate').value),installationPlannedDate:parseDisplayDate($('installationDate').value),products};l.stage='Qualified';l.stageAt=state.now;log(l,'Lead qualified',products.length+' product line'+(products.length===1?'':'s')+' · By '+people[currentUserId()].name);persist();close('modalOverlay');toast('Lead qualified.')};
}
function openCancellation(l){
 if(!['Claimed','Qualified'].includes(l.stage)||!canWork(l))return;
 showModal(`<h2 id="modalTitle">Cancel Confirmation</h2><form id="cancelForm"><div class="field"><label for="cancelReason">Cancel Reason <span class="required">*</span></label><select id="cancelReason" required><option value="">Please select</option>${CANCEL_REASONS.map(reason=>`<option value="${esc(reason)}">${esc(reason)}</option>`).join('')}</select></div><div class="buttonrow"><button type="button" class="btn" id="cancelModal">Cancel</button><button type="submit" class="btn primary">Confirm</button></div></form>`);
 $('cancelForm').onsubmit=e=>{e.preventDefault();const reason=$('cancelReason').value;if(!reason||!['Claimed','Qualified'].includes(l.stage)||!canWork(l))return;l.cancelReason=reason;l.stage='Disqualified';l.stageAt=state.now;log(l,'Lead cancelled',reason+' · By '+people[currentUserId()].name);persist();close('modalOverlay');toast('Lead moved to Disqualified.')};
}
function openEdit(l){
 if(!['Claimed','Qualified'].includes(l.stage)||!canWork(l))return;
 const [first,last]=nameParts(l.name);
 showModal(`<h2 id="modalTitle">Edit lead</h2><p>${esc(l.id)} · ${esc(l.stage)}</p><form id="editForm"><div class="field"><label for="editFirst">First Name</label><input type="text" id="editFirst" value="${esc(first)}" maxlength="80" required></div><div class="field"><label for="editLast">Last Name</label><input type="text" id="editLast" value="${esc(last)}" maxlength="80" required></div><div class="field"><label for="editEmail">Email</label><input type="email" id="editEmail" value="${esc(l.email)}" maxlength="160" required></div><div class="field"><label for="editPhone">Telephone</label><input type="tel" id="editPhone" value="${esc(l.telephone)}" maxlength="40" required></div><div class="buttonrow"><button type="button" class="btn" id="cancelModal">Cancel</button><button type="submit" class="btn primary">Save changes</button></div></form>`);
 $('editForm').onsubmit=e=>{e.preventDefault();if(!['Claimed','Qualified'].includes(l.stage)||!canWork(l))return;l.name=$('editFirst').value.trim()+' '+$('editLast').value.trim();l.email=$('editEmail').value.trim();l.telephone=$('editPhone').value.trim();log(l,'Lead edited','Contact fields updated by '+people[currentUserId()].name);persist();close('modalOverlay');toast('Lead details updated.')};
}
function openDetail(l){
 const [first,last]=nameParts(l.name),owner=people[l.owner]?.name||'Unassigned';
 const canRecord=canWork(l)&&['Claimed','Qualified'].includes(l.stage);
 showModal(`<h2 id="modalTitle">Lead detail</h2><p>${esc(l.id)}</p><dl class="detail-grid"><dt>First Name</dt><dd>${esc(first)}</dd><dt>Last Name</dt><dd>${esc(last)}</dd><dt>Email</dt><dd>${esc(l.email)}</dd><dt>Telephone</dt><dd>${esc(l.telephone)}</dd><dt>Lead Type</dt><dd>${esc(l.leadType)}</dd><dt>Lead Source</dt><dd>${esc(l.source)}</dd><dt>Country</dt><dd>${esc(l.country)}</dd><dt>Sales Representative</dt><dd>${esc(l.salesRepresentative)}</dd><dt>Assigned to</dt><dd>${esc(owner)}</dd><dt>Status</dt><dd>${esc(l.stage)}</dd>${l.cancelReason?`<dt>Cancel Reason</dt><dd>${esc(l.cancelReason)}</dd>`:''}</dl><div class="buttonrow">${canRecord?'<button class="btn" id="detailFollowUp">Record follow-up</button>':''}<button class="btn primary" id="cancelModal">Close</button></div>`);
 $('detailFollowUp')?.addEventListener('click',()=>{close('modalOverlay');openFollowUp(l)});
}
function openFollowUp(l){
 if(!canWork(l)||!['Claimed','Qualified'].includes(l.stage))return;
 const actorId=currentUserId();
 $('modalContent').innerHTML=`<div class="eyebrow">Lead activity</div><h2 id="modalTitle">Record follow-up</h2><p>${esc(l.name)} · ${l.id}</p><form id="followForm"><div class="field"><label for="followNote">Follow-up note</label><input type="text" id="followNote" maxlength="300" placeholder="e.g. Called customer; site visit requested" required></div><div class="notice">A follow-up note does not reset the stage timer.</div><div class="buttonrow"><button type="button" class="btn" id="cancelModal">Cancel</button><button type="submit" class="btn primary">Save follow-up</button></div></form>`;
 open('modalOverlay');$('cancelModal').onclick=()=>close('modalOverlay');
 $('followForm').onsubmit=ev=>{
  ev.preventDefault();const note=$('followNote').value.trim();if(!note)return;
  const result=saveFollowUp(l.id,actorId,note);
  if(result.status!=='saved'){close('modalOverlay');render();toast('This lead is no longer available for your follow-up.');return}
  persist();close('modalOverlay');toast('Follow-up saved.');
 };
}
function handleLeadAction(action,l){
 if(!l)return;
 if(action==='assignment-history'){
  const events=assignmentEvents(l);
  $('historyTitle').textContent='Assignment history';$('historySubtitle').textContent=l.id+' · '+l.name;
  $('historyContent').innerHTML=events.length?'<div class="timeline">'+events.map(h=>`<div class="event"><strong>${esc(h.title)}</strong><p>${esc(h.detail)}</p><small>${date(h.at)}</small></div>`).join('')+'</div>':'<p>No assignment history yet.</p>';
  open('historyOverlay');return;
 }
 if(![...actionPolicy(l).direct,...actionPolicy(l).menu].includes(action))return;
if(action==='reassign'){if(!canReassign(l))return;const candidates=Object.keys(people).filter(k=>k!==l.owner);$('modalContent').innerHTML=`<div class="eyebrow">Change ownership</div><h2 id="modalTitle">Reassign lead</h2><p>${esc(l.name)} · ${l.id}</p><form id="reassignForm"><div class="field"><label>Current owner</label><div class="scope">${people[l.owner]?.name||'Shared pool · Unassigned'}</div></div><div class="field"><label for="newOwner">New owner</label><select id="newOwner">${candidates.map(k=>`<option value="${k}">${people[k].name} · ${people[k].role==='sales'?'Sales':'Manager'}</option>`).join('')}</select></div><div class="field"><label for="reason">Reason <span class="secondary">(required)</span></label><input type="text" id="reason" placeholder="e.g. Territory change or workload balancing" maxlength="240" required></div><div class="buttonrow"><button type="button" class="btn" id="cancelModal">Cancel</button><button type="submit" class="btn primary">Confirm reassignment</button></div></form>`;open('modalOverlay');$('cancelModal').onclick=()=>close('modalOverlay');$('reassignForm').onsubmit=ev=>{ev.preventDefault();const reason=$('reason').value.trim();if(!reason){$('reason').setCustomValidity('Enter a reason.');$('reason').reportValidity();return}const previous=people[l.owner]?.name||'Unassigned';l.owner=$('newOwner').value;l.assignedAt=state.now;log(l,'Lead reassigned',previous+' → '+people[l.owner].name+' · '+reason+' · By '+people[currentUserId()].name);persist();close('modalOverlay');toast('Lead reassigned. Notification recorded for '+people[l.owner].name+'.')};$('reason').oninput=()=>$('reason').setCustomValidity('');return}
if(action==='detail'){openDetail(l);return}
if(action==='accept'||action==='reject'){confirmPendingDecision(l,action);return}
if(!canWork(l))return;
if(action==='qualify'){openQualification(l);return}
if(action==='cancel'){openCancellation(l);return}
if(action==='edit'){openEdit(l);return}
}
$('leads').onclick=e=>{const button=e.target.closest('[data-action]');if(!button)return;const l=state.leads.find(x=>x.id===button.dataset.id);if(!l)return;if(button.dataset.action==='more'){openActionMenu(button,l);return}closeActionMenu();handleLeadAction(button.dataset.action,l)};

$('newLead').onclick=()=>{if(role!=='admin')return;const n=state.leads.length-12,owner=state.policy.mode==='random'?nextOwner():null;const l={id:'LD202610'+(210050+n),name:['Alice Dupont','Louis Mercier'][n]||'Demo Contact '+(n+1),email:'demo.contact.'+(n+1)+'@example.com',source:'Web',owner,stage:'Pending Claim',stageAt:state.now,assignedAt:state.now,createdAt:state.now,createdBy:people[currentUserId()].name,followUps:[],history:[]};ensureLeadFields(l,state.leads.length);log(l,owner?'Lead assigned':'Added to shared pool',owner?'Random assignment → '+people[owner].name+' · New lead notification recorded':'No owner · An authorized user can Accept to take ownership');state.leads.unshift(l);persist();toast(owner?'New lead randomly assigned to '+people[owner].name+'.':'New lead added to shared pool. Accept to take ownership.')};
$('statusFilter').innerHTML='<option value="all">All statuses</option>'+ALL_STAGES.filter(s=>PORTAL_STAGES.has(s)).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
$('export').onclick=()=>{const rows=[['First Name','Last Name','Email','Telephone','Lead No.','Lead Type','Lead Source','Country','Sales Representative','Assigned to','Created By','Created Time','Last Updated By','Last Updated Time','Assignment History','Time in stage','Status'],...filtered().map(l=>{const [first,last]=nameParts(l.name);return[first,last,l.email,l.telephone,l.id,l.leadType,l.source,l.country,l.salesRepresentative,people[l.owner]?.name||'Unassigned',l.createdBy,dateTime(l.createdAt),l.lastUpdatedBy,dateTime(l.lastUpdatedAt),assignmentEvents(l).map(h=>dateTime(h.at)+' '+h.title+': '+h.detail).join('; '),age(l)+' '+(age(l)===1?'day':'days'),l.stage]})];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='sunpower-demo-leads.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Filtered leads exported as CSV.')};render();

function resetFilters(){$('leadNoFilter').value='';$('leadTypeFilter').value='all';clearDateControl('creationStart');clearDateControl('creationEnd');$('statusFilter').value='all';$('leadSourceFilter').value='all';render()}
$('resetFilters').onclick=resetFilters;$('emptyReset').onclick=resetFilters;$('searchButton').onclick=()=>{if(!$('creationStart').reportValidity()||!$('creationEnd').reportValidity())return;render()};
