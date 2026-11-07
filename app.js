'use strict';

const app = document.querySelector('#app');
const landing = app.innerHTML;
const roles = ['Picker / Packer', 'Supervisor', 'Inventory controller', 'Manager'];
const navigation = [
  ['overview', 'Overview'], ['receiving', 'Receiving'],
  ['inventory', 'Inventory & bins'], ['picking', 'Picking & packing'],
  ['shipping', 'Shipping & dispatch'], ['reports', 'Reports & alerts'],
  ['accounts', 'User accounts']
];
const modules = ['Login & accounts', 'Dashboard', 'Receiving', 'Inventory & bins', 'Picking & packing', 'Shipping & dispatch', 'Reports & alerts'];
const moduleCopy = ['Role-based access', 'See what needs attention', 'Count, confirm, put away', 'Find stock. Record every move.', 'One item. One trusted bin.', 'Ready orders. On-time trucks.', 'Measure, learn, improve.'];
const products = [
  {name:'Packing cartons', sku:'SKU-101', bin:'A-01-1', stock:420, spec:'Medium carton'},
  {name:'Carton tape', sku:'SKU-204', bin:'B-11-1', stock:18, spec:'48 mm × 100 m'},
  {name:'Bubble wrap', sku:'SKU-305', bin:'C-02-3', stock:86, spec:'Protective roll'},
  {name:'Shipping labels', sku:'SKU-406', bin:'D-03-1', stock:0, spec:'Label roll'}
];
const sampleOrders = [
  {id:'4821', customer:'SM Calamba', departure:'3:00 PM', dock:'2GO · Dock 02', truck:0,
    lines:[{product:0,quantity:12},{product:1,quantity:24,startBin:'A-04-2'},{product:2,quantity:10}], picks:[]},
  {id:'4822', customer:'Puregold', departure:'4:30 PM', dock:'J&T · Dock 03', truck:1,
    lines:[{product:0,quantity:8},{product:2,quantity:10}], picks:[]}
];
const employees = [
  {name:'Maria Santos', id:'EMP-1042', role:roles[1], status:'Active'},
  {name:'Elmer Bacoro', id:'EMP-1043', role:roles[0], status:'Active'},
  {name:'BJ Caballas', id:'EMP-1044', role:roles[2], status:'Active'},
  {name:'Ryence Meman', id:'EMP-1045', role:roles[3], status:'Active'}
];
function readSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem('bodega-' + key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem('bodega-' + key, JSON.stringify(value)); }
  catch {}
}
const previousDispatches = readSaved('dispatched', []);
const initialOrders = sampleOrders.map(order => ({
  ...order,
  picks: previousDispatches.includes(order.truck) || (order.truck === 0 && readSaved('ready',false))
    ? order.lines.map(line => ({...line,bin:products[line.product].bin}))
    : []
}));
const state = {
  employees:readSaved('employees', employees), move:readSaved('move', null),
  cycle:readSaved('cycle', 420), received:readSaved('received', {}),
  orders:readSaved('orders',initialOrders), dispatched:previousDispatches,
  employee:null, warehouseRole:roles[0],
  inventoryQuery:'', inventoryFilter:'all', zone:'All zones', accountQuery:'',
  receipt:readSaved('received', {})['PO-1042'] || readSaved('draft-PO-1042',[120,116,120]),
  delivery:0, truck:0, adjust:418, adjustTape:0,
  reorder:null, pickMode:'demo', pickView:'item', activeOrderId:null,
  loginId:'EMP-1042', loginError:false, week:'This week'
};
document.documentElement.dataset.theme = readSaved('theme','auto');

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[character]));
const pill = (text, color = '') => `<span class="pill ${color}">${escape(text)}</span>`;
const label = (text, color = '') => `<p class="eyebrow ${color}">${escape(text)}</p>`;
const link = (text, target, style = 'primary') => `<a class="btn ${style}" href="#${target}">${escape(text)}</a>`;
const button = (text, action, style = 'primary', value = '') => `<button type="button" class="btn ${style}" data-action="${action}" data-value="${escape(value)}">${escape(text)}</button>`;
const inline = (text, action, value = '') => `<button type="button" class="link-btn" data-action="${action}" data-value="${escape(value)}">${escape(text)}</button>`;
const submit = text => `<button class="btn primary" type="submit">${escape(text)}</button>`;
const actions = (items, extra = '') => `<div class="actions ${extra}">${items.join('')}</div>`;
const brand = (target = 'home') => `<a class="brand" href="#${target}"><span aria-hidden="true">B</span>Bodega</a>`;
const uiIcon = name => `<i class="ui-icon ui-${name}" aria-hidden="true"></i>`;
const markCurrent = selected => selected ? ' aria-current="page"' : '';
const heading = (title, description, links = []) => `<header class="heading"><div><h1>${title}</h1><p>${description}</p></div>${links.length ? actions(links) : ''}</header>`;
const input = (name, title, value, options = '') => `<label class="field">${title}<input name="${name}" value="${escape(value)}" ${options}></label>`;
const select = (name, title, values, value, options = '') => `<label class="field">${title}<select name="${name}" aria-label="${escape(title || name)}" ${options}>${values.map(item => `<option${item === value ? ' selected' : ''}>${escape(item)}</option>`).join('')}</select></label>`;
const note = text => `<p class="note">${text}</p>`;
const status = () => pill('● Up to date');
const productStock = index => index === 0 ? state.cycle : products[index].stock;
const tapeBin = () => state.move?.to || products[1].bin;
const productBin = index => index === 1 ? tapeBin() : products[index].bin;
const metricCards = metrics => `<div class="metric-grid" style="--metric-count:${metrics.length}">${metrics.map(([name,value,detail]) => `<article class="metric">${label(name)}<strong>${value}</strong><small>${detail}</small></article>`).join('')}</div>`;
const overviewMetrics = [
  ['Open orders','24','6 due before 3:00 PM'], ['Ready to ship','18','75% of today’s orders'],
  ['Low-stock items','03','2 require a reorder'], ['Deliveries due','04','2 ready to receive']
];
const layout = (title, section, content) => {
  const name = state.employee?.name || 'Maria Santos';
  return `<div class="workspace">
    <aside class="sidebar">${brand('overview')}${label('Main workspace')}
      <nav aria-label="Workspace">${navigation.map(([id,text]) => `<a href="#${id}"${markCurrent(section === id)}>${uiIcon(id)}${text}</a>`).join('')}</nav>
      <div class="sidebar-foot"><p>Valenzuela · Warehouse 01</p><p>EN / Filipino <a href="#login" data-action="sign-out">☼ Sign out</a></p><small>Sample data · Uicons by <a href="https://www.flaticon.com/uicons">Flaticon</a></small></div>
    </aside>
    <div class="workarea"><header class="workbar"><div>${label('Bodega / Warehouse')}<h2>${title}</h2></div>${status()}<div class="who"><span class="avatar">${escape(name.split(/\s+/).slice(0,2).map(part => part[0]).join(''))}</span>${escape(name.split(' ')[0])}</div></header>
      <main class="workmain">${content}</main>
    </div></div>`;
};
function siteBar(current) {
  return `<header class="site-bar">${brand()}<nav aria-label="Main navigation">
    <a href="#home">Home</a><a href="#demo"${markCurrent(current === 'demo')}>Demo</a><a href="#modules"${markCurrent(current === 'modules')}>Modules</a>
  </nav>${link('Open workspace','login','primary compact')}</header>`;
}
const orderById = id => state.orders.find(order => order.id === id);
const pickedFor = (order, product) => order.picks.reduce((sum,pick) => sum + (pick.product === product ? pick.quantity : 0),0);
const unitsInOrder = order => order.lines.reduce((sum,line) => sum + line.quantity,0);
const unitsPicked = order => order.picks.reduce((sum,pick) => sum + pick.quantity,0);
const remainingLine = order => order.lines.find(line => pickedFor(order,line.product) < line.quantity);
const orderLocked = order => state.dispatched.includes(order.truck);
const orderReady = order => !remainingLine(order);
const truckOrders = truck => state.orders.filter(order => order.truck === truck);
const truckReady = truck => truckOrders(truck).every(orderReady);
const orderRoute = (action,id,mode) => [action,id,mode === 'workspace' ? mode : ''].filter(Boolean).join('/');
function updateOrder(order) {
  state.orders = state.orders.some(item => item.id === order.id)
    ? state.orders.map(item => item.id === order.id ? order : item)
    : [...state.orders,order];
  save('orders',state.orders);
}
function orderList(workspace = false) {
  const mode = workspace ? 'workspace' : 'demo';
  const block = `<section class="demo-panel">
    ${label('Your assigned orders')}<h2>Start with the next truck out.</h2>
    ${state.orders.map((order,index) => {
      const ready = orderReady(order);
      const action = ready ? 'View order' : order.picks.length ? 'Continue picking' : 'Start picking';
      return `<article class="order"><div>
        ${index === 0 && order.departure ? pill(`◷ Departs ${order.departure}`,'amber') : ''}
        <h3>Order #${escape(order.id)}</h3>
        <p>${escape(order.customer)} · ${order.lines.length} item${order.lines.length === 1 ? '' : 's'} · ${unitsInOrder(order)} units
          ${index > 0 && order.departure ? ' · Departs ' + escape(order.departure) : ''}</p>
        ${index === 0 && order.dock ? `<small>${escape(order.dock)}</small>` : ''}
        ${ready ? `<small class="green">✓ ${orderLocked(order) ? 'Dispatched' : 'Ready for packing'}</small>` : order.picks.length ? `<small>${unitsPicked(order)} of ${unitsInOrder(order)} units picked</small>` : ''}
        </div><div class="order-controls">
          ${link(`${action} #${order.id} →`,orderRoute('pick',order.id,mode),'primary compact')}
          ${!order.picks.length && !orderLocked(order) ? `<a href="#${orderRoute('order-edit',order.id,mode)}">Edit order</a>` : ''}
        </div></article>`;
    }).join('')}
    ${link('Add order +',orderRoute('order-new',null,mode),'compact')}
    <div class="exception-note">${label('Try the exception path','sky')}<p>When a bin is empty, “Not at this bin” shows where the stock moved.</p></div>
  </section>`;
  if (workspace) return layout('Picking & packing','picking',heading('One item. One clear next step.','Choose an assigned order to start picking.') + block);
  return `${siteBar('demo')}<main>
    <header class="site-hero">${pill('INTERACTIVE DEMO','sky')}<h1>A better way to pick.</h1><p>Follow an order from the first bin to packing.</p></header>
    <div class="public-content">${block}<div class="demo-footer"><p>Orders and picking progress are saved in this browser.</p><p><a href="#home">‹ Back to Home</a></p></div></div></main>`;
}
function orderForm(id,mode) {
  const order = id ? orderById(id) : null;
  const workspace = mode === 'workspace';
  if (id && (!order || order.picks.length || orderLocked(order))) return orderList(workspace);
  const title = order ? `Edit order #${escape(order.id)}` : 'Add an order';
  const fields = `<form class="panel stack" data-form="order" data-id="${escape(id || '')}" data-mode="${mode}">
    <div class="field-grid">
      ${input('orderId','Order number',order?.id || '',order ? 'readonly' : 'required maxlength="24" pattern="[A-Za-z0-9][A-Za-z0-9\\-]{0,23}" placeholder="e.g. 4823"')}
      ${input('customer','Customer',order?.customer || '','required maxlength="80"')}
    </div>
    <div><h2>Items to pick</h2><p class="muted">Enter the required quantity for each item in this order.</p></div>
    <div class="field-grid">${products.map((product,i) =>
      input(`order-qty-${i}`,`${product.name} · ${product.sku}`,order?.lines.find(line => line.product === i)?.quantity ?? 0,'type="number" min="0" max="99999" step="1" required')
    ).join('')}</div>
    <p class="field-error" role="alert" hidden></p>
    ${actions([submit('Save order'),link('Cancel',workspace ? 'picking' : 'demo','secondary')],'split')}
  </form>`;
  if (workspace) return layout('Picking & packing','picking',heading(title,'Set the order’s quantities before picking starts.') + fields);
  return `${siteBar('demo')}<main class="public-content" style="margin-top:36px">${heading(title,'Set the order’s quantities before picking starts.')}${fields}</main>`;
}

