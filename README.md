# Animal Crossing Radio

Plays real-time music from Animal Crossing: New Horizons, synced to your location and weather. You can also request specific songs from K.K. Slider and there's a slingshot mini-game.

## How it works

Location data is gathered in two ways: the browser's built-in gelocation function and [Google's Geolocation API](https://developers.google.com/maps/documentation/geolocation/overview). That location is then displayed using reverse geocoding (also through Google). The time is displayed in the correct timezone using [Google's Timezone API](https://developers.google.com/maps/documentation/timezone/overview) and formatted using the browser's language property. After that, weather data is gathered from [OpenWeatherMap API](https://openweathermap.org/api) and displayed. Finally, specific audio files are requested from [ACNH API](http://acnhapi.com/) using the user's local time/weather or search criteria.

The mini-game is built using the [Matter.js](https://brm.io/matter-js/) physics engine.

The app is built using Node.js with Express and is hosted on Heroku [here](https://animal-crossing-radio.herokuapp.com/). Just give it a few seconds to load, as it will "sleep" after 1 hour of inactivity.

## Code Louisville - January 2021 JavaScript Features
- Retrieve data from an external API and display data in your app (see `getMusic` in app.js and server.js, which uses [node-fetch](https://www.npmjs.com/package/node-fetch))
- Create and use a function that accepts two or more values (parameters), calculates or determines a new value based on those inputs, and returns a new value (see `calcMusicId` in app.js)
- Build a conversion tool that converts user input to another type and displays it (see `getWeather` in app.js)
- Calculate and display data based on an external factor

### Additional Features
- Create a web server with at least one route and connect to it from your application using ExpressJS

## More credits
- CSS based on designs by [Ananya Neogi](https://codepen.io/ananyaneogi/pen/Bgozrz) and [Sarah Fossheim](https://codepen.io/fossheim/pen/RwPeVKG)
- Images sourced from https://pngtree.com/, https://nookipedia.com/, and Nintendo
- Volume button icons are from [Font Awesome](https://fontawesome.com/)
- Auto-complete drop-down is based on [this example](https://www.w3schools.com/howto/howto_js_autocomplete.asp) from w3schools
