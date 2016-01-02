/*
// jQuery Responsive Drag & Drop Bucket Filtering
// jQuery Plugin for Filtering and Displaying Items in a List - requires jQuery and jQuery UI
// by Shelby Neil Smith
*/

;(function($) {
	var alertTimeOut, filterObj;

	$.DragDropFilter = function(resultsList, rebuildResultsPre, options) {

		var defaults = {
			optionsContainer: $('#filter-options'),
			bucketInstructions: '',
			filterGroup: 'categories',
			gutterWidth: 20,
			wideWidth: 1056,
			narrowWidth: 720,
			alertSec: 2000
		};

		filterObj = this;

		this.resultsList = resultsList;

		if (rebuildResultsPre && typeof rebuildResultsPre !== 'undefined') {
			this.rebuildResultsPre = rebuildResultsPre;
		} else {
			this.rebuildResultsPre = function(callback) {
				callback();
			};
		}

		this.settings = $.extend({}, defaults, options);
	};

	//=========================================
	// ** Initialize the filter object
	//=========================================
	$.DragDropFilter.prototype.init = function(optionsArr) {

		// create the icon elements from the given array
		for (var o = 0, ol = optionsArr.length; o < ol; o++) {
			this.settings.optionsContainer.append('<div class="filter-option-slot out drop-spot ' + optionsArr[o].toLowerCase() + '" data-filter-label="' + optionsArr[o].toLowerCase() + '"><div class="filter-option draggable" data-filter="' + optionsArr[o].toLowerCase() + '"><span class="icon ' + optionsArr[o].toLowerCase() + '">' + optionsArr[o] + '</span></div><span>' + optionsArr[o] + '</span></div>');
		}

		// create the filter bucket
		var bucketHTML = '<div id="filter-bucket" class="sort-bucket drop-spot in empty">';
		if (this.settings.bucketInstructions) {
			bucketHTML += '<span class="bucket-instr">' + this.settings.bucketInstructions + '</span>';
		}
		bucketHTML += '<a href="#" class="clear-all">Clear All Filters</a>';
		bucketHTML += '</div>';
		this.settings.optionsContainer.after(bucketHTML);

		// set some variables for the bucket that we can reference later
		this.bucket = $('#filter-bucket');
		this.bucketHeightStart = this.bucket.height();
		this.bucketOrder = [];

		// check the url query to see if we need to go ahead and set up a particular filter option
		var catQuery = checkQuery();
		if (catQuery) {
			this.dropInBucket(catQuery);
		}

		// set up behavior for draggable items
		$( '.draggable' ).draggable({
			cursor: "move",
			stack: '.draggable',
			revert : function( event, ui ) {
				var outModifier;

				if ( $(this).hasClass( 'reverting' ) ) {
					$(this).data( 'uiDraggable' ).originalPosition = {
						top : 0,
						left : 0
					};

					if ( $( '.in-bucket' ).length === 0 ) {
						outModifier = 'last-out';
					}

					filterObj.update( 'out', outModifier, $(this) );

					$(this).removeClass( 'reverting' );
				}
				return !event;
			},
			start: function( event, ui ) {
				filterObj.curIconStartPos = ui.helper.position();
			}
		});

		// set up 'droppable' behavior for bucket
		this.bucket.droppable({
			tolerance: 'touch',
			accept: function(d) {
				if ( $(this).hasClass( 'out' ) ) {
					var filterLabel = $(this).attr( 'data-filter-label' );

					if ( d.attr( 'data-filter' ) === filterLabel ) {
						return true;
					}
				} else {
					return true;
				}
			},
			over: function( event, ui ) {
				$(this).addClass( 'over' );

				if (ui.helper.hasClass('reverting')) {
					ui.helper.addClass( 'in-bucket' ).removeClass('reverting');
				}
			},
			drop: function( event, ui ) {
				filterObj.dropInBucket(ui.draggable);
			},
			out: function( event, ui ) {
				$(this).removeClass( 'over' );

				// If we're pulling an icon out of the bucket, go ahead and get it ready to revert.
				if (ui.helper.hasClass('in-bucket')) {
					ui.helper.removeClass( 'in-bucket' ).addClass('reverting');
				}
			}
		});

		//////// SETUP RESPONSIVE BEHAVIOR
		var windowResize = {
			width:0,
			init: function() {
				oldWindowWidth = $(window).width();
			},
			checkResize: function(callback) {
				if( this.width !== oldWindowWidth ) {
					callback.apply();
				}
			}
		};
		windowResize.init();

		var tOut = false;
		var milSec = 300;

		$(window).resize(function() {windowResize.checkResize(function() {
				mediaWidthCheck();

				if(tOut !== false) {
					clearTimeout(tOut);
				}
				tOut = setTimeout( function() { filterObj.mediaWidthReset.call(filterObj); }, milSec );
			});
		});
		/////// END RESPONSIVE BEHAVIOR STUFF

	};

	//=========================================
	// ** Method for updating the filter bucket and results when an icon is dropped
	//=========================================
	$.DragDropFilter.prototype.update = function( $inOut, $modifier, $newCat )  {
		// make the bucket visually react to the update
		this.bucketUpdate( $inOut, $modifier, $newCat );

		// rebuild the filter results
		this.rebuildResults( $modifier );

		// update filter results message
		this.showMessage(filterAlert());
	};

	//===================================================
	// ** Method to update the bucket.
	//===================================================
	$.DragDropFilter.prototype.bucketUpdate = function( $inOut, $modifier, $newCat ) {
		// if removing items, remove associated "plus" icons
		if ( ( $inOut === 'out' ) && ( $newCat !== undefined ) ) {
			if ( this.bucketOrder.length > 1 ) {
				if ( $newCat.attr( 'data-filter' ) === this.bucketOrder[ this.bucketOrder.length - 1 ] ) {
					$( '.in-bucket[data-filter=' + this.bucketOrder[ this.bucketOrder.length - 2 ] + ']').children( '.plus-icon' ).fadeOut( 200, function() { $(this).remove(); } );
				} else {
					$newCat.children( '.plus-icon' ).remove();
				}
			}
		}

		// show/hide bucket instructions and 'clear all' button
		if ( $modifier === 'last-out' ) {
			$( '.bucket-instr' ).fadeIn();
			$( '.clear-all' ).hide().unbind( 'click' );
		} else if ( $modifier === "first-in" ) {
			$( '.bucket-instr' ).hide();
			$( '.clear-all' ).fadeIn().bind( 'click', (function(scope) { return function() { scope.clearAll.call(scope); return false; }; })(this) );
		}

		// position the icons in the bucket, if things are changing
		if ( typeof $newCat !== 'undefined' ) {
			this.positionInBucket( $inOut, $modifier, $newCat  );
		}

		// remove the category from the bucket options array
		if ( ( $inOut === 'out' ) && ( $newCat !== undefined ) ) {
			this.bucketOrder.remove( $newCat.text().toLowerCase() );
		}

		this.bucketReact($modifier);
	};

	//===================================================
	// ** Method to make the bucket visually react to icons being moved in and out.
	//===================================================
	$.DragDropFilter.prototype.bucketReact = function( $modifier ) {
		// Bucket Animation
		if ( $modifier === 'last-out' ) {
			this.bucket
				.animate( {
					height: "110px",
					top: "5px"
				}, 200 )
				.delay( 20 )
				.animate( {
					height: this.bucketHeightStart + "px",
					top: "0"
				}, 50, function () {
					$(this).css( 'height', 'auto' );
				} );
		} else {
			this.bucket
				.animate( {
					height: "130px",
					top: "-5px"
				}, 100 )
				.delay( 20 )
				.animate( {
					height: "110px",
					top: "5px"
				}, 30 )
				.animate( {
					height: "130px",
					top: "-5px"
				}, 100 )
				.delay( 20 )
				.animate( {
					height: "120px",
					top: "0"
				}, 50 );
		}
	};

	//===============================================
	// ** Method to position new icon in the bucket and keep things centered
	//===============================================
	$.DragDropFilter.prototype.positionInBucket = function( $inOut, $modifier, $ui ) {
		// get the offset of the current icon
 		var filterObj = this;
 		var drag_p = $ui.offset();
		var bucketOffset = this.bucket.offset();

		var moveAmt = ( ($ui.width() * 0.5) + ( filterObj.settings.gutterWidth * 0.5 ) );

		// declare positioning variables and set top position for all icons
		var left_end, top_end = ( bucketOffset.top + this.settings.gutterWidth ) - drag_p.top;

		if ( $inOut === 'in' ) {
			// figure out position of this icon in bucket, relative to other icons already in there.
			if ( $modifier === 'first-in' ) {
				left_end = ( ( $(window).width() * 0.5) - ( $ui.width() * 0.5 ) ) - drag_p.left;
			} else {
				var endIconLeft = $( '.in-bucket[data-filter=' + this.bucketOrder[ this.bucketOrder.length - 2 ] + ']' ).offset().left;
				var endIconWidth = $( '.in-bucket[data-filter=' + this.bucketOrder[ this.bucketOrder.length - 2 ] + ']' ).width();

				left_end = ( endIconLeft + endIconWidth + this.settings.gutterWidth - moveAmt ) - drag_p.left;

				// scoot over icons already in the bucket
				$( '.in-bucket' ).not($ui).each(function () {
					$(this).animate({
						// left: '-=' + ( $ui.width() * 0.66 ) + 'px'
						left: '-=' + moveAmt  + 'px'
					}, 200);
				});
			}

			 // animate the icon into place at the end of the items in the bucket
			$ui.animate({
				top: '+=' + top_end,
				left: '+=' + left_end
			}, 200);
		} else {
			// if this is the last icon in the bucket, we don't have to worry about adjusting other icon positions
			if ( $modifier !== 'last-out' ) {
				var moveDir;

				// Figure out which direction to scoot individual icons so things remain centered, even if we pull out icons from the middle
				$.each(filterObj.bucketOrder, function( index, item) {
					if ( $ui.attr( 'data-filter' ) === filterObj.bucketOrder[ filterObj.bucketOrder.length - 1 ] ) {
						moveDir = '+';
					} else if ( $ui.attr( 'data-filter' ) === filterObj.bucketOrder[ 0 ] ) {
						moveDir = '-';
					} else {
						if ( index < filterObj.bucketOrder.getKeyByValue( $ui.attr( 'data-filter' ) ) ) {
							moveDir = '+';
						} else if ( index > filterObj.bucketOrder.getKeyByValue( $ui.attr( 'data-filter' ) ) ) {
							moveDir = '-';
						}
					}

					$( '.in-bucket[data-filter=' + filterObj.bucketOrder[ index ] + ']' ).animate({
						left: moveDir + '=' + moveAmt + 'px'
					}, 200);
				});
			}
		}
	};

	//=========================================
	// ** Behavior for when we drop an icon in the bucket
	//=========================================
	$.DragDropFilter.prototype.dropInBucket = function($ui) {
		// check if icon is in "reverting" state, if so remove the class
		if ( $ui.hasClass( 'reverting' ) ) {
			$ui.removeClass( 'reverting' );
		}
		// remove the "over" class for the bucket
		this.bucket.removeClass( 'over' );

		// if icon is already in bucket, and not dropped outside bucket, just send it right back to where it was
		if ( $ui.hasClass( 'in-bucket' ) ) {
			$ui.animate({
				top: this.curIconStartPos.top,
				left: this.curIconStartPos.left
			});
		// otherwise, figure out what to do with it.
		} else {
			var inModifier = null;

			// add the category to the bucket options array
			this.bucketOrder.push($ui.text().toLowerCase());

			// if this is the first icon going in the bucket, let the program know
			if ( $( '.in-bucket' ).length === 0 ) {
				inModifier = 'first-in';
			} else {
				// if this isn't the first item in the bucket, add the plus icon
				$('<span class="plus-icon">+</span>').appendTo($( '.in-bucket[data-filter=' + this.bucketOrder[ this.bucketOrder.length - 2 ] + ']')).css('width',  this.settings.gutterWidth + 'px').hide().fadeIn();
			}
			// Add the "in-bucket" class to this icon
			$ui.addClass( 'in-bucket' );

			// update everything
			this.update( 'in', inModifier, $ui );

			// set oldDropWidth to the current $ui outerWidth
			oldDropWidth = $ui.outerWidth();
		}

	};

	//=========================================
	// ** Method to show a new message when filters update
	//=========================================
	$.DragDropFilter.prototype.showMessage = function( $message ) {
		var origResultsOffsetTop, origResultsPosTop;

		// If there is already message displayed, go ahead and remove it.
		if($('.alert-message')) {
			$('.alert-message').remove();
		}

		// Display the new message!
		$( '<span class="alert-message alert">'+$message+'</span>' ).insertAfter( this.bucket );

		$alertMessage = $('.alert-message');

		// Clear any timeout that might already exist.
		clearTimeout(alertTimeOut);

		// Set the new time to hide the message after it displays for a few seconds.
		alertTimeOut = setTimeout( function() {
			$alertMessage.animate( { 'opacity' : 0, 'height' : 0 }, 400, function() {
				$alertMessage.remove();
			});
		}, this.settings.alertSec );
	};

	//=========================================
	// ** Method to clear out all items from bucket
	//=========================================
	$.DragDropFilter.prototype.clearAll = function(clearAllMod) {
		// loop through all the icons in the bucket and return them to their homes
		$( '.in-bucket' ).each(function() {
			var $bucketItem = $(this);

			$bucketItem.animate({
				left: 0,
				top: 0
			}, 500 ).removeClass( 'in-bucket' );

			$bucketItem.children( '.plus-icon' ).remove();
		});
		// clear out the bucket order array
		this.bucketOrder = [];

		// give the user messages based on what event cause the clearing of the bucket
		if ( clearAllMod === 'shaken' ) {
			this.showMessage( 'Not so fast, speed metal...they all fell out!' );
		} else {
			this.showMessage( 'All filters cleared - showing all items!' );
		}

		// update everything
		this.update( 'out', 'last-out' );
	};

	//==================================================
	// ** Method to rebuild filter results based on items currently in the bucket
	//==================================================
	$.DragDropFilter.prototype.rebuildResults = function( $modifier, forceZero  ) {
		filterObj.rebuildResultsPre(function() {
			if (typeof filterObj.resultsList !== "undefined") {
				filterObj.resultsList.fadeOut('slow', function() {
					var bucketOptions, bucketCount, resultFilters, resultFiltersArray;

					bucketOptions = $( '.in-bucket' );

					var $resultsAll = $(filterObj.resultsList).children('li');

					if ( $modifier === 'last-out' ) {
						$resultsAll.addClass( 'visible-result' );
					} else {
						$resultsAll.removeClass( 'visible-result' );

						$resultsAll.each(function() {
							resultFilters = $(this).attr( 'data-' + filterObj.settings.filterGroup );

							if (typeof resultFilters !== 'undefined') {
								resultFiltersArray = resultFilters.split(' ');

								if(containsAll(filterObj.bucketOrder, resultFiltersArray)) {
									if( $(this).hasClass('hidden-result')) {
										$(this).removeClass( 'hidden-result' );
									}
									$(this).addClass( 'visible-result' );
								} else {
									$(this).addClass( 'hidden-result' );
								}
							}
						});
					}
					filterObj.resultsList.fadeIn();
				});
			}
		});
	};

	$.DragDropFilter.prototype.mediaWidthReset = function() {
		var bucketHeightEnd, oldParentPos;

		if (newWindowWidth < this.settings.narrowWidth) {
			bucketHeightEnd = 'auto';
		} else {
			bucketHeightEnd = this.bucketHeightStart;
		}

		if ( ( $( '.in-bucket' ).length > 0 ) && ( ( ( oldWindowWidth > this.settings.wideWidth ) && ( newWindowWidth < this.settings.wideWidth ) ) || ( ( oldWindowWidth < this.settings.wideWidth ) && ( newWindowWidth > this.settings.wideWidth ) ) || ( ( oldWindowWidth < this.settings.narrowWidth ) && ( newWindowWidth > this.settings.narrowWidth ) ) || ( ( oldWindowWidth > this.settings.narrowWidth ) && ( newWindowWidth < this.settings.narrowWidth ) ) ) ) {
			this.clearAll( 'shaken' );
		}

		$( '.in-bucket' ).each(function() {
			var curPos = $(this).offset().left;
			var widthChangeOffset = ( oldWindowWidth - newWindowWidth );

			var parentOffset = ( oldParentPos - filterObj.newParentPos );

			var newPos = ( ( widthChangeOffset * 0.5 ) + ( ( oldDropWidth - newDropWidth ) * 0.5 ) ) - parentOffset;

			$(this).animate({
				left: '-=' + newPos
			});
		});

		if ( $( '.in-bucket' ).length > 0 ) {
			oldDropWidth = $( '.in-bucket:first-of-type' ).outerWidth();
		}
		oldParentPos = $( '.filter-option-slot:first-of-type' ).offset().left;

		oldWindowWidth = $(window).width();
	};


	//==================================================
	// ** Helper functions
	//==================================================

	Array.prototype.remove = function(v) { this.splice(this.indexOf(v) === -1 ? this.length : this.indexOf(v), 1); };
	Array.prototype.getKeyByValue = function( value ) {
		for( var prop in this ) {
			if( this.hasOwnProperty( prop ) ) {
				if( this[ prop ] === value ) {
					return prop;
				}
			}
		}
	};

	function checkQuery() {
		var QueryString = (function () {
		// This function is anonymous, is executed immediately and
		// the return value is assigned to QueryString!
			var query_string = {};
			var query = window.location.search.substring(1);
			var vars = query.split("&");
			for ( var i = 0; i < vars.length; i++ ) {
				var pair = vars[i].split("=");
				// If first entry with this name
				if (typeof query_string[pair[0]] === "undefined") {
					query_string[pair[0]] = pair[1];
					// If second entry with this name
				} else if (typeof query_string[pair[0]] === "string") {
					var arr = [ query_string[pair[0]], pair[1] ];
					query_string[pair[0]] = arr;
					// If third or later entry with this name
				} else {
					query_string[pair[0]].push(pair[1]);
				}
			}
			return query_string;
		} ());

		if(QueryString.filter !== undefined) {
			var selectedFilter = $('.filter-option[data-filter=' + QueryString.filter + ']');
			oldDropWidth = selectedFilter.outerWidth();

			return selectedFilter;
		}
	}

	function filterAlert() {
		// Remove any message showing
		$( '.alert-message' ).fadeOut( 'fast', function() { $(this).remove(); });

		// update list of categories that appear in the message
		var msg_cats = '';
		var $bucketItems = $('.in-bucket');
		var servicesLen = $bucketItems.length;

		// loop through all items in bucket and add each one to the message, figuring out where to add commas, etc.
		if (servicesLen > 0) {
			$.each($bucketItems, function(index) {
				if ((index !== 0) && (servicesLen > 1)) {
					if (index !== servicesLen - 1) {
						msg_cats += ', ';
					} else {
						msg_cats += ' and ';
					}
				}

				msg_cats += '<strong>' + $(this).parent().attr('data-filter-label') + '</strong>';
			});
		} else {
			msg_cats = '<strong>ALL</strong>';
		}

		// return the message we made!
		return 'Showing ' + msg_cats + ' results.';
	}

	function mediaWidthCheck() {
		newWindowWidth = $(window).width();

		if ( $( '.in-bucket' ).length > 0 ) {
			newDropWidth = $( '.in-bucket:first-of-type' ).outerWidth();
		}

		filterObj.newParentPos = $( '.filter-option-slot:first-of-type' ).offset().left;
	}

	function containsAll ( needles, haystack ) {
		for ( var i = 0 , len = needles.length; i < len; i++ ) {
			if ( $.inArray( needles[ i ], haystack ) === -1 ) { return false; }
		}
		return true;
	}

})(jQuery);
