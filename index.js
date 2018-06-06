const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");

var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));

const yt_api_key = config.yt_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

var queue = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];

client.login(discord_token);

client.user.setStatus("online");
client.user.setGame(`-komutlar|blitenetworkbot.com.tr.ht ziyaret edin notumuz var!`);

client.on('message', function(message) {
  const member = message.member;
  const mess = message.content.toLowerCase();
  const args = message.content.split(' ').slice(1).join(" ");

  if (mess.startsWith(prefix + "oynat")) {
    if (member.voiceChannel || client.guilds.get("338433261934215171").voiceConnection != null) {
      if (queue.length > 0 || isPlaying) {
        getID(args, function(id) {
          add_to_queue(id);
          fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            message.reply(" Kuyruğa Eklendi: **" + videoInfo.title + "**");
          });
        });
      } else {
        isPlaying = true;
        getID(args, function(id) {
          queue.push("placeholder");
          playMusic(id, message);
          fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            message.reply(" Oynatılıyor: **" + videoInfo.title + "**");
          })
        });
      }
    } else {
      message.reply(" Bir ses kanalında olmanız gerekiyor!");
    }
  } else if (mess.startsWith(prefix + "atla")) {
    if (skippers.indexOf(message.author.id) === -1) {
      skippers.push(message.author.id);
      skipReq++;
      if (skipReq >= Math.ceil((voiceChannel.members.size - 1) / 2)) {
        skip_song(message);
        message.reply(" Atlamanız onaylandı. Şimdi atlatılıyor");
      } else {
        message.reply(" Atlamanız Onaylandı **" + Math.ceil((voiceChannel.members.size - 1) / 2) - skipReq + "** more skip votes!");
      }
    } else {
      message.reply(" Zaten atlamak için oy verdiniz!");
    }
  } else if (mess.startsWith(prefix + "temizle")) {
    while (queue.length > 0) {
      queue.pop();
    }
    message.reply("Kuyruk temizlendi!");
  } else if (mess.startsWith(prefix + "sil")) {
    getID(args, function(id) {
      console.log(queue);
      if (queue.indexOf(id) > -1) {
        fetchVideoInfo(id, function(err, videoInfo) {
          if (err) throw new Error(err);
          message.reply(" Siliniyor: **" + videoInfo.title + "**");
          var deleteindex = queue.indexOf(id);
          queue.splice(deleteindex, 1);
        });
      } else {
        message.reply(" Kuyrukta şarkı bulunamadı!")
      }
    })

  }


});

client.on('ready', function() {
  console.log('Ben Hazırım!');

});

function skip_song(message) {
  dispatcher.end();
}

function playMusic(id, message) {
  voiceChannel = message.member.voiceChannel;

  voiceChannel.join().then(function(connection) {
    stream = ytdl("https://www.youtube.com/watch?v=" + id, {
      filter: 'audioonly'
    });
    skipReq = 0;
    skippers = [];

    dispatcher = connection.playStream(stream);
    dispatcher.on('end', function() {
      skipReq = 0;
      skippers = [];
      queue.shift();
      if (queue.length === 0) {
        queue = [];
        isPlaying = false;
      } else {
        playMusic(queue[0], message);
      }
    })
  });
}

function getID(str, cb) {
  if (isYoutube(str)) {
    cb(getYouTubeID(str));
  } else {
    search_video(str, function(id) {
      cb(id);
    });
  }
}

function add_to_queue(strID) {
  if (isYoutube(strID)) {
    queue.push(getYoutubeID(strID));
  } else {
    queue.push(strID);
  }
}

function isYoutube(str) {
  return str.toLowerCase().indexOf("youtube.com") > -1;
}

function search_video(query, callback) {
  request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
    var json = JSON.parse(body);
    callback(json.items[0].id.videoId);
  });
}
