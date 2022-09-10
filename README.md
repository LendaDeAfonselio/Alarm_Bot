# AlarmBot
A Discord Bot that allows users to set up alarms periodic or one time alarms and receive them via DM or in a certain channel.

You can check out the bot's page on [top.gg](https://top.gg/bot/754350217876340816) to invite AlarmBot to your server!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/A0A07J64F)

## Module installs:
- `npm i discord.js`
- `npm i cron`
- `npm i mongoose`
- `npm i file-system`
- `npm i timezones.json`
- `npm i winston`
- `npm i pm2`
- `npm install @discordjs/rest discord-api-types`
- `npm install @discordjs/builders`
- `npm i @discordjs/rest`
- `npm i discord-hybrid-sharding`
## Running the bot

**Steps to run the bot**:

1. Install `Node.Js` on your machine (I use `v16.14.2` but the latest stable version should also work, previous versions can have problems).
2. Install all of the necessary node modules (you can install them individually or use `nodeInstall.sh`).
3. Go to `appsettings.json` and insert a discord bot token in the `token` field and a url to a mongodb database in `mongo_db_url`. Instructions to [get a token for a discord bot](https://www.writebots.com/discord-bot-token/). Instructions to [setup a mongo database](https://docs.atlas.mongodb.com/connect-to-cluster/).
4. Run the node script `deployCommands.js` with `$node deployCommands.js` 
5. Use the command `$pm2 start index.js` in the project's folder.


Do be aware that some DNS setting may have issues interacting with discord js v13 and mongo, therefore you should check [if you can query your mongo cluster](https://stackoverflow.com/questions/68875026/error-querysrv-eservfail-mongodb-tcp-cluster0-abcd0-mongodb-net) and if not, try using the Google DNS.

## Usage and examples

The parameters for `alarm` and `privateAlarm` work as follows:

```
    # Use the hash sign to prefix a comment
    # +---------------- minute (0 - 59)
    # |  +------------- hour (0 - 23)
    # |  |  +---------- day of month (1 - 31)
    # |  |  |  +------- month (0 - 11)
    # |  |  |  |  +---- day of week (0 - 6) (Sunday=0, Monday=1, ...)
    # |  |  |  |  |
    # *  *  *  *  *  command to be executed
```

**Some semantics:**

`*/x` => Every number that divides by x, for example: `*/15`  would be 15, 30 and 45 -> For now, if you want to use this I strongly advise to use in the timezone of the bot(Dublin's time), otherwise the behavior might not be the expected.

`x1,...,xn` => Defines a set with specific values, for example: `1,3,5` would be mean 1, 3 and 5 **ONLY**.

`x1-xn`=>  Defines a set with all values within that interval, for example : `1-5` would mean every number between 1 and 5 including the extremes, *i.e*. - `1,2,3,4,5`.

### Examples of `alarm` usage:

**Sending `hello` everyday at 19:35 (GMT)** => `$alarm GMT 35 19 * * * Hello!`

**Sending `hello` everyday at 19:35 for GMT timezone in #general channel** => `$alarm GMT 35 19 * * * Hello! #general`

**Sending `Greetings` wednesday at 19:35** => `$alarm GMT 35 19 * * 3 Greetings!`

**Sending `1234!` at the 23rd of every month at 19:35** => `$alarm GMT 35 19 23 * * 1234!`

**Sending `Goodbye` every Monday, Wednesday and Friday at 19:00** => `$alarm GMT 00 19 * * 1,3,5 Goodbye`

**Send `aaa` hourly from 9 to 19 everyday** => `$alarm GMT 0 9-19 * * * aaa`

**Send `aaa` every 30 minutes from 9 to 12(excluding) everyday** => `$alarm GMT */30 9-12 * * * aaa`

**Note:** These examples also work for the privateAlarm command by replacing alarm with privateAlarm.

### Some examples `oneTimeAlarm` usage:

**Sending `Hello` today at 19:00 for GMT timezone** => `$oneTimeAlarm GMT 19:00 Hello`

**Sending `Hello` via DM, today at 19:00 for GMT timezone** => `$oneTimeAlarm -p GMT 19:00 Hello`

**Sending `Hello world` in the 25th of April of the current year at 8:00 for GMT timezone**=> `$oneTimeAlarm GMT 8:00 25/04 Hello World`

**Sending `Alarm bot do something!` in the 25th of April of 2024 at 8:00 for GMT timezone** => `$oneTimeAlarm GMT 8:00 25/04/2024 Alarm bot do something!`

**Note:** `-p` flag is used to receive a DM instead of a message in the channel.

### Available Commands:

Currently the bot has the following commands:

- `help` - Help command with all you need to know about the bot and the commands.
    - Usage example: `$help`
- `activateAlarm` - Reactivates a silenced alarm.
    - Usage example: `$activateAlarm id123`
- `activateAllAlarms` - Reactives **all**  silenced alarms.
    - Usage example: `$activateAllAlarm -a` or `$activateAllAlarm -p`
- `alarm` - Sets up an alarm to the channel in which you're sending the message. If you wish to send the alarm to a specific channel, the last "word" of the message should be the channel that you desire to send the message to (examples above).
    - Usage example: `$alarm GMT 30 12 * * * aaa`
- `alarmHelp` - Some examples and help on how to setup an alarm.
    - Usage example: `$alarmHelp`
- `deleteAlarm` - Deletes an alarm given an id.
    - Usage example: `$deleteAlarm id123`
- `deleteAllAlarms` - Deletes **all** private alarms or alarms that **YOU** have set in a server.
    - Usage example: `$deleteAllAlarms -a` or `$deleteAllAlarms -p` 
- `editAlarm` - Edits the message of an alarm using `-m` flag. Edits the periodicity of an alarm using the `-c` flag. Edits the message and periodicity of the alarm using `-c -m` flags.
    - Usage examples: `$editAlarm -m id123 Brand new message` / `$editAlarm -c id123 GMT 36 23 * * *` / `$editAlarm -c -m id123 GMT 28 23 * * * 🤔 Think Tank 🤔`
- `myAlarms` - Shows you a list of your public and private alarms.
    - Usage example: `$myAlarms`
- `oneTimeAlarm` - Sets up an one time alarm, use -p for a private alarm.
    - Usage example: `$oneTimeAlarm GMT 19:00 Hello`
- `ping` - Just to check if the bot is alive.
    - Usage example: `$ping`
- `premium` - Get information and the link to get AlarmBot premium (75 alarms)
    - Usage example: `$premium`
- `privateAlarm`- Sets up a private alarm via DM.
    - Usage example: `$privateAlarm GMT */30 9-18 * * * aaa`
- `silenceAlarm` - Silences a specific alarm, if you pass a date (ex: 22/03) it will activate once that they arrives otherwise the alarm will be silent activated again with `activateAlarm`.
    - Usage example: `$silenceAlarm id123 23/01`
- `silenceAllAlarms` - Silences all alarms until they are activated again.
    - Usage example: `$silenceAllAlarms -a` or `$silenceAllAlarms -p` 
- `ttsAlarm` - Creates a scheduled alarm in a channel that is read out loud by discord TTS. Same usage as alarm, only changes the command.
    - Usage example: `$ttsAlarm GMT 30 12 * * * aaa`



### Bot Support ###
Join our discord server for more information: https://discord.gg/zV3xnt8zkA
