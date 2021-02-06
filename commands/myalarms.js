const auth = require('./../auth.json');
const utility = require('./../Utils/utility_functions');
const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');
const oneTimeAlarm = require('./oneTimeAlarm');
module.exports = {
    name: 'myAlarms',
    description: 'Fetches all of your alarms.',
    usage: auth.prefix + 'myAlarms',
    async execute(msg, args, client, cron, cron_list, mongoose) {

        var results_pub = await Alarm_model.find({ "alarm_id": { $regex: `.*${msg.author.id}.*` } });
        var results_priv = await Private_alarm_model.find({ "user_id": msg.author.id });

        let general_alarms = createMessageWithEntries(results_pub);
        let private_alarms = createMessageWithEntries(results_priv);

        for (let k of Object.keys(oneTimeAlarm.oneTimeAlarmList)) {
            if (k.includes(msg.author.id)) {
                let alarm_id = k;
                let v = oneTimeAlarm.oneTimeAlarmList[k];
                let alarm_params = v.date;
                let alarm_preview = v.message.substring(0, 50);

                let field = {
                    name: `ID: ${alarm_id}`,
                    value: `\tWith params: ${alarm_params}\nMessage: ${alarm_preview}\n**One time alarm**!`
                };
                if (v.isPrivate) {
                    private_alarms.push(field);
                } else {
                    general_alarms.push(field);
                }
            }
        }
        // chunk it because of the max size for discord messages
        var public_chunks = utility.chunkArray(general_alarms, 20);
        var private_chunks = utility.chunkArray(private_alarms, 20);

        if (general_alarms.length <= 0 && oneTimeAlarms_list.length <= 0) {
            msg.channel.send('You do not have alarms in any server!');
        }

        const title_message = "Your public alarms are:";

        // send public alarms
        sendChunksAsPublicMsg(public_chunks, msg, title_message);


        // send private alarms
        for (let chunk of private_chunks) {
            msg.author.send({
                embed: {
                    color: 0xcc0000,
                    title: "Your private alarms are:",
                    fields: chunk,
                    timestamp: new Date()
                }
            });
        }

    }
}

function sendChunksAsPublicMsg(public_chunks, msg, title_message) {
    for (let chunk of public_chunks) {
        msg.channel.send({
            embed: {
                color: 0xff80d5,
                title: title_message,
                fields: chunk,
                timestamp: new Date()
            }
        });
    }
}

function createMessageWithEntries(results_pub) {
    let general_alarms = [];
    for (let alarm of results_pub) {
        let alarm_id = alarm.alarm_id;
        let alarm_params = alarm.alarm_args;
        let alarm_preview = alarm.message.substring(0, 50);
        let active_alarm = alarm.isActive ? "Active" : "Silenced";
        let field = {
            name: `ID: ${alarm_id}`,
            value: `\tWith params: ${alarm_params}\nMessage: ${alarm_preview}\n${active_alarm}`
        };
        general_alarms.push(field);
    }
    return general_alarms;
}
