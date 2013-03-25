jQuery(document).ready(function(){
	new Gallery({
		url: 'http://api-fotki.yandex.ru/api/top/',
		order: 'updated',
		limit: 50,
		thumbnail_size: 'XXS',
		image_size: 'L'
	});
});

Gallery = function(config){
	this.init(config);
};

Gallery.prototype = {
	DEFAULT_THUMBNAIL_SIZE: 'XXS',
	DEFAULT_IMAGE_SIZE: 'M',
	AVAILABLE_SIZES: ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],

	THUMBNAILS_WRAPPER_HEIGHT_ADDITION: 10, //Magick constant.

	config: null,
	data_source: null,

	thumbnails_hidden: true,

	init: function(config){
		this.config = (config != undefined && config != null) ? config : {};
		
		if(this.config.thumbnail_size == undefined || this.config.thumbnail_size == null){
			this.config.thumbnail_size = this.DEFAULT_THUMBNAIL_SIZE;
		}

		if(this.config.image_size == undefined || this.config.thumbnail_size == null){
			this.config.image_size = this.DEFAULT_IMAGE_SIZE;
		}

		console.log('-- gallery initialize start --');
		
		var self = this;
		this.data_source = new DataSource(this.config);
		
		var ds = this.data_source
		ds.load_data().done(function(response) { 
			ds.parse_data(response).done(function(){
				self.draw_thumbnails();
				self.draw_arrows();
				self.draw_first_image().done(function(){
					self.align_and_resize();
				});
			}); 
		});
	},

	/**
	* Draw thumbnails wrapper with all images and
	* bind all neccessary events for it
	**/
	draw_thumbnails: function(){
		var images = this.data_source.images;
		var l = images.length;
		var self = this;

		if(l > 0){
			
			// create thumbnail wrapper div and append it to body
			var thumbnail_wrapper = jQuery('<div/>', {class: 'thumbnails-wrapper'});
			thumbnail_wrapper.appendTo('body');

			// iterate throught images collection
			// on each iteration we should
			//- create image DOM element
			//- add src, data-id, data-index attributes
			//- add width and height css attributes
			//- add style class for thumbnail
			//- append image to thumbnail wrapper 
			for(var i = 0; i < l; i++){
				jQuery('<img/>')
				.attr('src', images[i].get_by_size(this.config.thumbnail_size).href)
				.attr('data-id', images[i].id)
				.attr('data-index', i)
				.css({
					'width': images[i].get_by_size(this.config.thumbnail_size).width,
					'height': images[i].get_by_size(this.config.thumbnail_size).height,
				}).addClass('thumbnails-image').appendTo(thumbnail_wrapper);
			}

			// hide thumbnail wrapper below bottom border of browser window
			thumbnail_wrapper.css('bottom', 
				(-1)*(thumbnail_wrapper.height() + this.THUMBNAILS_WRAPPER_HEIGHT_ADDITION));

			// add mouse move event for window for hiding and showing thumbnails wrapper
			// at this handler we should:
			//- take current window height (h)
			//- take current mouse cursor y position (y)
			//- take thumbnails wrapper height (it can be different depending on gallery initial configuration setings)
			//- calculate difference twh between h and y
			//- depending on twh value we should show or hide thumbnail wrapper 	
			jQuery(window).mousemove(function(event){
				var h = jQuery(window).height();
				var y = event.pageY;
				var twh = jQuery('.thumbnails-wrapper').height();
				if(h - y <= twh){
					self.show_thumbnails_wrapper();
				}else{
					self.hide_thumbnails_wrapper();
				}
			});

			// bind image switching handler for thumbnail image click event
			jQuery('.thumbnails-image').on('click', function(){
				self.switch_image(jQuery(this).attr('data-index'));
			});

			//bing mousewheel scrolling for thumbnail wrapper
			this.bind_scrollable();
		}
	},

	/**
	* Method for hide thumbnails wrapper
	* At first we should check if thumbnails wrapper is already in hidden state
	* It is necessary for preventing multiple attempt to hiding
	* Finally we should animate css transition of bottom property for hiding 
	* thumbnails wrapper below bottom border of browser window
	**/
	hide_thumbnails_wrapper: function(){
		if(!this.thumbnails_hidden){
			console.log('-- hide thumbnails wrapper --');
			this.thumbnails_hidden = true;
			var _twh = (-1)*(jQuery('.thumbnails-wrapper').height() + this.THUMBNAILS_WRAPPER_HEIGHT_ADDITION);
			jQuery('.thumbnails-wrapper').animate({
    			bottom: _twh
  			}, 300);
		}	
	},

	/**
	* Method for show thumbnails wrapper
	* At first we should check if thumbnails wrapper is already in visible state
	* It is necessary for preventing multiple attempt to show
	* Finally we should animate css transition of bottom property to zero value
	**/
	show_thumbnails_wrapper: function(){
		if(this.thumbnails_hidden){
			console.log('-- show thumbnails wrapper --');
			this.thumbnails_hidden = false;
			jQuery('.thumbnails-wrapper').animate({
    			bottom: 0,
  			}, 300);
		}	
	},

	/**
	* Draw side arrows for switching images to next or previous
	**/
	draw_arrows: function(){
		//create div for previous arrow 
		jQuery('<div/>')
			.addClass('arrow_previous')
			.appendTo('body');
		
		jQuery('<div/>')
			.addClass('arrow_next')
			.appendTo('body');

		if(this.data_source.is_current_first()){
			jQuery('.arrow_previous').hide();
		}

		if(this.data_source.is_current_last()){
			jQuery('.arrow_next').hide();
		}	
		
		var self = this;	
		jQuery(window).mouseenter(function(){
			if(self.data_source.is_current_first()){
				jQuery('.arrow_next').fadeIn(0);
			}
			if(self.data_source.is_current_last()){
				jQuery('.arrow_previous').fadeIn(0);
			}	
		});

		jQuery(window).mouseleave(function(){
			jQuery('.arrow_previous, .arrow_next').fadeOut(0);
		});
	},

	draw_first_image: function(){
		//TODO check for cookies

		var image = this.data_source.images[this.data_source.current_index];

		var img = jQuery('<img/>')
		.attr('src', image.get_by_size(this.config.image_size).href)
		.attr('data-id', image.id)
		.attr('data-index', this.data_source.current_index)
		.css({
			'width': image.get_by_size(this.config.image_size).width,
			'height': image.get_by_size(this.config.image_size).height,
		})
		.addClass('large-image')
		.addClass('large-image-active')
		.addClass('no-disp')
		.appendTo('body').hide();

		var deferred = jQuery.Deferred();
		img.load(function(){
			deferred.resolve();
		});
		return deferred.promise();
	},

	align_and_resize: function(){
		this.window_resize_handler();
		this.show_large_image();
	},

	show_large_image: function(){
		jQuery('.large-image-active').fadeIn(400);
	},

	switch_image: function(index){
		console.log('-- switch image --');
		console.log('image index = ' + index);

		jQuery('.thumbnails-image').removeClass('thumbnails-image-active');
		
		jQuery('[data-index="' + index + '"]').addClass('thumbnails-image-active');

		jQuery('.thumbnails-wrapper').scrollTo('[data-index="' + index + '"]', 400);

   		//TODO implement correct scrolling for thumbnails wrapper on image switching
   		//jQuery('.thumbnails-wrapper').scrollTo(iLeft+'px', 400);
	},

	window_resize_handler: function(){
		var current_image = this.data_source.images[this.data_source.current_index];
		var img = jQuery('.large-image-active');

		var w = jQuery(window).width(); //window width
		var dw = current_image.get_by_size(this.config.image_size).width; //original image width
		
		var h = jQuery(window).height(); //window height
		var dh = current_image.get_by_size(this.config.image_size).height; //original image height

		var ar = dw/dh; //image aspect ratio

		//resize image if it necessary
		if(w < dw || h < dh){
			if (w/h > ar){
				img.height(h);
            	img.width(h * ar);
			}else{
				img.width(w);
            	img.height(w / ar);
			}
		}

		//center image on horizontal and vertical dimensions
		img.css('margin-left', ((jQuery(window).width() - img.width())/2) + 'px');
		img.css('margin-top', ((jQuery(window).height() - img.height())/2) + 'px');
	},

	/**
	* This is not my solution
	* thanks to http://www.adomas.org/javascript-mouse-wheel/
	**/
	bind_scrollable: function(){
		if (window.addEventListener){
        	window.addEventListener('DOMMouseScroll', this.on_thumbnails_scroll, false);
        }	
		window.onmousewheel = document.onmousewheel = this.on_thumbnails_scroll;
	},

	/**
	* This is not my solution
	* thanks to http://www.adomas.org/javascript-mouse-wheel/
	**/
	on_thumbnails_scroll: function(event){
		var delta = 0;
        if(!event){
                event = window.event;
        }        
        if(event.wheelDelta) { 
                delta = event.wheelDelta/120;
        }else if (event.detail) {
                delta = -event.detail/3;
        }
        
        if(delta){
                jQuery('.thumbnails-wrapper').scrollTo(delta > 0 ? '+=50px' : '-=50px', 30);
        }        
        if(event.preventDefault){
                event.preventDefault();
        }        
		event.returnValue = false;
	}
},

