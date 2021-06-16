const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
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
                    let x = await Private_alarm_model.find(
                        { isActive: false, user_id: alarm_user }
                    );

                    // update in memory list
                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].start();
                    });

                    await Private_alarm_model.updateMany(
                        { isActive: false, user_id: alarm_user },
                        { isActive: true }
                    );
                    msg.channel.send(`Sucesfully re-activated ${x.length} private alarms.`);

                } else if (flag === '-a') {
                    if (msg.channel.type === 'dm') {
                        msg.channel.send('Can only activate public alarms in a server, otherwise the bot does not know which alarms to activate.');
                        return;
                    }

                    let x = await Alarm_model.find(
                        { isActive: false, guild: msg.guild.id, user_id: alarm_user });

                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].start();
                    });

                    await Alarm_model.updateMany(
                        { isActive: false, guild: msg.guild.id, user_id: alarm_user },
                        { isActive: true }
                    );
                    msg.channel.send(`Sucesfully re-activated ${x.length} alarms.`);
                } else {
                    msg.channel.send(`The flag you have provided: ${flag} is invalid. Try silenceAllAlarms -p to silent all of your private alarms or -a to silent all of your alarms in this server.`);
                }

            } catch (e) {
                logging.logger.info(`Error activating all alarm. ${flag}`);
                logging.logger.error(e);
                msg.channel.send(`Error activating all alarms`);
            }
        }
        else {
            msg.channel.send(`No arguments were passed to execute this command.\n`
                + 'Usage: ' + this.usage);
        }
    }
};