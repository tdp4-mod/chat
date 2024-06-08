/* Requires */
var favicon = require('serve-favicon');
var s = require('underscore.string');
var readline = require('readline');
var express = require('express');
var sockjs = require('sockjs');
    const yts = require( 'yt-search' )
const { Downloader } = require("ytdl-mp3");

var https = require('https');
var chalk = require('chalk');
var fs = require('fs');
var moment = require('moment');

var log = require('./lib/log.js');
var utils = require('./lib/utils.js');
var config = require('./config.json');
var pack = require('./package.json');
var path = require('path');
 const cors = require('cors');


/* Config */
var port = utils.normalizePort(process.env.PORT || config.port);
var app = express();
var server;
app.use('/static', express.static(path.join(__dirname, '../Downloads')))
 app.use(cors());

var serverConfig = {stream: false};


/* Variables */
var lastTime = [];
var rateLimit = [];
var currentTime = [];
var rateInterval = [];

var chat = sockjs.createServer();
var clients = [];
var users = {};
var bans = [];
var uid = 1;

var alphanumeric = /^\w+$/;

if(config.readline.use) {
    var rl = readline.createInterface(process.stdin, process.stdout);
    rl.setPrompt(config.readline.prompt);
    rl.prompt();
}


/* Express */
app.set('port', port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname,'public/img/favicon.png')));
app.locals.version = pack.version;
app.locals.moment = moment;


/* Routes */
app.use(config.url, express.static(path.join(__dirname, 'public')));
app.get(config.url, function (req, res) {
    res.render('index', {version:pack.version});
});

app.get('/onair/:id', async function (req, res) {
    
    if (fs.existsSync(`/home/container/Downloads/${req.params.id}.mp3`)) {
 console.log("EXISTSSSSSSSSSSSSSSSSSS")

   // res.render('/home/container/bot/views',{data:videos});
  fs.createReadStream(`/home/container/Downloads/${req.params.id}.mp3`).pipe(res)

}else {
console.log(req.params.id)
       const downloader = new Downloader({
        getTags: false,
    });
    
    await downloader
        .downloadSong("https://youtube.com/watch?v="+req.params.id)
        .then(async(results) => {
            //do any results transformations
            console.log("==============");
            console.log(results);
           
    await fs.renameSync(`/home/container/Downloads/${results.split("Downloads/")[1]}`, `/home/container/Downloads/${req.params.id}.mp3`, function(err) {
    if ( err ) console.log('ERROR: ' + err);
})
     var filePath = `/home/container/Downloads/${req.params.id}.mp3`

      /*
     var filePath = `/home/container/Downloads/${videos[0].videoId}.mp3`
    var stat = fs.statSync(filePath);
    var total = stat.size;
    if (req.headers.range) {
        var range = req.headers.range;
        var parts = range.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];

        var start = parseInt(partialstart, 10);
        var end = partialend ? parseInt(partialend, 10) : total-1;
        var chunksize = (end-start)+1;
        var readStream = fs.createReadStream(filePath, {start: start, end: end});
        res.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
            'Accept-Ranges': 'bytes', 'Content-Length': chunksize,
            'Content-Type': 'audio/mpeg'
        });
        readStream.pipe(res);
     } else {
        res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'audio/mpeg' });
        fs.createReadStream(filePath).pipe(res);
     }
     */
      fs.createReadStream(filePath).pipe(res)
   // res.render('/home/container/bot/views',{data:videos});

       
    })
        .catch((error) => {
            //handle any errors here
            console.log(error.message);
        
        });
}
})


