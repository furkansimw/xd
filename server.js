const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 3000;

const rooms = {
  genel: { name: "# genel", messages: [], users: new Set() },
  teknoloji: { name: "# teknoloji", messages: [], users: new Set() },
  oyun: { name: "# oyun", messages: [], users: new Set() },
  muzik: { name: "# müzik", messages: [], users: new Set() },
  felsefe: { name: "# felsefe", messages: [], users: new Set() },
  sanat: { name: "# sanat", messages: [], users: new Set() },
};

const users = {};

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F1948A",
  "#82E0AA",
  "#F8C471",
  "#AED6F1",
  "#D7DBDD",
];
let colorIndex = 0;
function nextColor() {
  return COLORS[colorIndex++ % COLORS.length];
}

function timestamp() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function broadcastRoomUsers(roomId) {
  const list = [...rooms[roomId].users].map((u) => ({
    name: u,
    color: users[u]?.color || "#fff",
  }));
  io.to(roomId).emit("room:users", { roomId, users: list });
}

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (req, res) => res.sendStatus(200));

io.on("connection", (socket) => {
  let currentUser = null;
  let currentRoom = null;

  socket.on("user:join", ({ username, room = "genel" }) => {
    username = username.trim().slice(0, 20);
    if (!username || users[username]) {
      socket.emit("error", { msg: "Bu kullanıcı adı alınmış veya geçersiz." });
      return;
    }
    if (!rooms[room]) room = "genel";

    currentUser = username;
    currentRoom = room;

    users[username] = { socketId: socket.id, color: nextColor(), room };

    socket.join(room);
    rooms[room].users.add(username);

    socket.emit("history", rooms[room].messages.slice(-200));

    const sysMsg = {
      type: "system",
      text: `${username} odaya katıldı 👋`,
      time: timestamp(),
    };
    rooms[room].messages.push(sysMsg);
    io.to(room).emit("message", sysMsg);

    broadcastRoomUsers(room);

    // send room list to everyone
    io.emit("rooms:update", getRoomMeta());
  });

  // ── Switch room ──────────────────────────────────────────────
  socket.on("room:switch", ({ room }) => {
    if (!currentUser || !rooms[room]) return;

    // leave old room
    socket.leave(currentRoom);
    rooms[currentRoom].users.delete(currentUser);
    const leaveMsg = {
      type: "system",
      text: `${currentUser} odadan ayrıldı`,
      time: timestamp(),
    };
    rooms[currentRoom].messages.push(leaveMsg);
    io.to(currentRoom).emit("message", leaveMsg);
    broadcastRoomUsers(currentRoom);

    // join new room
    currentRoom = room;
    users[currentUser].room = room;
    socket.join(room);
    rooms[room].users.add(currentUser);

    socket.emit("history", rooms[room].messages.slice(-200));

    const joinMsg = {
      type: "system",
      text: `${currentUser} odaya katıldı 👋`,
      time: timestamp(),
    };
    rooms[room].messages.push(joinMsg);
    io.to(room).emit("message", joinMsg);
    broadcastRoomUsers(room);

    io.emit("rooms:update", getRoomMeta());
  });

  // ── Chat message ─────────────────────────────────────────────
  socket.on("message:send", ({ text }) => {
    if (!currentUser || !currentRoom) return;
    text = text.trim().slice(0, 500);
    if (!text) return;

    const msg = {
      type: "chat",
      username: currentUser,
      color: users[currentUser].color,
      text,
      time: timestamp(),
    };
    rooms[currentRoom].messages.push(msg);
    // keep last 200 messages in memory
    if (rooms[currentRoom].messages.length > 200) {
      rooms[currentRoom].messages.shift();
    }
    io.to(currentRoom).emit("message", msg);
  });

  // ── Typing indicator ─────────────────────────────────────────
  socket.on("typing:start", () => {
    if (!currentUser) return;
    socket.to(currentRoom).emit("typing", {
      username: currentUser,
      color: users[currentUser]?.color,
    });
  });
  socket.on("typing:stop", () => {
    if (!currentUser) return;
    socket.to(currentRoom).emit("typing:stop", { username: currentUser });
  });

  // ── Disconnect ───────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (!currentUser) return;
    rooms[currentRoom]?.users.delete(currentUser);
    delete users[currentUser];

    const msg = {
      type: "system",
      text: `${currentUser} bağlantısı kesildi`,
      time: timestamp(),
    };
    if (rooms[currentRoom]) {
      rooms[currentRoom].messages.push(msg);
      io.to(currentRoom).emit("message", msg);
      broadcastRoomUsers(currentRoom);
    }
    io.emit("rooms:update", getRoomMeta());
  });
});

function getRoomMeta() {
  return Object.entries(rooms).map(([id, r]) => ({
    id,
    name: r.name,
    count: r.users.size,
  }));
}

server.listen(PORT, () => {
  console.log(`✅  Socket.IO sunucusu çalışıyor → http://localhost:${PORT}`);
});
