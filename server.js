const express = require('express');
const socket = require('socket.io');

const app = express();
const PORT = process.env.PORT || 4002;

const server = app.listen(PORT, () => {
  console.log('listening to request on port 4002');
});

app.use(express.static('./client'));

app.get(/(^\/[0-9]+$)/, (req, res) => {
  res.sendFile(__dirname + '/client/index.html');
});

const io = socket(server);

const games = {};

io.on('connect', (socket) => {
  socket.on('joinroom', (code) => {
    const game = games[code];
    if (game && game.playersNumber > Object.keys(game.players).length) {
      socket.join(code);
      game.words[socket.id] = [];

      game.players[`${socket.id}`] = {
        points: 0,
        name: socket.id,
      };

      io.to(code).emit('playerchange', game);

      console.log('games');
      console.dir(games, { depth: null });

      socket.emit('prepareGame', game);

      socket.on('disconnect', () => {
        disconnect(socket, game);
      });
    } else if (code !== '') {
      socket.emit('wrongRoom');
    }
  });

  socket.on('host', ({ categories, playersNumber, rounds, time }) => {
    const code = Math.floor(Math.random() * 9001 + 1000);
    // const code = 2000;

    socket.join(code);
    games[code] = {
      id: code,
      categories: categories,
      players: {
        [socket.id]: {
          points: 0,
          name: socket.id + '[HOST]',
        },
      },
      words: { [socket.id]: [] },
      playersNumber: playersNumber,
      rounds: rounds,
      roundsCounter: 0,
      roundTime: time,
      alphabet: 'ABCDEFGHIJKLMNOPRSTUWZ',
      checkDuplicatesCounter: 0,
    };

    const game = games[code];

    socket.emit('setcode', { code: code, id: socket.id, roundTime: game.roundTime });
    socket.emit('playerchange', game);

    socket.on('disconnect', () => {
      //delete game if host leaves
      disconnect(socket, game);
      delete games[code];

      if (io.sockets.adapter.rooms[code]) {
        io.sockets.adapter.rooms[code].sockets = {};
      }
    });
  });

  socket.on('ready', (code) => {
    const game = games[code];

    if (game) {
      game.players[socket.id].isReady = true;
      io.to(code).emit('playerchange', game);

      const readyPlayers = Object.values(game.players)
        .map((player) => player.isReady === true)
        .filter((value) => value);

      if (readyPlayers.length == game.playersNumber) {
        const alphabet = game.alphabet;
        let random = alphabet[Math.floor(Math.random() * alphabet.length)];

        game.alphabet = alphabet.replace(random, '');
        game.letter = random;

        Object.values(game.players).forEach((player) => (player.isReady = false));

        io.to(code).emit('start', { game: game, code: code });
      }
    }
  });

  socket.on('endround', (code) => {
    io.to(code).emit('getWords', games[code]);
  });

  socket.on('wordlist', ({ wordList, code }) => {
    const game = games[code];

    game.checkDuplicatesCounter++;
    game.words[socket.id] = wordList;

    game.players[socket.id].words = wordList;

    wordList.forEach((word) => {
      if (word != '---') {
        game.players[socket.id].points += 2;
      }
    });

    if (game.checkDuplicatesCounter == Object.keys(game.players).length) {
      // sprawdzamy duplikaty, jeśli są wszystkie słowa
      game.checkDuplicatesCounter = 0;

      game.categories.forEach((el, i) => {
        let words = [];

        Object.values(game.words).forEach((el) => words.push(el[i]));

        const duplicates = getDuplicates(words);

        if (duplicates.length > 1) {
          duplicates.forEach((index) => {
            game.players[Object.keys(game.players)[index]].points -= 1;
          });
        }
      });

      game.roundsCounter++;
      if (game.roundsCounter == game.rounds) {
        Object.keys(game.players).forEach((player) => {
          game.players[player].words = null;
        });

        io.to(code).emit('endgame', { players: game.players, code: code });
      }

      io.to(code).emit('playerchange', game);

      socket.on('deleteGame', () => {
        socket.leave(code);
        delete game;
      });
    }

    console.log('games');
    console.dir(games, { depth: null });
  });
});

const disconnect = (socket, game) => {
  if (game && Object.keys(game.players).length === 1) {
    delete game;
  } else if (game) {
    delete game.players[socket.id];
    delete game.words[socket.id];
    socket.leave(game.id);
    io.to(game.id).emit('playerchange', game);
  }
};

const getDuplicates = (array) => {
  var duplicates = [];
  for (let i = 0; i < array.length; i++) {
    if (array.filter((el) => el != array[i]).length < array.length - 1 && array[i] !== '---') {
      duplicates.push(i);
    }
  }
  return duplicates;
};
