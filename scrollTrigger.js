;(function () {
  'use strict';

  var $ = window.jQuery;
  var $window = $(window);
  // Default values when you instantiate a new scrollTrigger
  var defaults = {
    throttle: 250,
    offset: 0,
    callback: function(){
      console.log('Add a callback to your scrollTrigger'); // eslint-disable-line no-console
    },
    selector: '',
    namespace: ''
  };

  // Global ScrollTrigger object to store global methods, an array of each scrollElement, and the queue of scrollTrigger functions
  window.ScrollTrigger = window.ScrollTrigger || {

    // Recalculates scroll points on all scrollTriggers
    recalc: function(){
      // Loop through all globally saved scrollElements
      this.scrollElements.forEach(function(scrollElement){
        scrollElement.each(function(index, el){
          var $el = $(el);
          var data = $el.data();
          // Loop through all scrollTriggers saved on the scrollElement and unbind old listeners then recalculate scroll points
          for(var attr in data) {
            if (attr.indexOf('scrollTrigger') > -1) {
              $el.data(attr).recalc();
            }
          }

        });

      });
    },

    // Reinitialized scrollTrigger so that it can be initialized on new elements appended to the dom
    reinit: function(){
      // Loop through all globally saved scrollElements
      this.scrollElements.forEach(function(scrollElement){
        scrollElement.each(function(index, el){
          var $el = $(el);
          var data = $el.data();
          // Loop through all scrollTriggers saved on the scrollElement and reinitailize scrollTrigger to capture newly appended elements
          for(var attr in data) {
            if (attr.indexOf('scrollTrigger') > -1) {
              $el.data(attr).reinit();
            }
          }
        });
      });
    },
    // Save global scrollElements here
    scrollElements: [],
    // Queue of scrollTrigger functions
    queue: [],
    // Switch to make sure queue emptying function won't run if the queue is already being emptied
    queueActive: false
  };

  // constructor for ScrollTrigger class
  function ScrollTrigger(scrollElement, options) {
    // Store scrollElement element and jQuery object for later
    this.element = scrollElement;
    this.$element = $(scrollElement);
    // Merge set options with defaults
    this.options = $.extend( {}, defaults, options);
    // Store scrolling data here
    this.data = {};
    // Initialize scrollTrigger calculations used to calculate offsets and trigger points
    this.init();
    // Initialize scroll listener that checks when a trigger point is reached
    this.scroll();
    // Initialize resize listener that checks if a resize happens to recalculate trigger points
    this.resize();
    // Initizlie helper methods to aid in manually refreshing scrollTrigger scrollElements or calculations
    this.helper();
  }

  ScrollTrigger.prototype = {

    // TODO: Add destroy method

    // Calculate offset and trigger point
    init: function() {

      var offset = this.options.offset;
      var offsetInt;

      if(offset == 'bottom'){
        offsetInt = this.$element.outerHeight();
      } else if(offset == 'enter'){
        offsetInt = -window.innerHeight;
      } else if(offset == 'inview'){
        offsetInt = -(window.innerHeight - this.element.clientHeight);
      } else if(typeof offset == 'function'){
        offsetInt = offset.call(this.element);
      } else {
        offsetInt = offset !== undefined ? parseInt(offset) : 0;
      }

      this.offset = Math.floor(offsetInt);
      this.top = Math.floor(this.$element.offset().top + this.offset);

    },

    // Attach scroll listener to check when a scroll trigger point is reached
    scroll: function() {

      var oldTop = 0;
      var $this = this;
      // Namespace scroll event so we can bind/unbind listener as needed
      var event = 'scroll.' + $this.options.namespace;

      $window.on(event, throttle(function(){
        var windowTop = Math.floor($window.scrollTop());
        var direction = oldTop < windowTop ? 'down' : 'up';

        // Going down
        if($this.top - windowTop <= 0 && $this.data.top !== true) {
          $this.data.top = true;
          $this.data.bottom = false;
          // Push scrollTrigger callback to function queue
          window.ScrollTrigger.queue.push({
            callback: $this.options.callback,
            element: $this.element,
            direction: direction,
            position: $this.top
          });
          // Sort the queue in the correct order
          window.ScrollTrigger.queue.sort(function(a, b) {
            return a.position - b.position;
          });
        }

        // Going up
        if($this.top - windowTop > 0 && $this.data.top === true && $this.data.bottom !== true) {
          $this.data.top = false;
          $this.data.bottom = true;
          // Push scrollTrigger callback to function queue
          window.ScrollTrigger.queue.push({
            callback: $this.options.callback,
            element: $this.element,
            direction: direction,
            position: $this.top
          });
          // Sort the queue in the correct order
          window.ScrollTrigger.queue.sort(function(a, b) {
            return b.position - a.position;
          });
        }

        // Save old top position to check against top to see which direction you're scrolling
        oldTop = windowTop;

      }, this.options.throttle));

    },

    // Recalculate offsets/scroll points
    recalc: function(self) {
      var $this = this;
      var name = $this.options.name;
      var selector = $this.options.selector;
      $(selector).each(function(){
        var $this = $(this);
        $this.data(name).init();
        if($window.scrollTop() > $this.offset().top && self === true) {
          var elData = $this.data(name);
          elData.data.top = false;
          $this.data(name, elData);
        }
      });
    },

    // Recalculate offsets/scroll points after a browser resize
    resize: function() {
      var $this = this;
      function resized(){
        $this.init();
      }
      var event = 'resize.' + $this.options.namespace;

      $window.on(event, debounce(resized, 500));
    },

    // Unbind old listeners and reinitialize scrollTrigger in order to capture new scrollElements
    reinit: function() {
      var $this = this;
      var selector = $this.options.selector;
      $(selector).scrollTrigger($this.options);
    },

    // Helper methods attached to scrollElement to more easily refresh/recalc scrollTriggers
    helper: function() {
      var $this = this;
      var $element = this.$element;
      var helpers = {
        $element: $element,
        recalc: function(self) {
          this.$element.each(function(index, el){
            var $el = $(el);
            var data = $el.data();
            for(var attr in data) {
              if (attr.indexOf('scrollTrigger') > -1) {
                $el.data(attr).recalc(self);
              }
            }
          });
        },
        reinit: function() {
          this.$element.each(function(index, el){
            var $el = $(el);
            var data = $el.data();
            for(var attr in data) {
              if (attr.indexOf('scrollTrigger') > -1) {
                $el.data(attr).reinit();
              }
            }
          });
        },
        refresh: function() {
          this.$element.each(function(index, el){
            var $el = $(el);
            var data = $el.data();
            for(var attr in data) {
              if (attr.indexOf('scrollTrigger') > -1) {
                $el.data(attr).reinit();
                $el.data(attr).recalc();
              }
            }
          });
        }
      };
      $this.$element.data('scrollElement', helpers);
    }

  };

  // jQuery plugin wrapper around the constructor, preventing against duplicate instantiations
  $.fn.scrollTrigger = function (options) {

    var $this = this;
    var scrollTriggerCount = 1;
    var scrollTriggerName = 'scrollTrigger' + scrollTriggerCount;
    var uniqueScrollTrigger = true;
    var uniqueGlobalScrollElement = true;
    var data = $this.data();

    // Loop through possible scrollTriggers stored on the element to make sure this isn't a duplicate scrollTrigger
    for(var attr in data){
      if(attr.indexOf('scrollTrigger') > -1 && uniqueScrollTrigger === true){

        // Best way right now to do a deep comparison of properties of the scrollTrigger
        var thisOffset = $this.data(scrollTriggerName).options.offset.toString();
        var thisThrottle = $this.data(scrollTriggerName).options.throttle.toString();
        var thisCallback = $this.data(scrollTriggerName).options.callback.toString();
        var newOffset = options.offset ? options.offset.toString() : defaults.offset.toString();
        var newThrottle = options.throttle ? options.throttle.toString() : defaults.throttle.toString();
        var newCallback = options.callback ? options.callback.toString() : defaults.callback.toString();

        if(thisOffset == newOffset && thisThrottle == newThrottle && thisCallback == newCallback){
          uniqueScrollTrigger = false;
        } else {
          scrollTriggerCount++;
          scrollTriggerName = 'scrollTrigger' + scrollTriggerCount;
        }
      }
    }

    // Store element in global scrollElements array for later use, if it hasn't been stored yet
    window.ScrollTrigger.scrollElements.forEach(function(scrollElement){
      if(scrollElement[0] === $this[0]){
        uniqueGlobalScrollElement = false;
      }
    });

    if(uniqueGlobalScrollElement){
      window.ScrollTrigger.scrollElements.push($this);
    }

    // Store selector used to reselect the scrollElement later on
    options.selector = $this.selector ? $this.selector : ( options.selector ? options.selector : '');

    // Store trigger name for later use
    options.name = scrollTriggerName;

    // Create unique namespace so we can namespace our scroll/resize events to bind/unbind them later
    options.namespace = options.selector.replace(/[\W_]+/g, '') + scrollTriggerName;

    // Initialize actual scrollTrigger
    return this.each(function() {
      if (!$.data(this, scrollTriggerName)) {
        $.data(this, scrollTriggerName, new ScrollTrigger(this, options));
      }
    });


  };

  // Sacrificial unthrottled scroll event for maximum accuracy that fires function queue for scrollTrigger callbacks
  $window.on('scroll', throttle(function(){
    if(window.ScrollTrigger.queue.length && window.ScrollTrigger.queueActive === false) {
      while(window.ScrollTrigger.queue.length > 0) {
        window.ScrollTrigger.queue[0].callback.call(window.ScrollTrigger.queue[0].element, window.ScrollTrigger.queue[0].direction);
        window.ScrollTrigger.queue.shift();
        window.ScrollTrigger.queueActive = window.ScrollTrigger.queue.length > 0;
      }
    }
  }, 20));

  $window.on('scroll', debounce(function(){
    if(window.ScrollTrigger.queue.length && window.ScrollTrigger.queueActive === false) {
      while(window.ScrollTrigger.queue.length > 0) {
        window.ScrollTrigger.queue[0].callback.call(window.ScrollTrigger.queue[0].element, window.ScrollTrigger.queue[0].direction);
        window.ScrollTrigger.queue.shift();
        window.ScrollTrigger.queueActive = window.ScrollTrigger.queue.length > 0;
      }
    }
  }, 500));

  // Locally store throttle and debounce since this is a self-contained jQuery plugin
  function throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : new Date().getTime();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now =  new Date().getTime();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  }

  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

})();