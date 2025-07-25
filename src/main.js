import "mapbox-gl/dist/mapbox-gl.css"
import "./main.css"
import mapboxgl from "mapbox-gl"
import { io } from "socket.io-client"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const geojson = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			properties: {
				username: "Toby",
				avatar: "https://cdn5.vectorstock.com/i/1000x1000/95/04/funny-crocodile-surfing-cartoon-on-white-vector-47309504.jpg",
			},
			geometry: {
				type: "Point",
				coordinates: [ 69.26121583796288, 41.31552884597011 ]
			}
		},
		{
			type: "Feature",
			properties: {
				username: "Toby",
				avatar: "https://dbw3zep4prcju.cloudfront.net/animal/6f03d683-43b3-4101-8a62-850ccfab79a3/image/e61d9814-a84c-43f8-a607-1aa962332f95.jpg?versionId=5gqLFUBzVa8uyoeri8DsodBYJqKH12kJ&bust=1752550902&width=600",
			},
			geometry: {
				type: "Point",
				coordinates: [ 69.26521583796288, 41.31552884597011 ]
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

	const server = io( "http://localhost:3000" )

	map.on( "click", () => {

		addNewUser( {
			type: "Feature",
			properties: {
				username: "Chubrik",
				avatar: "https://www.diamondpet.com/wp-content/uploads/2023/07/brown-chihuahua-standing-in-grass-071723.jpg",
			},
			geometry: {
				type: "Point",
				coordinates: [ 69.257, 41.31552884597011 ]
			}
		}, map )
	} )

	for ( const user of geojson.features ) {

		addNewUser( user, map )
	}
} )

function addNewUser( geoJSONFeature, map ) {

	const el = document.createElement( "div" )
	el.className = "user"
	el.style.backgroundImage = `url(${ geoJSONFeature.properties.avatar })`

	el.onclick = () => {

		console.log( geoJSONFeature.properties.username )
	}

	const marker = new mapboxgl.Marker( el )
	marker.setLngLat( geoJSONFeature.geometry.coordinates )
	marker.addTo( map )
}