async function dl(name,socket){
  var songid=  name.slice(3).trim().split(/ +/g).join(" ");
      const r = await yts( songid )

if (!r.videos){
        return (false)
    }
    
const videos = r.videos.slice( 0, 5 )
console.log(videos[0])
    if (videos[0].seconds >1200){
        return  utils.sendToAll(clients, {type:'global', message:`مدة الفديو اطول من 20 دقيقة !`});

    }
    /*
    if (videos){
          serverConfig.filePath="http://78.46.39.20:14433/onair/"+videos[0].videoId;
          serverConfig.currentTime = 0;
        return  utils.sendToAll(clients,{type:'onair', data:"http://78.46.39.20:14433/onair/"+videos[0].videoId});

    }
    */
      if (fs.existsSync(`/home/container/Downloads/${videos[0].videoId}.mp3`)) {
               serverConfig.filePath="http://78.46.39.20:14433/static/"+videos[0].videoId+".mp3";
            serverConfig.currentTime = 0;
        utils.sendToAll(clients,{type:'onair', data:"http://78.46.39.20:14433/static/"+videos[0].videoId+".mp3"});
                        utils.sendToAll(clients, {type:'global', message:`انت الأن تستمع الى ${videos[0].title}`});

return;
}
         const downloader = new Downloader({
        getTags: false,
    });
    
    await downloader
        .downloadSong("https://youtube.com/watch?v="+videos[0].videoId)
        .then(async(results) => {
            //do any results transformations
            console.log("==============");
            console.log(results);
           
    await fs.renameSync(`/home/container/Downloads/${results.split("Downloads/")[1]}`, `/home/container/Downloads/${videos[0].videoId}.mp3`, function(err) {
    if ( err ) console.log('ERROR: ' + err);
})
     var filePath = `/home/container/Downloads/${videos[0].videoId}.mp3`
     serverConfig.filePath="http://78.46.39.20:14433/static/"+videos[0].videoId+".mp3";
                    serverConfig.currentTime = 0;

               utils.sendToAll(clients, {type:'onair', data:"http://78.46.39.20:14433/static/"+videos[0].videoId+".mp3"});

          utils.sendToAll(clients, {type:'onair', data:"http://78.46.39.20:14433/static/"+videos[0].videoId+".mp3"});
                        utils.sendToAll(clients, {type:'global', message:`انت الأن تستمع الى ${videos[0].title}`});

return filePath
    }).catch((error) => {
  console.error(error);
});
    
}
/* Logic */
chat.on('connection', function(conn) {
    log('socket', chalk.underline(conn.id) + ': connected (' + conn.headers['x-forwarded-for'] + ')');
    rateLimit[conn.id] = 1;
    lastTime[conn.id] = Date.now();
    currentTime[conn.id] = Date.now();

    clients[conn.id] = {
        id: uid,
        un: null,
        ip: conn.headers['x-forwarded-for'],
        role: 0,
        con: conn,
        warn : 0
    };

    users[uid] = {
        id: uid,
        oldun: null,
        un: null,
        role: 0
    };
    
    for(i in bans) {
        if(bans[i][0] == clients[conn.id].ip) {
            if(Date.now() - bans[i][1] < bans[i][2]) {
                conn.write(JSON.stringify({type:'server', info:'rejected', reason:'banned', time:bans[i][2]}));
                return conn.close();
            } else {
                bans.splice(i);
            }
        }
    }

    conn.write(JSON.stringify({type:'server', info:'clients', clients:users}));
    conn.write(JSON.stringify({type:'server', info:'user', client:users[uid]}));
    conn.on('data', function(message) {
        currentTime[conn.id] = Date.now();
        rateInterval[conn.id] = (currentTime[conn.id] - lastTime[conn.id]) / 1000;
        lastTime[conn.id] = currentTime[conn.id];
        rateLimit[conn.id] += rateInterval[conn.id];

        if(rateLimit[conn.id] > 1) {
            rateLimit[conn.id] = 1;
        }

        if(rateLimit[conn.id] < 1 && JSON.parse(message).type != 'delete' && JSON.parse(message).type != 'typing' && JSON.parse(message).type != 'ping'&& JSON.parse(message).type != 'onairstatus') {
            clients[conn.id].warn++;

            if(clients[conn.id].warn < 6) {
                return conn.write(JSON.stringify({type:'server', info:'spam', warn:clients[conn.id].warn}));
            } else {
                bans.push([clients[conn.id].ip, Date.now(), 5 * 1000 * 60]);
                utils.sendToAll(clients, {type:'ban', extra:clients[conn.id].un, message:'Server banned ' + clients[conn.id].un + ' from the server for 5 minutes for spamming the servers'});

                return conn.close();
            }
        } else {
            try {
                var data = JSON.parse(message);
if (data.type == "message" && data.message.indexOf("شغل")>-1){
serverConfig.stream = true;
dl(data.message,clients)
}
                if(data.type == 'ping') {
                    return false;
                }
if(data.type == "onairstatus"){
    serverConfig.currentTime = data.currentTime;
    if (data.currentTime == 0){
        serverConfig.filePath=""
    }
          return false;
}
                if(data.type == 'typing') {
                    return utils.sendToAll(clients, {type:'typing', typing:data.typing, user:clients[conn.id].un});
                }

                if(data.type == 'delete' && clients[conn.id].role > 0) {
                    utils.sendToAll(clients, {type:'server', info:'delete', mid:data.message});
                }

                if(data.type == 'update') {
                    return updateUser(conn.id, data.user);
                }
                if(data.type == 'message' && data.message.length > 768) {
                    data.message = data.message.substring(0, 768);
                    message = JSON.stringify(data);
                }

                if(data.type == 'pm') log('message', chalk.underline(clients[conn.id].un) + ' to ' + chalk.underline(data.extra) + ': ' + data.message);
                else log('message', '[' + data.type.charAt(0).toUpperCase() + data.type.substring(1) + '] ' + chalk.underline(clients[conn.id].un) + ': ' + data.message);

                handleSocket(clients[conn.id], message);
            } catch(err) {
                console.log(err)
                return log('error', err);
            }

            rateLimit[conn.id] -= 1;
        }
    });

    conn.on('close', function() {
        log('socket', chalk.underline(conn.id) + ': disconnected (' + clients[conn.id].ip + ')');
        utils.sendToAll(clients, {type:'typing', typing:false, user:clients[conn.id].un});
        utils.sendToAll(clients, {type:'server', info:'disconnection', user:users[clients[conn.id].id]});
        delete users[clients[conn.id].id];
        delete clients[conn.id];
    });
});


