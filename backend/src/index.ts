import express from 'express';
import { MusicStreamService } from './services/MusicStreamService';

const app = express();
const rooms: any = {};

((() => {
  var musicStreamService = new MusicStreamService('test', 2);

  rooms['constRoom'] = musicStreamService;
})());

app.get('/rooms', (req, res) => {
  const roomsData = Object.keys(rooms).map((roomId) => {
    const room = <MusicStreamService>rooms[roomId];

    return {
      'id': roomId,
      'owner': room.owner,
      'limit': room.connectionsLimit,
      'clientsCount': room.clientsCount,
      'connectable': room.connectionsLimit >= room.clientsCount + 1,
      'playing': room.playing
    }
  });

  return res.send(roomsData);
});

app.get('/start/:roomId/:music', (req, res) => {
  if (rooms[req.params.roomId]) {
    rooms[req.params.roomId]?.start('musics/' + req.params.music);
    return res.send('ok');
  }

  return res.send('Err');
});

app.get('/create/:username/:connectionsLimit', (req, res) => {
  var musicStreamService = new MusicStreamService(req.params.username, Number(req.params.connectionsLimit) || 1);

  rooms[musicStreamService.id] = musicStreamService;
  res.send('ok');
});

app.get('/stream/:roomId', (req, res) => {
  if (rooms[req.params.roomId])
    return rooms[req.params.roomId]?.addCLient(res);
  else
    res.sendStatus(404);
});

app.get('/remove/:roomId/:id', (req, res) => {
  if (rooms[req.params.roomId])
    return res.send(rooms[req.params.roomId]?.removeCLient(req.params.id));

  return res.send('Err');
});

app.listen(3000);