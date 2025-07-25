import "mapbox-gl/dist/mapbox-gl.css"
import mapboxgl from "mapbox-gl"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const button = document.querySelector( "button" )

const map = new mapboxgl.Map( {
  container: "map",
  attributionControl: false,
  logoPosition: "bottom-right",
  zoom: 9,
  center: [ 69.2753, 41.3126 ],
  hash: true,
  minZoom: 5,
  maxZoom: 18,
  projection: "mercator",
} )

const state = {
  longitude: null,
  latitude: null,
  id: null,
  tracking: false,
}

const locationInfo = {
  longitude: document.getElementById("longitude"),
  latitude: document.getElementById("latitude"),
  speed: document.getElementById("speed"),
  container: document.getElementById("location-info"),
}

map.on( "load", async () => {

  map.addSource( "mydatasource", { type: "geojson", data: {
    type: "FeatureCollection",
	features: [
		{
			"type": "Feature",
			"properties": {
				"id": "A4VP7ED6RNDVCM98",
				"width": 1
			},
			"geometry": {
				"type": "LineString",
				"coordinates": [
					[
						69.24326419830322,
						41.30876078219282
					],
					[
						69.25055980682373,
						41.331322376377756
					],
					[
						69.28083658218384,
						41.321364006997584
					],
					[
						69.29280996322632,
						41.31872107738923
					],
					[
						69.2973804473877,
						41.31013081597226
					],
					[
						69.29504156112671,
						41.30318364169784
					],
					[
						69.27869081497192,
						41.292463231644945
					],
					[
						69.27369117736816,
						41.29041567475139
					],
					[
						69.26849842071533,
						41.2969128187365
					],
					[
						69.26585912704468,
						41.303312598310384
					],
					[
						69.25995826721191,
						41.30769697140238
					],
					[
						69.25506591796875,
						41.30808381369809
					],
					[
						69.2478346824646,
						41.309131500056594
					],
					[
						69.24367189407349,
						41.30876078219282
					],
					[
						69.24326419830322,
						41.30876078219282
					]
				]
			}
		}
	],
  } } )
  map.addSource("me", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [69.2753, 41.3126]
      }
    }
  })

  map.addLayer({
    id: "me",
    source: "me",
    type: "circle",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5, 16,
        8, 14,
        11, 12,
        13, 10,
        18, 8,
      ],
      "circle-color": "orange",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 4,
      "circle-opacity": 0.75,
    }
  })
  map.addLayer({
    id:"polygons",
    source:"mydatasource",
    type:"fill",
    filter:["==",["geometry-type"],"Polygon"],
    paint:{
    "fill-color":"#ffa500",
    "fill-opacity":0.5
    }
  })
  map.addLayer({
    id: "lines",
    source: "mydatasource",
    type: "line",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": "#0000ff",
      "line-width": 5
    }
  })

  // Hover effects for circle
  map.on("mouseenter", "me", () => {
    map.getCanvas().style.cursor = "pointer"
    map.setPaintProperty("me", "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5, 20,
      8, 18,
      11, 16,
      13, 14,
      18, 12,
    ])
  })

  map.on("mouseleave", "me", () => {
    map.getCanvas().style.cursor = ""
    map.setPaintProperty("me", "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5, 16,
      8, 14,
      11, 12,
      13, 10,
      18, 8,
    ])
  })

  // Hover effects for lines
  map.on("mouseenter", "lines", () => {
    map.getCanvas().style.cursor = "pointer"
    map.setPaintProperty("lines", "line-width", 8)
  })

  map.on("mouseleave", "lines", () => {
    map.getCanvas().style.cursor = ""
    map.setPaintProperty("lines", "line-width", 5)
  })

  button.onclick = () => {

    if (!state.tracking) {
      
      state.tracking = true
      locationInfo.container.style.display = "block"
      
      state.id = navigator.geolocation.watchPosition( position => {

        const { longitude, latitude, speed } = position.coords

        state.longitude = longitude
        state.latitude = latitude

        const geoJSONPoint = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
        }

        map.getSource("me").setData(geoJSONPoint)
        
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          speed: 1.5,
          curve: 1.2,
        })
        
        locationInfo.longitude.textContent = `Lon: ${longitude.toFixed(6)}`
        locationInfo.latitude.textContent = `Lat: ${latitude.toFixed(6)}`
        
        const speedKmh = speed !== null && speed !== undefined ? (speed * 3.6).toFixed(1) : "0"
        locationInfo.speed.textContent = `Speed: ${speedKmh} km/h`

      }, error => {

        console.log( error )
        state.tracking = false
        locationInfo.container.style.display = "none"
      }, {
        enableHighAccuracy: true,
        timeout: 10_000,
      } )
    } else {
      
      navigator.geolocation.clearWatch( state.id )
      state.tracking = false
      locationInfo.container.style.display = "none"
    }
  }
} )

