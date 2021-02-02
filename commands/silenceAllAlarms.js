"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const logging = require('../Utils/logging');

module.exports = {
    name: 'silenceAllAlarms',
    description: 'Silences all alarms until they are reactivate.\n-p to silence all private alarms and -a to silence all regular alarms on the server',
    usage: auth.prefix + 'silenceAllAlarms <type>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {
            let flag = args[0].toLowerCase();
            let alarm_user = msg.author.id;

            try {
                if (flag === '-p') {
                    var x = await Private_alarm_model.find(
                        { isActive: true, user_id: alarm_user }
                    );

                    // update in memory list
                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].stop();
                    });

                    await Private_alarm_model.updateMany(
                        { isActive: true, user_id: alarm_user },
                        {
                            isActive: false
                        }
                    );
                    msg.channel.send(`Sucesfully silenced ${x.length} private alarms.`);

                } else if (flag === '-a') {
                    if (msg.channel.type === 'dm') {
                        msg.channel.send('Can only silence public alarms in a server, otherwise the bot does not know which alarms to silence.');
                        return;
                    }
                    var x = await Alarm_model.find(
                        { isActive: true, guild: msg.guild.id, alarm_id: { $regex: `.*${alarm_user}.*` } });

                    x.forEach(alarm => {
                        cron_list[alarm.alarm_id].stop();
                    });

                    await Alarm_model.updateMany(
                        { isActive: true, guild: msg.guild.id, alarm_id: { $regex: `.*${alarm_user}.*` } },
                        { isActive: false }
                    );
                    msg.channel.send(`Sucesfully silenced ${x.length} alarms.`);
                } else {
                    msg.channel.send(`The flag you have provided: ${flag} is invalid. Try silenceAllAlarms -p to silent all of your private alarms or -a to silent all of your alarms in this server.`);
                }

            } catch (e) {
                logging.logger.info(`Error silencing all alarm ${flag}`);
                logging.logger.error(e);
                msg.channel.send(`Error silencing all alarms`);
            }
        }
        else {
            msg.channel.send(`No arguments were passed to execute this command.\n`
                + 'Usage: ' + this.usage);
        }
    }
};