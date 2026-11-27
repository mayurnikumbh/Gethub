/* GetHub front-end (demo). Real accounts, uploads and downloads need a backend + database. */

const DATA = [
  { id: "port-check", type: "tool", name: "Port Check", desc: "Check which ports are open on your own server or router.", ver: "1.2.0", dl: 1840, owner: "gethub", files: ["portcheck.zip", "README.md"], readme: "Checks common ports on hosts you own or administer.\n\nUsage: run portcheck, enter your own IP, read the report.\nOnly scan systems you have permission to test." },
  { id: "pass-meter", type: "tool", name: "Password Meter", desc: "Rates password strength offline and explains how to improve it.", ver: "2.0.1", dl: 3120, owner: "gethub", files: ["pass-meter.zip", "README.md"], readme: "Works fully offline. Nothing you type leaves your device." },
  { id: "log-reader", type: "script", name: "Log Reader", desc: "Python script that flags failed logins and odd requests in server logs.", ver: "0.9.4", dl: 960, owner: "gethub", files: ["log_reader.py", "requirements.txt", "README.md"], readme: "Usage: python log_reader.py access.log\n\nPrints a summary of failed logins, repeated IPs and unusual paths." },
  { id: "hash-id", type: "script", name: "Hash Identifier", desc: "Tells you which hash type (MD5, SHA-1, SHA-256...) a string most likely is.", ver: "1.0.0", dl: 2210, owner: "gethub", files: ["hash_id.py", "README.md"], readme: "Usage: python hash_id.py <hash>\n\nUseful for checking file integrity values." },
  { id: "wifi-audit", type: "apk", name: "Wi-Fi Audit", desc: "Android app that lists nearby networks and shows weak security settings.", ver: "3.1.0", dl: 5400, owner: "gethub", files: ["wifi-audit.apk", "CHANGELOG.md", "sha256.txt"], readme: "Shows encryption type and signal for nearby Wi-Fi.\nCompare the file hash in sha256.txt before installing." },
  { id: "safe-notes", type: "apk", name: "Safe Notes", desc: "Encrypted notes app for Android. Notes stay on your phone.", ver: "1.4.2", dl: 2750, owner: "gethub", files: ["safe-notes.apk", "sha256.txt"], readme: "AES-encrypted notes, locked with a PIN or fingerprint." },
  { id: "status-api", type: "api", name: "Status API", desc: "Simple REST API that returns uptime and response time for any URL.", ver: "1.1.0", dl: 780, owner: "gethub", files: ["openapi.json", "README.md"], readme: "GET /check?url=example.com returns status, latency and SSL expiry." },
  { id: "cve-feed", type: "api", name: "Advisory Feed", desc: "JSON feed of public security advisories, sorted by severity.", ver: "0.5.0", dl: 640, owner: "gethub", files: ["feed-spec.json", "README.md"], readme: "Pulls public advisories and returns them as clean JSON." }
];
const LABELS = { tool: "Tool", script: "Script", apk: "APK", api: "API" };

/* helpers */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const getUser = () => read("gethub_user", null);
const getUploads = () => read("gethub_uploads", []);
const allItems = () => DATA.concat(getUploads());

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* shared navbar + footer */
function buildChrome() {
  const page = location.pathname.split("/").pop() || "index.html";
  const user = getUser();
  const link = (href, text) => `<a href="${href}" class="${page === href ? "active" : ""}">${text}</a>`;
  const nav = $("#nav");
  if (nav) nav.innerHTML = `
    <nav class="nav glass" aria-label="Main">
      <a class="brand" href="index.html"><img src="assets/logo.svg" alt="">GetHub</a>
      <div class="links">
        ${link("explore.html", "Explore")}
        ${link("upload.html", "Upload")}
        ${user ? link("profile.html", esc(user.name)) + '<a href="#" id="logout">Log out</a>'
               : link("login.html", "Log in") + '<a class="btn" href="signup.html">Sign up</a>'}
      </div>
    </nav>`;
  const foot = $("#foot");
  if (foot) foot.innerHTML = `© 2026 GetHub. Share only what you own or have permission to share.`;
  const out = $("#logout");
  if (out) out.addEventListener("click", e => { e.preventDefault(); localStorage.removeItem("gethub_user"); location.href = "index.html"; });
}

/* cards */
function card(i) {
  return `<a class="card glass" href="repo.html?id=${encodeURIComponent(i.id)}">
    <span class="tag ${esc(i.type)}">${esc(LABELS[i.type] || i.type)}</span>
    <h3>${esc(i.name)}</h3>
    <p>${esc(i.desc)}</p>
    <div class="meta"><span>v${esc(i.ver)}</span><span>${Number(i.dl).toLocaleString()} downloads</span></div>
  </a>`;
}

/* pages */
function pageHome() {
  const items = allItems();
  const cats = $("#cats");
  if (cats) cats.innerHTML = Object.keys(LABELS).map(t =>
    `<a class="cat glass card" href="explore.html?type=${t}"><div class="count">${items.filter(i => i.type === t).length}</div><div>${LABELS[t]}s</div></a>`).join("");
  const top = $("#top");
  if (top) top.innerHTML = items.slice().sort((a, b) => b.dl - a.dl).slice(0, 3).map(card).join("");
  const f = $("#homeSearch");
  if (f) f.addEventListener("submit", e => { e.preventDefault(); location.href = "explore.html?q=" + encodeURIComponent($("#q").value); });
}

