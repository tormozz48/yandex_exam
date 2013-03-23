jQuery(document).ready(function(){
	console.log('gallery initialize start');
	new Gallery({
		url: 'http://api-fotki.yandex.ru/api/top/',
		order: 'updated',
		limit: 40
	});
});

Gallery = function(config){
	this.init(config);
};

Image = function(w,h){
	this.width = w;
	this.height = h;
};	

Image.prototype = {
	width: null,
	height: null,

	get_width: function(){
		return this.width;
	},

	get_height: function(){
		return this.height;
	}
};

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

		this.data_source = new DataSource((this.config != undefined && this.config != null) ? this.config : {});
	},

	draw_image: function(){
		var img = jQuery('.large-image');
		this.image = new Image(img.width(), img.height()); 

		this.window_resize_handler();

		this.show_image();
	},

	window_resize_handler: function(){
		var img = jQuery('.large-image');

		var w = jQuery(window).width(); //window width
		var dw = this.image.get_width(); //original image width
		
		var h = jQuery(window).height(); //window height
		var dh = this.image.get_height(); //original image height

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

	//show image by removing non-visible class from it
	show_image: function(){
		jQuery('.large-image').removeClass('non-visible'); 	
	},

	//hide image by adding non-visible class to it
	hide_image: function(){
		jQuery('.large-image').addClass('non-visible');	
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

	init: function(config){
		this.config = config;
		this.load_data();
	},

	create_url: function(){
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
		var self = this;
		jQuery.getJSON(this.create_url()).done(function(response) { self.parse_data(response) });
	},

	parse_data: function(response){
		console.log(response.title);
		console.log(response.id);
		console.log(response.updated);
	}
};