const _leetify_key = window._leetify_key;
const _faceitApi = window._faceitApi;

const leetifyUrl = "https://api-public.cs-prod.leetify.com/v3/profile";
const faceitUrl = "https://open.faceit.com/data/v4/players";

const PLAYER_SELECTORS = [
    'a[href*="/players/"]',           // Most stable - profile links
    '[data-testid*="player-nickname"]',
    '[data-testid*="nickname"]',
    '[data-testid*="player-name"]',
    '[class*="Nickname"] a',
    '[class*="Nickname__Name"]',
    '[class*="Player__Name"]',
];

function findPlayerElements() {
    for (const selector of PLAYER_SELECTORS) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            return Array.from(elements);
        }
    }
    return [];
}

function findPlayerContainer(el) {
    if (!el) return null;

    let current = el;
    for (let i = 0; i < 10 && current && current !== document.body; i++) {
        if (current.dataset && current.dataset.leetifyInjected) {
            return null;
        }

        // Look for structural cues of a player card
        const hasAvatar = current.querySelector('img[alt*="avatar"], img[alt*="Avatar"], [class*="Avatar"], [class*="avatar"]');
        const hasFlag = current.querySelector('[class*="Flag"], [class*="flag"]');
        const hasLevel = current.querySelector('[class*="Level"], [class*="level"]');
        const isPlayerCard = current.matches('[class*="Roster"], [class*="Party"], [class*="Team"], [class*="PlayerCard"], [class*="MatchRoom"]') || 
                            current.closest('[class*="Roster"], [class*="Party"], [class*="Team"]');

        if ((hasAvatar || hasFlag || hasLevel) && current !== el.parentElement) {
            return current;
        }

        if (isPlayerCard && current !== document.body && i >= 2) {
            // Prefer not going all the way up to the whole matchroom
            if (!current.matches('body, html')) {
                return current;
            }
        }

        current = current.parentElement;
    }

    // Fallbacks
    return el.closest('[class*="RosterParty"], [class*="Party"], [class*="Team"], [class*="PlayerCard"]') || el.parentElement;
}

async function validateKey() {
    if (!_leetify_key) {
        console.error("Leetify API key not found");
        return null;
    }

    try {
        const validate = await fetch("https://api-public.cs-prod.leetify.com/api-key/validate", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${_leetify_key}`,
            }
        });
        if (!validate.ok) {
            console.error(`Leetify key validation failed: ${validate.status}`);
        }
        return validate;
    } catch (error) {
        console.error("Key validation error:", error.message);
        return null;
    }
}

async function getSteamID(name) {
    if (!_faceitApi) {
        console.error("FACEIT API key not found");
        return null;
    }

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
        return result.steam_id_64 || null;

    } catch (error) {
        console.error("FACEIT:", error.message);
        return null;
    }
}

async function getData(steam64) {
    if (!_leetify_key) {
        console.error("Leetify API key not found");
        return null;
    }

    try {
        const response = await fetch(
            `${leetifyUrl}?steam64_id=${encodeURIComponent(steam64)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${_leetify_key}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error("Leetify:", error.message);
        return null;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main(playerEntries) {
    validateKey();

    for (const entry of playerEntries) {
        if (!entry.steam64 || !entry.container) continue;
        if (entry.container.dataset.leetifyInjected) continue;

        const result = await getData(entry.steam64);
        const ratingDiv = document.createElement("div");
        ratingDiv.className = "leetify-rating";
        ratingDiv.style.display = "block";
        ratingDiv.style.width = "100%";
        ratingDiv.style.gridColumn = "1 / -1";
        ratingDiv.style.padding = "2px 4px";
        ratingDiv.style.fontSize = "11px";
        ratingDiv.style.opacity = "0.8";

        if (!result) {
            ratingDiv.textContent = "Leetify: Error loading data";
            // Try to insert as a new row below the player info
            insertRatingBelow(entry, ratingDiv);
            entry.container.dataset.leetifyInjected = "true";
            await sleep(1800);
            continue;
        }

        if (result === "Not Found" || result.error) {
            ratingDiv.textContent = "Leetify profile not found";
            insertRatingBelow(entry, ratingDiv);
            entry.container.dataset.leetifyInjected = "true";
            await sleep(1800);
            continue;
        }

        try {
            ratingDiv.textContent = `Leetify: ${result.ranks?.leetify?.toFixed(1) ?? 'N/A'} | Aim: ${result.rating?.aim?.toFixed(1) ?? 'N/A'} | Pos: ${result.rating?.positioning?.toFixed(1) ?? 'N/A'} | Util: ${result.rating?.utility?.toFixed(1) ?? 'N/A'}`;
            insertRatingBelow(entry, ratingDiv);
            entry.container.dataset.leetifyInjected = "true";
        } catch (error) {
            console.error("Error rendering Leetify data:", error);
            ratingDiv.textContent = "Leetify: Error rendering";
            insertRatingBelow(entry, ratingDiv);
            entry.container.dataset.leetifyInjected = "true";
        }

        await sleep(1800);
    }
}

function insertRatingBelow(entry, ratingDiv) {
    const container = entry.container;
    const nameEl = entry.nameElement;
    
    // Try to find a good insertion point - look for the row containing the player info
    // Prefer inserting after the name element or in a new row
    if (nameEl && nameEl.parentElement) {
        // Check if parent uses flex/grid - we want to add as a new row
        const parent = nameEl.parentElement;
        const style = window.getComputedStyle(parent);
        if (style.display === 'flex' || style.display === 'grid') {
            // Try to find a container that can hold full-width content
            // Look for the player row
            let row = nameEl;
            for (let i = 0; i < 5; i++) {
                if (!row.parentElement) break;
                row = row.parentElement;
                const rowStyle = window.getComputedStyle(row);
                if (rowStyle.display === 'flex' || rowStyle.display === 'grid') {
                    // Insert as a sibling after this row
                    if (row.parentElement) {
                        row.parentElement.insertBefore(ratingDiv, row.nextSibling);
                        return;
                    }
                }
            }
        }
        // Insert after the name element's row
        parent.appendChild(ratingDiv);
        return;
    }
    
    // Fallback: append to container but try to make it break to new line
    container.appendChild(ratingDiv);
}

async function injectForMatchroom() {
    const playerElements = findPlayerElements();
    if (playerElements.length === 0) return;

    const entries = [];
    for (const el of playerElements) {
        const name = el.textContent.trim();
        if (!name) continue;

        const steam64 = await getSteamID(name);
        if (!steam64) continue;

        const container = findPlayerContainer(el);
        if (!container || container.dataset.leetifyInjected) continue;

        entries.push({ container, steam64, nameElement: el });
    }

    if (entries.length > 0) {
        await main(entries);
    }
}

// Use MutationObserver for better reliability
const observer = new MutationObserver(() => {
    clearTimeout(observer._timeout);
    observer._timeout = setTimeout(injectForMatchroom, 250);
});

if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    injectForMatchroom();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
        injectForMatchroom();
    });
}