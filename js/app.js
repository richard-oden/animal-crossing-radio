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
            if (Object.values(states).includes(foundCity.admin_name)) {
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

async function getQueryString(inputValue, inputArr) {
    const worldCitiesJSON = await getJSON('../worldcities.json');
    
    //TODO: Reformat place names separated by comma (e.g. 'Korea, South' => 'South Korea')
    const foundCities = worldCitiesJSON.filter(c => 
        inputValue.match(RegExp(`\\b${c.city.toLowerCase()}\\b`, 'g')));
        //TODO: Add way to detect US State abbreviations
    const foundRegions = worldCitiesJSON.filter(c => c.admin_name != ''
        && inputValue.match(RegExp(`\\b${c.admin_name.toLowerCase()}\\b`, 'g')));
    const foundCountries = worldCitiesJSON.filter(c => 
        inputValue.match(RegExp(`\\b${c.country.toLowerCase()}\\b`, 'g'))
        || inputArr.includes(c.iso2.toLowerCase()) 
        || inputArr.includes(c.iso3.toLowerCase()));

    let queryString = `q=`;

    if (foundCities.length) {
        const citiesWithRegionAndCountry = foundCities.filter(c => 
            foundRegions.includes(c) && foundCountries.includes(c));
        const citiesWithRegion = foundCities.filter(c => foundRegions.includes(c));
        const citiesWithCountry = foundCities.filter(c => foundCountries.includes(c));

        let selectedCity;
        if (citiesWithRegionAndCountry.length) selectedCity = citiesWithRegionAndCountry[0];
        else if (citiesWithRegion.length) selectedCity = citiesWithRegion[0];
        else if (citiesWithCountry.length) selectedCity = citiesWithCountry[0];
        else selectedCity = foundCities[0];
        let regionString = ``;
        if (Object.values(states).includes(selectedCity.admin_name)) regionString = `,${selectedCity.admin_name}`;
        queryString += `${selectedCity.city.normalize()}${regionString.normalize()},${selectedCity.country.normalize()}`;
    } else if (foundRegions.length) {
        const regionsWithCountry = foundRegions.filter(c => foundCountries.includes(c));

        let selectedRegion;
        if (regionsWithCountry.length) selectedRegion = regionsWithCountry[0];
        else selectedRegion = foundRegions[0];
        queryString += `${selectedRegion.admin_name.normalize()},${selectedRegion.country.normalize()}`;
    } else if (foundCountries.length) {
        queryString += foundCountries[0].country.normalize();
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