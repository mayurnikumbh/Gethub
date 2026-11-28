/* GetHub front-end connected to Supabase (accounts, database, file storage). */

const SB_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const LABELS = { tool: "Tool", script: "Script", apk: "APK", api: "API" };
const MAX_MB = 25;
const ALLOWED = [".zip", ".apk", ".py", ".js", ".sh", ".json", ".txt", ".md", ".gz", ".tar"];

/* sample items shown only until the backend is connected */
const DEMO = [
  { id: "d1", type: "tool", name: "Port Check", description: "Check which ports are open on your own server or router.", version: "1.2.0", downloads: 1840, owner_name: "gethub", file_name: "portcheck.zip" },
  { id: "d2", type: "script", name: "Log Reader", description: "Python script that flags failed logins and odd requests in server logs.", version: "0.9.4", downloads: 960, owner_name: "gethub", file_name: "log_reader.py" },
  { id: "d3", type: "apk", name: "Safe Notes", description: "Encrypted notes app for Android. Notes stay on your phone.", version: "1.4.2", downloads: 2750, owner_name: "gethub", file_name: "safe-notes.apk" }
];

let sb = null, LIVE = false, SESSION = null;

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
}
function showErr(msg) {
  let e = $("#err");
  if (!e) { e = document.createElement("div"); e.id = "err"; e.className = "err"; e.setAttribute("role", "alert"); ($("#authForm") || $("#loginForm") || document.body).appendChild(e); }
  e.textContent = msg; e.style.display = "block";
}

/* ---------- backend ---------- */
async function initBackend() {
  try { await loadScript("js/config.js"); } catch (e) {}
  const c = window.GETHUB_CONFIG || {};
  LIVE = !!(c.url && c.key && !c.url.includes("YOUR_") && !c.key.includes("YOUR_"));
  if (!LIVE) return;
  try {
    await loadScript(SB_CDN);
    sb = window.supabase.createClient(c.url, c.key);
    const { data } = await sb.auth.getSession();
    SESSION = data.session;
  } catch (e) { LIVE = false; }
}
const userName = () => SESSION ? (SESSION.user.user_metadata?.username || SESSION.user.email.split("@")[0]) : null;

async function fetchItems(extra) {
  if (!LIVE) return DEMO;
  let q = sb.from("projects").select("*").eq("status", "active").order("downloads", { ascending: false });
  if (extra) q = extra(q);
  const { data, error } = await q;
  if (error) { toast("Could not load data. Try again."); return []; }
  return data;
}

/* ---------- shared chrome ---------- */
function buildChrome() {
  const page = location.pathname.split("/").pop() || "index.html";
  const name = userName();
  const link = (href, text) => `<a href="${href}" class="${page === href ? "active" : ""}">${text}</a>`;
  const nav = $("#nav");
  if (nav) nav.innerHTML = `
    <nav class="nav glass" aria-label="Main">
      <a class="brand" href="index.html"><img src="assets/logo.svg" alt="">GetHub</a>
      <div class="links">
        ${link("explore.html", "Explore")}${link("upload.html", "Upload")}
        ${name ? link("profile.html", esc(name)) + '<a href="#" id="logout">Log out</a>'
               : link("login.html", "Log in") + '<a class="btn" href="signup.html">Sign up</a>'}
      </div>
    </nav>`;
  const foot = $("#foot");
  if (foot) foot.innerHTML = `© 2026 GetHub · <a href="rules.html">Rules and reporting</a>`;
  const out = $("#logout");
  if (out) out.addEventListener("click", async e => { e.preventDefault(); await sb.auth.signOut(); location.href = "index.html"; });
  if (!LIVE && nav) {
    const n = document.createElement("div");
    n.className = "rules glass"; n.style.margin = "0 0 20px";
    n.textContent = "Backend not connected yet. You are seeing sample data. Add your Supabase details in js/config.js.";
    nav.appendChild(n);
  }
}

function card(i) {
  return `<a class="card glass" href="repo.html?id=${encodeURIComponent(i.id)}">
    <span class="tag ${esc(i.type)}">${esc(LABELS[i.type] || i.type)}</span>
    <h3>${esc(i.name)}</h3><p>${esc(i.description)}</p>
    <div class="meta"><span>v${esc(i.version)}</span><span>${Number(i.downloads).toLocaleString()} downloads</span></div></a>`;
}

