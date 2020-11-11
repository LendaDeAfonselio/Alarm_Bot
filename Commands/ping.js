module.exports = {
  name: 'ping',
  description: 'Ping!',
  execute(msg, args, client, cron, cron_list, mongoose) {
    msg.channel.send('pong');
  },
};