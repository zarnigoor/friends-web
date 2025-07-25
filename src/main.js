import "mapbox-gl/dist/mapbox-gl.css"
import "./main.css"
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
	longitude: document.getElementById('longitude'),
	latitude: document.getElementById('latitude'),
	speed: document.getElementById('speed'),
	container: document.getElementById('location-info'),
}

map.on( "load", async () => {

	const popup = new mapboxgl.Popup( { offset: 100 } ).setHTML( `
		<div class="user-info">
			<h1>Muhammadrahim</h1>
			<ul>
				<li>Firadvs</li>
				<li>Asror</li>
			</ul>
		</div>
	` )

	console.log( popup )

	const marker = new mapboxgl.Marker()
	marker.setLngLat( [ 69.24850253531139, 41.316625628696045 ] )
	marker.setPopup( popup )
	marker.addTo( map )

	return

	map.addSource( "me", { type: "geojson", data: null } )
	map.addSource( "me-hover", { type: "geojson", data: null } )
	map.addSource( "me-active", { type: "geojson", data: null } )
	map.addLayer( {
		id: "me",
		source: "me",
		type: "circle",
		paint: {
			"circle-radius": [
				"interpolate",
				[ "linear" ],
				[ "zoom" ],
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
	} )
	map.addLayer( {
		id: "me-hover",
		source: "me-hover",
		type: "circle",
		paint: {
			"circle-radius": 16,
			"circle-color": "navy",
			"circle-stroke-color": "white",
			"circle-stroke-width": 4,
			"circle-opacity": 0.75,
		}
	} )
	map.addLayer( {
		id: "me-active",
		source: "me-active",
		type: "circle",
		paint: {
			"circle-radius": 16,
			"circle-color": "yellow",
			"circle-stroke-color": "black",
			"circle-stroke-width": 4,
			"circle-opacity": 1,
		}
	} )

	map.on( "mousemove", "me", e => {

		if ( e.features.length > 0 ) {

			const geoJSONFeature = e.features[ 0 ]

			map.getSource( "me-hover" ).setData( geoJSONFeature )
		}
	} )

	map.on( "mouseleave", "me", () => {

		map.getSource( "me-hover" ).setData( {
			type: "FeatureCollection",
			features: [],
		} )
	} )

	map.on( "click", "me-hover", e => {

		if ( e.features.length ) {

			const geoJSONFeature = e.features[ 0 ]

			map.getSource( "me-active" ).setData( geoJSONFeature )
		}
	} )

	//

	button.onclick = () => {

		if (!state.tracking) {
			
			state.tracking = true
			locationInfo.container.style.display = 'block'
			
			state.id = navigator.geolocation.watchPosition( position => {

				const { longitude, latitude, speed } = position.coords

				state.longitude = longitude
				state.latitude = latitude

				const geoJSONPoint = {
					id: "abc",
					type: "Feature",
					properties: {
						id: "abc",
					},
					geometry: {
						type: "Point",
						coordinates: [ longitude, latitude ],
					},
				}

				map.getSource( "me" ).setData( geoJSONPoint )
				
				map.flyTo({
					center: [longitude, latitude],
					zoom: 15,
					speed: 1.5,
					curve: 1.2,
				})
				
				locationInfo.longitude.textContent = `Lon: ${longitude.toFixed(6)}`
				locationInfo.latitude.textContent = `Lat: ${latitude.toFixed(6)}`
				
				const speedKmh = speed !== null && speed !== undefined ? (speed * 3.6).toFixed(1) : '0'
				locationInfo.speed.textContent = `Speed: ${speedKmh} km/h`

			}, error => {

				console.log( error )
				state.tracking = false
				locationInfo.container.style.display = 'none'
			}, {
				enableHighAccuracy: true,
				timeout: 10_000,
			} )
		} else {
			
			navigator.geolocation.clearWatch( state.id )
			state.tracking = false
			locationInfo.container.style.display = 'none'
		}
	}
} )
