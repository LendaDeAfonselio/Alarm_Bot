"use strict";
module.exports = {
  name: 'ping',
  description: 'Ping!',
  usage: 'ping',
  async execute(msg, args, client, cron, cron_list, mongoose) {
   await msg.channel.send('pong');
  },
};