/* ---------- pages ---------- */
async function pageHome() {
  const items = await fetchItems();
  const cats = $("#cats");
  if (cats) cats.innerHTML = Object.keys(LABELS).map(t =>
    `<a class="cat glass card" href="explore.html?type=${t}"><div class="count">${items.filter(i => i.type === t).length}</div><div>${LABELS[t]}s</div></a>`).join("");
  const top = $("#top");
  if (top) top.innerHTML = items.slice(0, 3).map(card).join("") || `<div class="empty glass">Nothing uploaded yet. <a href="upload.html">Be the first</a>.</div>`;
  const f = $("#homeSearch");
  if (f) f.addEventListener("submit", e => { e.preventDefault(); location.href = "explore.html?q=" + encodeURIComponent($("#q").value); });
}

async function pageExplore() {
  const params = new URLSearchParams(location.search);
  let type = params.get("type") || "all";
  const q = $("#q"); q.value = params.get("q") || "";
  const chips = $("#chips");
  chips.innerHTML = ["all", ...Object.keys(LABELS)].map(t => `<button class="chip" data-t="${t}">${t === "all" ? "All" : LABELS[t] + "s"}</button>`).join("");
  const items = await fetchItems();
  function draw() {
    chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.t === type));
    const term = q.value.trim().toLowerCase();
    const list = items.filter(i => (type === "all" || i.type === type) && (i.name + " " + i.description).toLowerCase().includes(term));
    $("#list").innerHTML = list.length ? list.map(card).join("") : `<div class="empty glass">Nothing matches. Try another word, or <a href="upload.html">upload the first one</a>.</div>`;
  }
  chips.addEventListener("click", e => { if (e.target.dataset.t) { type = e.target.dataset.t; draw(); } });
  q.addEventListener("input", draw);
  draw();
}

async function pageRepo() {
  const id = new URLSearchParams(location.search).get("id");
  const box = $("#repo");
  const items = await fetchItems(q => q.eq("id", id));
  const i = LIVE ? items[0] : DEMO.find(x => x.id === id);
  if (!i) { box.innerHTML = `<div class="empty glass">This project was not found. <a href="explore.html">Back to Explore</a></div>`; return; }
  document.title = i.name + " - GetHub";
  const mine = LIVE && SESSION && SESSION.user.id === i.owner;
  box.innerHTML = `
    <span class="tag ${esc(i.type)}">${esc(LABELS[i.type] || i.type)}</span>
    <h1 class="title" style="margin-top:10px">${esc(i.name)}</h1>
    <p class="lead">${esc(i.description)}</p>
    <div class="split">
      <div>
        <div class="panel glass"><h2 style="margin-top:0">File</h2>
          <ul class="filelist"><li>📄 ${esc(i.file_name)} ${i.file_size ? "(" + fmtSize(i.file_size) + ")" : ""}</li></ul>
          ${i.sha256 ? `<h2>SHA-256</h2><pre class="readme" style="word-break:break-all">${esc(i.sha256)}</pre><p class="muted">Compare this with the hash of the downloaded file before you run or install it.</p>` : ""}
        </div>
      </div>
      <div class="panel glass">
        <button class="btn" id="dl" style="width:100%">Download</button>
        <div style="margin-top:18px">
          <div class="stat"><span>Version</span><span>${esc(i.version)}</span></div>
          <div class="stat"><span>Downloads</span><span>${Number(i.downloads).toLocaleString()}</span></div>
          <div class="stat"><span>Owner</span><span>${esc(i.owner_name)}</span></div>
        </div>
        <button class="btn ghost" id="rep" style="width:100%;margin-top:14px">Report this file</button>
        ${mine ? '<button class="btn ghost" id="del" style="width:100%;margin-top:10px">Delete my upload</button>' : ""}
      </div>
    </div>`;
  $("#dl").addEventListener("click", async () => {
    if (!LIVE) return toast("Connect the backend first.");
    await sb.rpc("increment_downloads", { pid: i.id });
    const { data } = sb.storage.from("files").getPublicUrl(i.file_path, { download: i.file_name });
    location.href = data.publicUrl;
  });
  $("#rep").addEventListener("click", async () => {
    if (!LIVE) return toast("Connect the backend first.");
    if (!SESSION) return toast("Please log in to report a file.");
    const reason = prompt("Why are you reporting this file?");
    if (!reason || reason.trim().length < 3) return;
    const { error } = await sb.from("reports").insert({ project_id: i.id, reason: reason.trim().slice(0, 500) });
    toast(error ? "Could not send the report." : "Thank you. The report was sent.");
  });
  const del = $("#del");
  if (del) del.addEventListener("click", async () => {
    if (!confirm("Delete this upload for good?")) return;
    await sb.storage.from("files").remove([i.file_path]);
    const { error } = await sb.from("projects").delete().eq("id", i.id);
    if (error) return toast("Could not delete.");
    location.href = "profile.html";
  });
}