function modulesPage() {
  const locations = ['login','overview','receiving','inventory','picking','shipping','reports'];
  const order = state.orders.find(item => !orderReady(item));
  const line = order && remainingLine(order);
  const bin = line && productBin(line.product);
  return `${siteBar('modules')}<main><header class="site-hero">${pill('BUILT FOR YOUR WAREHOUSE','sky')}
    <h1>Know where it is.<br>Every time.</h1><p>Stock moves. Your records should keep up.<br>One clear workspace, from receiving to the last truck out.</p>
    ${actions([link('Try the demo →','demo','primary compact'),link('Explore modules','module-list','compact')])}
    </header><div class="public-content">
    <div class="demo-panel"><div class="actions" style="justify-content:space-between;margin-bottom:16px">${label('Bodega / Operations overview')}${status()}</div>
    ${metricCards(overviewMetrics)}<div class="columns"><section class="panel"><h2>The right location. Before you walk.</h2>
    ${order ? `<p class="muted">Order #${escape(order.id)} · Item ${order.lines.indexOf(line) + 1} of ${order.lines.length}</p>
    <p class="big-code">${escape(bin)}</p><p class="muted">${line.quantity - pickedFor(order,line.product)} units remaining</p>
    ${link('Continue picking →',orderRoute('pick',order.id,'demo'))}` : link('View assigned orders →','demo')}</section>
    <section class="panel"><h2>Needs attention</h2><p>! 3 items reached reorder point</p><p>↗ 2GO truck leaves in 40 min</p><p>✓ PO-1042 ready to receive</p></section></div></div>
    <section class="module-section" id="module-list"><h2>One warehouse. Seven connected modules.</h2><p class="muted">Every handoff accounted for. Every next step clear.</p><div class="module-grid">
    ${modules.map((name,i) => `<a class="panel" href="#${locations[i]}">${label(String(i + 1).padStart(2,'0'),'sky')}<strong>${name}</strong><small>${moduleCopy[i]}</small></a>`).join('')}
    </div></section><section class="panel"><h2>Designed for the people on the floor.</h2><p class="muted">Large actions. Clear locations. English and Filipino. Built for handhelds and desktops.</p></section>
    </div></main>`;
}
function requestForm() {
  return `<section class="request-panel landing-width" id="request-demo"><h2>Request a demo</h2>
    <form data-form="request" class="stack"><div class="field-grid">
    ${input('name','Name','','required autocomplete="name"')}
    ${input('email','Email','','required type="email" autocomplete="email"')}
    </div>${input('company','Warehouse or company','','required autocomplete="organization"')}
    ${submit('Save demo request')}<p class="muted" role="status">This preview saves the request on this device.</p></form>
    <h2>Frequently asked questions</h2>
    <details><summary>Can I try Bodega without an account?</summary><p>Yes. <a href="#demo">Try the interactive demo</a> with sample order data.</p></details>
    <details><summary>Can I use Bodega on a handheld?</summary><p>The picking flow is designed for handhelds, with large buttons and clear bin locations.</p></details>
  </section>`;
}
function login() {
  return `<main class="login"><section class="login-story"><a href="#home">Bodega</a><div>${pill('WAREHOUSE MANAGEMENT','sky')}<h1>A clearer shift.<br>Starts here.</h1>
    <p class="muted">One trusted view of every item,<br>every bin, and every next step.</p>
    <div class="login-stats">${label('Your shift, at a glance','sky')}<div class="metric-grid"><div><strong>24</strong><span class="muted">open orders</span></div><div><strong>18</strong><span class="muted">ready to ship</span></div></div><span class="green">✓ Current locations. Fewer empty-bin trips.</span></div></div>
    <small>Designed for warehouses in the Philippines.</small></section>
    <section class="login-form"><div>${label('Welcome back','sky')}<h1>Sign in to your shift.</h1><p class="muted">Use your Employee ID and assigned role.</p>
      <form data-form="login">${input('id','Employee ID',state.loginId,`required spellcheck="false" ${state.loginError ? 'aria-invalid="true" aria-describedby="login-error"' : ''}`)}
      ${state.loginError ? '<small class="field-error" id="login-error" role="alert">Enter a valid Employee ID, for example EMP-1042.</small>' : ''}
      ${select('role','Your role',roles,state.warehouseRole)}${submit('Sign in →')}</form>
      <div class="login-hint"><p>Your role opens the right home screen.</p><p>Picker → Picking · Supervisor → Overview</p><p>Inventory → Stock · Manager → Reports</p></div></div>
      <div class="login-foot"><p>EN / Filipino Need access? Contact your admin.</p><p>Sessions lock after 15 minutes of inactivity.</p></div>
    </section></main>`;
}
function overview() {
  const firstName = state.employee?.name.split(' ')[0] || 'Maria';
  const ready = truckReady(0);
  return layout('Overview','overview',heading(`Good afternoon, ${escape(firstName)}.`,'Friday, 23 October · Valenzuela warehouse') + metricCards(overviewMetrics) + `
    <div class="stack"><div class="columns">
      <section class="panel"><h2>Needs attention</h2><p class="muted">Act now to keep the afternoon shift moving.</p>
      <p style="margin-top:16px">${ready ? pill('✓ Load ready','green') : pill('! Dispatch risk','amber')}</p>
      <h3 style="margin:6px 0 12px">2GO · Truck 02 leaves at 3:00 PM</h3><p class="muted">${ready ? 'All assigned orders are picked.' : 'Picking is still in progress.'}</p>${link('View shipping →','shipping')}</section>
      <section class="panel"><h2>Receiving today</h2><p class="muted">Next delivery · Dock 01</p><p class="big-code">PO-1042</p><p class="muted">Metro Supply · 3 product lines</p>${link('Receive delivery →','receiving','primary wide')}</section>
    </div><section class="panel"><h2>Recent stock movements</h2><p class="muted">Every move includes a user, time, and destination.</p>
    <h3 style="margin:16px 0">SKU-204 Carton tape ${escape(state.move?.from || 'A-04-2')} → ${escape(tapeBin())}</h3><p class="muted">Joel R. · 2:12 PM Recorded by bin scan</p></section></div>`);
}