function pageExplore() {
  const params = new URLSearchParams(location.search);
  let type = params.get("type") || "all";
  const q = $("#q"); q.value = params.get("q") || "";
  const chips = $("#chips");
  chips.innerHTML = ["all", ...Object.keys(LABELS)].map(t => `<button class="chip" data-t="${t}">${t === "all" ? "All" : LABELS[t] + "s"}</button>`).join("");
  function draw() {
    chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.t === type));
    const term = q.value.trim().toLowerCase();
    const list = allItems().filter(i => (type === "all" || i.type === type) && (i.name + " " + i.desc).toLowerCase().includes(term));
    $("#list").innerHTML = list.length ? list.map(card).join("") : `<div class="empty glass">Nothing matches. Try another word, or <a href="upload.html">upload the first one</a>.</div>`;
  }
  chips.addEventListener("click", e => { if (e.target.dataset.t) { type = e.target.dataset.t; draw(); } });
  q.addEventListener("input", draw);
  draw();
}

function pageRepo() {
  const id = new URLSearchParams(location.search).get("id");
  const i = allItems().find(x => x.id === id);
  const box = $("#repo");
  if (!i) { box.innerHTML = `<div class="empty glass">This project was not found. <a href="explore.html">Back to Explore</a></div>`; return; }
  document.title = i.name + " - GetHub";
  box.innerHTML = `
    <span class="tag ${esc(i.type)}">${esc(LABELS[i.type] || i.type)}</span>
    <h1 class="title" style="margin-top:10px">${esc(i.name)}</h1>
    <p class="lead">${esc(i.desc)}</p>
    <div class="split">
      <div>
        <div class="panel glass"><h2 style="margin-top:0">README</h2><pre class="readme">${esc(i.readme || "No README yet.")}</pre></div>
        <div class="panel glass" style="margin-top:18px"><h2 style="margin-top:0">Files</h2>
          <ul class="filelist">${i.files.map(f => `<li>📄 ${esc(f)}</li>`).join("")}</ul></div>
      </div>
      <div class="panel glass">
        <button class="btn" id="dl" style="width:100%">Download</button>
        <div style="margin-top:18px">
          <div class="stat"><span>Version</span><span>${esc(i.ver)}</span></div>
          <div class="stat"><span>Downloads</span><span>${Number(i.dl).toLocaleString()}</span></div>
          <div class="stat"><span>Owner</span><span>${esc(i.owner)}</span></div>
        </div>
        <p class="muted" style="margin-top:14px">Check the file hash before you run or install anything.</p>
      </div>
    </div>`;
  $("#dl").addEventListener("click", () => toast("Demo mode: real downloads need a backend and file storage."));
}

function pageProfile() {
  const user = getUser();
  const box = $("#profile");
  if (!user) { box.innerHTML = `<div class="empty glass">You are not logged in. <a href="login.html">Log in</a> or <a href="signup.html">create an account</a>.</div>`; return; }
  const mine = getUploads().filter(u => u.owner === user.name);
  box.innerHTML = `
    <div class="panel glass" style="margin-bottom:10px">
      <div class="avatar">${esc(user.name.charAt(0).toUpperCase())}</div>
      <h1 class="title">${esc(user.name)}</h1>
      <p class="muted">${mine.length} upload${mine.length === 1 ? "" : "s"}</p>
    </div>
    <h2>Your uploads</h2>
    <div class="grid">${mine.length ? mine.map(card).join("") : `<div class="empty glass">No uploads yet. <a href="upload.html">Upload your first file</a>.</div>`}</div>`;
}

function pageUpload() {
  const user = getUser();
  const form = $("#uploadForm");
  if (!user) { form.outerHTML = `<div class="empty glass">Please <a href="login.html">log in</a> to upload.</div>`; return; }
  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#name").value.trim();
    const file = $("#file").files[0];
    const item = {
      id: "u-" + Date.now(), type: $("#type").value, name,
      desc: $("#desc").value.trim(), ver: $("#ver").value.trim() || "1.0.0",
      dl: 0, owner: user.name, files: [file ? file.name : "(no file)"],
      readme: $("#desc").value.trim()
    };
    const list = getUploads(); list.push(item); write("gethub_uploads", list);
    location.href = "repo.html?id=" + encodeURIComponent(item.id);
  });
}

function pageAuth(mode) {
  const form = $("#authForm");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#username").value.trim();
    const err = $("#err");
    if (mode === "signup" && $("#password").value !== $("#password2").value) {
      err.textContent = "Passwords do not match."; err.style.display = "block"; return;
    }
    write("gethub_user", { name: name.split("@")[0] }); /* demo only: no real check, password is never stored */
    location.href = mode === "signup" ? "profile.html" : "explore.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  buildChrome();
  const p = document.body.dataset.page;
  ({ home: pageHome, explore: pageExplore, repo: pageRepo, profile: pageProfile, upload: pageUpload,
     login: () => pageAuth("login"), signup: () => pageAuth("signup") }[p] || (() => {}))();
});
