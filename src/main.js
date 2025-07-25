import "mapbox-gl/dist/mapbox-gl.css"
import "./main.css"
import mapboxgl from "mapbox-gl"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const geojson = {
	'type': 'FeatureCollection',
	'features': [
		{
			'type': 'Feature',
			'properties': {
				'message': 'Foo',
				'imageId': 1011,
				'iconSize': [60, 60]
			},
			'geometry': {
				'type': 'Point',
				'coordinates': [-66.324462, -16.024695]
			}
		},
		// {
		// 	'type': 'Feature',
		// 	'properties': {
		// 		'message': 'Bar',
		// 		'imageId': 870,
		// 		'iconSize': [50, 50]
		// 	},
		// 	'geometry': {
		// 		'type': 'Point',
		// 		'coordinates': [-61.21582, -15.971891]
		// 	}
		// },
		// {
		// 	'type': 'Feature',
		// 	'properties': {
		// 		'message': 'Baz',
		// 		'imageId': 837,
		// 		'iconSize': [40, 40]
		// 	},
		// 	'geometry': {
		// 		'type': 'Point',
		// 		'coordinates': [-63.292236, -18.281518]
		// 	}
		// }
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

			console.log( "CLICKED" )
		}

		const marker = new mapboxgl.Marker( el )
		marker.setLngLat( [ 69.24848892741892, 41.316625628694 ] )
		marker.addTo( map )
	}
} )
