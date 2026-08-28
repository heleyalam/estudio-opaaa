const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Aumentar el límite de recepción para soportar imágenes subidas por usuarios
const io = new Server(server, {
  maxHttpBufferSize: 1e7 // 10 MB
});

const DATA_FILE = path.join(__dirname, 'preguntas.json');

function cargarPreguntas() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
      return {};
    }
  }
  return {};
}

let bancoPreguntas = cargarPreguntas();
let jugadores = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.emit('cargarCategorias', Object.keys(bancoPreguntas));
  socket.emit('actualizarPuntuaciones', jugadores);

  socket.on('nuevoJugador', (data) => {
    const { nombre, avatar } = data;
    if (nombre) {
      jugadores[nombre] = { puntos: jugadores[nombre] ? jugadores[nombre].puntos : 0, avatar: avatar };
      io.emit('actualizarPuntuaciones', jugadores);
    }
  });

  socket.on('obtenerPreguntas', (categoria) => {
    const lista = bancoPreguntas[categoria] || [];
    socket.emit('preguntasDeCategoria', { categoria, preguntas: lista });
  });

  socket.on('respuestaCorrecta', (nombre) => {
    if (nombre && jugadores[nombre]) {
      jugadores[nombre].puntos += 10;
      io.emit('actualizarPuntuaciones', jugadores);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
