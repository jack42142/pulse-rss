const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "pulse-rss-feeds-v1";
const state = { feeds: [], articles: [], view: "all", activeFeed: null, search: "" };
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const cleanText = html => { const node = document.createElement("div"); node.innerHTML = html || ""; return (node.textContent || "").replace(/\s+/g," ").trim(); };
const dateText = value => { if (!value) return "Không rõ ngày"; const date = new Date(value); return isNaN(date) ? "Không rõ ngày" : new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"short",year:"numeric"}).format(date); };
const load = () => { try { state.feeds = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { state.feeds = []; } };
const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.feeds));
const unread = article => !article.read;
function updateArticles() { state.articles = state.feeds.flatMap(feed => feed.items.map(item => ({...item, feedId:feed.id, read:!!feed.read?.includes(item.id), saved:!!feed.saved?.includes(item.id)}))).sort((a,b)=>new Date(b.pubDate||0)-new Date(a.pubDate||0)); }
function render() {
  updateArticles();
  $("allCount").textContent = state.articles.length;
  $("unreadCount").textContent = state.articles.filter(unread).length;
  $("feedList").innerHTML = state.feeds.length ? state.feeds.map(feed => `<div class="feed-row ${state.activeFeed===feed.id?"selected":""}" data-feed="${escapeHTML(feed.id)}"><span class="feed-favicon">${escapeHTML((feed.title||"R").slice(0,1).toUpperCase())}</span><span class="feed-name">${escapeHTML(feed.title)}</span><button class="feed-remove" data-remove="${escapeHTML(feed.id)}" title="Xóa nguồn">×</button></div>`).join("") : '<div class="empty-side">Chưa có nguồn RSS</div>';
  const titles = {all:"Tất cả bài viết",unread:"Chưa đọc",saved:"Đã lưu"};
  let heading = state.activeFeed ? state.feeds.find(f=>f.id===state.activeFeed)?.title || "Nguồn tin" : titles[state.view];
  $("pageTitle").textContent = heading; $("heading").innerHTML = `${escapeHTML(heading)}<span>.</span>`;
  $("subheading").textContent = state.activeFeed ? "Bài viết mới nhất từ nguồn bạn đã chọn." : "Mọi nội dung bạn quan tâm, trong một nơi.";
  let items = state.articles;
  if(state.activeFeed) items=items.filter(a=>a.feedId===state.activeFeed);
  else if(state.view==="unread") items=items.filter(unread);
  else if(state.view==="saved") items=items.filter(a=>a.saved);
  if(state.search) items=items.filter(a=>(a.title+" "+a.excerpt+" "+a.feedTitle).toLowerCase().includes(state.search.toLowerCase()));
  if($("sortSelect").value==="old") items=[...items].reverse();
  $("summary").textContent = items.length ? `${items.length} BÀI VIẾT · CẬP NHẬT TỪ ${new Set(items.map(a=>a.feedId)).size} NGUỒN` : "";
  $("articles").innerHTML = items.length ? items.map(a=>`<article class="article-card" data-open="${escapeHTML(a.id)}" data-feed-id="${escapeHTML(a.feedId)}"><div class="article-main"><div class="article-meta"><span class="source-dot"></span><b>${escapeHTML(a.feedTitle)}</b><span>·</span>${dateText(a.pubDate)}${a.read?"":" · <span style='color:#7568e9'>MỚI</span>"}</div><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(cleanText(a.excerpt||a.content).slice(0,260))}</p></div><div class="article-actions"><button class="save-btn ${a.saved?"saved":""}" data-save="${escapeHTML(a.id)}" data-feed-id="${escapeHTML(a.feedId)}" title="Lưu bài">${a.saved?"★":"☆"}</button></div></article>`).join("") : `<div class="welcome-empty"><div class="empty-icon">⌕</div><h2>${state.feeds.length?"Không tìm thấy bài viết":"Chào mừng đến với Pulse"}</h2><p>${state.feeds.length?"Thử từ khóa khác hoặc chọn mục khác.":"Thêm một nguồn RSS để bắt đầu đọc tin."}</p>${state.feeds.length?"":'<button class="primary-btn" id="emptyAddAgain">＋ Thêm nguồn RSS</button>'}</div>`;
}
function openAdd() { $("dialogError").textContent=""; $("feedUrl").value=""; $("addDialog").showModal(); setTimeout(()=>$("feedUrl").focus(),50); }
async function addFeed(url) {
  $("submitFeed").disabled=true; $("submitFeed").textContent="Đang tải…"; $("dialogError").textContent="";
  try {
    const response=await fetch("/api/parse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
    const data=await response.json(); if(!response.ok) throw new Error(data.error||"Không thể tải nguồn RSS.");
    if(state.feeds.some(f=>f.url===url)) throw new Error("Nguồn này đã có trong thư viện.");
    const feed={id:crypto.randomUUID(),url,title:data.title,description:data.description,site:data.site,items:data.items,read:[],saved:[],updatedAt:new Date().toISOString()};
    state.feeds.unshift(feed); persist(); state.activeFeed=feed.id; state.view="all"; $("addDialog").close(); render();
  } catch(err) { $("dialogError").textContent=err.message; }
  finally { $("submitFeed").disabled=false; $("submitFeed").innerHTML='Thêm nguồn <span>→</span>'; }
}
function openArticle(id,feedId) {
  const feed=state.feeds.find(f=>f.id===feedId), item=feed?.items.find(i=>i.id===id); if(!item)return;
  if(!feed.read.includes(id)) feed.read.push(id); persist(); render();
  $("readerContent").innerHTML=`<div class="eyebrow">${escapeHTML(item.feedTitle||feed.title)}</div><h1>${escapeHTML(item.title)}</h1><div class="reader-meta">${dateText(item.pubDate)} ${item.author?"· "+escapeHTML(item.author):""}</div><div class="reader-body">${item.content||escapeHTML(item.excerpt)||"<p>Không có nội dung xem trước.</p>"}</div>${item.link?`<a class="reader-link" href="${escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer">Đọc bài gốc trên trang nguồn ↗</a>`:""}`;
  $("readerDialog").showModal();
}
function refresh() {
  if(!state.feeds.length)return;
  $("refreshBtn").textContent="…";
  Promise.all(state.feeds.map(async feed=>{try{const r=await fetch("/api/parse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:feed.url})});const d=await r.json();if(r.ok){const known=new Set(feed.items.map(i=>i.id));feed.items=[...d.items.filter(i=>!known.has(i.id)),...feed.items].slice(0,100);feed.title=d.title;feed.updatedAt=new Date().toISOString();}}catch(e){console.warn("Refresh failed:",feed.url,e.message)}})).then(()=>{persist();render()}).finally(()=>$("refreshBtn").textContent="↻");
}
document.addEventListener("click",e=>{
  if(e.target.closest("#openAdd,#addSmall,#emptyAdd,#emptyAddAgain"))openAdd();
  const example=e.target.closest("[data-url]");if(example){openAdd();$("feedUrl").value=example.dataset.url;}
  const nav=e.target.closest("[data-view]");if(nav){state.view=nav.dataset.view;state.activeFeed=null;document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n===nav));render();}
  const feedRow=e.target.closest("[data-feed]");if(feedRow&&!e.target.closest("[data-remove]")){state.activeFeed=feedRow.dataset.feed;render();}
  const remove=e.target.closest("[data-remove]");if(remove){const f=state.feeds.find(x=>x.id===remove.dataset.remove);if(confirm(`Xóa nguồn "${f?.title}" khỏi thư viện?`)){state.feeds=state.feeds.filter(x=>x.id!==remove.dataset.remove);if(state.activeFeed===remove.dataset.remove)state.activeFeed=null;persist();render();}}
  const save=e.target.closest("[data-save]");if(save){e.stopPropagation();const f=state.feeds.find(x=>x.id===save.dataset.feedId);const id=save.dataset.save;f.saved=f.saved||[];f.saved.includes(id)?f.saved=f.saved.filter(x=>x!==id):f.saved.push(id);persist();render();}
  const article=e.target.closest("[data-open]");if(article&&!e.target.closest("[data-save]"))openArticle(article.dataset.open,article.dataset.feedId);
});
$("addForm").addEventListener("submit",e=>{e.preventDefault();const url=$("feedUrl").value.trim();if(url)addFeed(url);});
$("closeReader").addEventListener("click",()=>$("readerDialog").close());
$("refreshBtn").addEventListener("click",refresh);
$("searchInput").addEventListener("input",e=>{state.search=e.target.value;render();});
$("sortSelect").addEventListener("change",render);
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("searchInput").focus();}});
$("today").textContent=new Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
load();render();