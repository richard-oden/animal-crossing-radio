const openWeatherKey = config.OPEN_WEATHER_KEY;
const locationForm = document.querySelector('.menu');
const detectBtn = document.getElementById('detect-btn');
const manualInput = document.getElementById('manual-input');
const launchBtn = document.getElementById('launch-btn');

let now;
let hour;
let lat;
let lon;
let weather;
let music = new Audio();
music.loop = true;

async function getJSON(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw error;
    }
}

function setCoords() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            lat = position.coords.latitude;
            lon = position.coords.longitude;
            detectLocation();
        }, () => {
            console.log('Unable to retrive location.');
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
    }
}

async function populateInputField(cityName, countryCode) {
    const worldCitiesJSON = await getJSON('../worldcities.json');
    const foundCity = worldCitiesJSON.find(c => 
        c.city.toLowerCase() === cityName.toLowerCase() &&
        c.iso2.toLowerCase() === countryCode.toLowerCase()
    );
    let manualInputValue;
    // Use world cities data if present:
    if (foundCity) {
        let regionString = ``;
        if (foundCity.admin_name) {
            let region;
            if (Object.values(usStates).includes(foundCity.admin_name)) {
                region = fullNameToAcronym(foundCity.admin_name);
            } else {
                region = foundCity.admin_name;
            }
            regionString = `, ${region}`;
        }
        manualInputValue = `${foundCity.city}${regionString}, ${foundCity.country}`;
    // Otherwise use OpenWeather data:
    } else {
        manualInputValue = `${cityName}, ${countryCode}`;
    }
    manualInput.value = manualInputValue;
}

async function detectLocation() {
    const weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}`);
    const cityName = weatherJSON.name;
    const countryCode = weatherJSON.sys.country;
    populateInputField(cityName, countryCode);
}

function getMatchingCities(input, db, prop){
    const output = [];
    db.forEach(c => {
        // Matches case insensitive instances of property value, normalized property value, and uncomma'd property value:
        const regex = RegExp(`\\b${c[prop].normalize()}\\b|\\b${c[prop]}\\b|\\b${c[prop].replace(/(.*), (.*)/g, '$2 $1')}\\b`, 'gi');
        if (c[prop] != '' && input.match(regex)) {
            output.push(c);
        }
    });
    return output;
}

async function getQueryString(inputValue) {
    function formatQueryArg(input) {
        let formatted = input.normalize();
        if (/(.*), (.*)/g.test(formatted)) {
            return formatted.replace(/(.*), (.*)/g, '$2 $1');
        } else {
            return formatted;
        }
    }

    const worldCitiesJSON = await getJSON('../worldcities.json');
    const foundCities = getMatchingCities(inputValue, worldCitiesJSON, 'city');
        //TODO: Add way to detect US State abbreviations
    const citiesWithFoundRegion = getMatchingCities(inputValue, worldCitiesJSON, 'admin_name');
    const citiesWithFoundCountry = getMatchingCities(inputValue, worldCitiesJSON, 'country');
        citiesWithFoundCountry.concat(getMatchingCities(inputValue, worldCitiesJSON, 'iso2'));
        citiesWithFoundCountry.concat(getMatchingCities(inputValue, worldCitiesJSON, 'iso3'));

    let queryString = `q=`;
    if (foundCities.length) {
        const cityWithKnownRegionAndCountry = foundCities.find(c => 
            citiesWithFoundRegion.includes(c) && citiesWithFoundCountry.includes(c));
        const cityWithKnownRegion = foundCities.find(c => citiesWithFoundRegion.includes(c));
        const cityWithKnownCountry = foundCities.find(c => citiesWithFoundCountry.includes(c));

        let selectedCity;
        if (cityWithKnownRegionAndCountry) selectedCity = cityWithKnownRegionAndCountry;
        else if (cityWithKnownRegion) selectedCity = cityWithKnownRegion;
        else if (cityWithKnownCountry) selectedCity = cityWithKnownCountry;
        else selectedCity = foundCities[0];

        let regionString = ``;
        if (Object.values(usStates).includes(selectedCity.admin_name)) regionString = `,${formatQueryArg(selectedCity.admin_name)}`;
        queryString += `${formatQueryArg(selectedCity.city)}${regionString},${formatQueryArg(selectedCity.country)}`;
    } else if (citiesWithFoundRegion.length) {
        const regionWithKnownCountry = citiesWithFoundRegion.find(c => citiesWithFoundCountry.includes(c));

        let selectedRegion;
        if (regionWithKnownCountry) selectedRegion = regionWithKnownCountry;
        else selectedRegion = citiesWithFoundRegion[0];
        queryString += `${formatQueryArg(selectedRegion.admin_name)},${formatQueryArg(selectedRegion.country)}`;
    } else if (citiesWithFoundCountry.length) {
        queryString += formatQueryArg(citiesWithFoundCountry[0].country);
    }
    return queryString;
}

async function getUrlSubString() {
    const inputValue = manualInput.value.toLowerCase();
    const inputArr = inputValue.split(/(?:\s|\W)+/gm);
    let urlSubString = ``;
    // If input is only numbers, try zip code or coordinates:
    if (!inputArr.every(isNaN)) {
        urlSubString += inputArr.length === 1 ? `zip=${inputArr[0]}` : `lat=${inputArr[0]}&lon=${inputArr[1]}`;
    // If first item in input is number, try zip code and country:
    } else if (!isNaN(inputArr[0])) {
        urlSubString += `zip=${inputArr[0]},${inputArr[1]}`;
    // Else, try query:
    } else {
        urlSubString += await getQueryString(inputValue, inputArr);
    }
    return urlSubString;
}

async function getWeather()
{
    let weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}`);
    return weatherJSON.weather[0].main;
}

function calcMusicId(hour, weather)
{
    let id = (hour * 3) + 1;
    if (['Thunderstorm', 'Drizzle', 'Rain'].includes(weather)) {
        return id;
    } else if (weather === 'Snow') {
        return id + 1;
    } else {
        return id + 2;
    }
}

async function getMusic(id)
{
    music.pause();
    music.src = `https://acnhapi.com/v1/hourly/${id}`;
    music.play();
    fadeInMusic();
}

function fadeInMusic () {
    music.volume = 0.0;
    let fadeAudio = setInterval(() => {
        let volumeRounded = Math.round(music.volume * 100) / 100;
        // Fade in until default volume is reached:
        volumeRounded += 0.05;
        // When default volume is reached, stop:
        if (volumeRounded >= 1) {
            volumeRounded = 1;
            clearInterval(fadeAudio);
        }
        music.volume = volumeRounded;
    }, 200);
}

function startApp() {
    setCoords();
    setInterval(async () => {
        console.clear();
        now = new Date();
        if (now.getHours() !== hour ||
            await getWeather() != weather) {
            hour = now.getHours();
            weather = await getWeather();
            let id = calcMusicId(hour, weather);
            await getMusic(id);
        }
        console.log(now.toLocaleTimeString('en-US'));
        console.log(weather);
    }, 1000);
}

detectBtn.addEventListener('click', setCoords);
locationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log(getUrlSubString());
});