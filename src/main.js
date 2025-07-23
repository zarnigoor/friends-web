import "mapbox-gl/dist/mapbox-gl.css"
import mapboxgl from "mapbox-gl"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const map = new mapboxgl.Map( {
	container: "map",
	attributionControl: false,
	logoPosition: "bottom-right",
	zoom: 9,
	center: [ 69.2753, 41.3126 ],
	hash: true,
} )

map.on( "load", async () => {

	const response = await fetch( "/data.geojson" )
	const geoJSON = await response.json()

	map.addSource( "me", { type: "geojson", data: geoJSON } )
	map.addLayer( {
		id: "me",
		source: "me",
		type: "circle",
		paint: {
			"circle-radius": 12,
			"circle-color": "orange",
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": 4,
			"circle-opacity": 0.75,
		}
	} )
} )
