const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "pulse-rss-feeds-v1";
const state = {
  feeds: [],
  articles: [],
  view: "all",
  activeFeed: null,
  search: "",
  readingArticle: null
};

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const cleanText = (html) => {
  const node = document.createElement("div");
  node.innerHTML = html || "";
  return (node.textContent || "").replace(/\s+/g, " ").trim();
};

const sanitizeHTML = (html = "") => {
  const doc = new DOMParser().parseFromString(String(html), "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, style").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name) || (/^(href|src)$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value))) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === "A" && el.getAttribute("href")) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
};

const dateText = (value) => {
  if (!value) return "Không rõ ngày";
  const date = new Date(value);
  return isNaN(date)
    ? "Không rõ ngày"
    : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const load = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    state.feeds = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.feeds = [];
  }
};

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.feeds));
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

const unread = (article) => !article.read;

function openModalSafe(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeModalSafe(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    if (dialog.open) dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function updateArticles() {
  state.articles = state.feeds
    .flatMap((feed) =>
      (feed.items || []).map((item) => ({
        ...item,
        feedId: feed.id,
        feedTitle: item.feedTitle || feed.title,
        read: !!feed.read?.includes(item.id),
        saved: !!feed.saved?.includes(item.id)
      }))
    )
    .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
}

function getVisibleItems() {
  let items = state.articles;
  if (state.activeFeed) items = items.filter((a) => a.feedId === state.activeFeed);
  else if (state.view === "unread") items = items.filter(unread);
  else if (state.view === "saved") items = items.filter((a) => a.saved);

  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    items = items.filter((a) =>
      `${a.title || ""} ${cleanText(a.excerpt || a.content)} ${a.feedTitle || ""}`.toLowerCase().includes(q)
    );
  }

  if ($("sortSelect").value === "old") items = [...items].reverse();
  return items;
}

function render() {
  updateArticles();
  const totalUnread = state.articles.filter(unread).length;
  const totalSaved = state.articles.filter((a) => a.saved).length;

  $("allCount").textContent = state.articles.length;
  $("unreadCount").textContent = totalUnread;
  if ($("savedCount")) $("savedCount").textContent = totalSaved;

  $("feedList").innerHTML = state.feeds.length
    ? state.feeds
        .map((feed) => {
          const feedUnread = (feed.items || []).filter((i) => !feed.read?.includes(i.id)).length;
          return `<div class="feed-row ${state.activeFeed === feed.id ? "selected" : ""}" role="button" tabindex="0" data-feed="${escapeHTML(feed.id)}">
            <span class="feed-favicon">${escapeHTML((feed.title || "R").slice(0, 1).toUpperCase())}</span>
            <span class="feed-name">${escapeHTML(feed.title || "Nguồn tin")}</span>
            ${feedUnread > 0 ? `<span class="feed-unread">${feedUnread}</span>` : ""}
            <button type="button" class="feed-remove" data-remove="${escapeHTML(feed.id)}" title="Xóa nguồn" aria-label="Xóa nguồn">×</button>
          </div>`;
        })
        .join("")
    : '<div class="empty-side">Chưa có nguồn RSS</div>';

  const titles = { all: "Tất cả bài viết", unread: "Chưa đọc", saved: "Đã lưu" };
  const activeFeedObj = state.activeFeed ? state.feeds.find((f) => f.id === state.activeFeed) : null;
  const heading = activeFeedObj ? activeFeedObj.title || "Nguồn tin" : titles[state.view];

  $("pageTitle").textContent = heading;
  $("heading").innerHTML = `${escapeHTML(heading)}<span>.</span>`;
  $("subheading").textContent = activeFeedObj
    ? "Bài viết mới nhất từ nguồn bạn đã chọn."
    : "Mọi nội dung bạn quan tâm, trong một nơi.";

  const items = getVisibleItems();
  if ($("markAllReadBtn")) $("markAllReadBtn").disabled = !items.some(unread);

  $("summary").textContent = items.length
    ? `${items.length} BÀI VIẾT · CẬP NHẬT TỪ ${new Set(items.map((a) => a.feedId)).size} NGUỒN`
    : "";

  $("articles").innerHTML = items.length
    ? items
        .map(
          (a) => `<article class="article-card ${a.read ? "is-read" : ""}" role="button" tabindex="0" data-open="${escapeHTML(a.id)}" data-feed-id="${escapeHTML(a.feedId)}">
            <div class="article-main">
              <div class="article-meta">
                <span class="source-dot"></span>
                <b>${escapeHTML(a.feedTitle)}</b>
                <span>·</span>
                <span>${dateText(a.pubDate)}</span>
                ${a.read ? "" : '<span class="badge-new">MỚI</span>'}
              </div>
              <h3>${escapeHTML(a.title || "Không có tiêu đề")}</h3>
              <p>${escapeHTML(cleanText(a.excerpt || a.content).slice(0, 260))}</p>
            </div>
            <div class="article-actions">
              <button type="button" class="save-btn ${a.saved ? "saved" : ""}" data-save="${escapeHTML(a.id)}" data-feed-id="${escapeHTML(a.feedId)}" title="${a.saved ? "Bỏ lưu" : "Lưu bài"}" aria-label="${a.saved ? "Bỏ lưu" : "Lưu bài"}">${a.saved ? "★" : "☆"}</button>
            </div>
          </article>`
        )
        .join("")
    : `<div class="welcome-empty">
        <div class="empty-icon">⌕</div>
        <h2>${state.feeds.length ? "Không tìm thấy bài viết" : "Chào mừng đến với Pulse"}</h2>
        <p>${state.feeds.length ? "Thử từ khóa khác hoặc chọn mục khác." : "Thêm một nguồn RSS để bắt đầu đọc tin."}</p>
        ${state.feeds.length ? "" : '<button type="button" class="primary-btn" id="emptyAddAgain">＋ Thêm nguồn RSS</button>'}
      </div>`;
}

function openAdd(prefillUrl = "") {
  $("dialogError").textContent = "";
  $("feedUrl").value = prefillUrl;
  openModalSafe($("addDialog"));
  setTimeout(() => $("feedUrl").focus(), 60);
}

async function fetchFeedData(url) {
  // 1. Thử endpoint nội bộ /api/parse (nếu chạy kèm backend)
  try {
    const response = await fetch("./api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Bỏ qua để fallback sang rss2json khi chạy tĩnh trên GitHub Pages
  }

  // 2. Fallback cho GitHub Pages (static hosting không có backend)
  const fallbackRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
  const fallbackData = await fallbackRes.json();
  if (!fallbackRes.ok || fallbackData.status !== "ok") {
    throw new Error(fallbackData.message || "Không thể tải nguồn RSS này.");
  }

  return {
    title: fallbackData.feed?.title || new URL(url).hostname,
    description: fallbackData.feed?.description || "",
    site: fallbackData.feed?.link || url,
    items: (fallbackData.items || []).map((item) => ({
      id: item.guid || item.link || `${item.title}-${item.pubDate}`,
      title: item.title || "Không có tiêu đề",
      link: item.link || "",
      pubDate: item.pubDate || "",
      author: item.author || "",
      excerpt: cleanText(item.description || "").slice(0, 260),
      content: item.content || item.description || "",
      feedTitle: fallbackData.feed?.title || ""
    }))
  };
}

async function addFeed(url) {
  $("submitFeed").disabled = true;
  $("submitFeed").textContent = "Đang tải…";
  $("dialogError").textContent = "";
  try {
    const data = await fetchFeedData(url);
    if (state.feeds.some((f) => f.url === url)) throw new Error("Nguồn này đã có trong thư viện.");

    const feed = {
      id: makeId(),
      url,
      title: data.title,
      description: data.description,
      site: data.site,
      items: data.items || [],
      read: [],
      saved: [],
      updatedAt: new Date().toISOString()
    };
    state.feeds.unshift(feed);
    persist();
    state.activeFeed = feed.id;
    state.view = "all";
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === "all"));
    closeModalSafe($("addDialog"));
    render();
  } catch (err) {
    $("dialogError").textContent = err.message || "Không thể tải nguồn RSS.";
  } finally {
    $("submitFeed").disabled = false;
    $("submitFeed").innerHTML = "Thêm nguồn <span>→</span>";
  }
}

