jQuery(document).ready(function(){
	console.log('gallery initialize start');
	new Gallery({});
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
	image: null,

	//image_wrapper: jQuery('.large-image-wrapper'),

	init: function(config){
		this.draw_image();
		var self = this;
		jQuery(window).resize(function(){
			self.window_resize_handler();
		})
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

	show_image: function(){
		jQuery('.large-image').removeClass('non-visible'); 	
	},

	hide_image: function(){
		jQuery('.large-image').addClass('non-visible');	
	}	
}