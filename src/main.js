import "mapbox-gl/dist/mapbox-gl.css"
import mapboxgl from "mapbox-gl"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const map = new mapboxgl.Map( {
	container: "map",
	attributionControl: false,
	logoPosition: "bottom-right",
	zoom: 9,
	center: [ 69.2753, 41.3126 ]
} )

map.on( "load", async () => {

	const geoJSON = await ( await fetch( "/data.geojson" ) ).json()

	map.addSource( "me", { type: "geojson", data: geoJSON } )
} )
