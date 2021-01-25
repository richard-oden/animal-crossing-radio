const openWeatherKey = config.OPEN_WEATHER_KEY;
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

async function detectLocation() {
    let worldCitiesJSON = await getJSON('../worldcities.json');
    const weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}`);
    const cityName = weatherJSON.name;
    const countryCode = weatherJSON.sys.country;
    console.log(cityName, countryCode);
    const foundCity = worldCitiesJSON.find(d => 
        d.city.toLowerCase() === cityName.toLowerCase() &&
        d.iso2.toLowerCase() === countryCode.toLowerCase()
    );
    let manualInputValue;
    if (foundCity) {
        const regionString = foundCity.admin_name ? `, ${foundCity.admin_name}` : ``;
        manualInputValue = `${foundCity.city}${regionString}, ${foundCity.country}`;
    } else {
        manualInputValue = `${cityName}, ${countryCode}`;
    }
    manualInput.value = manualInputValue;
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