const deliveries = [
  ['PO-1042','Metro Supply','Dock 01 · Arrived 2:00 PM'],
  ['PO-1043','Pacific Packaging','Dock 03 · Due 3:30 PM'],
  ['PO-1044','Northstar Distribution','Dock 02 · Due 4:00 PM']
];
const truckList = [
  ['2GO · Truck 02','Dock 02 · 3:00 PM'],
  ['J&T · Truck 04','Dock 03 · 4:30 PM'],
  ['LBC · Truck 01','Dock 01 · 5:00 PM']
];
function complete(section, title, headline, description, lines, controls) {
  return layout(title,section,`<section class="panel success-panel"><span class="status-icon" aria-hidden="true">✓</span>
    <h1>${headline}</h1><p class="muted">${description}</p>
    <div class="stack muted" style="gap:6px;margin-top:20px">${lines.map(line => `<p>${line}</p>`).join('')}</div>${actions(controls,'split')}</section>`);
}
function receiving() {
  const [id,company] = deliveries[state.delivery];
  return layout('Receiving','receiving',heading('Receive with confidence.','Check what arrived before it goes on the shelf.') + `
    <div class="columns reverse"><section class="panel"><h2>Expected deliveries</h2><p class="muted">Today · 4 deliveries</p>
    ${deliveries.map(([number,supplier,dock],i) => `<button type="button" class="list-select ${i === state.delivery ? 'active' : ''}" data-action="delivery" data-value="${i}" aria-pressed="${i === state.delivery}"><strong>${number}</strong>${supplier}<small>${state.received[number] ? '✓ Received' : dock}</small></button>`).join('')}</section>
    <form class="panel table-panel" data-form="receipt"><h2>${id} · ${company}</h2><p class="muted">Count each item. We’ll suggest where it should go.</p>
    <table><thead><tr><th>Item</th><th>Expected</th><th>Received</th></tr></thead><tbody>
    ${products.slice(0,3).map((item,i) => `<tr><td><strong>${item.name}</strong><small>${item.sku} · Bin ${escape(productBin(i))}</small></td>
      <td>120</td><td><input aria-label="Received ${item.name}" type="number" min="0" max="99999" required name="qty-${i}" value="${state.receipt[i]}"></td></tr>`).join('')}
    </tbody></table><div class="notice" id="receipt-warning"${state.receipt.every(qty => qty === 120) ? ' hidden' : ''}>${receiptMessage()}</div>
    ${actions([submit('Review discrepancy →'),button('Save for later','save-receipt','secondary')],'split')}</form></div>
    <dialog id="receipt-dialog" class="modal" aria-labelledby="receipt-title"></dialog>`);
}
function receiptMessage() {
  const difference = state.receipt.reduce((sum,qty) => sum + Math.abs(120 - qty),0);
  return `! ${difference} units differ · Review before confirming`;
}
function receiptDialog() {
  const dialog = document.querySelector('#receipt-dialog');
  const i = state.receipt.findIndex(qty => qty !== 120);
  const amount = i < 0 ? 0 : Math.abs(120 - state.receipt[i]);
  const more = i >= 0 && state.receipt[i] > 120;
  dialog.innerHTML = `${pill(i < 0 ? '✓ Counts match' : '! Quantity difference', i < 0 ? 'green' : 'amber')}
    <h2 id="receipt-title">${i < 0 ? 'Confirm this delivery.' : amount + ' units ' + (more ? 'more' : 'fewer') + ' than expected.'}</h2>
    <p class="muted">${deliveries[state.delivery][0]} · ${deliveries[state.delivery][1]}${i < 0 ? '' : ' · ' + products[i].name}</p>
    ${i < 0 ? '' : `<div class="field-grid" style="margin-top:20px"><div class="panel">${label('Expected')}<strong>120 units</strong></div><div class="panel">${label('Received')}<strong class="amber">${state.receipt[i]} units</strong></div></div>`}
    <p class="note">Confirming saves the received quantities and logs any discrepancy.</p>
    ${actions([button('Back to count','close-dialog','secondary'),button(i < 0 ? 'Confirm receipt' : `Confirm ${state.receipt[i]} received`,'confirm-receipt')],'split')}`;
  dialog.showModal();
}
function received() {
  const [id,company] = deliveries[state.delivery];
  const counts = state.received[id] || state.receipt;
  const description = counts.every(qty => qty === 120) ? 'All counts verified.' : 'Discrepancy recorded for review.';
  return complete('receiving','Receiving / Delivery received','Delivery received. Ready to put away.',`${id} · ${company} · ${description}`,
    products.slice(0,3).map((item,i) => `${item.name} · ${counts[i]} units → ${escape(productBin(i))}`),
    [link('View updated inventory →','inventory'),link('Receive another delivery','receiving','secondary')]);
}
const filterNames = [['all','All stock 126'],['in','In stock 121'],['low','Low stock'],['out','Out of stock']];
function inventoryRows() {
  const query = state.inventoryQuery.trim().toLowerCase();
  return products.map((item,i) => {
    const stock = productStock(i), bin = productBin(i);
    const kind = stock === 0 ? 'out' : stock < 24 ? 'low' : 'in';
    if (state.inventoryFilter !== 'all' && state.inventoryFilter !== kind) return '';
    if (state.zone !== 'All zones' && bin[0] !== state.zone.slice(-1)) return '';
    if (!`${item.name} ${item.sku} ${bin}`.toLowerCase().includes(query)) return '';
    const [statusText,color] = {in:['✓ In stock','green'],low:['! Low stock','amber'],out:['× Out of stock','red']}[kind];
    return `<tr><td><strong>${item.name}</strong><small>${item.sku}</small></td><td><strong>${escape(bin)}</strong></td><td><strong>${stock}</strong></td>
      <td>${pill(statusText,color)}</td><td>${kind === 'in' ? inline('View →','item-view',i) : inline('Reorder →','reorder',i)}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="muted">No matching stock.</td></tr>';
}
function inventory() {
  const last = state.move ? `Carton tape · ${escape(state.move.from)} → ${escape(state.move.to)} · Current shift` : 'Carton tape · A-04-2 → B-11-1 · Joel R. · 2:12 PM';
  return layout('Inventory & bin management','inventory',
    heading('Know what’s on the shelf.','Search, move, and replenish stock from one place.',[link('Cycle count','cycle','secondary'),link('Scan to move →','move')]) + `
    <div class="field-grid search">${input('inventoryQuery','',state.inventoryQuery,'type="search" aria-label="Search stock" placeholder="⌕ Search item, SKU, or bin location"')}
      ${select('zone','',['All zones','Zone A','Zone B','Zone C','Zone D'],state.zone)}</div>
    <div class="tabs" aria-label="Filter stock">${filterNames.map(([id,text]) => `<button type="button" data-action="inventory-filter" data-value="${id}" aria-pressed="${id === state.inventoryFilter}">${text}</button>`).join('')}</div>
    <section class="panel table-panel"><table><thead><tr><th>Item / SKU</th><th>Bin</th><th>On hand</th><th>Status</th><th><span class="visually-hidden">Action</span></th></tr></thead>
    <tbody id="inventory-rows">${inventoryRows()}</tbody></table></section>
    ${note('Last movement: ' + last)}
    ${state.reorder !== null ? `<div class="notice success" role="status"><div><strong>✓ Reorder placed</strong><p>${products[state.reorder].name} · 120 units · Reorder can be cancelled before fulfilment.</p></div>${button('Undo','undo-reorder','secondary compact')}</div>` : ''}
    <dialog id="item-dialog" class="modal" aria-labelledby="item-title"></dialog>`);
}
function move() {
  const draft = {from:'A-04-2', sku:'SKU-204',to:'B-11-1',qty:24};
  return layout('Inventory / Scan to move','inventory',heading('Record the move as it happens.','Scan the source, item, and destination in that order.') + `
    <div class="columns"><form class="panel stack" data-form="move"><div><h2>Scan to move</h2><p class="muted">Use a handheld scanner or enter the barcode.</p></div>
    ${input('from','1 · Source bin',draft.from,'required pattern="[A-Za-z]-[0-9]{2}-[0-9]"')}
    ${input('sku','2 · Item barcode / SKU',draft.sku,'required pattern="SKU-204" title="Use SKU-204 for Carton tape in this demo"')}
    ${input('to','3 · Destination bin',draft.to,'required pattern="[A-Za-z]-[0-9]{2}-[0-9]"')}
    <div class="field-grid">${input('qty','Quantity to move',draft.qty,'required type="number" min="1" max="99999"')}${submit('Confirm stock move →')}</div>
    <p class="field-error" role="alert" hidden id="move-error">Choose a different destination bin.</p></form>
    <div><section class="panel"><h2>Movement summary</h2><p class="muted">Check the destination before saving.</p>
    <p class="big-code" id="move-bins">${escape(draft.from)} → ${escape(draft.to)}</p><p class="muted" id="move-units">${draft.qty} units · Carton tape</p>
    <p class="muted">Recorded by ${escape(state.employee?.name || 'Maria Santos')}<br>Time added on confirmation</p></section>
    <section class="move-summary">${label('When Wi-Fi drops','sky')}<p><strong>Move saved on this device.</strong></p><p class="muted">Syncs when you reconnect.</p><p class="sky">◷ 1 move waiting to sync</p></section></div></div>`);
}
function moved() {
  const data = state.move || {qty:24,from:'A-04-2',to:'B-11-1'};
  return complete('inventory','Inventory / Move recorded','The record moved with the stock.',`${data.qty} units of Carton tape · SKU-204`,
    [`Source: ${escape(data.from)} → Destination: ${escape(data.to)}`,`Recorded by ${escape(state.employee?.name || 'Maria Santos')} · Current shift`,'✓ Pickers can now see the updated bin.'],
    [link('Back to inventory →','inventory'),link('Record another move','move','secondary')]);
}
function diffBadge(count, recorded) {
  const difference = count - recorded;
  return difference === 0 ? pill('✓ Match','green') : pill(`! ${difference > 0 ? '+' : '−'}${Math.abs(difference)} units`,'amber');
}
function cycle() {
  return layout('Inventory / Cycle count','inventory',heading('Keep the count trustworthy.','Zone A · Cycle count · Compare recorded and physical stock.') + `
    <form class="stack" data-form="cycle"><div class="field-grid">
      ${select('countZone','Count zone',['Zone A — General stock'],'Zone A — General stock')}
      ${select('assignee','Assigned employee',state.employees.map(item => item.name),state.employee?.name || 'Maria Santos')}
    </div><section class="panel table-panel"><h2>Count sheet</h2><p class="muted">Differences are reviewed before stock is adjusted.</p>
    <table><thead><tr><th>Item / bin</th><th>Recorded</th><th>Counted</th><th>Difference</th></tr></thead><tbody>
    <tr><td><strong>Packing cartons</strong> A-01-1</td><td>${state.cycle}</td><td><input aria-label="Packing cartons counted" name="adjust" type="number" min="0" max="99999" required value="${state.adjust}"></td><td id="diff-0">${diffBadge(state.adjust,state.cycle)}</td></tr>
    <tr><td><strong>Carton tape</strong> A-04-2</td><td>${state.tapeCount}</td><td><input aria-label="Carton tape counted" name="adjustTape" type="number" min="0" max="99999" required value="${state.adjustTape}"></td><td id="diff-1">${diffBadge(state.adjustTape,state.tapeCount)}</td></tr>
    </tbody></table>
    ${actions([submit(reviewLabel()),button('Save progress','save-cycle','secondary')],'split')}</section></form>
    ${note('The approved adjustment is logged with the user, time, and reason.')}`);
}
const reviewLabel = () => {
  const changes = Number(state.adjust !== state.cycle) + Number(state.adjustTape !== state.tapeCount);
  return changes ? `Review ${changes} adjustment${changes === 1 ? '' : 's'} →` : 'Review count →';
};
function cycleReview() {
  return layout('Inventory / Review cycle count','inventory',heading('Review the adjustment.','Zone A · Cycle count') + `
    <section class="panel confirm"><h2>Packing cartons · A-01-1</h2><p>Recorded: ${state.cycle} units</p>
    <p><strong>Counted: ${state.adjust} units</strong></p><p>${diffBadge(state.adjust,state.cycle)}</p>
    ${state.adjustTape !== state.tapeCount ? `<p>Carton tape · A-04-2 · ${state.tapeCount} recorded → ${state.adjustTape} counted</p>` : ''}
    <p>Confirming updates the count and records you as the reviewer.</p>
    ${actions([link('Cancel','cycle','secondary'),button('Confirm adjustment','confirm-cycle')],'split')}</section>`);
}
function cycleSaved() {
  const previous = state.previousCycle ?? 420;
  return complete('inventory','Inventory / Cycle count saved','Count reviewed. Stock corrected.','Zone A · Packing cartons · A-01-1',
    [`${previous} recorded → ${state.cycle} counted`,`Adjustment: ${state.cycle - previous} units`,'✓ Reviewer and time recorded in the movement history.'],[link('Back to inventory →','inventory')]);
}
function loadList(truck) {
  const checked = [['#4820 · Puregold','#4819 · Robinsons'],[],['#4818 · Robinsons']][truck];
  const orders = truckOrders(truck).map(order => ({
    title:`#${order.id} · ${order.customer}`,
    description:`${unitsPicked(order)} of ${unitsInOrder(order)} units picked`,
    ready:orderReady(order)
  }));
  return `${label('Load list')}${[...orders,...checked.map(title => ({title,description:'Packed and checked · Ready for loading',ready:true}))].map(row => {
    return `<div class="load-row"><div><h3>${escape(row.title)}</h3><p>${row.description}</p></div>
      ${pill(row.ready ? '✓ Ready' : '◷ Picking',row.ready ? 'green' : 'amber')}</div>`;
  }).join('')}`;
}
function shipping() {
  const [truck,dock] = truckList[state.truck], ready = truckReady(state.truck);
  const dispatched = state.dispatched.includes(state.truck);
  const control = dispatched ? pill('✓ Dispatched','green') : ready ? link('Dispatch truck →','dispatch','primary wide') : '<button class="btn wide" disabled>Dispatch truck 🔒</button>';
  return layout('Shipping & dispatch','shipping',heading('Ready when the truck is.','Check every order before releasing the load.') + `
    <div class="columns reverse"><section class="panel"><h2>Today’s trucks</h2><p class="muted">3 departures</p>
      ${truckList.map(([name,when],i) => `<button class="list-select ${i === state.truck ? 'active' : ''}" data-action="truck" data-value="${i}" aria-pressed="${i === state.truck}">
        <strong>${name}</strong><small>${when}</small><span style="display:block;margin-top:8px">${state.dispatched.includes(i) ? pill('✓ Dispatched','green') : truckReady(i) ? pill('✓ All orders ready','green') : pill('! Picking in progress','amber')}</span></button>`).join('')}
    </section><section class="panel"><h2>${truck}</h2><p class="muted" style="margin-bottom:20px">${dock} · Carrier ref. 2GO-1023</p>
    ${loadList(state.truck)}
    ${ready ? '<div class="notice success">✓ All orders ready</div>' : `<div class="notice">! Finish picking the assigned orders before dispatch. <a href="#picking">Open picking →</a></div>`}
    ${actions([control],'split')}</section></div>`);
}
function shippingReady() {
  state.truck = 0;
  if (!truckReady(0)) return shipping();
  return layout('Shipping & dispatch','shipping',heading('Every order is ready.','2GO · Truck 02 · Dock 02 · Departure 3:00 PM') + `
    <section class="panel">${loadList(0)}</section><div class="notice success">✓ All 3 orders ready</div>
    <div style="margin-top:22px">${state.dispatched.includes(0) ? pill('✓ Dispatched','green') : link('Dispatch truck →','dispatch','primary wide')}</div>`);
}
function dispatch() {
  if (!truckReady(state.truck) || state.dispatched.includes(state.truck)) return shipping();
  const [truck,dock] = truckList[state.truck];
  return layout('Shipping / Dispatch confirmation','shipping',heading('Every order is ready.',`${truck} · ${dock}`) + `
    ${pill('✓ All orders packed and checked','green')}
    <section class="panel confirm"><h2>Dispatch ${truck}?</h2><p>${state.truck === 0 ? '3 orders · 8 cartons · ' : ''}${dock.split(' · ')[0]}</p>
    <p><strong>This records the truck as dispatched.</strong></p><p>You cannot undo dispatch after the truck leaves.</p><p>Confirm only after the load has been checked.</p>
    ${actions([link('Cancel',state.truck === 0 ? 'shipping-ready' : 'shipping','secondary'),button('Confirm dispatch →','confirm-dispatch')],'split')}</section>`);
}
function dispatched() {
  const [truck,dock] = truckList[state.truck];
  return complete('shipping','Shipping / Dispatch recorded','Truck dispatched. Shift moving forward.',`${truck} · ${dock.split(' · ')[0]}`,
    [state.truck === 0 ? '3 orders · 8 cartons · Load checked' : 'Load checked','Departure recorded in dispatch history.','Dispatch is final. Continue with the next truck.'],
    [link('Back to overview →','overview'),link('View trucks','shipping','secondary')]);
}

