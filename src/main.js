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

	console.clear()

	// Get user data from localStorage (set by onboarding)
	const userData = JSON.parse(localStorage.getItem('userData') || '{}')
	const username = userData.name || 'Anonymous User'
	let avatar = userData.image || "https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png"
	
	try {
		new URL( avatar )
	}
	catch( err ) {
		avatar = "https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png"
		console.log( err )
	}

	const server = io( "http://localhost:3000" )

	server.on( "new_user", user => {
		console.log( user )
		addNewUser( user, map )
	} )

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

		alert( geoJSONFeature.properties.username )
	}

	const marker = new mapboxgl.Marker( el )
	marker.setLngLat( geoJSONFeature.geometry.coordinates )
	marker.addTo( map )
}
