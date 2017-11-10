const googleTTS = require('google-tts-api');
const Discord = require('discord.io');
const config = require('./config');
const utils = require('./utils');

if (!(
  utils.has(config,'discord.token') &&
  utils.has(config,'discord.client.id')
)) {
  console.log("Config does not have all the information needed.");
  process.exit()
}

const botUserTag = `<@${config.discord.client.id}>`;


function ping(bot,textChannelID) {
  bot.sendMessage({
      to: textChannelID,
      message: "pong"
  });
}

function joinPromise(bot,state,voiceChannelID) {
  return new Promise((resolve, reject) => {
    bot.joinVoiceChannel( voiceChannelID , (error => {
      if (error !== null) {
        return reject(error);
      }
      state.voice.last = state.voice.current;
      state.voice.current = voiceChannelID;
      return resolve();
    }));
  });
}

function join(bot,state,line, errBack) {
  line = line.substring('join'.length,line.length).trim();
  const voiceChannelID = line;

  return joinPromise(bot,state,voiceChannelID);
}

function say(bot,state,line,errBack) {
  let languageCode ='en';
  let speed = 1;
  let voiceChannelID = state.voice.current;
  line = line.substring('say'.length,line.length).trim();

  [args, leftover] = utils.parseArgs(line);
  const text = leftover.join(' ');
  console.log(`[say] ${line}`)
  if(text.length === 0) {
    return errBack(new Error('No text given to say.'));
  }

  if(args.speed !== undefined) {
    speed = Number.parseInt(args.speed);
  }
  if(args.lang !== undefined) {
    languageCode = args.lang;
  }
  if(args.channel !== undefined) {
    voiceChannelID = args.channel;
  }

  if(typeof voiceChannelID !== 'string') {
    return errBack(new Error('No Voice Channel Set'));
  }

  return googleTTS(text, languageCode, speed)   // speed normal = 1 (default), slow = 0.24
  .then((url) => {
    return joinPromise(bot,state,voiceChannelID)
    .then(() => {
      // say the things
    })
  })
  .catch(function (err) {
    return errBack(err.stack);
  });

}

function main() {
  const bot = new Discord.Client({
      autorun: true,
      token: config.discord.token,
  });
  const state = {
    voice: {
      current: null,
      last: null,
    }
  }

  
  bot.on('ready', function(event) {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
    console.log();
    console.log('Please auth the app');
    if (utils.has(config,'discord.client.id')) {
      console.log(`https://discordapp.com/oauth2/${
        [
          'authorize',
          `client_id=${config.discord.client.id}`,
          'scope=bot',
          'permissions=0',
          'response_type=code',
        ].join('&')
      }`);
    }
  });

  bot.on('message', function(user, userID, channelID, message, event) {
    let line = message.trim();
    if(!line.startsWith(botUserTag)) return;
    console.log(line);

    // remove the username from the begining of the line
    line = line.substring(botUserTag.length,line.length).trim();
    if (line.startsWith('ping')) {
      ping(bot,channelID);
    } else if (line.startsWith('join')) {
      join(bot,state,line, (error) => {
        if (error === null) return;
        bot.sendMessage({
            to: channelID,
            message: `[ERROR] ${error}`,
        });
      });
    } else if (line.startsWith('say')) {
      say(bot,state,line, (error) => {
        if (error === null) return;
        bot.sendMessage({
            to: channelID,
            message: `[ERROR] ${error}`,
        });
      });
    } 
  });

  return bot;
}

module.exports = main();