/* Functions */
function updateUser(id, name) {
    if(name.length > 2 && name.length < 17 && name.indexOf(' ') < 0 && !utils.checkUser(clients, name) && name.match(alphanumeric) && name != 'Console' && name != 'System') {
        if(clients[id].un == null) {
            clients[id].con.write(JSON.stringify({type:'server', info:'success',config: serverConfig}));
            uid++;
        }

        users[clients[id].id].un = name;
        utils.sendToAll(clients, {
            type: 'server',
            info: clients[id].un == null ? 'connection' : 'update',
            user: {
                id: clients[id].id,
                oldun: clients[id].un,
                un: name,
                role: clients[id].role
            }
        });
        clients[id].un = name;
    } else {
        var motive = 'format';
        var check = false;

        if(!name.match(alphanumeric)) motive = 'format';
        if(name.length < 3 || name.length > 16) motive = 'length';
        if(utils.checkUser(clients, name) ||  name == 'Console' || name == 'System') motive = 'taken';
        if(clients[id].un != null) check = true;

        clients[id].con.write(JSON.stringify({type:'server', info:'rejected', reason:motive, keep:check}));
        if(clients[id].un == null) clients[id].con.close();
    }
}

function handleSocket(user, message) {
    var data = JSON.parse(message);
    data.id = user.id;
    data.user = user.un;
    data.type = s.escapeHTML(data.type);
    data.message = s.escapeHTML(data.message);
    data.mid = (Math.random() + 1).toString(36).substr(2, 5);

    switch(data.type) {
        case 'pm':
            if(data.extra != data.user && utils.checkUser(clients, data.extra)) {
                utils.sendToOne(clients, users, data, data.extra, 'message');
                data.subtxt = 'PM to ' + data.extra;
                utils.sendBack(clients, data, user);
            } else {
                data.type = 'light';
                data.subtxt = null;
                data.message = utils.checkUser(clients, data.extra) ? 'You can\'t PM yourself' : 'User not found';
                utils.sendBack(clients, data, user);
            }
            break;

        case 'global': case 'kick': case 'ban': case 'role':
            if(user.role > 0) {
                if(data.type == 'global') {
                    if(user.role == 3) {
                        return utils.sendToAll(clients, data);
                    } else {
                        data.subtxt = null;
                        data.message = 'You don\'t have permission to do that';
                        return utils.sendBack(clients, data, user);
                    }
                } else {
                    data.subtxt = null;
                    if(data.message != data.user) {
                        if(utils.checkUser(clients, data.message)) {
                            switch(data.type) {
                                case 'ban':
                                    var time = parseInt(data.extra);

                                    if(!isNaN(time) && time > 0) {
                                        if(user.role > 1 && utils.getUserByName(clients, data.message).role == 0) {
                                            for(var client in clients) {
                                                if(clients[client].un == data.message) {
                                                    bans.push([clients[client].ip, Date.now(), time * 1000 * 60]);
                                                }
                                            }

                                            data.extra = data.message;
                                            data.message = data.user + ' banned ' + data.message + ' from the server for ' + time + ' minutes';
                                            return utils.sendToAll(clients, data);
                                        } else {
                                            data.message = 'You don\'t have permission to do that';
                                            return utils.sendBack(clients, data, user);
                                        }
                                    } else {
                                        data.type = 'light';
                                        data.message = 'Use /ban [user] [minutes]';
                                        return utils.sendToOne(clients, users, data, data.user, 'message')
                                    }
                                    break;

                                case 'role':
                                    if(data.extra > -1 && data.extra < 4) {
                                        if(user.role == 3) {
                                            var role;
                                            data.role = data.extra;
                                            data.extra = data.message;

                                            if(data.role == 0) role = 'User';
                                            if(data.role == 1) role = 'Helper';
                                            if(data.role == 2) role = 'Moderator';
                                            if(data.role == 3) role = 'Administrator';
                                            data.message = data.user + ' set ' + data.message + '\'s role to ' + role;

                                            utils.sendToOne(clients, users, data, JSON.parse(message).message, 'role');
                                            utils.sendToAll(clients, {type:'server', info:'clients', clients:users});
                                        } else {
                                            data.message = 'You don\'t have permission to do that';
                                            return utils.sendBack(clients, data, user);
                                        }
                                    } else {
                                        data.type = 'light';
                                        data.message = 'Use /role [user] [0-3]';
                                        return utils.sendToOne(clients, users, data, data.user, 'message')
                                    }
                                    break;

                                case 'kick':
                                    if(user.role > 1 && utils.getUserByName(clients, data.message).role == 0) {
                                        data.extra = data.message;
                                        data.message = data.user + ' kicked ' + data.message + ' from the server';
                                    } else {
                                        data.message = 'You don\'t have permission to do that';
                                        return utils.sendBack(clients, data, user);
                                    }
                                    break;
                            }                            
                            utils.sendToAll(clients, data);
                        } else {
                            data.type = 'light';
                            data.message = 'User not found';
                            utils.sendBack(clients, data, user);
                        }
                    } else {
                        data.message = 'You can\'t do that to yourself';
                        utils.sendBack(clients, data, user);
                    }
                }
            } else {
                data.message = 'You don\'t have permission to do that';
                utils.sendBack(clients, data, user);
            }
            break;

        default:
            console.log(data)
            utils.sendToAll(clients, data);
            break;
    }
}



/* Internal */
if(config.readline.use) {
    readLine();
}

function readLine() {
    rl.on('line', function(line) {
        var data = {};
        if(line.indexOf('/role') == 0) {
            var string = 'Console gave ' + line.substring(6) + ' administrator permissions';

            data.message = string;
            data.user = 'Console';
            data.type = 'role';
            data.extra = line.substring(6);
            data.role = 3;

            utils.sendToAll(clients, data);
            utils.sendToOne(clients, users, data, line.substring(6), data.type);
        }

        rl.prompt();
    }).on('close', function() {
        log('stop', 'Shutting down\n');
        process.exit(0);
    });
}

if(!config.ssl.use) {
    var http = require('http');
    server = http.createServer(app);
} else {
    var https = require('https');
    var opt = {
        key: fs.readFileSync(config.ssl.key),
        cert: fs.readFileSync(config.ssl.cert)
    };

    server = https.createServer(opt, app);
}

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function onError(error) {
    if(error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch(error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;

        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;

        default:
            throw error;
    }
}

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    log('start', 'Listening at ' + bind);
}

chat.installHandlers(server, {prefix:'/socket', log:function(){}});
