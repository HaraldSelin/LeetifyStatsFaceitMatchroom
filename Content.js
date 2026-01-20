nameArray = []

const interval = setInterval(() => {
    const roster = document.querySelectorAll('[class*="Nickname__Name"]');
    if (roster.length > 0) {
        clearInterval(interval);
        for (const div of roster) {
            nameArray.push(div.textContent); 
        }
    }
}, 500); 

console.log(nameArray);