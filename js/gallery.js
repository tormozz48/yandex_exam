jQuery(document).ready(function(){
	new Gallery({
		url: 'http://api-fotki.yandex.ru/api/top/',
		order: 'updated',
		limit: 40
	});
});

Gallery = function(config){
	this.init(config);
};

// Image = function(w,h){
// 	this.width = w;
// 	this.height = h;
// };	

// Image.prototype = {
// 	width: null,
// 	height: null,

// 	get_width: function(){
// 		return this.width;
// 	},

// 	get_height: function(){
// 		return this.height;
// 	}
// };

Gallery.prototype = {
	config: null,
	data_source: null,
	image: null,

	//image_wrapper: jQuery('.large-image-wrapper'),

	init: function(config){
		this.config = config;
		
		// this.draw_image();
		// var self = this;
		// jQuery(window).resize(function(){
		// 	self.window_resize_handler();
		// });

		console.log('-- gallery initialize start --');
		var self = this;
		this.data_source = new DataSource((this.config != undefined && this.config != null) ? this.config : {});
		
		var ds = this.data_source
		ds.load_data().done(function(response) { 
			ds.parse_data(response).done(function(){
				self.draw_thumbnails();
			}); 
		});
	},

	draw_thumbnails: function(){
		var thumbnail_wrapper = jQuery('<div/>', {class: 'thumbnails-wrapper'});
		thumbnail_wrapper.appendTo('body');

		var images = this.data_source.images;
		var l = images.length;

		if(l > 0){
			for(var i = 0; i < l; i++){
				jQuery('<img/>')
				.attr('src', images[i].get_href_by_size('XXS'))
				.css({
					'width': images[i].get_width_by_size('XXS'),
					'height': images[i].get_height_by_size('XXS'),
				}).addClass('thumbnails-image').appendTo(thumbnail_wrapper);
			}
		}
	}

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

	init: function(config){
		this.config = config;
		//this.load_data();
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
		var limit = null
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
	}
};

Image = function(id, sizes){
	this.init(id, sizes);
};

Image.prototype = {
	
	id: null,
	sizes: null,

	// AVAILABLE_SIZES: {XXXS: 'XXXS', XXS : 'XXS', XS: 'XS', S: 'S', M: 'M', L: 'L', XL: 'XL', XXL: 'XXL', XXXL: 'XXXL'},

	init: function(id, sizes){
		this.id = id;
		this.sizes = sizes;
	},

	get_by_size: function(size){
		return this.sizes[size];
	},

	get_width_by_size: function(size){
		return this.get_by_size(size).width;
	},

	get_height_by_size: function(size){
		return this.get_by_size(size).height;
	},

	get_href_by_size: function(size){
		return this.get_by_size(size).href;
	}
};