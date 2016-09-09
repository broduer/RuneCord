/* REQUIRED DEPENDENCIES */
require('dotenv').config();
const Discord = require('discord.js');
const fs      = require('fs');

/* REQUIRED FILES */
const logger       = require('./bot/logger.js');
const versionCheck = require('./bot/versionCheck.js');
const database     = require('./bot/data/database.js');

/* SET OPTIONS AND INIT BOT */
const discordOptions = {'fetch_all_members': true};
const client         = new Discord.Client(discordOptions);

/* MAKE THE BOT CONNECT TO DISCORD, IF NO TOKEN IS SET, DO NOT ATTEMPT TO CONNECT */
function connect() {
  if (!process.env.TOKEN) {
    logger.error('Please setup TOKEN in .env to use RuneCord!');
    process.exit(1);
  }

  client.login(process.env.TOKEN).then(checkDb());
}

/* CHECK TO SEE IF THE DATABASE FILES ARE THERE, IF NOT, MAKE THEM */
function checkDb() {
  try {
    fs.statSync('./bot/data/guilds.json');
  } catch (e) {
    logger.warn('\'bot/data/guilds.json\' doesn\'t exist... Creating!');
    fs.writeFileSync('./bot/data/guilds.json', '{}');
  }
}

/* USED FOR '(eval)' COMMAND, RUNS THE MESSAGE AS A REAL FUNCTION */
function evaluateString(msg) {
  if (msg.author.id != process.env.ADMIN_ID) return; // Make sure only the admin can use this

  var timeTaken = new Date();
  var result;
  logger.info('Running eval...');
  try {
    result = eval(msg.content.substring(7).replace(/\n/g, ''));
  } catch (e) {
    logger.error(e);
    var toSend = [];
    toSend.push(':x: Error evaluating');
    toSend.push('```diff');
    toSend.push('- ' + e);
    toSend.push('```');
    msg.channel.sendMessage(toSend.join(''));
  }
  if (result) {
    var toSend = [];
    toSend.push(':white_check_mark: Evaluated successfully:');
    toSend.push('```');
    toSend.push(result);
    toSend.push('```');
    toSend.push('Time taken: ' + (timeTaken - msg.timestamp) + ' ms');
    msg.channel.sendMessage(toSend.join('')).then(logger.info('Result: ' + result));
  }
}

/* POST STATS TO VARIOUS WEBSITES */
function stats() {

  /* BOTS.DISCORD.PW STATS */
  if (process.env.DISCORD_BOTS_KEY) {
    request.post({
      'url': 'https://bots.discord.pw/api/bots/' + client.user.id + '/stats',
      'headers': {'content-type': 'application/json', 'Authorization': process.env.DISCORD_BOTS_KEY},
      'json': true,
      body: {
        'server_count': client.guilds.array().length
      }
    }, (err, res, body) => {
      if (err || res.statusCode != 200) {
        logger.error('Error updating stats at bots.discord.pw: Status code: ' + res.statusCode + ' Error: ' + err);
      }
      logger.info('Updated stats at bots.discord.pw to ' + client.guilds.array().length);
    });
  }

  /* CARBONITEX.NET STATS */
  if (process.env.CARBON_KEY) {
    request.post({
      'url': 'https://www.carbonitex.net/discord/data/botdata.php',
      'headers': {'content-type': 'application/json'},
      'json': true,
      body: {
        'key': process.env.CARBON_KEY,
        'servercount': client.guilds.array().length
      }
    }, (err, res, body) => {
      if (err || res.statusCode != 200) {
        logger.error('Error updating stats at carbonitex.net: Status code: ' + res.statusCode + ' Error: ' + err);
      }
      logger.info('Updated stats at carbonitex.net to ' + client.guilds.array().length);
    });
  }
}

/* UPDATE STATS EVERY HOUR */
setInterval(stats, 3600000);

/* WHEN BOT SENDS READY EVENT */
client.on('ready', () => {
  logger.info('RuneCord is ready! Listening to ' + client.channels.array().length + ' channels on ' + client.guilds.array().length + ' guilds.');
  versionCheck.checkForUpdate();
  setTimeout(() => {
    database.checkGuilds(client)
  }, 10000);
});

/* WHEN BOT JOINS A NEW GUILD */
client.on('guildCreate', (guild) => {
  if (database.guildIsNew(guild)) {
    logger.info(chalk.bold.green('[JOINED] ') + guild.name);
    if (config.banned_server_ids && config.banned_server_ids.indexOf(guild.id) > -1) {
      logger.error('Joined guild but it was on the ban list: ' + guild.name);
      guild.defaultChannel.sendMessage('This server is on the ban list, please contact the bot creator to find out why.');
      setTimeout(() => {
        guild.leave();
      }, 1000);
    } else {
      database.addGuild(guild);
    }
  } else {
    if (config.whitelist.indexOf(guild.id) == -1) {
      var toSend = [];
      toSend.push(':wave: Hi! I\'m **' + client.user.username + '**');
      toSend.push('You can use `' + config.command_prefix + 'help` to see what I can do. Moderators can use `' + config.mod_command_prefix + 'help` for moderator commands.');
      toSend.push("Moderator/Administrator commands *including bot settings* can be viewed with `" + config.mod_command_prefix + "help`");
      toSend.push("For help, feedback, bugs, info, changelogs, etc. go to **<https://discord.me/runecord>**");
      guild.defaultChannel.sendMessage(toSend.join(''));
    }
  }
});

/* WHEN THE BOT RECEIVES A MESSAGE */
client.on('message', (msg) => {
  if (msg.author.id == client.user.id) return; // Do nothing if the message comes from the bot
  if (msg.content.startsWith('(eval) ')) {
    if (msg.author.id == process.env.ADMIN_ID) {
      evaluateString(msg);
      return;
    } else {
      msg.channel.sendMessage('```diff\n- You do not have permission to use that command!```');
      return;
    }
  }
});

connect();
