// @ts-nocheck
import { Server } from 'socket.io';
import express from 'express';
import turn from './turn.js';
export default function server({
    serverHttp,
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_AUTH_TOKEN,
    cors = {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
}) {
    const io = new Server(serverHttp, { cors });
    io.on('connection', (socket) => {
        const roomsClient = () => Array.from(socket.rooms).filter(room => room !== Array.from(socket.rooms)[0]);
        socket.on("join", async({ room, username }, reJoin = false) => {
            if (roomsClient().includes(room) && !reJoin) {
                socket.emit("error_join", { data: "Ya estas en una sala", status: "in_room" });
                return;
            }

            if (!reJoin) { await socket.join(room); }

            let userAlreadyExist = false;
            const usersSocket = await io.fetchSockets();
            const users = usersSocket
                .filter(localSocket => (localSocket.username !== undefined))
                .map((localSocket) => {
                    if (localSocket.username === username) { userAlreadyExist = true; }
                    return localSocket.username;
                })

            if (userAlreadyExist) {
                socket.emit("error_join", { data: "El usuario ya existe", status: "user_exist" });
                return;
            }

            socket.username = username;
            socket.emit("joined", { users });
            socket.broadcast.to(room).emit("join", { sender: String(username), username: "all", users, data: { type: "join" } });
        });
        socket.on('toClient', async({ data, username, event }) => {
            const sockets = await io.fetchSockets();
            const socketEncontrado = sockets.find(toClientSocket => toClientSocket.username === username);
            if (socketEncontrado) { socketEncontrado.emit(event, { data, username, sender: socket.username }); return; }
            console.log("Socket no encontrado");
        });
    });

    const notifyClose = express.Router();
    notifyClose.post('/notify-close', async(req, res) => {
        const [user, room] = req.body.toString('utf-8').split('/');
        io.to(room).emit('notify-close', user);
        res.sendStatus(204); // No Content
    });

    return {
        notifyClose: () => notifyClose,
        turn: () => turn({ CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AUTH_TOKEN })
    };
}