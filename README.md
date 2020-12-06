# AlarmBot
A Simple Discord Bot that allows people/roles to set up alarms and receive them via DM or in a certain channel 

## Module installs:
- npm install discord.js
- npm i cron
- npm i mongoose
- npm i file-system

## Usage and examples

The parameters for `alarm` and `privateAlarm` work as follows:

```
    # Use the hash sign to prefix a comment
    # +---------------- minute (0 - 59)
    # |  +------------- hour (0 - 23)
    # |  |  +---------- day of month (1 - 31)
    # |  |  |  +------- month (1 - 12)
    # |  |  |  |  +---- day of week (0 - 7) (Sunday=0 or 7)
    # |  |  |  |  |
    # *  *  *  *  *  command to be executed
```

**Some semantics:**

`*/x` => Every number that divides by x, for example: `*/15`  would be 15, 30 and 45 

`x1,...,xn` => Defines a set with specific values, for example: `1,3,5` would be mean 1, 3 and 5 **ONLY**

`x1-xn`=>  Defines a set with all values within that interval, for example : `1-5` would mean every number between 1 and 5 including the extremes, *i.e* - `1,2,3,4,5`

### Examples:

**Sending `hello` everyday at 19:35** => `$alarm 35 19 * * * Hello!`

**Sending `Greetings` wednesday at 19:35** => `$alarm 35 19 * * 3 Greetings!`

**Sending `1234!` at the 23rd of every month at 19:35** => `$alarm 35 19 23 * * 1234!`

**Sending `Goodbye` every Monday, Wednesday and Friday at 19:00** => `$alarm  00 19 * * 1,3,5`

**Send `aaa` hourly from 9 to 19 everyday** => `$alarm * 9-19 * * * aaa`

**Send `aaa` every 30 minutes from 9 to 19(excluding) everyday** => `$alarm */30 9-18 * * * aaa`

