const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 1e7 // 10 MB para imágenes de avatares
});

const DATA_FILE = path.join(__dirname, 'preguntas.json');

// CLAVE SECRETAPARA EL ROL DE EDITOR (Puedes cambiarla aquí)
const CLAVE_EDITOR = "opaaa2026"; 

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

function guardarPreguntas(nuevasPreguntas) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(nuevasPreguntas, null, 2), 'utf8');
  } catch (err) {
    console.error("Error al guardar preguntas:", err);
  }
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

  // Validar clave del editor
  socket.on('verificarEditor', (clave) => {
    if (clave === CLAVE_EDITOR) {
      socket.emit('accesoEditorConcedido', true);
    } else {
      socket.emit('accesoEditorConcedido', false);
    }
  });

  socket.on('agregarPregunta', ({ clave, categoria, pregunta, opciones, correcta, explicacion }) => {
    if (clave !== CLAVE_EDITOR) return;

    if (!bancoPreguntas[categoria]) {
      bancoPreguntas[categoria] = [];
    }

    bancoPreguntas[categoria].push({ pregunta, opciones, correcta, explicacion });
    guardarPreguntas(bancoPreguntas);

    // Notificar a todos los usuarios de la nueva categoría/pregunta
    io.emit('cargarCategorias', Object.keys(bancoPreguntas));
    socket.emit('preguntaGuardadaExito');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
