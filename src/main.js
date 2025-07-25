import "mapbox-gl/dist/mapbox-gl.css"
import "./main.css"
import mapboxgl from "mapbox-gl"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const geojson = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			properties: {
				username: "Toby",
			},
			geometry: {
				type: "Point",
				coordinates: [ 69.26121583796288, 41.31552884597011 ]
			}
		},
	]
}

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

map.on( "load", async () => {

	for ( const user of geojson.features ) {

		const el = document.createElement( "div" )
		el.className = "user"
		el.style.backgroundImage = "url(https://i.etsystatic.com/51940401/r/il/09f87f/6026253544/il_570xN.6026253544_g00n.jpg)"

		el.onclick = () => {

			console.log( user.properties.username )
		}

		const marker = new mapboxgl.Marker( el )
		marker.setLngLat( user.geometry.coordinates )
		marker.addTo( map )
	}
} )
