'use strict';
const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');
const alarm_db = require('../data_access/alarm_index');
const auth = require('./../auth.json');
const logging = require('../Utils/logging');
const utility_functions = require('../Utils/utility_functions');
const { SlashCommandBuilder } = require('@discordjs/builders');


module.exports = {
    name: 'deleteAllAlarms',
    description: 'Deletes all of YOUR alarms in the server - **THIS ACTION CANNOT BE REVERTED**\n' +
        '-a for public alarms of that server; -p for private alarms; -oa for public one time alarms; -op for private one time alarms',
    usage: `\`${auth.prefix}deleteAllAlarms -a\`; or \`${auth.prefix}deleteAllAlarms -p\`; or \`${auth.prefix}deleteAllAlarms -oa\`; or \`${auth.prefix}deleteAllAlarms -op\`\nUse -a to silence all private alarms,
     -p for private alarms; -oa for public one time alarms; -op for private one time alarms`,
    data: new SlashCommandBuilder()
        .setName('deleteallalarms')
        .setDescription('Deletes all of YOUR alarms in the server'),
    async execute(msg, args, client, cron, cron_list, mongoose) {
        let flag = args[0];
        let alarm_user = msg.author.id;
        if (args.length > 0) {
            if (flag.toLowerCase() === '-p') {
                try {
                    let to_be_removed = await Private_alarm_model.find(
                        { user_id: alarm_user },
                    );
                    if (to_be_removed.length > 0) {
                        let x = await Private_alarm_model.deleteMany(
                            { user_id: alarm_user },
                        );
                        to_be_removed.find(function (i) {
                            cron_list[i.alarm_id].stop();
                            delete cron_list[i.alarm_id];
                        });
                        msg.channel.send(`Sucessfully deleted ${x.deletedCount} alarms.`);
                    } else {
                        msg.channel.send('No private alarm found for your user, only private `oneTimeAlarm`s will be deleted. Try `myAlarms` to check your alarms.');
                    }
                } catch (e) {
                    logging.logger.error(e);
                    msg.channel.send('Error deleting your private alarms...');
                }
            }
            else if (flag.toLowerCase() === '-a') {
                if (msg.channel.type === 'dm') {
                    msg.channel.send('Can only delete public alarms in a server, otherwise the bot does not know which alarms to delete.');
                    return;
                }
                try {
                    let to_be_removed = await Alarm_model.find({
                        $and: [
                            { user_id: alarm_user },
                            { guild: msg.guild.id },
                        ]
                    });
                    if (to_be_removed.length > 0) {
                        //delete regular alarms
                        let y = await Alarm_model.deleteMany({
                            $and: [
                                { user_id: alarm_user },
                                { guild: msg.guild.id },
                            ]
                        });
                        to_be_removed.find(function (i) {
                            if (cron_list[i.alarm_id] !== undefined) {
                                cron_list[i.alarm_id].stop();
                                delete cron_list[i.alarm_id];
                            }
                        });
                        msg.channel.send(`Sucessfully deleted ${y.deletedCount} alarms.`);
                    } else {
                        msg.channel.send('No alarm found for you in this server. Try `myAlarms` to check your alarms');
                    }
                } catch (e) {
                    logging.logger.info(`Error deleting alarms for user:${alarm_user} with params ${flag}`);
                    logging.logger.error(e);
                    msg.channel.send('Error deleting your alarms...');
                }
            }
            else if (flag.toLowerCase() === '-op') {
                let private_ota = await alarm_db.get_all_oneTimeAlarm_from_user(alarm_user, true, '');
                private_ota.find(function (i) {
                    if (cron_list[i.alarm_id] !== undefined) {
                        cron_list[i.alarm_id].stop();
                        delete cron_list[i.alarm_id];
                    }
                });
                let f = await alarm_db.delete_all_private_oneTimeAlarm_from_user(alarm_user);
                msg.channel.send(`Sucessfully deleted ${f.deletedCount} alarms.`);

            }
            else if (flag.toLowerCase() === '-oa') {
                if (msg.channel.type === 'dm') {
                    msg.channel.send('Can only delete public one time alarms in a server, otherwise the bot does not know which alarms to delete.');
                    return;
                }
                let als = await alarm_db.get_all_oneTimeAlarm_from_user(alarm_user, false, msg.guild.id);
                als.find(function (i) {
                    if (cron_list[i.alarm_id] !== undefined) {
                        cron_list[i.alarm_id].stop();
                        delete cron_list[i.alarm_id];
                    }
                });
                let n = await alarm_db.delete_all_public_oneTimeAlarm_from_user(alarm_user, msg.guild.id);
                msg.channel.send(`Sucessfully deleted ${n.deletedCount} alarms.`);
            } else if (flag.toLowerCase() == '-tts') {
                if (msg.channel.type === 'dm') {
                    msg.channel.send('Can only delete tts alarms in a server, otherwise the bot does not know which alarms to delete.');
                    return;
                }
                let tts_alarms = await alarm_db.get_all_ttsalarms_from_user_and_guild(alarm_user, msg.guild.id);
                tts_alarms.find((i) => { utility_functions.deleteFromCronList(cron_list, i) });
                let num_del_tts = await alarm_db.delete_all_ttsAlarm_from_user(alarm_user, msg.guild.id);
                msg.channel.send(`Sucessfully deleted ${num_del_tts.deletedCount} tts alarms.`);
            }
        } else {
            let stg = "You did not specify what alarms you wish to delete.\n"
                + "`:deleteAllAlarms -p` deletes all of your private alarms.\n"
                + "`:deleteAllAlarms -a` deletes **YOUR** alarms for this server.\n"
                + "`:deleteAllAlarms -tts` deletes **YOUR** TTS alarms for this server.\n"
                + "`:deleteAllAlarms -oa` deletes **YOUR** one time alarms in the server you are using.\n"
                + "`:deleteAllAlarms -op` deletes your private one time alarms";
            msg.channel.send(stg.replace(/:/g, auth.prefix));
        }
    }
};