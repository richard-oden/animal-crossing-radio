const openWeatherKey = config.OPEN_WEATHER_KEY;
const googleKey = config.GOOGLE_KEY;
const locationForm = document.querySelector('.menu');
const detectBtn = document.getElementById('detect-btn');
const locationInput = document.getElementById('manual-input');
const launchBtn = document.getElementById('launch-btn');
const toggleMusicBtn = document.getElementById('toggle-music-btn');
const musicControls = document.querySelector('.music-controls');

const user = {
    timeString: null,
    hour: null,
    coords: null,
    weather: null,
}
let music = new Audio();
music.loop = true;
let appRunning;

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
            user.coords = [position.coords.latitude, position.coords.longitude];
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
            user.coords = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
        } else {
            alert("Geocode was not successful for the following reason: " + status);
        }
    });
}

async function populateInput() {
    geocoder.geocode({ location: {lat: user.coords[0], lng: user.coords[1]} }, (results, status) => {
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

async function setTimeAtCoords()
{
    const d = new Date();
    const timestamp = Math.round(d.getTime() / 1000);
    const timezoneJSON = await getJSON(`https://maps.googleapis.com/maps/api/timezone/json?location=${user.coords[0]},${user.coords[1]}&timestamp=${timestamp}&key=${googleKey}`);
    if (timezoneJSON.status === "OK") {
        const options = {hour: 'numeric', minute: 'numeric', second: 'numeric', timeZone: timezoneJSON.timeZoneId};
        user.timeString = Intl.DateTimeFormat(navigator.language, options).format(d);
        user.hour = parseInt(Intl.DateTimeFormat('en-US', {hour: 'numeric', hour12: false, timeZone: timezoneJSON.timeZoneId}).format(d));
        if (user.hour == 24) user.hour = 0;
    } else {
        alert("Timezone API request failed due to: " + timezoneJSON.status);
    }
}

async function getWeather()
{
    const weatherJSON = await getJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${user.coords[0]}&lon=${user.coords[1]}&appid=${openWeatherKey}`);
    user.weather = weatherJSON.weather[0].main;
}

function calcMusicId()
{
    let id = (user.hour * 3) + 1;
    if (['Thunderstorm', 'Drizzle', 'Rain'].includes(user.weather)) {
        return id;
    } else if (user.weather === 'Snow') {
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
}

function fadeInMusic () {
    music.volume = 0;
    const fadeIn = setInterval(() => {
        let volumeRounded = Math.round(music.volume * 100) / 100;
        // Fade in until default volume is reached:
        volumeRounded += 0.05;
        // When default volume is reached, stop:
        if (volumeRounded >= 1) {
            volumeRounded = 1;
            clearInterval(fadeIn);
        }
        music.volume = volumeRounded;
    }, 200);
}

function transitionMusic() {
    const fadeOut = setInterval(() => {
        let volumeRounded = Math.round(music.volume * 100) / 100;
        if (volumeRounded > 0) {
            volumeRounded -= 0.05
            music.volume = volumeRounded;
        } else {
            clearInterval(fadeOut);
            const id = calcMusicId();
            getMusic(id);
            fadeInMusic();
        }
    }, 200);
}

async function startApp() {
    let seconds = 0;
    await setTimeAtCoords();
    await getWeather();
    const id = calcMusicId();
    getMusic(id);
    appRunning = setInterval(async () => {
        console.clear();
        // If hour has changed, update music:
        let prevHour = user.hour;
        await setTimeAtCoords();
        if (prevHour !== user.hour) transitionMusic()
        // Every ten minutes, if weather has changed, update music;
        if (seconds % 600 == 0) {
            let prevWeather = user.weather;
            await getWeather();
            if (prevWeather !== user.weather) transitionMusic();
        }
        console.log(user.timeString, user.weather);
        seconds++;
    }, 1000);
}

locationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (user.coords) {
        if (appRunning) {
            clearInterval(appRunning);
        }
        startApp();
        musicControls.classList.toggle("collapsed");
    } else {
        alert('Location not found!');
    }
});

toggleMusicBtn.addEventListener('click', () => {
    toggleMusicBtn.classList.toggle("paused");
    if (toggleMusicBtn.classList.contains("paused")) {
        startApp();
    } else {
        music.pause();
        clearInterval(appRunning);
    }
});