function reports() {
  return layout('Reports & alerts','reports',heading('Better shifts, backed by numbers.','Review performance and act on exceptions early.',[button('Export report ↓','export')]) +
    metricCards([['Pick accuracy','99.2%','↑ 1.4 points vs last week'],['On-time dispatch','96.8%','↑ 3.2 points vs last week'],['Stock accuracy','98.6%','↑ 0.8 points vs last week']]) + `
    <div class="stack"><div class="columns">
    <section class="panel"><h2>Fewer empty-bin trips</h2><p class="muted">Illustrative data · ${escape(state.week)}</p><p class="big-code">13 <small class="green" style="font-size:13px">↓ 86% from Monday</small></p>
    <div class="chart" role="img" aria-label="Empty-bin trips fell over the week from thirteen to two">
      ${[13,11,8,6,5,3,2].map((value,i) => `<div><span style="height:${value / 13 * 86}%"></span>${'MTWTFSS'[i]}</div>`).join('')}
    </div></section>
    <section class="panel"><h2>Alerts to review</h2><p class="muted">Stock and exceptions</p><div style="margin:18px 0">${pill('! 3 low-stock items','amber')}</div>
    <h3>Carton tape · 18 remaining</h3><p class="muted">Reorder point: 24 units</p>${link('Review stock →','inventory','primary wide')}</section>
    </div><section class="panel actions" style="justify-content:space-between"><div><h2>Make every shift a little better.</h2><p class="muted">Export the current view as CSV.</p></div>
    <div class="report-period">${select('week','',['This week','Last week'],state.week)}</div></section></div>`);
}
function exportReady() {
  return complete('reports','Reports / Export ready','Your report is ready.',`CSV export preview · ${escape(state.week)} · All zones`,
    ['Pick accuracy: 99.2%','On-time dispatch: 96.8% · Stock accuracy: 98.6%','Empty-bin trips: 13 · Sample report data'],[link('Back to reports →','reports')]);
}
function accountRows() {
  const query = state.accountQuery.trim().toLowerCase();
  return state.employees.map((person,i) => {
    if (!`${person.name} ${person.id}`.toLowerCase().includes(query)) return '';
    return `<tr><td><strong>${escape(person.name)}</strong><small>${escape(person.id)}</small></td><td>${escape(person.role)}</td>
      <td>${person.status === 'Active' ? pill('✓ Active','green') : pill('× Inactive','red')}</td><td>${inline('Edit','edit-employee',i)}</td></tr>`;
  }).join('') || '<tr><td colspan="4" class="muted">No matching employees.</td></tr>';
}
function accounts() {
  return layout('Login & accounts / Manage users','accounts',heading('The right access for every role.','Manage warehouse accounts and assigned permissions.',[link('Add employee +','employee-add')]) + `
    <div class="stack">${input('accountQuery','',state.accountQuery,'aria-label="Find an employee" type="search" placeholder="⌕ Find an employee by name or ID"')}
    <section class="panel table-panel"><h2>Employee accounts</h2><p class="muted">Role access is assigned by an administrator.</p>
      <table><thead><tr><th>Employee</th><th>Role</th><th>Account</th><th><span class="visually-hidden">Action</span></th></tr></thead><tbody id="account-rows">${accountRows()}</tbody></table>
    </section></div>${note('Deactivate access, change an assigned role, or add a new employee from this screen.')}`);
}
function employeeForm(edit) {
  const nextId = Math.max(1045,...state.employees.map(item => Number(item.id.slice(4)) || 0)) + 1;
  const employee = edit ? state.employees[state.editIndex ?? 0] : {name:'New employee',id:`EMP-${nextId}`,role:roles[0],status:'Active'};
  return layout(`User accounts / ${edit ? 'Edit employee' : 'Add employee'}`,'accounts',
    heading(edit ? 'Edit employee details.' : 'Add an employee.','Set the employee’s ID, role, and warehouse access.') + `
    <form class="panel stack" data-form="employee" data-edit="${edit}"><div class="field-grid">
      ${input('name','Full name',employee.name,'required maxlength="80"')}
      ${input('id','Employee ID',employee.id,'required pattern="EMP-[0-9]{4}" maxlength="8" title="Use a format such as EMP-1042"')}
      ${select('role','Assigned role',roles,employee.role)}${select('status','Account status',['Active','Inactive'],employee.status)}
    </div><div class="panel" style="background:#19191d"><h2>Role permissions</h2><p class="muted">The assigned role opens the appropriate home screen.</p><p class="muted">Changes apply to this employee account.</p></div>
    <p class="field-error" id="employee-error" role="alert" hidden>That employee ID is already in use.</p>
    ${actions([submit('Save employee'),link('Cancel','accounts','secondary')],'split')}</form>`);
}
function accountSaved() {
  return complete('accounts','User accounts / Changes saved','Employee details saved.','The account is ready for the assigned role.',
    ['✓ Employee ID recorded','✓ Role and access settings saved','These are sample employee records.'],[link('Back to user accounts →','accounts')]);
}

