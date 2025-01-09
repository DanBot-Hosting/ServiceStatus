const axios = require('axios');
const config = require("./config.json");
const { MessageEmbed } = require('discord.js');
const nstatus = config.HetrixStatus;
async function parse() {
    const toReturn = {};
    const statsData = await Promise.all([
        axios.get(`https://api.netweak.com/servers`, {
            headers: { Authorization: `Bearer ${config.HetrixToken}` }
        })
    ]);

    for (let [title, data] of Object.entries(nstatus)) {
        const temp = [];

        for (let d of data) {
            let retries = 3;

            while (retries > 0) {
                try {
                    //console.log(statsData[0].data)
                    if (statsData[0].data) break; // Success!
                    else throw new Error('Invalid or missing data from Netweaks API');

                } catch (error) {
                    console.error(`Error fetching data for ${d.name} (attempt ${4 - retries}): ${error.message}`);
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            // If retries exhausted, add error message to temp
            const monitorData = statsData[0].data.filter(item => item.id === d.data);

            if (!retries) {
                temp.push(`${d.name}: 🔴 **Offline**, Uptime: ${monitorData[0].uptime.month}%`);
                continue;
            }

            const da = monitorData[0];

            if (!da) {
                console.error(`Monitor data not found for ${d.name}`);
                continue; // Skip if monitor data is missing
            }

            let serverUsage = `CPU: ${da.payload.load_cpu}%, RAM: ${da.payload.load_ram}%, SSD: ${da.payload.load_disk}%, Uptime: ${da.uptime.month}%`;
            let statusMessage = "";

            if (da.status == "online") {
                statusMessage = da.status == "online"
                    ? `🟢 Online, ${serverUsage}`
                    : `🔴 **Offline**, Uptime: ${da.uptime.month}%`;
            } else {
                statusMessage = `🔴 **Offline**, Uptime: ${da.uptime.month}%`;
            }

            temp.push(`${d.name}: ${statusMessage}`); // Assuming statusMessage is constructed correctly
        }

        toReturn[title] = temp;
    }

    return toReturn;
}

const getEmbed = async () => {
    let status = await parse();
    let desc = "*Uptime is based on 30days*\n";

    for (let [title, d] of Object.entries(status)) {
        if (Array.isArray(d)) {
            desc = `${desc}***${title}***\n${d.join("\n")}\n\n`;
        }
    }

    // Check if the description is empty
    if (desc.trim() === "") {
        desc = "No service status data available at this time.";
    }

    let embed = new MessageEmbed().setTitle("DBH Live Usage").setDescription(desc).setTimestamp();
    return embed;
};

module.exports = {
    parse: parse,
    getEmbed: getEmbed,
};
