const _leetify_key = window._leetify_key;
const _faceitApi = window._faceitApi;


const leetifyUrl = "https://api-public.cs-prod.leetify.com/v3/profile";
const faceitUrl = "https://open.faceit.com/data/v4/players"

var nameArray = []
var steam64Array = []


const interval = setInterval(async () => {
    const roster = document.querySelectorAll('[class*="Nickname__Name"]');
    
    if (roster.length === 0) return;

    clearInterval(interval);
    const playerEntries = [];
    for (const div of roster) {
        const name = div.textContent.trim().replace(/\s+/g, "");
        nameArray.push(name);
        
        const steam64 = await getSteamID(name);

        if(steam64) {
            console.log(steam64)
            steam64Array.push(steam64); 

            const container = div.closest('[class*="RosterParty__"]');

            playerEntries.push({
                container,
                steam64
            });
        }
    }
    
    await main(playerEntries);
}, 500); 


async function getSteamID(name) {
    try {
        const response = await fetch(
            `${faceitUrl}?nickname=${encodeURIComponent(name)}`,
            {
                headers: {
                    Authorization: `Bearer ${_faceitApi}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`FACEIT response: ${response.status}`);
        }

        const result = await response.json();
        return result.games.cs2.game_player_id;

    } catch (error) {
        console.error("FACEIT:", error.message);
        return null;
    }
}


async function main(playerEntries) {

    for (const entry of playerEntries) {

        if (!entry.steam64 || !entry.container) continue;

        const result = await getData(entry.steam64);
        //  if (!res) continue;

        const ratingDiv = document.createElement("div");
        ratingDiv.className = "leetify-rating";

        ratingDiv.textContent =
            `Leetify: ${result.ranks.leetify.toFixed(1)} | Aim: ${result.rating.aim.toFixed(1)} | Pos: ${result.rating.positioning.toFixed(1)} | Util: ${result.rating.utility.toFixed(1)}`;

        entry.container.appendChild(ratingDiv);

        await sleep(600);
    }
}



async function getData(steam64)
{
    try {
        const response = await fetch(
            `${leetifyUrl}?steam64_id=${encodeURIComponent(steam64)}`,
            {
                headers: {
                    Authorization: `Bearer ${_leetify_key}`
                }
            }
        );

        if(!response.ok)
        {
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        return result;

    } catch(error) {
        console.error(error.message);
        return null;
    }
        
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}