function syncReaderButton(id, feedId) {
  const feed = state.feeds.find((f) => f.id === feedId);
  const isRead = !!feed?.read?.includes(id);
  if ($("toggleReadBtn")) {
    $("toggleReadBtn").textContent = isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc";
  }
}

function openArticle(id, feedId) {
  const feed = state.feeds.find((f) => f.id === feedId);
  const item = feed?.items.find((i) => i.id === id);
  if (!item || !feed) return;

  feed.read = feed.read || [];
  if (!feed.read.includes(id)) {
    feed.read.push(id);
    persist();
    render();
  }

  state.readingArticle = { id, feedId };
  syncReaderButton(id, feedId);

  const safeBody = item.content
    ? sanitizeHTML(item.content)
    : `<p>${escapeHTML(cleanText(item.excerpt) || "Không có nội dung xem trước.")}</p>`;

  $("readerContent").innerHTML = `
    <div class="eyebrow">${escapeHTML(item.feedTitle || feed.title)}</div>
    <h1>${escapeHTML(item.title || "Không có tiêu đề")}</h1>
    <div class="reader-meta">${dateText(item.pubDate)} ${item.author ? "· " + escapeHTML(item.author) : ""}</div>
    <div class="reader-body">${safeBody}</div>
    ${item.link ? `<a class="reader-link" href="${escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer">Đọc bài gốc trên trang nguồn ↗</a>` : ""}
  `;

  openModalSafe($("readerDialog"));
}