DataSource = function(config){
	this.init(config);
};

DataSource.prototype = {
	DEFAULT_URL: 'http://api-fotki.yandex.ru/api/top/',
	DEFAULT_LIMIT: 50,

	DATA_FORMAT: 'format=json',
	CALLBACK: 'callback=?',

	ORDERS: ['updated', 'rupdated', 'published', 'rpublished', 'created', 'rcreated'],
	MIN_LIMIT: 0,
	MAX_LIMIT: 100,

	config: null,
	images: null,

	current_index: 0,

	init: function(config){
		this.config = config;
	},

	create_url: function(){
		console.log('-- create url start --')

		var url = null;

		//get url from config or set default url
		if(this.config.url != undefined && this.config.url != null){
			url = this.config.url;
		}else{
			this.config.url = this.DEFAULT_URL;
		}

		//get order from cofig or set default order
		if(this.config.order != undefined && this.config.order != null && 
			jQuery.inArray(this.config.order, this.ORDERS)){
			url += this.config.order;
		}else{
			url += this.ORDERS[0];
		}

		url += '/';

		//get limit from config or set default limit
		var limit = null;
		if(this.config.limit != undefined && this.config.order != null &&
			jQuery.isNumeric(this.config.limit) && this.config.limit > 0){
			limit = this.config.limit <= this.MAX_LIMIT ? this.config.limit : this.MAX_LIMIT;
		}else{
			limit = this.DEFAULT_LIMIT;
		}

		url += '?limit=' + limit;

		url += '&' + this.DATA_FORMAT + '&' + this.CALLBACK;

		console.log('url = ' + url);
		return url;
	},

	load_data: function(){
		return jQuery.getJSON(this.create_url())
	},

	parse_data: function(response){
		console.log('-- data has been received from API --');
		console.log(response.title);
		console.log(response.id);
		console.log(response.updated);

		var deferred = jQuery.Deferred(); 
		var l = response.entries.length;

		if(l > 0){
			this.images = new Array();
			for(var i = 0; i < l; i++){
				this.images[i] = new Image(response.entries[i].id, response.entries[i].img);
			}
			console.log('-- images have been placed into collection --');
			console.log('images length = ' + this.images.length);
		}else{
			console.log('-- no images were received from API --');
		}

		deferred.resolve();
		return deferred.promise();
	},

	get_index_by_id: function(id){
		var index = -1;
		if(this.images != null && this.images.length > 0){
			for(var i = 0, l = this.images.length; i < l; i++){
				if(this.images[i].id === id){
					index = i;
					break;
				}
			}
		}
		return index;
	},

	/**
	* Method for check if current selected image is first in collection
	**/	
	is_current_first: function(){
		return this.current_index == 0;
	},

	/**
	* Method for check if current selected image is last in collection
	**/
	is_current_last: function(){	
		return (this.images != null && this.images.length > 0) ? this.current_index == this.images.length - 1 : true;			
	}
};

