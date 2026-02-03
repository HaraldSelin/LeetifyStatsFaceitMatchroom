import { _leetify_key } from "./api";
const url = "https://api-public-docs.cs-prod.leetify.com";
var nameArray = []
var apiFile = "./api.js";
var name = ""

const interval = setInterval(() => {
    const roster = document.querySelectorAll('[class*="Nickname__Name"]');
    if (roster.length > 0) {
        clearInterval(interval);
        for (const div of roster) {
            nameArray.push(div.textContent); 
        }
    }
}, 500); 







if(apiFile.exists()) {
    getData(_leetify_key);
} 
else {
    getData();
}


function getData(apikey="")
{

    for(name in nameArray) {
        fetch(url + '/v3/profile?id={name}', {
            method: "GET"
        })
    }
    
}

