const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require("./config.json");
const status = require("./ServerStatus");

const client = new Client({
    intents: [Intents.FLAGS.MESSAGE_CONTENT, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

client.on('ready', () => {
    console.log(`Bot is ready as: ${client.user.tag}`);

        let channel = client.channels.cache.get(config.LiveStatusChannel);
        setInterval(async () => {
            let embed = await status.getEmbed();

            let messages = await channel.messages.fetch({
                limit: 10,
            });

            messages = messages.filter((x) => x.author.id === client.user.id).last();
            if (messages == null) channel.send({ embeds: [embed] });
            else messages.edit({ embeds: [embed] });
        }, 30000);
});
client.login(config.DiscordToken)
