README
Leaflet.draw freehand

This program is an extension of the Leaflet.draw plug-in and supports freehand drawing of polygons on leaflet maps.

The only external dependency for this program is leaflet.canvaslayer.js.

The program works by letting a user draw a freehand path on a HTML5 canvas and keeping a record of the points the user has traced out. This path is then simplified with an RDP algorithm and the new path is passed to the Leaflet addPolygon method. Editing and deleting are fully functional through the Leaflet.draw plugin

The RDP code is provided by http://karthaus.nl/rdp/