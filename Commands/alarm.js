

module.exports = {
    name: 'alarm',
    description: 'start an alarm',
    usage: '<prefix>alarm <m> <h> <weekday> <month> <year> <message> <role>',
    execute(msg, args, client) {
        var crono = args.slice(0,5).join(' ');
        var message_stg = args.slice(5, args.length - 1).join('');
        var role = args[args.length - 1];

        let scheduledMessage = new cron.CronJob(crono, () => {
            msg.channel.send(`${message_stg}! ${role}`);

        }, {
            scheduled: true
        });
        scheduledMessage.start();

        // needs to send a callback with the alarm name for it to be canceled later

    }
};