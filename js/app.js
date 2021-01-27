const openWeatherKey = config.OPEN_WEATHER_KEY;
const locationForm = document.querySelector('.menu');
const detectBtn = document.getElementById('detect-btn');
const locationInput = document.getElementById('manual-input');
const launchBtn = document.getElementById('launch-btn');

let now;
let hour;
let coords;
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

let geocoder;
function initGeocoder() {
    geocoder = new google.maps.Geocoder();
    detectBtn.addEventListener('click', enterLocation);
    locationInput.addEventListener('change', detectLocation);
}


async function enterLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            coords = [position.coords.latitude, position.coords.longitude];
            populateInput();
        }, () => {
            console.log('Unable to retrive location.');
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
    }
}

function detectLocation() {
    const address = locationInput.value;
        geocoder.geocode({ address: address }, (results, status) => {
        if (status === "OK") {
            coords = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
        } else {
            alert("Geocode was not successful for the following reason: " + status);
        }
    });
}

async function populateInput() {
    geocoder.geocode({ location: {lat: coords[0], lng: coords[1]} }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                locationInput.value = results[0].formatted_address;
            } else {
                alert("No results found");
            }
        } else {
            alert("Geocoder failed due to: " + status);
        }
    });
}

async function getWeather()
{
    let weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${coords[0]}&lon=${coords[1]}&appid=${openWeatherKey}`);
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

locationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (coords) {
        startApp();
    } else {
        alert('Location not found!');
    }
});