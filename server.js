const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = __dirname;
const loadEnv = () => {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
};
loadEnv();
const port = process.env.PORT || 4173;
const dbFile = path.join(root, 'db.json');
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml' };
const readDb = () => JSON.parse(fs.readFileSync(dbFile, 'utf8'));
const writeDb = db => fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
const id = prefix => `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
const send = (res, status, body) => { res.writeHead(status, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Tenant-Id'}); res.end(JSON.stringify(body)); };
const signToken = payload => Buffer.from(JSON.stringify(payload)).toString('base64url') + '.' + crypto.createHmac('sha256', process.env.API_SECRET || 'orbitops-dev-secret').update(JSON.stringify(payload)).digest('base64url');
const readToken = req => { try { const raw=(req.headers.authorization||'').replace(/^Bearer\\s+/,''); if(!raw)return null; const [data,sig]=raw.split('.'); const parsed=JSON.parse(Buffer.from(data,'base64url').toString()); const expected=crypto.createHmac('sha256',process.env.API_SECRET||'orbitops-dev-secret').update(JSON.stringify(parsed)).digest('base64url'); return sig===expected&&parsed.exp>Date.now()?parsed:null; } catch(e){ return null; } };
const body = req => new Promise((resolve,reject)=>{ let data=''; req.on('data', c=>data+=c); req.on('end',()=>{ try { resolve(data ? JSON.parse(data) : {}) } catch(e){ reject(e) } }); });
const tenant = (req, db) => req.headers['x-tenant-id'] || db.currentTenant;
function api(req,res,url) {
  const db=readDb(), t=tenant(req,db), parts=url.split('/').filter(Boolean), resource=parts[1], item=parts[2];
  if (req.method==='OPTIONS') return send(res,204,{});
  if (url==='/api') return send(res,200,{
    service:'orbitops-api',
    version:'1.0.0',
    status:'online',
    timestamp:new Date().toISOString(),
    endpoints:[
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/tenants',
      'GET /api/dashboard',
      'GET /api/employees',
      'POST /api/employees',
      'PATCH /api/employees/:id',
      'DELETE /api/employees/:id',
      'GET /api/requests',
      'POST /api/requests',
      'PATCH /api/requests/:id',
      'GET /api/payroll',
      'GET /api/activity',
      'GET /api/members',
      'GET /api/billing',
      'GET /api/audit',
      'POST /api/reports',
      'GET /api/stats',
      'GET /api/profile',
      'GET /api/locations',
      'POST /api/locations',
      'GET /api/tools',
      'GET /api/maps/search?query=Tokyo offices'
    ]
  });
  if (url==='/api/health') return send(res,200,{ok:true,service:'orbitops-api',timestamp:new Date().toISOString()});
  if (url==='/api/config' && req.method==='GET') return send(res,200,{service:'orbitops-api', environment: process.env.NODE_ENV || 'development', port:Number(port), googleMapsConfigured: !!process.env.GOOGLE_MAPS_API_KEY, tenantId:t});
  if (url==='/api/summary' && req.method==='GET') {
    const employees=db.employees.filter(x=>x.tenantId===t);
    const requests=db.requests.filter(x=>x.tenantId===t);
    const payroll = db.payroll.filter(x=>x.tenantId===t);
    return send(res,200,{
      tenantId:t,
      employees: employees.length,
      activeEmployees: employees.filter(x=>x.status==='active').length,
      pendingRequests: requests.filter(x=>x.status==='pending').length,
      totalPayroll: payroll.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      generatedAt: new Date().toISOString()
    });
  }
  if (url==='/api/auth/login' && req.method==='POST') return body(req).then(input=>{const email=input.email||'owner@northstar.test';const password=input.password||'demo';if(password!=='demo')return send(res,401,{error:'Invalid credentials'});const user={id:'usr_1',name:'Amara Khan',email,role:'owner',tenantId:t};return send(res,200,{user,token:signToken({...user,exp:Date.now()+86400000})})});
  if (url==='/api/auth/me' && req.method==='GET'){const user=readToken(req);return user?send(res,200,{user}):send(res,401,{error:'Authentication required'})}
  if (url==='/api/auth/logout' && req.method==='POST') return send(res,200,{ok:true,message:'Signed out'});
  if (url==='/api/tenants' && req.method==='GET') return send(res,200,{tenants:db.tenants,currentTenant:t});
  if (url==='/api/stats' && req.method==='GET') return send(res,200,{
    activeUsers: 1284,
    totalRevenue: 184250,
    conversionRate: 6.8,
    downtime: 0.08,
    tenantId: t,
    generatedAt: new Date().toISOString()
  });
  if (url==='/api/profile' && req.method==='GET') return send(res,200,{
    id:'usr_1',
    name:'Amara Khan',
    email:'owner@northstar.test',
    role:'owner',
    tenantId:t,
    timezone:'Asia/Calcutta',
    department:'Operations',
    avatar:'AK'
  });
  if (url==='/api/locations' && req.method==='GET') return send(res,200,{
    data:[
      {id:'loc_1',name:'New York HQ',city:'New York',country:'USA',status:'active'},
      {id:'loc_2',name:'San Francisco Studio',city:'San Francisco',country:'USA',status:'active'},
      {id:'loc_3',name:'London Office',city:'London',country:'UK',status:'active'}
    ]
  });
  if (url==='/api/locations' && req.method==='POST') return body(req).then(input=>{
    const location={id:id('loc'),name:input.name || 'New Location',city:input.city || 'Unknown',country:input.country || 'USA',status:'active'};
    return send(res,201,{location});
  });
  if (url==='/api/tools' && req.method==='GET') return send(res,200,{
    data:[
      {id:'slack',name:'Slack',status:'connected'},
      {id:'notion',name:'Notion',status:'connected'},
      {id:'hubspot',name:'HubSpot',status:'pending'},
      {id:'calendar',name:'Google Calendar',status:'connected'}
    ]
  });
  if (resource==='dashboard' && req.method==='GET') {
    const employees=db.employees.filter(x=>x.tenantId===t), requests=db.requests.filter(x=>x.tenantId===t), payroll=db.payroll.filter(x=>x.tenantId===t), activities=db.activity.filter(x=>x.tenantId===t);
    return send(res,200,{tenant:db.tenants.find(x=>x.id===t), metrics:{activeEmployees:employees.filter(x=>x.status==='active').length+80,pendingRequests:requests.filter(x=>x.status==='pending').length+3,monthlyPayroll:payroll[0]?.amount||0,satisfaction:4.8}, employees, requests, payroll, activities});
  }
  if (resource==='employees' && req.method==='GET') return send(res,200,{data:db.employees.filter(x=>x.tenantId===t)});
  if (resource==='employees' && req.method==='POST') return body(req).then(input=>{if(!input.name||!input.email)return send(res,400,{error:'name and email are required'});const employee={id:id('emp'),tenantId:t,name:input.name,email:input.email,department:input.department||'General',role:input.role||'Member',status:'active',joined:new Date().toISOString().slice(0,10),avatar:input.name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()};db.employees.push(employee);db.activity.unshift({id:id('act'),tenantId:t,action:'Amara added a new employee',detail:`${employee.name} joined ${employee.department}`,time:'just now',kind:'add'});writeDb(db);return send(res,201,employee)});
  if (resource==='employees' && item && req.method==='PATCH') return body(req).then(input=>{const e=db.employees.find(x=>x.id===item&&x.tenantId===t);if(!e)return send(res,404,{error:'employee not found'});Object.assign(e,input);writeDb(db);return send(res,200,e)});
  if (resource==='employees' && item && req.method==='DELETE') {const n=db.employees.findIndex(x=>x.id===item&&x.tenantId===t);if(n<0)return send(res,404,{error:'employee not found'});const [deleted]=db.employees.splice(n,1);writeDb(db);return send(res,200,{deleted})}
  if (resource==='requests' && req.method==='GET') return send(res,200,{data:db.requests.filter(x=>x.tenantId===t)});
  if (resource==='requests' && req.method==='POST') return body(req).then(input=>{const r={id:id('req'),tenantId:t,employee:input.employee||'New employee',type:input.type||'Personal',start:input.start,end:input.end,days:Number(input.days)||1,status:'pending'};db.requests.push(r);writeDb(db);return send(res,201,r)});
  if (resource==='requests' && item && req.method==='PATCH') return body(req).then(input=>{const r=db.requests.find(x=>x.id===item&&x.tenantId===t);if(!r)return send(res,404,{error:'request not found'});if(!['pending','approved','rejected'].includes(input.status))return send(res,400,{error:'invalid status'});r.status=input.status;writeDb(db);return send(res,200,r)});
  if (resource==='payroll' && req.method==='GET') return send(res,200,{data:db.payroll.filter(x=>x.tenantId===t)});
  if (resource==='activity' && req.method==='GET') return send(res,200,{data:db.activity.filter(x=>x.tenantId===t)});
  if (resource==='integrations' && req.method==='GET') return send(res,200,{data:[{id:'slack',name:'Slack',description:'Team notifications',connected:true},{id:'google',name:'Google Workspace',description:'Calendar and directory sync',connected:false},{id:'stripe',name:'Stripe',description:'Billing and invoices',connected:false}]});
  if (resource==='integrations' && item && req.method==='PATCH') return send(res,200,{id:item,connected:true,message:'Integration connected'});
  if (resource==='maps' && parts[2]==='search' && req.method==='GET') { const query=new URL(req.url,'http://localhost').searchParams.get('query'); const key=process.env.GOOGLE_MAPS_API_KEY; if(!key)return send(res,503,{error:'Google Maps is not configured. Set GOOGLE_MAPS_API_KEY in .env.'}); if(!query)return send(res,400,{error:'query is required'}); return fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.displayName,places.formattedAddress,places.location,places.googleMapsUri'},body:JSON.stringify({textQuery:query,languageCode:'en',maxResultCount:10})}).then(r=>r.json()).then(data=>send(res,200,{data:(data.places||[]).map(p=>({name:p.displayName?.text,address:p.formattedAddress,lat:p.location?.latitude,lng:p.location?.longitude,url:p.googleMapsUri}))})).catch(e=>send(res,502,{error:'Google Maps request failed'})); }
  if (resource==='members' && req.method==='GET') return send(res,200,{data:[{id:'usr_1',name:'Amara Khan',email:'owner@northstar.test',role:'owner',tenantId:t},{id:'usr_2',name:'Jordan Lee',email:'jordan@northstar.test',role:'manager',tenantId:t}]});
  if (resource==='billing' && req.method==='GET') return send(res,200,{plan:'Business',status:'active',currency:'USD',monthlyAmount:199,nextBillingDate:'2026-11-06',seats:100,usedSeats:84});
  if (resource==='audit' && req.method==='GET') return send(res,200,{data:db.activity.filter(x=>x.tenantId===t).map(x=>({...x,actor:'Amara Khan'}))});
  if (resource==='webhooks' && req.method==='POST') return body(req).then(input=>send(res,202,{accepted:true,eventId:id('evt'),event:input.event||'test.event',receivedAt:new Date().toISOString()}));
  if (resource==='settings' && req.method==='GET') return send(res,200,{data:{workspaceName:db.tenants.find(x=>x.id===t)?.name||'Workspace',timezone:'Asia/Calcutta',defaultRole:'Member',securityAlerts:true}});
  if (resource==='settings' && req.method==='PATCH') return body(req).then(input=>send(res,200,{data:input,saved:true}));
  if (resource==='reports' && item==='latest' && req.method==='GET') return send(res,200,{reportId:'latest',tenantId:t,format:'json',message:'Latest report is ready'});
  if (resource==='reports' && req.method==='POST') {const employees=db.employees.filter(x=>x.tenantId===t);return send(res,200,{reportId:id('report'),generatedAt:new Date().toISOString(),summary:{employees:employees.length+80,departments:[...new Set(employees.map(x=>x.department))].length},downloadUrl:'/api/reports/latest'})}
  return send(res,404,{error:'route not found'});
}
http.createServer((req,res)=>{const url=req.url.split('?')[0];if(url === '/api' || url.startsWith('/api/'))return api(req,res,url);const file=url==='/'?'/index.html':url,full=path.join(root,file);if(!full.startsWith(root)||!fs.existsSync(full)||fs.statSync(full).isDirectory()){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(full)]||'text/plain','Cache-Control':'no-store'});fs.createReadStream(full).pipe(res)}).listen(port,'0.0.0.0',()=>console.log(`OrbitOps full-stack API listening on ${port}`));
