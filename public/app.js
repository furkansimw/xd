/* ══════════════════════════════════════════════════════════════
   SocketChat — Client
   ══════════════════════════════════════════════════════════════ */

const socket = io();

// ── State ────────────────────────────────────────────────────
let myUsername = null;
let myColor = null;
let currentRoom = "genel";
let selectedRoom = "genel";
let typingTimeout = null;
let typingUsers = {}; // username → timer

// ── DOM refs ─────────────────────────────────────────────────
const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const loginRooms = document.getElementById("login-rooms");
const roomList = document.getElementById("room-list");
const userList = document.getElementById("user-list");
const onlineCount = document.getElementById("online-count");
const messages = document.getElementById("messages");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const typingBar = document.getElementById("typing-bar");
const currentRoomName = document.getElementById("current-room-name");
const myAvatar = document.getElementById("my-avatar");
const myUsernameLabel = document.getElementById("my-username-label");
const connBadge = document.getElementById("conn-badge");

// ── Connection status ─────────────────────────────────────────
socket.on("connect", () => {
  connBadge.textContent = "● BAĞLI";
  connBadge.className = "badge connected";
});
socket.on("disconnect", () => {
  connBadge.textContent = "● KESİLDİ";
  connBadge.className = "badge disconnected";
});

// ══════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════
const defaultRooms = [
  { id: "genel", name: "# genel" },
  { id: "teknoloji", name: "# teknoloji" },
  { id: "oyun", name: "# oyun" },
  { id: "muzik", name: "# müzik" },
  { id: "felsefe", name: "# felsefe" },
  { id: "sanat", name: "# sanat" },
];

// render login room pills
function renderLoginRooms() {
  loginRooms.innerHTML = "";
  defaultRooms.forEach((r) => {
    const pill = document.createElement("div");
    pill.className = "room-pill" + (r.id === selectedRoom ? " active" : "");
    pill.textContent = r.name;
    pill.addEventListener("click", () => {
      selectedRoom = r.id;
      document
        .querySelectorAll(".room-pill")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
    });
    loginRooms.appendChild(pill);
  });
}
renderLoginRooms();

joinBtn.addEventListener("click", doJoin);
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doJoin();
});

function doJoin() {
  const name = usernameInput.value.trim();
  if (!name) {
    usernameInput.focus();
    return;
  }
  socket.emit("user:join", { username: name, room: selectedRoom });
}

socket.on("error", ({ msg }) => {
  usernameInput.style.borderColor = "var(--accent2)";
  usernameInput.placeholder = msg;
  usernameInput.value = "";
  setTimeout(() => {
    usernameInput.style.borderColor = "";
    usernameInput.placeholder = "kullanıcı_adın";
  }, 2000);
});

// ══════════════════════════════════════════════════════════════
// HISTORY (sent on join/room-switch)
// ══════════════════════════════════════════════════════════════
socket.on("history", (msgs) => {
  // only run once we're in app view
  messages.innerHTML = "";
  msgs.forEach(renderMessage);
  scrollBottom();
});

// ══════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════
socket.on("message", (msg) => {
  // detect first real message → enter app
  if (!myUsername && msg.type === "system" && msg.text.includes("katıldı")) {
    // username was set before emit; handled below
  }
  renderMessage(msg);
  scrollBottom();
});

function renderMessage(msg) {
  const el = document.createElement("div");
  el.className = "msg " + (msg.type === "system" ? "system" : "chat");

  if (msg.type === "system") {
    el.innerHTML = `<span class="sys-text">${escHtml(msg.text)}</span>`;
  } else {
    const isMine = msg.username === myUsername;
    el.innerHTML = `
      <div class="msg-header">
        <span class="msg-user" style="color:${msg.color}">${escHtml(msg.username)}</span>
        <span class="msg-time">${escHtml(msg.time)}</span>
      </div>
      <div class="msg-text">${escHtml(msg.text)}</div>
    `;
    if (isMine) el.style.opacity = "1";
  }
  messages.appendChild(el);
}