const pickOrders = () => state.pickMode === 'workspace' ? 'picking' : 'demo';
const activeOrder = () => orderById(state.activeOrderId);
const pickProgress = order => Math.round(100 * unitsPicked(order) / unitsInOrder(order));

function pickingItem(order,line) {
  const product = products[line.product];
  const currentBin = productBin(line.product);
  const seenAtCurrentBin = line.startBin && order.picks.some(pick => pick.product === line.product && pick.bin === currentBin);
  const updated = state.pickView === 'updated' || seenAtCurrentBin;
  const bin = updated ? currentBin : line.startBin || currentBin;
  const next = order.lines[order.lines.indexOf(line) + 1];
  return {...product,bin,currentBin,updated,
    item:order.lines.indexOf(line) + 1,
    remaining:line.quantity - pickedFor(order,line.product),
    next:next ? next.startBin || productBin(next.product) : 'Packing'
  };
}
function pickQuantity(item) {
  return `<form id="pick-quantity" data-form="pick" class="pick-quantity">
    <label for="pick-qty" class="eyebrow">Quantity to pick · ${item.remaining} remaining</label>
    <div><input id="pick-qty" name="pickQty" aria-label="Quantity picked" type="number" min="1" max="${item.remaining}" step="1" value="${item.remaining}" required><span>units</span></div>
  </form>`;
}
function pickActions(item) {
  return [`<button class="btn primary" type="submit" form="pick-quantity" id="submit-pick">✓ Picked ${item.remaining}</button>`,
    button('Not at this bin','empty-bin','secondary')];
}
function handheld(order) {
  const line = remainingLine(order);
  const item = line ? pickingItem(order,line) : null;
  const progress = pickProgress(order);
  const orderNumber = `Order #${order.id}`;
  const progressBar = `<div class="progress" role="progressbar" aria-label="Units picked" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div>`;
  const workspaceHeading = () => heading('One item. One clear next step.',
    [orderNumber,order.customer,order.departure ? `Departure ${order.departure}` : ''].filter(Boolean).map(escape).join(' · '));
  const undo = !orderLocked(order) && order.picks.length ? inline('↶ Undo last pick','undo-pick') : '';
  let content;
  if (!item) {
    content = `<div class="finish"><div class="status-icon" aria-hidden="true">✓</div><h2>Picked. And accounted for.</h2><p class="muted">${escape(orderNumber)} ${orderLocked(order) ? 'has been dispatched.' : 'is ready for packing.'}</p></div>
    <section class="panel">${label('Order summary')}<h3>${order.lines.length} item${order.lines.length === 1 ? '' : 's'} · ${unitsPicked(order)} units picked</h3>
      ${order.lines.map(({product,quantity}) => `<p class="muted">${products[product].name} · ${quantity} picked</p>`).join('')}</section>
    ${order.truck != null ? inline('Supervisor view: Shipping →','view-shipping') : ''}
    <div class="stack">${link('Back to orders →',pickOrders())}${undo}</div>`;
  } else if (state.pickView === 'moved') {
    content = `${label(`Empty bin · ${orderNumber}`,'amber')}<h2 style="margin-top:18px">The stock moved.</h2><p class="muted">Here’s the latest recorded location.</p>
    <section class="panel" style="background:#2e2518">${label('Last recorded move','amber')}<p class="amber">${escape(item.bin)} →</p>
    <strong style="font-size:46px">${escape(item.currentBin)}</strong><p class="amber">${item.name} · ${item.remaining} units remaining</p></section>
    <div class="stack">${button(`Go to ${item.currentBin} →`,'updated-bin')}${button('Not there either','flag-bin','secondary')}</div>
    ${note('No record? Flag the bin for your supervisor.')}`;
  } else if (state.pickView === 'flagged') {
    content = `<div class="finish"><div class="status-icon amber" aria-hidden="true">!</div><h2>We’ve flagged this bin.</h2><p class="muted">${escape(item.bin)} · ${item.name}</p></div>
    <section class="panel">${label('No verified location','amber')}<h3>Keep the order open.</h3><p class="muted" style="margin-top:12px">Do not confirm a pick you haven’t made.</p></section>
    <div class="stack">${button('Back to the item','back-to-item')}${link('Return to orders',pickOrders(),'secondary')}</div>`;
  } else {
    if (state.pickMode === 'workspace') {
      return layout('Picking & packing','picking',workspaceHeading() + progressBar + `
      ${label(`Item ${item.item} of ${order.lines.length} · Go to bin`,'sky')}
      <section class="panel pick-panel">
      <div class="quantity">${pickQuantity(item)}</div>
      ${label('Bin location')}<h1 class="bin">${escape(item.bin)}</h1><h2>${item.name} · ${item.spec}</h2>
      <p class="muted">${item.sku} · Scan the bin label to verify your location</p>${actions(pickActions(item),'split')}</section>
      <div style="margin-top:22px">${actions([undo,`<a href="#picking">‹ Back to assigned orders</a>`,`<small>Next: ${escape(item.next)}</small>`])}</div>`);
    }
    content = `${label(`${orderNumber} · Item ${item.item} of ${order.lines.length}`,'sky')}
    <div style="margin-top:24px">${label(item.updated ? 'Go to the updated bin' : 'Go to bin')}</div>
    <h1 class="bin">${escape(item.bin)}</h1><h2>${item.name}</h2><p class="muted" style="font-size:13px">${item.sku} · ${item.spec}</p>
    <div class="panel">${pickQuantity(item)}</div>
    <p class="${item.updated ? 'green' : 'muted'}" style="font-size:12px">${item.updated ? '✓ Location updated from move history' : 'Enter the quantity you actually picked.'}</p>
    <div class="stack">${pickActions(item).join('')}</div>
    ${actions([undo,`<small>Next: ${escape(item.next)}</small>`])}`;
  }
  if (state.pickMode === 'workspace') {
    return layout('Picking & packing','picking',workspaceHeading() + progressBar + `
      <section class="handmain pick-result">${content}</section>
      <a href="#picking">‹ Back to assigned orders</a>`);
  }
  return `<div class="handheld"><div class="pick-site-bar">${siteBar('demo')}</div>
    <header class="handhead"><a href="#home">Bodega</a><div><a href="#demo">‹ Orders</a><small>● Up to date</small></div></header>
    <main class="handmain"><div class="pick-desktop-nav"><a href="#demo">‹ Orders</a>${status()}</div>${progressBar}${content}</main>
    <nav class="handnav" aria-label="Warehouse modules">${[['overview','Home'],['receiving','Receive'],['inventory','Stock'],[pickOrders(),'Pick'],['shipping','Ship'],['reports','Reports']].map(([target,text]) => `<a href="#${target}"${markCurrent(text === 'Pick')}>${uiIcon(text === 'Pick' ? 'picking' : text === 'Home' ? 'home' : target)}${text}</a>`).join('')}</nav></div>`;
}

