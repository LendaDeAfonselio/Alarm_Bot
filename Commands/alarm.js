
var global_id = 1;
module.exports = {
    name: 'alarm',
    description: 'Sets up an alarm that will be repeated',
    usage: '<prefix>alarm <m> <h> <weekday> <month> <year> <message> <role>',
    execute(msg, args, cron) {
        console.log(global_id);
        var this_alarm_id = global_id;
        global_id += 1;
        var crono = args.slice(0, 5).join(' ');
        var message_stg = args.slice(5, args.length - 1).join('');
        var role = args[args.length - 1];

        let scheduledMessage = new cron.scheduleJob(this_alarm_id, crono, () => {
            msg.channel.send(`${message_stg}! ${role}`);

        });
        scheduledMessage.start();

        // needs to send a callback with the alarm name for it to be canceled later

    }
};