// ══════════════════════════════════════════════════════════════
// ROOMS UPDATE
// ══════════════════════════════════════════════════════════════
socket.on("rooms:update", (roomMeta) => {
  renderRoomList(roomMeta);

  // First join detection: check if login screen still visible
  if (!myUsername) {
    // derive username from the join message that just fired
    // (we handle this via room:users first user)
  }
});

function renderRoomList(meta) {
  roomList.innerHTML = "";
  meta.forEach((r) => {
    const li = document.createElement("li");
    li.className = r.id === currentRoom ? "active" : "";
    li.dataset.roomId = r.id;
    li.innerHTML = `<span>${escHtml(r.name)}</span><span class="room-count">${r.count}</span>`;
    li.addEventListener("click", () => switchRoom(r.id));
    roomList.appendChild(li);
  });
}

function switchRoom(roomId) {
  if (!myUsername || roomId === currentRoom) return;
  currentRoom = roomId;
  socket.emit("room:switch", { room: roomId });
  currentRoomName.textContent =
    defaultRooms.find((r) => r.id === roomId)?.name || roomId;
  document.querySelectorAll("#room-list li").forEach((li) => {
    li.classList.toggle("active", li.dataset.roomId === roomId);
  });
}

// ══════════════════════════════════════════════════════════════
// ROOM USERS
// ══════════════════════════════════════════════════════════════
socket.on("room:users", ({ roomId, users }) => {
  if (roomId !== currentRoom) return;
  renderUserList(users);

  // First login → switch screens
  if (!myUsername) {
    const me = users.find((u) => !myUsername); // first user arriving
    // We detect ourselves by the socket id; simplest: server sends us our info
    // Instead: we set myUsername from the usernameInput at join time
    if (!myUsername) {
      myUsername = usernameInput.value.trim();
      const meObj = users.find((u) => u.name === myUsername);
      if (meObj) {
        myColor = meObj.color;
        enterApp();
      }
    }
  }
});

function renderUserList(users) {
  userList.innerHTML = "";
  onlineCount.textContent = users.length;
  users.forEach((u) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="user-dot" style="background:${u.color}"></span>
      <span>${escHtml(u.name)}</span>
    `;
    userList.appendChild(li);
  });
}

function enterApp() {
  loginScreen.style.display = "none";
  app.classList.remove("hidden");

  myAvatar.textContent = myUsername[0].toUpperCase();
  myAvatar.style.background = myColor;
  myUsernameLabel.textContent = myUsername;

  currentRoomName.textContent =
    defaultRooms.find((r) => r.id === currentRoom)?.name || currentRoom;
  msgInput.focus();
}

// ══════════════════════════════════════════════════════════════
// SEND MESSAGE
// ══════════════════════════════════════════════════════════════
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !myUsername) return;
  socket.emit("message:send", { text });
  msgInput.value = "";
  socket.emit("typing:stop");
  clearTimeout(typingTimeout);
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ── Typing ──────────────────────────────────────────────────
msgInput.addEventListener("input", () => {
  if (!myUsername) return;
  socket.emit("typing:start");
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing:stop"), 1800);
});

socket.on("typing", ({ username, color }) => {
  typingUsers[username] = color;
  renderTyping();
  // auto-clear after 2.5s
  clearTimeout(typingUsers[username + "_t"]);
  typingUsers[username + "_t"] = setTimeout(() => {
    delete typingUsers[username];
    delete typingUsers[username + "_t"];
    renderTyping();
  }, 2500);
});

socket.on("typing:stop", ({ username }) => {
  delete typingUsers[username];
  delete typingUsers[username + "_t"];
  renderTyping();
});

function renderTyping() {
  const names = Object.keys(typingUsers).filter((k) => !k.endsWith("_t"));
  if (!names.length) {
    typingBar.innerHTML = "";
    return;
  }
  const colored = names
    .map(
      (n) =>
        `<span style="color:${typingUsers[n]};font-weight:700">${escHtml(n)}</span>`,
    )
    .join(", ");
  const suffix = names.length === 1 ? " yazıyor" : " yazıyor";
  typingBar.innerHTML = `${colored}${suffix} <span class="typing-dots"></span>`;
}

// ══════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════
function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
