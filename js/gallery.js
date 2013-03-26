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

	win: null, //window object in jQuery wrapper
	data_source: null,
	thumbnail_wrapper: null, //thumbnail div in jQuery wrapper

	arrow_prev: null, //previous arrow div in jQuery wrapper
	arrow_next: null, //next arrow div in jQuery wrapper

	thumbnails_hidden: true,
	transition_execute_now: false,

	init: function(config){
		this.config = (config != undefined && config != null) ? config : {};
		
		if(this.config.thumbnail_size == undefined || 
			this.config.thumbnail_size == null){
			this.config.thumbnail_size = this.DEFAULT_THUMBNAIL_SIZE;
		}

		if(this.config.image_size == undefined || 
			this.config.thumbnail_size == null){
			this.config.image_size = this.DEFAULT_IMAGE_SIZE;
		}
		
		var self = this;
		this.win = jQuery(window);
		this.data_source = new DataSource(this.config);
		
		var ds = this.data_source
		ds.load_data().done(function(response) { 
			ds.parse_data(response)
				.done(function(){
					self.draw_thumbnails();
					self.draw_arrows();
					self.switch_image_first();
				});
			});

		this.win.resize(function(){
			self.window_resize_handler();
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
			this.thumbnail_wrapper = jQuery('<div/>', {class: 'thumbnails-wrapper'}).appendTo('body');

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
				})
				.addClass('thumbnails-image')
				.appendTo(this.thumbnail_wrapper);
			}

			// hide thumbnail wrapper below bottom border of browser window
			this.thumbnail_wrapper.css('bottom', 
				(-1)*(this.thumbnail_wrapper.height() + this.THUMBNAILS_WRAPPER_HEIGHT_ADDITION));

			// add mouse move event for window for hiding and showing thumbnails wrapper
			// at this handler we should:
			//- take current window height (h)
			//- take current mouse cursor y position (y)
			//- take thumbnails wrapper height (it can be different depending on gallery initial configuration setings)
			//- calculate difference twh between h and y
			//- depending on twh value we should show or hide thumbnail wrapper 	
			this.win.mousemove(function(event){
				var h = self.win.height();
				var y = event.pageY;
				var twh = self.thumbnail_wrapper.height();
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
	* Draw side arrows for switching images to next or previous
	**/
	draw_arrows: function(){
		var self = this;

		//create div for previous arrow 
		this.arrow_prev = jQuery('<div/>').addClass('arrow_previous').appendTo('body');
		
		//create div for next arrow 	
		this.arrow_next = jQuery('<div/>').addClass('arrow_next').appendTo('body');
		
		// Bind mouse enter event to  window for enable gallery arrows	
		this.win.mouseenter(function(){
			self.toggle_arrows();
		});

		//hide both arrows on mouse leave window event
		this.win.mouseleave(function(){
			self.arrow_prev.hide();
			self.arrow_next.hide();
		});

		// Bind click event on previous arrow div
		// for switch to previous image in gallery
		this.arrow_prev.click(function(){
			self.switch_image(self.data_source.current_index - 1);
		});

		// Bind click event on nex arrow div
		// for switch to next image in gallery		
		this.arrow_next.click(function(){
			self.switch_image(self.data_source.current_index - (-1));
		});

		//Immediately call method for enable gallery arrows
		this.win.triggerHandler('mouseenter');	
	},

	draw_large_image: function(index){
		var image = this.data_source.images[index];

		var img = jQuery('<img/>')
		.attr('src', image.get_by_size(this.config.image_size).href)
		.attr('data-id', image.id)
		.attr('data-index', index)
		.css({
			'width': image.get_by_size(this.config.image_size).width,
			'height': image.get_by_size(this.config.image_size).height,
		})
		.addClass('large-image')
		.addClass('no-disp')
		.appendTo('body');

		return img;
	},

	switch_thumbnail: function(index){
		jQuery('.thumbnails-image').removeClass('thumbnails-image-active');
		
		jQuery('[data-index="' + index + '"]').addClass('thumbnails-image-active');

		//TODO implement correct scrolling for thumbnails wrapper on image switching
		this.thumbnail_wrapper.scrollTo('[data-index="' + index + '"]', 300);
	},

	switch_image: function(index){
		var self = this;
		this.switch_image_step1(index)
		.done(function(){
			self.switch_image_step2(index)
			.done(function(){
				self.switch_image_step3(index)
			});
		});
	},

	/**
	* This is alternate method for switching for next image
	* It is special because it is called only at first time after gallery appear
	* first and third steps in this scenarious are same to with default swith_image method
	* but second step is different 
	**/
	switch_image_first: function(){
		var index = 0; //TODO get index from remember machine
		var self = this;
		this.switch_image_step1(index)
		.done(function(){
			self.switch_image_step2_0(index)			
			self.switch_image_step3(index)			
		});
	},

	switch_image_step1: function(index){
		var deferred = jQuery.Deferred();
		if(this.transition_execute_now || index < 0 
			|| index > this.data_source.images.length - 1 || index === this.data_source.current_index){
			deferred.reject();
		}else{
			this.transition_execute_now = true;
			this.switch_thumbnail(index);

			this.draw_large_image(index).load(function(){
				deferred.resolve(index);
			});
		}
		return deferred.promise();
	},

	switch_image_step2: function(index){
		var deferred = jQuery.Deferred();
		var current_index = this.data_source.current_index;

		var new_image = this.data_source.images[index];
		var old_image = this.data_source.images[current_index];

		var new_img = jQuery('.large-image[data-id="' + new_image.id + '"]');
		var old_img = jQuery('.large-image[data-id="' + old_image.id + '"]');

		var w = this.win.width();
		var h = this.win.height();

		var niw = new_image.get_by_size(this.config.image_size).width;
		var nih = new_image.get_by_size(this.config.image_size).height;

		var direction = index > current_index ? 1 : -1;

		new_img.css('right', (direction > 0 ? (-1)*niw : w) + 'px');
		new_img.css('top', ((h - nih)/2) + 'px');
		
		new_img.removeClass('no-disp');

		var config_new = {right: ((w - niw)/2) + 'px'};

		var config_old = {right: (direction > 0 ? w : (-1)*niw) + 'px'};		
		
		jQuery.when(old_img.animate(config_old, 300), new_img.animate(config_new, 300)).then(function(){
			old_img.remove();
			deferred.resolve();
		});
		return deferred.promise();
	},

	/**
	* This is a final part of switching to new image
	* In this method we should:
	* - set current index filed to index of new image
	* - toggle arrows for hide or display arrows depending on current_index value
	* - finish switching and unlocking ui
	**/
	switch_image_step3: function(index){				
		this.data_source.current_index = index;
		this.toggle_arrows();	
		this.transition_execute_now = false;
	},

	/**
	* This is second part of switching to new image
	* but only at first time.
	* In this method we should:
	* - get window width and height
	* - get new image original width and height
	* - align new image on center horizontally and vertically
	* - show new image by removing no-disp class from it 
	**/
	switch_image_step2_0: function(index){
		var new_image = this.data_source.images[index];
		var new_img = jQuery('.large-image[data-id="' + new_image.id + '"]');
		
		var w = this.win.width();
		var h = this.win.height();

		var niw = new_image.get_by_size(this.config.image_size).width;
		var nih = new_image.get_by_size(this.config.image_size).height;

		new_img.css('right', ((w - niw)/2) + 'px');
		new_img.css('top', ((h - nih)/2) + 'px');
		
		new_img.removeClass('no-disp');
	},

	window_resize_handler: function(){
		var current_image = this.data_source.images[this.data_source.current_index];
		var img = jQuery('.large-image');

		var w = this.win.width(); //window width
		var dw = current_image.get_by_size(this.config.image_size).width; //original image width
		
		var h = this.win.height(); //window height
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
		img.css('left', ((this.win.width() - img.width())/2) + 'px');
		img.css('top', ((this.win.height() - img.height())/2) + 'px');
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
			this.thumbnails_hidden = true;
			this.thumbnail_wrapper.animate({
    			bottom: (-1)*(this.thumbnail_wrapper.height() + this.THUMBNAILS_WRAPPER_HEIGHT_ADDITION)
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
			this.thumbnails_hidden = false;
			this.thumbnail_wrapper.animate({
    			bottom: 0,
  			}, 300);
		}	
	},

	/**
	* Enable gallery arrows for switch to previous or next image
	* Also we should check if current image is first or last in gallery
	* and hide previous or next arrow
	**/
	toggle_arrows: function(){
		//hide previous arrow if current image is first in gallery	
		if(this.data_source.is_current_first()){
			this.arrow_prev.hide();
		}else{
			this.arrow_prev.show();
		}

		//hide next arrow if current image is last in gallery
		if(this.data_source.is_current_last()){
			this.arrow_next.hide();
		}else{
			this.arrow_next.show();
		}
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

	current_index: null,

	init: function(config){
		this.config = config;
	},

	/**
	* Creates url for retreiving data from yandex photo hosting
	* url + order + / + ?limit=limit + & + format=json + & + callback=? 
	**/
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
		var limit = null;
		if(this.config.limit != undefined && this.config.order != null &&
			jQuery.isNumeric(this.config.limit) && this.config.limit > 0){
			limit = this.config.limit <= this.MAX_LIMIT ? this.config.limit : this.MAX_LIMIT;
		}else{
			limit = this.DEFAULT_LIMIT;
		}

		url += '?limit=' + limit;
		url += '&' + this.DATA_FORMAT + '&' + this.CALLBACK;
		
		return url;
	},

	load_data: function(){
		return jQuery.getJSON(this.create_url())
	},

	parse_data: function(response){
		var deferred = jQuery.Deferred(); 
		var l = response.entries.length;

		if(l > 0){
			this.images = new Array();
			for(var i = 0; i < l; i++){
				this.images[i] = new Image(response.entries[i].id, response.entries[i].img);
			}			
		}else{
			//TODO something
		}

		deferred.resolve();
		return deferred.promise();
	},

	/**
	* Get index of image in gallery by unique image id attribute
	**/
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

	/**
	* Get image version by size key
	**/
	get_by_size: function(size){
		return this.sizes[size];
	}
};
