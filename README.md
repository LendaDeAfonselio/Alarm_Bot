# AlarmBot
A Simple Discord Bot that allows people/roles to set up alarms and receive them via DM or in a certain channel 

## Module installs:
- npm install discord.js
- npm i cron
- npm i mongoose
- npm i file-system
- npm i timezones.json

## Usage and examples

The parameters for `alarm` and `privateAlarm` work as follows:

```
    # Use the hash sign to prefix a comment
    # +---------------- minute (0 - 59)
    # |  +------------- hour (0 - 23)
    # |  |  +---------- day of month (1 - 31)
    # |  |  |  +------- month (0 - 11)
    # |  |  |  |  +---- day of week (0 - 7) (Sunday=0 or 7)
    # |  |  |  |  |
    # *  *  *  *  *  command to be executed
```

**Some semantics:**

`*/x` => Every number that divides by x, for example: `*/15`  would be 15, 30 and 45 -> If you want to use this I strongly advise to use in the timezone of the bot, otherwise the behavior might not be as expected.

`x1,...,xn` => Defines a set with specific values, for example: `1,3,5` would be mean 1, 3 and 5 **ONLY**

`x1-xn`=>  Defines a set with all values within that interval, for example : `1-5` would mean every number between 1 and 5 including the extremes, *i.e* - `1,2,3,4,5`

### Examples:

**Sending `hello` everyday at 19:35 (GMT)** => `$alarm GMT 35 19 * * * Hello!`

**Sending `Greetings` wednesday at 19:35** => `$alarm GMT 35 19 * * 3 Greetings!`

**Sending `1234!` at the 23rd of every month at 19:35** => `$alarm GMT 35 19 23 * * 1234!`

**Sending `Goodbye` every Monday, Wednesday and Friday at 19:00** => `$alarm GMT 00 19 * * 1,3,5 Goodbye`

**Send `aaa` hourly from 9 to 19 everyday** => `$alarm GMT 0 9-19 * * * aaa`

**Send `aaa` every 30 minutes from 9 to 19(excluding) everyday** => `$alarm GMT */30 9-18 * * * aaa`

### Available Commands:

Currently the bot has the following commands:

- `help` - Help command with all you need to know about the bot and the commands!
- `alarm` - Sets up an alarm to the channel in which you're sending the message.
- `alarmHelp` - Some examples and help on how to setup an alarm.
- `deleteAlarm` - deletes an alarm given an id.
- `myAlarms` - Shows you a list of your public and private alarms.
- `oneTimeAlarm` - Sets up an one time alarm, use -p for a private alarm!
- `ping` - Just to check if the bot is alive.
- `privateAlarm`- Sets up a private alarm via DM.
