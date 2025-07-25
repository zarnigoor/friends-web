import "mapbox-gl/dist/mapbox-gl.css"
import "./main.css"
import mapboxgl from "mapbox-gl"
import { io } from "socket.io-client"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

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

	const username = prompt( "Type username:" )
	const avatar = prompt( "Type image (avatar/profile) address:" )

	console.log( username )
	console.log( avatar )

	const server = io( "http://localhost:3000" )

	server.on( "new_user", user => addNewUser( user, map ) )

	navigator.geolocation.getCurrentPosition( ( { coords } ) => {

		server.emit( "new_user", {
			username: username,
			avatar: avatar,
			coordinates: [ coords.longitude, coords.latitude ],
		} )
	} )
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