const routes = {
  demo:orderList, modules:modulesPage, 'module-list':modulesPage, login, overview, receiving, received, inventory,
  move, moved, cycle, 'cycle-review':cycleReview, 'cycle-saved':cycleSaved, picking:() => orderList(true),
  pick:handheld, 'order-new':orderForm, 'order-edit':orderForm,
  shipping, 'shipping-ready':shippingReady, dispatch, dispatched, reports, 'export-ready':exportReady,
  accounts, 'employee-add':() => employeeForm(false), 'employee-edit':() => employeeForm(true), 'account-saved':accountSaved
};
let current = '';
function render(resetScroll = true) {
  const [route,detail,context] = location.hash.slice(1).split('/');
  current = route || 'home';
  const mode = (current === 'order-new' ? detail : context) === 'workspace' ? 'workspace' : 'demo';
  const isLanding = ['home','story','request-demo'].includes(current) || !Object.hasOwn(routes,current);
  document.body.classList.toggle('landing',isLanding);
  if (isLanding) {
    app.innerHTML = landing;
    if (current === 'story' || current === 'request-demo') {
      const main = app.querySelector('main');
      main.replaceChildren(main.querySelector('#story'));
      main.insertAdjacentHTML('beforeend',requestForm());
      app.querySelector('[aria-current="page"]').removeAttribute('aria-current');
      app.querySelector('a[href="#story"]').setAttribute('aria-current','page');
    }
    app.querySelector('[data-action="theme"]').textContent = 'Theme: ' + ({auto:'Auto',dark:'Dark',light:'Light'}[document.documentElement.dataset.theme] || 'Auto');
  } else if (current === 'pick') {
    const order = orderById(detail || readSaved('last-order',state.orders[0]?.id));
    if (order) {
      if (state.activeOrderId !== order.id) state.pickView = 'item';
      state.activeOrderId = order.id;
      state.pickMode = mode;
      save('last-order',order.id);
      if (!detail) history.replaceState(null,'','#' + orderRoute('pick',order.id,mode));
      app.innerHTML = handheld(order);
    } else {
      app.innerHTML = orderList(mode === 'workspace');
    }
  } else if (current === 'order-new' || current === 'order-edit') {
    app.innerHTML = orderForm(current === 'order-edit' ? detail : null,mode);
  } else {
    app.innerHTML = routes[current]();
  }
  const pageTitle = app.querySelector('h1')?.textContent;
  document.title = isLanding ? 'Bodega — Warehouse Management System' : pageTitle ? `${pageTitle} | Bodega` : 'Bodega Workspace';
  if (!resetScroll) return;
  if (current === 'module-list' || current === 'request-demo') {
    requestAnimationFrame(() => document.getElementById(current)?.scrollIntoView());
  } else {
    window.scrollTo(0,0);
  }
}
function go(target) {
  if (location.hash === '#' + target) render();
  else location.hash = target;
}
function recordPick(quantity) {
  const order = activeOrder();
  const line = remainingLine(order);
  if (!line || orderLocked(order)) return;
  const item = pickingItem(order,line);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.remaining) return;
  updateOrder({...order,picks:[...order.picks,{product:line.product,quantity,bin:item.bin}]});
  if (quantity === item.remaining) state.pickView = 'item';
  render(quantity === item.remaining);
  if (quantity < item.remaining) app.querySelector('#pick-qty').focus();
}
function undoPick() {
  const order = activeOrder();
  if (!order.picks.length || orderLocked(order)) return;
  const last = order.picks.at(-1);
  const line = order.lines.find(item => item.product === last.product);
  updateOrder({...order,picks:order.picks.slice(0,-1)});
  state.pickView = line.startBin && last.bin === productBin(last.product) ? 'updated' : 'item';
  render();
}
function csv() {
  const lines = ['Metric,Value,Period','Pick accuracy,99.2%', 'On-time dispatch,96.8%', 'Stock accuracy,98.6%', 'Empty-bin trips,13'];
  const text = lines.map((line,i) => i ? line + ',' + state.week : line).join('\r\n');
  const url = URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  const download = document.createElement('a');
  download.href = url;
  download.download = 'bodega-report.csv';
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  go('export-ready');
}
const controls = {
  theme:() => {
    const themes = ['auto','dark','light'];
    const next = themes[(themes.indexOf(document.documentElement.dataset.theme) + 1) % themes.length];
    document.documentElement.dataset.theme = next;
    save('theme',next);
    app.querySelector('[data-action="theme"]').textContent = 'Theme: ' + next[0].toUpperCase() + next.slice(1);
  },
  'sign-out':() => { state.employee = null; state.loginError = false; go('login'); },
  'empty-bin':() => {
    const order = activeOrder();
    const item = pickingItem(order,remainingLine(order));
    state.returnPickView = state.pickView;
    state.pickView = item.bin !== item.currentBin ? 'moved' : 'flagged';
    render();
  },
  'updated-bin':() => { state.pickView = 'updated'; render(); },
  'flag-bin':() => { state.pickView = 'flagged'; render(); },
  'back-to-item':() => { state.pickView = state.returnPickView || 'item'; render(); },
  'undo-pick':undoPick,
  'view-shipping':() => {
    state.truck = activeOrder().truck;
    go(state.truck === 0 ? 'shipping-ready' : 'shipping');
  },
  delivery:value => {
    state.delivery = Number(value);
    const id = deliveries[state.delivery][0];
    state.receipt = [...(state.received[id] || readSaved('draft-' + id,state.delivery === 0 ? [120,116,120] : [120,120,120]))];
    render(false);
  },
  'save-receipt':() => {
    const form = app.querySelector('[data-form="receipt"]');
    if (form.reportValidity()) {
      save('draft-' + deliveries[state.delivery][0],state.receipt);
      flash(form,'✓ Delivery count saved for later.');
    }
  },
  'close-dialog':() => app.querySelector('dialog[open]')?.close(),
  'confirm-receipt':() => {
    state.received[deliveries[state.delivery][0]] = [...state.receipt];
    save('received',state.received);
    go('received');
  },
  'inventory-filter':value => {
    state.inventoryFilter = value;
    app.querySelectorAll('[data-action="inventory-filter"]').forEach(tab => tab.setAttribute('aria-pressed',String(tab.dataset.value === value)));
    app.querySelector('#inventory-rows').innerHTML = inventoryRows();
  },
  'item-view':value => {
    const i = Number(value), item = products[i], dialog = app.querySelector('#item-dialog');
    dialog.innerHTML = `<h2 id="item-title">${item.name}</h2><p class="muted">${item.sku}</p>
      <p class="big-code">${escape(productBin(i))}</p><p class="muted">${productStock(i)} units on hand</p>
      ${actions([button('Back to inventory','close-dialog','secondary')])}`;
    dialog.showModal();
  },
  reorder:value => { state.reorder = Number(value); render(false); },
  'undo-reorder':() => { state.reorder = null; render(false); },
  'save-cycle':() => {
    const form = app.querySelector('[data-form="cycle"]');
    if (form.reportValidity()) {
      save('count-draft',{cartons:state.adjust,tape:state.adjustTape});
      flash(form,'✓ Count progress saved.');
    }
  },
  'confirm-cycle':() => {
    state.previousCycle = state.cycle;
    state.cycle = state.adjust;
    state.tapeCount = state.adjustTape;
    save('cycle',state.cycle);
    save('tape-count',state.tapeCount);
    save('count-draft',null);
    go('cycle-saved');
  },
  truck:value => { state.truck = Number(value); render(false); },
  'confirm-dispatch':() => {
    if (state.dispatched.includes(state.truck) || !truckReady(state.truck)) return;
    state.dispatched.push(state.truck);
    save('dispatched',state.dispatched);
    go('dispatched');
  },
  export:csv,
  'edit-employee':value => { state.editIndex = Number(value); go('employee-edit'); }
};
const countDraft = readSaved('count-draft',null);
state.adjust = countDraft?.cartons ?? (state.cycle === 420 ? 418 : state.cycle);
state.tapeCount = readSaved('tape-count',0);
state.adjustTape = countDraft?.tape ?? state.tapeCount;
function flash(form,message) {
  let status = form.querySelector('[role="status"]');
  if (!status) {
    status = document.createElement('p');
    status.setAttribute('role','status');
    status.className = 'notice success';
    form.append(status);
  }
  status.textContent = message;
}
app.addEventListener('click',event => {
  const target = event.target.closest('[data-action]');
  if (!target || !Object.hasOwn(controls,target.dataset.action)) return;
  event.preventDefault();
  controls[target.dataset.action](target.dataset.value);
});
app.addEventListener('input',event => {
  const {name,value} = event.target;
  if (name === 'pickQty') {
    app.querySelector('#submit-pick').textContent = event.target.validity.valid ? `✓ Picked ${Number(value)}` : 'Confirm quantity';
  } else if (name === 'inventoryQuery' || name === 'zone') {
    state[name] = value;
    app.querySelector('#inventory-rows').innerHTML = inventoryRows();
  } else if (name === 'accountQuery') {
    state.accountQuery = value;
    app.querySelector('#account-rows').innerHTML = accountRows();
  } else if (name === 'week') {
    state.week = value;
    render(false);
  } else if (name === 'adjust' || name === 'adjustTape') {
    state[name] = Number(value);
    const cartons = name === 'adjust';
    app.querySelector(cartons ? '#diff-0' : '#diff-1').innerHTML = diffBadge(state[name],cartons ? state.cycle : state.tapeCount);
    event.target.form.querySelector('[type="submit"]').textContent = reviewLabel();
  } else if (name?.startsWith('qty-')) {
    state.receipt[Number(name.slice(4))] = Number(value);
    const warning = app.querySelector('#receipt-warning');
    warning.hidden = state.receipt.every(qty => qty === 120);
    warning.textContent = receiptMessage();
  } else if (event.target.form?.dataset.form === 'move') {
    const data = new FormData(event.target.form);
    document.querySelector('#move-bins').textContent = `${data.get('from')} → ${data.get('to')}`;
    document.querySelector('#move-units').textContent = `${data.get('qty')} units · Carton tape`;
  }
});
const forms = {
  pick:(_form,data) => recordPick(Number(data.get('pickQty'))),
  order:(form,data) => {
    const existing = orderById(form.dataset.id);
    const id = existing?.id || data.get('orderId').trim().toUpperCase();
    const customer = data.get('customer').trim();
    const lines = products.map((_,product) => ({
      ...existing?.lines.find(line => line.product === product),
      product,
      quantity:Number(data.get(`order-qty-${product}`))
    })).filter(line => line.quantity > 0);
    const error = form.querySelector('[role="alert"]');
    const message = existing?.picks.length || (existing && orderLocked(existing)) ? 'This order has already been picked.'
      : !existing && orderById(id) ? 'That order number is already in use.'
      : !customer ? 'Enter a customer name.'
      : !lines.length ? 'Enter a quantity for at least one item.'
      : '';
    if (message) {
      error.hidden = false;
      error.textContent = message;
      return;
    }
    updateOrder({...existing,id,customer,lines,picks:[]});
    go(form.dataset.mode === 'workspace' ? 'picking' : 'demo');
  },
  login:(_form,data) => {
    state.loginId = data.get('id').trim().toUpperCase();
    state.warehouseRole = data.get('role');
    const person = state.employees.find(item => item.id === state.loginId && item.status === 'Active');
    state.loginError = !person;
    if (!person) {
      render(false);
      app.querySelector('[name="id"]').focus();
      return;
    }
    state.employee = person;
    go(['picking','overview','inventory','reports'][roles.indexOf(state.warehouseRole)]);
  },
  receipt:() => receiptDialog(),
  move:(_form,data) => {
    const from = data.get('from').toUpperCase(), to = data.get('to').toUpperCase();
    if (from === to) {
      app.querySelector('#move-error').hidden = false;
      return;
    }
    state.move = {from,to,qty:Number(data.get('qty'))};
    save('move',state.move);
    go('moved');
  },
  cycle:() => go('cycle-review'),
  employee:(form,data) => {
    const editing = form.dataset.edit === 'true', index = editing ? (state.editIndex ?? 0) : state.employees.length;
    const id = data.get('id').toUpperCase();
    if (state.employees.some((item,i) => i !== index && item.id === id)) {
      app.querySelector('#employee-error').hidden = false;
      return;
    }
    const nameField = form.elements.name;
    const name = nameField.value.trim();
    if (!name) { nameField.focus(); return; }
    state.employees[index] = {name,id,role:data.get('role'),status:data.get('status')};
    save('employees',state.employees);
    go('account-saved');
  },
  request:(form,data) => {
    save('demo-request',Object.fromEntries(data));
    form.reset();
    flash(form,'Demo request saved on this device.');
  }
};
app.addEventListener('submit',event => {
  const form = event.target;
  if (!Object.hasOwn(forms,form.dataset.form)) return;
  event.preventDefault();
  forms[form.dataset.form](form,new FormData(form));
});
window.addEventListener('hashchange',() => render());
window.addEventListener('storage',event => {
  if (event.key === 'bodega-orders') {
    state.orders = readSaved('orders',initialOrders);
    state.pickView = 'item';
    if (['demo','picking','pick'].includes(current)) render(false);
  }
  if (event.key === 'bodega-dispatched') state.dispatched = readSaved('dispatched',[]);
});
render();