async function pageProfile() {
  const box = $("#profile");
  if (!SESSION) { box.innerHTML = `<div class="empty glass">You are not logged in. <a href="login.html">Log in</a> or <a href="signup.html">create an account</a>.</div>`; return; }
  const name = userName();
  const mine = await fetchItems(q => q.eq("owner", SESSION.user.id));
  box.innerHTML = `
    <div class="panel glass" style="margin-bottom:10px">
      <div class="avatar">${esc(name.charAt(0).toUpperCase())}</div>
      <h1 class="title">${esc(name)}</h1>
      <p class="muted">${mine.length} upload${mine.length === 1 ? "" : "s"}</p>
    </div>
    <h2>Your uploads</h2>
    <div class="grid">${mine.length ? mine.map(card).join("") : `<div class="empty glass">No uploads yet. <a href="upload.html">Upload your first file</a>.</div>`}</div>`;
}

async function sha256(file) {
  const buf = await file.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function pageUpload() {
  const form = $("#uploadForm");
  if (!LIVE) { form.outerHTML = `<div class="empty glass">Connect the backend first (js/config.js).</div>`; return; }
  if (!SESSION) { form.outerHTML = `<div class="empty glass">Please <a href="login.html">log in</a> to upload.</div>`; return; }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const file = $("#file").files[0];
    const btn = form.querySelector("button[type=submit]");
    if (!file) return toast("Choose a file first.");
    const ext = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
    if (!ALLOWED.includes(ext)) return toast("This file type is not allowed. Allowed: " + ALLOWED.join(" "));
    if (file.size > MAX_MB * 1048576) return toast("File is too big. Maximum " + MAX_MB + " MB.");
    btn.disabled = true; btn.textContent = "Uploading...";
    try {
      const hash = await sha256(file);
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${SESSION.user.id}/${Date.now()}-${safe}`;
      const up = await sb.storage.from("files").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const ins = await sb.from("projects").insert({
        owner_name: userName(), name: $("#name").value.trim(), type: $("#type").value,
        description: $("#desc").value.trim(), version: $("#ver").value.trim() || "1.0.0",
        file_path: path, file_name: file.name, file_size: file.size, sha256: hash
      }).select("id").single();
      if (ins.error) { await sb.storage.from("files").remove([path]); throw ins.error; }
      location.href = "repo.html?id=" + encodeURIComponent(ins.data.id);
    } catch (err) {
      toast("Upload failed. Check the details and try again.");
      btn.disabled = false; btn.textContent = "Publish";
    }
  });
}

function pageAuth(mode) {
  const form = $("#authForm") || $("#loginForm");
  const idField = $("#username");
  if (mode === "login" && idField) { idField.placeholder = "Enter your email"; idField.type = "email"; }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!LIVE) return showErr("Backend not connected yet. Add your Supabase details in js/config.js.");
    const password = $("#password").value;
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      if (mode === "signup") {
        if (password !== $("#password2").value) throw new Error("Passwords do not match.");
        const { data, error } = await sb.auth.signUp({ email: $("#email").value.trim(), password, options: { data: { username: $("#username").value.trim() } } });
        if (error) throw error;
        if (!data.session) { showErr("Account created. Check your email and confirm it, then log in."); btn.disabled = false; return; }
        location.href = "profile.html";
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: idField.value.trim(), password });
        if (error) throw error;
        location.href = "explore.html";
      }
    } catch (err) {
      showErr(err.message || "Something went wrong.");
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await initBackend();
  buildChrome();
  const p = document.body.dataset.page;
  ({ home: pageHome, explore: pageExplore, repo: pageRepo, profile: pageProfile, upload: pageUpload,
     login: () => pageAuth("login"), signup: () => pageAuth("signup") }[p] || (() => {}))();
});
