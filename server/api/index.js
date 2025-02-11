const { Server } = require("socket.io");
const { userJoin, getUsers, userLeave } = require("../utils/user");

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  let imageUrl, userRoom;
  
  io.on("connection", (socket) => {
    socket.on("user-joined", (data) => {
      const { roomId, userId, userName, host, presenter } = data;
      userRoom = roomId;
      const user = userJoin(socket.id, userName, roomId, host, presenter);
      const roomUsers = getUsers(user.room);
      socket.join(user.room);
      socket.emit("message", { message: "Welcome to ChatRoom" });
      socket.broadcast.to(user.room).emit("message", {
        message: `${user.username} has joined`,
      });

      io.to(user.room).emit("users", roomUsers);
      io.to(user.room).emit("canvasImage", imageUrl);
    });

    socket.on("drawing", (data) => {
      imageUrl = data;
      socket.broadcast.to(userRoom).emit("canvasImage", imageUrl);
    });

    socket.on("disconnect", () => {
      const userLeaves = userLeave(socket.id);
      const roomUsers = getUsers(userRoom);

      if (userLeaves) {
        io.to(userLeaves.room).emit("message", {
          message: `${userLeaves.username} left the chat`,
        });
        io.to(userLeaves.room).emit("users", roomUsers);
      }
    });
  });

  res.end();
}