function toggleReadingReadState() {
  if (!state.readingArticle) return;
  const { id, feedId } = state.readingArticle;
  const feed = state.feeds.find((f) => f.id === feedId);
  if (!feed) return;
  feed.read = feed.read || [];
  if (feed.read.includes(id)) {
    feed.read = feed.read.filter((x) => x !== id);
  } else {
    feed.read.push(id);
  }
  persist();
  syncReaderButton(id, feedId);
  render();
}

function markVisibleAsRead() {
  const items = getVisibleItems().filter(unread);
  if (!items.length) return;
  for (const item of items) {
    const feed = state.feeds.find((f) => f.id === item.feedId);
    if (!feed) continue;
    feed.read = Array.from(new Set([...(feed.read || []), item.id]));
  }
  persist();
  render();
}

function refresh() {
  if (!state.feeds.length) return;
  $("refreshBtn").textContent = "…";
  Promise.all(
    state.feeds.map(async (feed) => {
      try {
        const d = await fetchFeedData(feed.url);
        const known = new Set((feed.items || []).map((i) => i.id));
        feed.items = [...(d.items || []).filter((i) => !known.has(i.id)), ...(feed.items || [])].slice(0, 100);
        feed.title = d.title || feed.title;
        feed.updatedAt = new Date().toISOString();
      } catch (e) {
        console.warn("Refresh failed:", feed.url, e.message);
      }
    })
  )
    .then(() => {
      persist();
      render();
    })
    .finally(() => {
      $("refreshBtn").textContent = "↻";
    });
}

function handleAction(target) {
  if (!target) return;

  if (target.closest("#openAdd,#addSmall,#emptyAdd,#emptyAddAgain")) {
    openAdd("");
    return;
  }

  if (target.closest("#closeAdd,#cancelAdd")) {
    closeModalSafe($("addDialog"));
    return;
  }

  const example = target.closest("[data-url]");
  if (example) {
    openAdd(example.dataset.url || "");
    return;
  }

  const nav = target.closest("[data-view]");
  if (nav) {
    state.view = nav.dataset.view;
    state.activeFeed = null;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n === nav));
    render();
    return;
  }

  const remove = target.closest("[data-remove]");
  if (remove) {
    const f = state.feeds.find((x) => x.id === remove.dataset.remove);
    if (confirm(`Xóa nguồn "${f?.title || "này"}" khỏi thư viện?`)) {
      state.feeds = state.feeds.filter((x) => x.id !== remove.dataset.remove);
      if (state.activeFeed === remove.dataset.remove) state.activeFeed = null;
      persist();
      render();
    }
    return;
  }

  const feedRow = target.closest("[data-feed]");
  if (feedRow) {
    state.activeFeed = feedRow.dataset.feed;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    render();
    return;
  }

  const save = target.closest("[data-save]");
  if (save) {
    const f = state.feeds.find((x) => x.id === save.dataset.feedId);
    if (!f) return;
    const id = save.dataset.save;
    f.saved = f.saved || [];
    f.saved.includes(id) ? (f.saved = f.saved.filter((x) => x !== id)) : f.saved.push(id);
    persist();
    render();
    return;
  }

  const article = target.closest("[data-open]");
  if (article) {
    openArticle(article.dataset.open, article.dataset.feedId);
  }
}

document.addEventListener("click", (e) => {
  // Chạm vùng nền backdrop của dialog để đóng trên mobile
  if (e.target === $("addDialog")) closeModalSafe($("addDialog"));
  if (e.target === $("readerDialog")) closeModalSafe($("readerDialog"));
  handleAction(e.target);
});

$("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const url = $("feedUrl").value.trim();
  if (url) addFeed(url);
});

if ($("toggleReadBtn")) $("toggleReadBtn").addEventListener("click", toggleReadingReadState);
$("closeReader").addEventListener("click", () => closeModalSafe($("readerDialog")));
if ($("markAllReadBtn")) $("markAllReadBtn").addEventListener("click", markVisibleAsRead);
$("refreshBtn").addEventListener("click", refresh);
$("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value;
  render();
});
$("sortSelect").addEventListener("change", render);

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    $("searchInput").focus();
  }
});

$("today").textContent = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long"
}).format(new Date());

load();
render();