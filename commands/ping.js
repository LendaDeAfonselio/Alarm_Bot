"use strict";
module.exports = {
  name: 'ping',
  description: 'Ping!',
  usage: 'ping',
  execute(msg, args, client, cron, cron_list, mongoose) {
    msg.channel.send('pong');
  },
};