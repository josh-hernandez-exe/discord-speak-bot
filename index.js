const fs = require('fs');
const googleTTS = require('google-tts-api');
const Discord = require('discord.io');
const request = require('request');

const config = require('./config');
const utils = require('./utils');

if (!utils.has(config,'discord.token')) {
  console.log("Config does not have all the information needed.");
  process.exit()
}

function ping(bot,textChannelID) {
  return new Promise((resolve,reject) => {
    bot.sendMessage({
        to: textChannelID,
        message: "pong"
    },(error) => {
      if (error) return reject(error);
      return resolve();
    });
  })
}

function joinPromise(bot,state,voiceChannelID) {
  return new Promise((resolve, reject) => {
    // already in the target channel
    if (state.voice.current === voiceChannelID) return resolve();

    bot.joinVoiceChannel( voiceChannelID , (error => {
      if (error) return reject(error);

      state.voice.last = state.voice.current;
      state.voice.current = voiceChannelID;
      return resolve();
    }));
  });
}

function join(bot,state,line) {
  line = line.substring('join'.length,line.length).trim();
  const voiceChannelID = line;

  return joinPromise(bot,state,voiceChannelID);
}

function say(bot,state,line) {
  let languageCode ='en-US';
  let speed = 1;
  let voiceChannelID = state.voice.current;
  line = line.substring('say'.length,line.length).trim();

  [args, leftover] = utils.parseArgs(line);
  const text = leftover.join(' ');
  console.log(`[say] ${line}`)
  if(text.length === 0) return Promise.reject(new Error('No text given to say.'));

  if(args.speed !== undefined) {
    speed = Number.parseInt(args.speed);
  }
  if(args.lang !== undefined) {
    // https://cloud.google.com/speech/docs/languages
    languageCode = args.lang;
  }
  if(args.channel !== undefined) {
    voiceChannelID = args.channel;
  }

  if(typeof voiceChannelID !== 'string') {
    return Promise.reject(new Error('No Voice Channel Set'));
  }

  console.log(`[DEBUG][say] ${JSON.stringify(args)}`);
  console.log(`[DEBUG][say] ${JSON.stringify({text, languageCode, speed})}`);

  return Promise.all([
    joinPromise(bot,state,voiceChannelID),
    googleTTS(text, languageCode, speed), // speed normal = 1 (default), slow = 0.24
  ])
  .then(([_, url]) => new Promise((resolve, reject) => {
    if (typeof url !== 'string') return reject('Generated googleTTS url is not type string');
    if (url.length === 0) return reject('Generated googleTTS url is an empty string');
    console.log(`[DEBUG][say] url = ${url}`)

    //Then get the audio context
    bot.getAudioContext(voiceChannelID, (error, stream) => {
      if (error) return reject(error);

      request.get(url)
        .on('response', (response) => {
          if (response.statusCode !== 200) return reject();
          console.log('[debug][say][response]');

          //Without {end: false}, it would close up the stream, so make sure to include that.
          response.pipe(stream,{end: false});
        })
        .on('error', (err) => {
          if (err) return reject(err);
        });

      stream.on('done', resolve);
      stream.on('error', (error) => {
        if (error) return reject(error);
      });
    });
  }));
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

  const botUserTag = `<@${bot.id}>`;
  
  bot.on('ready', function(event) {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
    console.log();
    console.log('Please auth the app');
    console.log(`https://discordapp.com/oauth2/${
      [
        'authorize',
        `client_id=${bot.id}`,
        'scope=bot',
        'permissions=0',
        'response_type=code',
      ].join('&')
    }`);
  });

  bot.on('message', function(user, userID, channelID, message, event) {
    let line = message.trim();
    if(!line.startsWith(botUserTag)) return;
    console.log(line);

    // remove the username from the begining of the line
    line = line.substring(botUserTag.length,line.length).trim();

    return Promise.resolve()
    .then(() => {
      if (line.startsWith('ping')) {
        return ping(bot,channelID);
      } else if (line.startsWith('join')) {
        return join(bot,state,line);
      } else if (line.startsWith('say')) {
        return say(bot,state,line);
      }
    })
    .then(() => console.log('DONE'))
    .catch((error) => {
      bot.sendMessage({
          to: channelID,
          message: `[ERROR] ${error}`,
      });
    })
  });

  return bot;
}

module.exports = main();
