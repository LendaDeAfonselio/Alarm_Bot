const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const temp_flag = auth.one_time_prefix;
const logging = require('../Utils/logging');

module.exports = {
    name: 'activateAllAlarms',
    description: 'Activates all alarms that are currently silent.\n-p to activate all private alarms and -a to activate all regular alarms on the server',
    usage: auth.prefix + 'activateAllAlarms <type>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {
            let flag = args[0].toLowerCase();
            let alarm_user = msg.author.id;

            try {
                if (flag === '-p') {
                    var x = await Private_alarm_model.find(
                        { isActive: false, user_id: alarm_user },
                        {
                            isActive: true
                        }
                    );

                    // update in memory list
                    console.log(x);
                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].start();
                    });

                    await Private_alarm_model.updateMany(
                        { isActive: false, user_id: alarm_user },
                        { isActive: true }
                    );
                    msg.channel.send(`Sucesfully silenced ${x.length} private alarms.`);

                } else if (flag === 'a') {
                    var x = await Alarm_model.find(
                        { isActive: false, guild: msg.guild.id, alarm_id: { $regex: `.*${alarm_user}.*` } },
                        { isActive: true }
                    );
                    console.log(x);
                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].start();
                    });

                    await Alarm_model.updateMany(
                        { isActive: false, guild: msg.guild.id, alarm_id: { $regex: `.*${alarm_user}.*` } },
                        { isActive: true }
                    );
                    msg.channel.send(`Sucesfully silenced ${x.length} alarms.`);
                } else {
                    msg.channel.send(`The flag you have provided: ${flag} is invalid. Try silenceAllAlarms -p to silent all of your private alarms or -a to silent all of your alarms in this server.`);
                }

            } catch (e) {
                logging.logger.info(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
                logging.logger.error(e);
                msg.channel.send(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
            }
        }
        else {
            msg.channel.send(`No arguments were passed to execute this command.\n`
                + 'Usage: ' + this.usage);
        }
    }
};