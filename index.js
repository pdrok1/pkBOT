const Discord = require("discord.js");
const config = require("./config.json");
const package = require("./package.json");
var log = 
[
    {
        user_target_id: "",
        user_target_name: "",
        poll_opened_by_id: "",
        poll_opened_by_name: "",
        execution_date: new Date(),
        ban: false
    }
];
const client = new Discord.Client();
const prefix = "!pk"

mentionPlayer = (id) => "<@" + id + ">";

function pollToPercentage(yes, no){
    var total = yes + no, yp = parseInt(yes/total*100), np = parseInt(no/total*100);
    return ':white_check_mark: ' + yp + '%\n:x: ' + np + '%';
}

var pollRequest;

function kick(message, targetUser, reason){
    const kickpoll = {
        color: '#000000',
        title: 'Vote Kick',
        description: mentionPlayer(message.author.id) + ' quer kickar ' + mentionPlayer(targetUser.id),
        fields: [
            { name: '\nMotivo: ', value: reason },
            { name: '\u200B', value: '\u200B' },
            { name: 'Votação: ', value: pollToPercentage(1, 1), inline: true },
            { name: '\u200B', value: '\u200B' }
        ],
        timestamp: new Date(),
        footer: {
            text: "v" + package.version,
            icon_url: "https://cdn.discordapp.com/avatars/" + message.author.id + "/" + message.author.avatar + ".png"
        },
        message: message,
        targetUser: targetUser,
        reason: reason
    }
    pollRequest = kickpoll;
    message.channel.send({embed: kickpoll});
}

client.on("message", function(message) {
    if (message.author.bot){
        if(message.author.id === '753297685670526977'){
            if(message.embeds[0]){
                if(message.embeds[0].title === 'Vote Kick'){
                    const filter = (reaction, user) => {
                        return ['✅', '❌'].includes(reaction.emoji.name); //&& user.id === message.author.id;
                    };
                    var yes = 0, no = 0;
                    const collector = message.createReactionCollector(filter, { time: 30000, dispose: true });

                    message.react('✅');
                    message.react('❌');

                    function updatePoll(){
                        const newPoll = JSON.parse(JSON.stringify(pollRequest)); // Pega a poll
                        newPoll.fields[2] = {name: "Votação: ", value: pollToPercentage(yes, no)}; // Edita o campo
                        message.edit({embed: newPoll}); // "Reinsere" a poll no embed da mensagem
                    }

                    collector.on('collect', (reaction, user) => {
                        if(reaction.emoji.name === '✅')
                            yes++;
                        else
                            no++;
                        updatePoll();                  
                    });

                    collector.on('remove', reaction => {
                        if(reaction.emoji.name === '✅')
                            yes--;
                        else
                            no--;
                        updatePoll();
                    });

                    collector.on('end', reaction =>{
                        const yes = message.reactions.cache.find( r => r.emoji.name === '✅').count;
                        const no = message.reactions.cache.find( r => r.emoji.name === '❌').count;
                        const total = yes + no, yesPercentage = parseInt(yes/total * 100);
                        var emoji, finalText, color;
                        if(yesPercentage >= 75)
                        {
                            emoji = '✅';
                            finalText = mentionPlayer(pollRequest.targetUser.id) + '  foi kickado do servidor.';
                            color = '#00ff22';
                            
                            const kickDayCount = log.filter((item) => (item.user_target_id == pollRequest.targetUser.id)).length;
                            if(kickDayCount === 1)
                                finalText += '\n' + mentionPlayer(pollRequest.targetUser.id) + ' acumulou 2 kicks em 24 horas, olha o ban vindo.';
                            else if (kickDayCount === 2){
                                message.guild.member(pollRequest.targetUser.id).ban().then((user)=>{
                                    finalText = 'Aí ' + mentionPlayer(pollRequest.targetUser.id) + 
                                    ', _🎵 segura o ban, amarra o ban 🎵_';
                                    log.push(
                                        {
                                            user_target_id: user.user.id,
                                            user_target_name: user.user.username,
                                            poll_opened_by_id: pollRequest.message.author.id,
                                            poll_opened_by_name: pollRequest.message.author.username,
                                            execution_date: new Date(),
                                            ban: true
                                        }
                                    );
                                    finishPoll();
                                }).catch((error)=>{
                                    emoji = '❌';
                                    finalText = 'Permissão negada. O poder dele... é mais de 9000 🔥';
                                    color = '#ff0000';
                                    finishPoll();
                                });;
                            }
                            //console.log("kickDayCount: " + kickDayCount);
                            if(kickDayCount < 2)
                                message.guild.member(pollRequest.targetUser.id).kick().then((user)=>{
                                    const yesterday = new Date().setDate(new Date().getDate() - 1);
                                    const newLog = log.filter( (klog) => (klog.execution_date >= yesterday) || klog.ban);
                                    newLog.push(
                                        {
                                            user_target_id: user.id,
                                            user_target_name: user.username,
                                            poll_opened_by_id: pollRequest.message.author.id,
                                            poll_opened_by_name: pollRequest.message.author.username,
                                            execution_date: new Date(),
                                            ban: false
                                        }
                                    );
                                    log = newLog;
                                    finishPoll();
                                }, (user)=>{
                                    console.log("ca");
                                    emoji = '❌';
                                    finalText = 'Permissão negada. Tão tentando banir o adm, safados?';
                                    color = '#ff0000';
                                    finishPoll();
                                });
                        }
                        else
                        {
                            emoji = '❌';
                            finalText = 'Não houve votos suficientes.';
                            color = '#ff0000';
                            finishPoll();
                        }
                        function finishPoll(){
                            const conclusion = {
                                color: color,
                                title: 'Votação Encerrada  ' + emoji,
                                description: finalText,
                                timestamp: new Date(),
                                footer: {
                                    text: "v" + require("./package.json").version,
                                    icon_url: "https://cdn.discordapp.com/avatars/" + message.author.id + "/" + message.author.avatar + ".png"
                                }
                            }
                            message.edit({embed: conclusion});
                            pollRequest = null;
                        }
                    });
                }
            }
        }
    }
    if (!message.content.startsWith(prefix)) return;
    const commandBody = message.content.slice(prefix.length).trim();
    const args = commandBody.split(' ', 2);
    switch(args[0]){
        case "kick":
            const reason = commandBody.slice(commandBody.indexOf(">") + 2).trim();
            if(message.mentions.users.first()){ // Checar se a mensagem tem uma mention
                if(message.guild.member(message.mentions.users.first().id)){ // Checar se usuário alvo está no servidor
                    if(!pollRequest){ // Checar se já está em uma votação
                        if(reason.length > 0)
                            kick(message, message.mentions.users.first(), reason); // Enviar embed de votação de kick (mensagem, alvo, motivo)
                        else
                            message.channel.send("Não é possível kickar sem um motivo.");
                    }else{
                        message.channel.send("Há uma votação em andamento.");
                    }
                }
            }
            break;
    }
});

client.login(process.env.BOT_TOKEN);