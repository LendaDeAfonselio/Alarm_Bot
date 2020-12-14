const Alarm_model = require('../models/alarm_model');
const auth = require('./../auth.json');
const time_utils = require('../Utils/time_validation');
const utils = require('../Utils/utility_functions');

module.exports = {
    name: 'alarm',
    description: 'Sets up an alarm that will be repeated\n' +
        'This alarm will send a message to the _channel_ of the _server_ in which it is activated.\n'
        + 'The parameter <target> is optional.',
    usage: auth.prefix + 'alarm <m> <h> <month> <weekday> <message> <target>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (utils.hasAlarmRole(msg, auth.alarm_role_name) || utils.isAdministrator(msg)) {
            var crono = args.slice(0, 5).join(' ');
            var message_stg = args.slice(5, args.length).join(' ');
            if (time_utils.validate_alarm_parameters(msg, crono, message_stg)) {
                var guild = msg.guild.id;

                try {
                    let scheduledMessage = new cron(crono, () => {
                        msg.channel.send(`${message_stg}`);
                    }, {
                        scheduled: true
                    });
                    scheduledMessage.start();
                    let alarm_user = msg.author.id;
                    let this_alarm_id = Math.random().toString(36).substring(4);
                    let alarm_id = `${this_alarm_id}_${alarm_user}`;
                    // save locally
                    cron_list[alarm_id] = scheduledMessage;

                    // save to DB
                    const newAlarm = new Alarm_model({
                        _id: mongoose.Types.ObjectId(),
                        alarm_id: alarm_id,
                        alarm_args: crono,
                        message: message_stg,
                        guild: guild,
                        channel: msg.channel.id,
                        timestamp: Date.now(),
                    });
                    newAlarm.save()
                        .then((result) => {
                            console.log(`${result} added to database`);
                            msg.channel.send({
                                embed: {
                                    fields: { name: 'Alarm added successfully!', value: `Alarm with params: ${crono} and message ${message_stg} for channel ${msg.channel.name} was added with success!` },
                                    timestamp: new Date()
                                }
                            });
                        })
                        .catch(err => console.log(err));
                } catch (err) {
                    console.error(err);
                    msg.channel.send(`Error adding the alarm with params: ${crono}, for target ${target}`);
                }
            }
        }
        else {
            msg.channel.send('You do not have permissions to set that alarm! Ask for the admins on your server to give you the `Alarming` role!');
        }
    }
};
