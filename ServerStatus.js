const axios = require('axios');
const config = require("./config.json");
const { MessageEmbed } = require('discord.js');
const nstatus = config.HetrixStatus;
async function parse() {
    const toReturn = {};

    for (let [title, data] of Object.entries(nstatus)) {
        const temp = [];

        for (let d of data) {
            let retries = 3;
            let statsData, monitorData;

            while (retries > 0) {
                try {
                    [statsData, monitorData] = await Promise.all([
                        axios.get(`https://api.hetrixtools.com/v1/${config.HetrixToken}/server/stats/${d.data}/`),
                        axios.get(`https://api.hetrixtools.com/v3/uptime-monitors?id=${d.data}`, {
                            headers: { Authorization: `Bearer ${config.HetrixToken}` }
                        })
                    ]);

                    if (statsData.data.Stats && monitorData.data.monitors?.[0]) break; // Success!
                    else throw new Error('Invalid or missing data from HetrixTools API');

                } catch (error) {
                    console.error(`Error fetching data for ${d.name} (attempt ${4 - retries}): ${error.message}`);
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }
            }

            // If retries exhausted, add error message to temp
            if (!retries) {
                temp.push(`${d.name}: 🔴 **Offline**, Uptime: ${monitorData.data.monitors?.[0].uptime}%`);
                continue;
            }

            const now = Math.floor(Date.now() / 1000 / 60);
            const status2 = statsData.data.Stats;

            if (!status2 || !Array.isArray(status2)) {
                console.error(`Invalid stats data for ${d.name}:`, status2);
                continue; // Skip to the next node if stats are invalid
            }

            const closest = status2.reduce((prev, curr) =>
                Math.abs(curr.Minute - now) < Math.abs(prev.Minute - now) ? curr : prev
            );

            const da = monitorData.data.monitors?.[0];

            if (!da) {
                console.error(`Monitor data not found for ${d.name}`);
                continue; // Skip if monitor data is missing
            }

            let serverUsage = `CPU: ${closest.CPU}%, RAM: ${closest.RAM}%, SSD: ${closest.Disk}%, Uptime: ${da.uptime}%`;
            let statusMessage = "";

            if (da.monitor_status == "maint") {
                statusMessage = "🟣 Maintenance ~ Returning Soon!";
            } else if (da.monitor_status == "active") {
                statusMessage = da.uptime_status == "up"
                    ? `🟢 Online, ${serverUsage}`
                    : `🔴 **Offline**, Uptime: ${da.uptime}%`;
            } else {
                statusMessage = "❓ Unknown Status";
            }

            temp.push(`${d.name}: ${statusMessage}`); // Assuming statusMessage is constructed correctly
        }

        toReturn[title] = temp;
    }

    return toReturn;
}

const getEmbed = async () => {
    let status = await parse();
    let desc = "";

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