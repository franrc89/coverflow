/*jslint devel: true, bitwise: true, regexp: true, browser: true, confusion: true, unparam: true, eqeq: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4 */
/*globals jQuery */

/*
 * Coverflow
 *
 * Copyright (c) 2013 Martijn W. van der Lee
 * Licensed under the MIT.
 *
 * Lightweight and flexible coverflow effect using CSS3 transforms.
 * For modern browsers with some amount of graceful degradation.
 * Optional support for jQuery.interpolate() plugin.
 * Optional support for .reflect() plugins.
 *
 * Requires jQuery 1.7+.
 * Recommended jQuery 1.8+ and jQueryUI.
 *
 * @todo Only update 1 outside visible range
 * @todo Support touch-drag for mobile devices
 * @todo Scroll-mode cyclic
 * @todo Display-mode continuous/cyclic
 * @todo Support direct jQueryUI slider hookup?
 * @todo Support mouse-drag to scroll?
 * @todo Support transformie?
 * @todo Support reflection.js properly (or do it in this code self)
 * @todo Take element layout into account
 * @todo Automatic height? Set scaling
 * @todo Flat view if sufficient space
 */

;(function($, undefined) {
	"use strict";

	var sign	= function(number) {
					return number < 0 ? -1 : 1;
				},
		scl		= function(number, fromMin, fromMax, toMin, toMax) {
					return ((number - fromMin) * (toMax - toMin) / (fromMax - fromMin)) + toMin;
				};

	$.widget("vanderlee.coverflow", {
		options: {
			index:			0,
			width:			undefined,
			visible:		'density',		// 'density', 'all', exact
			density:		1,
			duration:		'normal',
			innerAngle:		-75,
			outerAngle:		-30,
			innerScale:		.75,
			outerScale:		.25,
			innerOffset:	100 / 3,
			selectedCss:		undefined,
			innerCss:		undefined,
			outerCss:		undefined,

			change:			undefined,	// Whenever index is changed
			select:			undefined,	// Whenever index is set (also on init)
		},

		_create: function() {
			var that = this;

			// Internal event prefix
			that.widgetEventPrefix	= 'vanderlee-coverflow';

			that.hovering			= false;
			that.pagesize			= 1;
	
			// Fix height
			that.element.height(that.element.height());
			
			// Hide all covers and set position to absolute
			that._getCovers().hide().css('position', 'absolute');
											
			// Enable click-jump
			that.element.on('click', '> *', function() {
				that._setIndex(that._getCovers().index(this));
			});

			// Refresh on resize
			$(window).resize(function() {
				that.refresh();
			});

			// Mousewheel
			that.element.on('mousewheel', function(event, delta) {
				event.preventDefault();
				that._setIndex(Math.max(0, Math.min(that.options.index + delta, that._getCovers().length - 1)));
			});
									
			// Keyboard
			that.element.hover(
				function() { that.hovering = true; }
			,	function() { that.hovering = false; }
			);			
			
			$(window).on('keydown', function(event) {
				if (that.hovering) {
					switch (event.which) {
						case 36:	// home
							that._setIndex(0);
							break;
							
						case 35:	// end
							that._setIndex(-1);
							break;
							
						case 40:	// down
						case 37:	// left
							that._setIndex(Math.max(0, that.options.index - 1));
							break;
							
						case 38:	// up
						case 39:	// right
							that._setIndex(that.options.index + 1);
							break;
							
						case 34:	// page down
							that._setIndex(Math.max(0, that.options.index - that.pagesize));
							break;
							
						case 33:	// page up
							that._setIndex(Math.min(that.options.index + that.pagesize, that._getCovers().length - 1));
							break;
					}
				}
			});

			// Initialize
			that._setIndex(that.options.index, true);
			that.refresh();

			return that;
		},

		/**
		 * Returns the currently selected cover
		 * @returns {jQuery} jQuery object
		 */		
		cover: function() {
			return $(this._getCovers()[this.options.index]);
		},
				
		/**
		 * 
		 * @returns {unresolved}
		 */
		_getCovers: function() {
			return $('> *', this.element);
		},

		_setIndex: function(index, initial) {
			var covers = this._getCovers();

			while (index < 0) {
				index += covers.length;
			}

			index %= covers.length;

			if (index !== this.options.index) {
				this.refresh();		// pre-correct for reflection/mods
				this.options.index = Math.round(index);
				this.refresh(this.options.duration);
				this._callback('change');
				this._callback('select');
			} else if (initial === true) {
				this.refresh();
				this._callback('select');
			}
		},

		_callback: function(callback) {
			this._trigger(callback, null, this._getCovers().get(this.options.index));
		},

		index: function(index) {
			if (index === undefined) {
				return this.options.index;
			}
			this._setIndex(index);
		},

		refresh: function(duration) {
			var that		= this,
				count		= that._getCovers().length,
				parentWidth	= that.element.outerWidth(),
				parentLeft	= that.element.position()['left'],
				coverWidth	= that.options.width? that.options.width : that._getCovers().outerWidth(),
				duration	= duration === undefined ? 0 : duration,
				visible		= that.options.visible === 'density'	? Math.floor(parentWidth * that.options.density / coverWidth)
							: $.isNumeric(that.options.visible)		? that.options.visible
							: count,
				space		= (parentWidth - coverWidth) * .5;
		
			that.pagesize	= visible;

			that._getCovers().removeClass('current').each(function(index, cover) {
				var position	= index - that.options.index,
					offset		= position / visible,
					isVisible	= Math.abs(offset) <= 1,
					sin			= isVisible ? Math.sin(offset * Math.PI * .5)
								: sign(offset),
					cos			= isVisible ? Math.cos(offset * Math.PI * .5)
								: 0,
					isMiddle	= position === 0,
					zIndex		= count - Math.abs(position),
					left		= parentLeft + space + (isMiddle ? 0 : sign(sin) * scl(Math.abs(sin), 0, 1, that.options.innerOffset, space)),
					scale		= !isVisible? 0
								: isMiddle	? 1
								: scl(Math.abs(cos), 1, 0, that.options.innerScale, that.options.outerScale),
					angle		= isMiddle	? 0
								: sign(sin) * scl(Math.abs(sin), 0, 1, that.options.innerAngle, that.options.outerAngle),
					state		= {},
					css			= isMiddle ? that.options.selectedCss || {}
								: ( $.interpolate && that.options.outerCss && !$.isEmptyObject(that.options.outerCss) ? (	
									isVisible ? $.interpolate(that.options.innerCss || {}, that.options.outerCss, Math.abs(sin))
											  : that.options.outerCss
									) : {}
								),
					transform;

				if (isVisible) {
					$(cover).show();
				}

				$(cover).stop().css({
					'z-index':	zIndex
				}).animate($.extend(css, {
					'left':		left,
					'_scale':	scale,
					'_angle':	angle
				}), {
					'duration': duration,
					'step': function(now, fx) {
						state[fx.prop] = now;
						
						if (fx.prop === '_angle') {
							transform = 'scale(' + state._scale + ',' + state._scale + ') perspective('+(parentWidth*.5)+'px) rotateY(' + state._angle + 'deg)';
							$(this).css({
								'-webkit-transform':	transform,
								'-ms-transform':		transform,
								'transform':			transform
							});
						}
					},
					complete: function() {
						$(this)[isMiddle ? 'addClass' : 'removeClass']('current');
						$(this)[isVisible ? 'show' : 'hide']();
					}
				});
			});
		}
	});
}(jQuery));