Image = function(id, sizes){
	this.init(id, sizes);
};

Image.prototype = {
	
	id: null,
	sizes: null,

	init: function(id, sizes){
		this.id = id;
		this.sizes = sizes;
	},

	get_by_size: function(size){
		return this.sizes[size];
	}
};

// draw_image: function(){
	// 	var img = jQuery('.large-image');
	// 	this.image = new Image(img.width(), img.height()); 

	// 	this.window_resize_handler();

	// 	this.show_image();
	// },

	// window_resize_handler: function(){
	// 	var img = jQuery('.large-image');

	// 	var w = jQuery(window).width(); //window width
	// 	var dw = this.image.get_width(); //original image width
		
	// 	var h = jQuery(window).height(); //window height
	// 	var dh = this.image.get_height(); //original image height

	// 	var ar = dw/dh; //image aspect ratio

	// 	//resize image if it necessary
	// 	if(w < dw || h < dh){
	// 		if (w/h > ar){
	// 			img.height(h);
 //            	img.width(h * ar);
	// 		}else{
	// 			img.width(w);
 //            	img.height(w / ar);
	// 		}
	// 	}

	// 	//center image on horizontal and vertical dimensions
	// 	img.css('margin-left', ((jQuery(window).width() - img.width())/2) + 'px');
	// 	img.css('margin-top', ((jQuery(window).height() - img.height())/2) + 'px');
	// },

	//show image by removing non-visible class from it
	// show_image: function(){
	// 	jQuery('.large-image').removeClass('non-visible'); 	
	// },

	// //hide image by adding non-visible class to it
	// hide_image: function(){
	// 	jQuery('.large-image').addClass('non-visible');	
	// }