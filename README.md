# jquery-bucket-filter
## jQuery Responsive Drag &amp; Drop Bucket Filtering

jQuery Plugin for Filtering and Displaying Items in a List - requires jQuery and jQuery UI

// by Shelby Neil Smith


To use, create an instance of the DragDropFilter jQuery object:
``` js
var filterOptions = new $.DragDropFilter();
```
...and then call the object's init method, passing in an array of filter options:
``` js
filterOptions.init(['filter1', 'filter2', 'filter3']);
```
The object parameters are:
* A jQuery selector of the list element containing the items you are going to be sorting, 
* An optional pre-filter function - this is good for if you need to something like running an Ajax call every time you filter your results.
* The plugin options (shown below)
``` js
var filterOptions = {
	filterGroup: 'categories',
	bucketInstructions: "Drop an icon in this here bucket to filter stuff!",
};

var someMoreFiltering = new $.DragDropFilter($('#filter-results ul'), preFilterFunction, filterOptions);
```

Here are the currently available options (and their defaults) for the plugin:
``` js
var filterOptions = {
	optionsContainer: $('#filter-options'),		
	bucketInstructions: '',
	filterGroup: 'categories',
	gutterWidth: 20,
	wideWidth: 1056,
	narrowWidth: 720,
	alertSec: 2000
};
```
