module.exports = {
    name: 'ping',
    description: 'Ping!',
    execute(msg, args, client, cron_list) {
      msg.channel.send('pong');
    },
  };