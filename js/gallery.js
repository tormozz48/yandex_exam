jQuery(document).ready(function(){
	new Gallery({
		data_source: {
			url: 'http://api-fotki.yandex.ru/api/top/',
			order: 'updated',
			limit: 50
		},	
		thumbnail_size: 'XXS',
		image_size: 'L',
		switch_direction: 'left',
		switch_duration: 300
	});
});

Gallery = function(config){
	this.init(config);
};

Gallery.prototype = {
	DEFAULT_THUMBNAIL_SIZE: 'XXS',
	DEFAULT_IMAGE_SIZE: 'M',

	AVAILABLE_SIZES: ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],

	SWITCH_DIRECTIONS: ['left', 'bottom', 'right', 'top'], 

	DEFAULT_SWITCH_DURATION: 300,

	THUMBNAILS_WRAPPER_HEIGHT_ADDITION: 10, //Magick constant.

	config: null,

	win: null, //window object in jQuery wrapper
	data_source: null,

	thumbnails: null, //thumbnails panel
	arrows: null, //gallery arrows closure 
	loader: null, //loader closure

	transition_execute_now: false,

	init: function(config){
		this.parse_config(config);

		var self = this;
		this.win = jQuery(window);
		this.thumbnails = this.init_thumbnails();
		this.loader = this.init_loader();
		this.arrows = this.init_arrows();
		this.data_source = new DataSource(this.config);
		
		var ds = this.data_source
		ds.load_data()
		.then(
			function(response) { 
				return ds.parse_data(response)
			},
			function() { 
				alert('Can not load data from yandex API');
			}
		)
		.then(
			function(){
				self.thumbnails.draw();
				self.arrows.draw();
				self.switch_image_first();
				self.bind_key_switching();
			},
			function(){
				alert('No data were retrieve from server');
			}
		);

		//bind handler to window resize event for align 
		//and resize image proportionally to the screen
		this.win.resize(function(){
			self.window_resize_handler();
		});	 
	},

	parse_config: function(config){
		this.config = (config != undefined && config != null) ? config : {data_source: {}};
		
		//verify thumbnails size
		if(this.config.thumbnail_size == undefined || this.config.thumbnail_size == null 
			|| !jQuery.inArray(this.config.thumbnail_size, this.AVAILABLE_SIZES)){
			this.config.thumbnail_size = this.DEFAULT_THUMBNAIL_SIZE;
		}

		//verify image size
		if(this.config.image_size == undefined || this.config.thumbnail_size == null
			|| !jQuery.inArray(this.config.image_size, this.AVAILABLE_SIZES)){
			this.config.image_size = this.DEFAULT_IMAGE_SIZE;
		}
		
		//verify switch direction
		if(this.config.switch_direction == undefined || this.config.switch_direction == null
			|| !jQuery.inArray(this.config.switch_direction, this.SWITCH_DIRECTIONS)){
			this.config.switch_direction == this.SWITCH_DIRECTIONS[0];
		}

		//verify switch duration
		if(this.config.switch_duration == undefined || this.config.switch_duration == null 
			|| !jQuery.isNumeric(this.config.switch_duration) || this.config.switch_duration < 0){
			this.config.switch_duration = this.DEFAULT_SWITCH_DURATION;
		}
	},

	
	/**
	* Create image element for large image
	* - set src with url of large size image
	* - set attribute data-id with unique id of image
	* - set attribute data-index with index of image in gallery
	* - set width and height css properties
	* - style this image by adding large-image class
	* - hide image by adding no-disp class
	**/
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

	/**
	* Method for switching images in gallery
	* It is suitable to divide this operation into 3 steps
	**/
	switch_image: function(index){
		var self = this;
		this.switch_image_step1(index)
		.then(function(){
			return self.switch_image_step2(index)	
		})
		.then(function(){
			self.switch_image_step3(index)
		});
	},

	/**
	* This is alternate method for switching for next image
	* It is special because it is called only at first time after gallery appear
	* first and third steps in this scenarious are same to with default swith_image method
	* but second step is different 
	**/
	switch_image_first: function(){
		var index = this.data_source.load_image_index();
		var self = this;
		this.switch_image_step1(index).done(function(){
			self.switch_image_step2_0(index)			
			self.switch_image_step3(index)			
		});
	},

	/**
	* At first step we should:
	* - check if all transitions have been finished
	* - check for index of image which we want to show next
	* 	if index is out of model range or is the sam as current index we should not perform next steps
	* - call method for switching thumbnails
	* - draw new large image and hide it
	* - add asynchronious callback for image loading
	* (after image loading we will move to the next step)  
	**/
	switch_image_step1: function(index){
		var deferred = jQuery.Deferred();
		var self = this;
		if(this.transition_execute_now || index < 0 
			|| index > this.data_source.images.length - 1 || index === this.data_source.current_index){
			deferred.reject();
		}else{
			this.transition_execute_now = true;
			// this.show_loader();
			this.loader.show();
			this.draw_large_image(index).load(function(){
				self.loader.hide();
				deferred.resolve(index);
			});
		}
		return deferred.promise();
	},

	/**
	* This is most important part of image switch operation
	* In this method we should:
	* - retrieve index of current displayed image in gallery
	* - get image which we should switch to (model and DOM element)
	* - get current displayed image (model and DOM element)
	* - get window width and height
	* - get original model width and height
	* - detect direction by next and current indexes comparison
	* - hide next image behind left or right screen border
	* - align new image at center vertically
	* - show new image by removing no-disp class
	* - calculate new coordinates for new image and current image
	* - run animations for show new image and hide current image
	* - remove old image from DOM and move to final step 
	**/
	switch_image_step2: function(index){
		var deferred = jQuery.Deferred();
		var current_index = this.data_source.current_index;

		var new_image = this.data_source.images[index];
		var old_image = this.data_source.images[current_index];

		var new_img = jQuery('.large-image[data-id="' + new_image.id + '"]');
		var old_img = jQuery('.large-image[data-id="' + old_image.id + '"]');

		var w = this.win.width();
		var h = this.win.height();

		this.resize_image(new_img, new_image);

		var direction = index > current_index ? 1 : -1;

		//forward from right to left
		if(this.config.switch_direction == this.SWITCH_DIRECTIONS[0]){

			new_img.css('right', (direction > 0 ? (-1)*new_img.width() : w) + 'px');
			new_img.css('top', ((h - new_img.height())/2) + 'px');
		
		//forward from top to bottom
		}else if(this.config.switch_direction == this.SWITCH_DIRECTIONS[1]){

			new_img.css('top', (direction > 0 ? (-1)*new_img.height() : h) + 'px');
			new_img.css('right', ((w - new_img.width())/2) + 'px');
		
		//forward from left to right
		}else if(this.config.switch_direction == this.SWITCH_DIRECTIONS[2]){

			new_img.css('left', (direction > 0 ? (-1)*new_img.width() : w) + 'px');
			new_img.css('top', ((h - new_img.height())/2) + 'px');
		
		//forward from bottom to top
		}else if(this.config.switch_direction == this.SWITCH_DIRECTIONS[3]){

			new_img.css('bottom', (direction > 0 ? (-1)*new_img.height() : h) + 'px');
			new_img.css('right', ((w - new_img.width())/2) + 'px');
		}

		new_img.removeClass('no-disp');

		var config_new = null;
		var config_old = null;

		//forward from right to left
		if(this.config.switch_direction == this.SWITCH_DIRECTIONS[0]){

			config_new = {right: ((w - new_img.width())/2) + 'px'};
			config_old = {right: (direction > 0 ? w : (-1)*new_img.width()) + 'px'};
		
		//forward from top to bottom
		}else if(this.config.switch_direction == this.SWITCH_DIRECTIONS[1]){

			config_new = {top: ((h - new_img.height())/2) + 'px'};
			config_old = {top: (direction > 0 ? h : (-1)*new_img.height()) + 'px'};
		
		//forward from left to right
		}else if(this.config.switch_direction == this.SWITCH_DIRECTIONS[2]){

			config_new = {left: ((w - new_img.width())/2) + 'px'};
			config_old = {left: (direction > 0 ? w : (-1)*new_img.width()) + 'px'};
		
		//forward from bottom to top
		}else if(this.config.switch_direction == this.SWITCH_DIRECTIONS[3]){

			config_new = {bottom: ((h - new_img.height())/2) + 'px'};
			config_old = {bottom: (direction > 0 ? h : (-1)*new_img.height()) + 'px'};
		}		

		this.thumbnails.switch(index);

		jQuery.when(old_img.animate(config_old, this.config.switch_duration), 
					new_img.animate(config_new, this.config.switch_duration))
		.then(function(){
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
	* - save current image state to cookies
	* - finish switching and unlocking ui
	**/
	switch_image_step3: function(index){				
		this.data_source.current_index = index;
		this.arrows.toggle();
		this.data_source.save_image_index();	
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
		var image = this.data_source.images[index];
		var img = jQuery('.large-image[data-id="' + image.id + '"]');
		
		this.resize_image(img, image);
		this.align_image(img);
		
		// this.hide_loader();
		this.thumbnails.switch(index);

		img.removeClass('no-disp');
	},

	/**
	* Method for resizing image if window size is less then original image size 	
	* - get image original width and height
	* - calculate aspect ration of image dimensions 
	* - resize image if it width or height is less then window width o height
	**/
	resize_image: function(img, model){
		var w = this.win.width(); //window width
		var h = this.win.height(); //window height

		var dw = model.get_by_size(this.config.image_size).width; //original image width
		var dh = model.get_by_size(this.config.image_size).height; //original image height

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
	},

	/**
	* Align image on center of screen by setting left and top css properties
	**/
	align_image: function(img){
		var w = this.win.width(); //window width
		var h = this.win.height(); //window height

		//center image on horizontal and vertical dimensions
		img.css('right', ((w - img.width())/2) + 'px');
		img.css('top', ((h - img.height())/2) + 'px');
	},

	init_thumbnails: function(){
		var self = this;
		var wrapper = null;
		var is_hidden = true;

		function thumbnails(){};

		/**
		* Draw thumbnails wrapper with all images and
		* bind all neccessary events for it
		**/
		thumbnails.draw = function(){
			var images = self.data_source.images;
			var l = images.length;

			if(l > 0){
				
				// create thumbnail wrapper div and append it to body
				wrapper = jQuery('<div/>', {class: 'thumbnails-wrapper'}).appendTo('body');

				// iterate throught images collection
				// on each iteration we should
				//- create image DOM element
				//- add src, data-id, data-index attributes
				//- add width and height css attributes
				//- add style class for thumbnail
				//- append image to thumbnail wrapper 
				for(var i = 0; i < l; i++){
					jQuery('<img/>')
					.attr('src', images[i].get_by_size(self.config.thumbnail_size).href)
					.attr('data-id', images[i].id)
					.attr('data-index', i)
					.css({
						'width': images[i].get_by_size(self.config.thumbnail_size).width,
						'height': images[i].get_by_size(self.config.thumbnail_size).height,
					})
					.addClass('thumbnails-image')
					.appendTo(wrapper);
				}

				// hide thumbnail wrapper below bottom border of browser window
				wrapper.css('bottom', (-1)*(wrapper.height() + self.THUMBNAILS_WRAPPER_HEIGHT_ADDITION));

				// add mouse move event for window for hiding and showing thumbnails wrapper
				// at this handler we should:
				//- take current window height (h)
				//- take current mouse cursor y position (y)
				//- take thumbnails wrapper height (it can be different depending on gallery initial configuration setings)
				//- calculate difference twh between h and y
				//- depending on twh value we should show or hide thumbnail wrapper 	
				self.win.mousemove(function(event){
					var h = self.win.height();
					var y = event.pageY;
					var twh = wrapper.height();
					if(h - y <= twh){
						thumbnails.show();
					}else{
						thumbnails.hide();
					}
				});

				// bind image switching handler for thumbnail image click event
				jQuery('.thumbnails-image').on('click', function(){
					self.switch_image(jQuery(this).attr('data-index'));
				});

				/**
				* Bind mousewheel scrolling for thumbnail wrapper
				* This is not my solution
				* thanks to http://www.adomas.org/javascript-mouse-wheel/
				**/
				if (window.addEventListener){
		        	window.addEventListener('DOMMouseScroll', thumbnails.scroll, false);
		        }	
				window.onmousewheel = document.onmousewheel = thumbnails.scroll;
			}
		};

		/**
		* Method for show thumbnails wrapper
		* At first we should check if thumbnails wrapper is already in visible state
		* It is necessary for preventing multiple attempt to show
		* Finally we should animate css transition of bottom property to zero value
		**/
		thumbnails.show = function(){
			if(is_hidden){			
				is_hidden = false;
				wrapper.animate({
	    			bottom: 0,
	  			}, 300);
			}	
		};

		/**
		* Method for hide thumbnails wrapper
		* At first we should check if thumbnails wrapper is already in hidden state
		* It is necessary for preventing multiple attempt to hiding
		* Finally we should animate css transition of bottom property for hiding 
		* thumbnails wrapper below bottom border of browser window
		**/
		thumbnails.hide = function(){
			if(!is_hidden){			
				is_hidden = true;
				wrapper.animate({
	    			bottom: (-1)*(wrapper.height() + self.THUMBNAILS_WRAPPER_HEIGHT_ADDITION)
	  			}, 300);
			}
		};

		/**
		* Switch thumbnail in gallery
		* In this method we should: 
		* - remove thumbnails-image-active class from all thumbnails
		* - find selected thumbnail by data-index custom attribute
		* - add thumbnails-image-active class to selected thumbnail
		**/
		thumbnails.switch = function(index){
			jQuery('.thumbnails-image').removeClass('thumbnails-image-active');		
			jQuery('.thumbnails-image[data-index="' + index + '"]').addClass('thumbnails-image-active');

			wrapper.scrollTo('.thumbnails-image-active', self.config.switch_duration);
		};

		/**
		* This is not my solution
		* thanks to http://www.adomas.org/javascript-mouse-wheel/
		**/
		thumbnails.scroll = function(event){
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
                wrapper.scrollTo(delta > 0 ? '+=50px' : '-=50px', 30);
	        }        
	        if(event.preventDefault){
                event.preventDefault();
	        }        
			event.returnValue = false;
		};

		return thumbnails;
	},

	/**
	* Init loader module for loading indicator
	**/
	init_loader: function(){
		var win = this.win;
		var l = jQuery('<div/>').addClass('loader').addClass('no-disp').appendTo('body');
		
		return {

			// show loading indicator 
			show: function(){
				//align loading indicator at center of the browser screen
				l.css('left', (win.width() - l.width())/2 + 'px');
				l.css('top', (win.height() - l.height())/2 + 'px');

				l.removeClass('no-disp');
			},

			// hide loading indicator
			hide: function(){
				l.addClass('no-disp');
			}
		};
	},

	init_arrows: function(){
		var self = this;
		var arrow_prev = null;
		var arrow_next = null;	

		function arrows(){};

		/**
		* Draw side arrows for switching images to next or previous
		**/
		arrows.draw = function(){
			//create div for previous arrow 
			arrow_prev = jQuery('<div/>').addClass('arrow_previous').appendTo('body');
			
			//create div for next arrow 	
			arrow_next = jQuery('<div/>').addClass('arrow_next').appendTo('body');
			
			// Bind mouse enter event to  window for enable gallery arrows	
			self.win.mouseenter(function(){
				arrows.toggle();
			});

			//hide both arrows on mouse leave window event
			self.win.mouseleave(function(){
				arrow_prev.hide();
				arrow_next.hide();
			});

			// Bind click event on previous arrow div
			// for switch to previous image in gallery
			arrow_prev.click(function(){
				self.switch_image(self.data_source.current_index - 1);
			});

			// Bind click event on nex arrow div
			// for switch to next image in gallery		
			arrow_next.click(function(){
				self.switch_image(self.data_source.current_index - (-1));
			});

			//Immediately call method for enable gallery arrows
			self.win.triggerHandler('mouseenter');
		};

		/**
		* Enable gallery arrows for switch to previous or next image
		* Also we should check if current image is first or last in gallery
		* and hide previous or next arrow
		**/
		arrows.toggle = function(){
			//hide previous arrow if current image is first in gallery	
			if(self.data_source.is_current_first()){
				arrow_prev.hide();
			}else{
				arrow_prev.show();
			}

			//hide next arrow if current image is last in gallery
			if(self.data_source.is_current_last()){
				arrow_next.hide();
			}else{
				arrow_next.show();
			}
		};

		return arrows;
	},

	/**
	* This is handler for window resize event
	* In this method we should:
	* - get window width and height
	* - resize image if necessary
	* - align image horizontally and vertically by setting new left and top css properties
	**/
	window_resize_handler: function(){
		var current_image = this.data_source.images[this.data_source.current_index];
		var img = jQuery('.large-image');
		this.resize_image(img, current_image);
		this.align_image(img);	
	},

	/**
	* Bind keypress event to window
	* On this event we should get code of key which has been pressed
	* If code of pressed key is equal to arrow left or arrow up or num pad 4 or num pad 8
	* then we shoul switch gallery to previous image
	* If code of pressed key is equal to arrow right or arrow down or num pad 6 or num pad 2
	* then we shoul switch gallery to next image 
	**/
	bind_key_switching: function(){
		var self = this;
		this.win.keydown(function(e){
            var key = e.charCode || e.keyCode || 0;
            if(key == 37 || key == 38 || key == 98 || key == 102){
            	self.switch_image(self.data_source.current_index - 1);
            }if(key == 39 || key == 40 || key == 100 || key == 104){
            	self.switch_image(self.data_source.current_index - (-1));
            }
        });
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

	COOKIE_NAME: 'yandex_gallery_current_id',

	config: null,
	images: null,

	current_index: null,

	init: function(config){
		this.config = config.data_source;
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

	/**
	* Loads data from yandex API with JSONP
	**/
	load_data: function(){
		return jQuery.getJSON(this.create_url())
	},

	/**
	* Parse data retrieved from yandex API
	* and fill model
	**/
	parse_data: function(response){
		var deferred = jQuery.Deferred(); 
		var l = response.entries.length;

		if(l > 0){
			this.images = new Array();
			for(var i = 0; i < l; i++){
				this.images[i] = new Image(response.entries[i].id, response.entries[i].img);
			}
			deferred.resolve();			
		}else{
			deferred.reject();
		}
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
	},

	/**
	* Save unique id of current selected image to cookies
	**/
	save_image_index: function(){
		var image = this.images[this.current_index];
		this.create_cookie(this.COOKIE_NAME, image.id, 7);
	},

	/**
	* Load index of image which we should switch to after gallery initializtion
	**/
	load_image_index: function(){
		var index = 0;
		var id = this.read_cookie(this.COOKIE_NAME);
		if(id != undefined && id != null){
			index = this.get_index_by_id(id);
			if(index < 0){
				index = 0;
			}
		}
		return index;
	},

	/**
	* It is not my solution. Thank to http://www.quirksmode.org/js/cookies.html
	**/
	create_cookie: function(name,value,days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
		}
		else var expires = "";
		document.cookie = name+"="+value+expires+"; path=/";
	},

	/**
	* It is not my solution. Thank to http://www.quirksmode.org/js/cookies.html
	**/
	read_cookie: function(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
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
		return (this.sizes[size] != undefined && this.sizes[size] != null) ? 
				this.sizes[size] : this.get_largest_image();
	},

	get_largest_image: function(){
		var largest_image = null;
		for(var i in this.sizes){
			if(largest_image == null || this.sizes[i].width > largest_image.width){
				largest_image = this.sizes[i];
			}
		}
		return largest_image;
	}
};

