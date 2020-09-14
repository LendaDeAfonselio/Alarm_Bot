var global_id = 0;
module.exports = {
    name: 'alarm',
    description: 'Sets up an alarm that will be repeated',
    usage: '<prefix>alarm <m> <h> <weekday> <month> <year> <message> <target>',
    execute(msg, args, client, cron, cron_list) {
        global_id += 1;
        var crono = args.slice(0, 5).join(' ');
        var message_stg = args.slice(5, args.length - 1).join(' ');
        var target = args[args.length - 1];

        try {
            let scheduledMessage = new cron(crono, () => {
                msg.channel.send(`${message_stg}! ${target}`);
            }, {
                scheduled: true
            });
            scheduledMessage.start();
            let this_alarm_id = global_id;
            let alarm_user = msg.author.id;
            let alarm_id = `${this_alarm_id}_${alarm_user}`;
            cron_list[alarm_id] = scheduledMessage;
        } catch (err) {
            console.err(err);
        }

        // needs to send a callback with the alarm name for it to be canceled later

    }
};