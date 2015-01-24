/*
 # Endpoint URL #
 
 https://api.github.com/legacy/repos/search/{query}
 
 Note: Github imposes a rate limit of 60 request per minute. Documentation can be found at http://developer.github.com/v3/.
 
 # Example Response JSON #
 
 {
 "meta": {...},
 "data": {
 "repositories": [
 {
 "type": string,
 "watchers": number,
 "followers": number,
 "username": string,
 "owner": string,
 "created": string,
 "created_at": string,
 "pushed_at": string,
 "description": string,
 "forks": number,
 "pushed": string,
 "fork": boolean,
 "size": number,
 "name": string,
 "private": boolean,
 "language": number
 },
 {...},
 {...}
 ]
 }
 }
 */

/**
 # Endpoint URL: https://developer.github.com/v3/search/ #
 
 Right now the legacy api is deprecated and will be removed in the next version.  
 See:
 https://developer.github.com/v3/search/legacy/#legacy-search-api-is-deprecated
 
 I have created a personal token to avoid the limit of 5 requests per minute.
 See: https://developer.github.com/v3/search/#rate-limit
 
 I will use a personal token to increase this number up to 20 per minute:
 https://github.com/blog/1509-personal-api-tokens
 * 
 */

(function ($) {
    var API_URL = "https://api.github.com/search/repositories";
        
       /**
     * Creates an instance to search an api
     * @param {String} url the API's url
     * @param {Function} defaultSuccessCb we can pass a search callback in the constructor
     * @param {Function} defaultErrorCb we can pass an error callback in the constructor
     * @returns {ApiSearcher}
     */
    function ApiSearcher(url, defaultSuccessCb, defaultErrorCb){
        if( !(this instanceof ApiSearcher) ){
            return new ApiSearcher(url, defaultSuccessCb, defaultErrorCb);
        }
        var noop = function(){};
        this.apiUrl = url;
        this.customSuccess = $.isFunction(defaultSuccessCb) ? defaultSuccessCb : noop;
        this.customError = $.isFunction(defaultErrorCb) ? defaultErrorCb : noop;
        
    }
    
    /**
     * Personal Authentication Token that allows us to call 20 times in a minute.
     * See: https://github.com/blog/1509-personal-api-tokens
     */
     //2161f323efe781e7c9c8cb9986abb3c5ccf30cef
    
    ApiSearcher.SEARCH = "ON_SEARCH";
    ApiSearcher.ERROR = "ON_ERROR";
    ApiSearcher.PROVIDE = "ON_PROVIDE"
    
    ApiSearcher.prototype = {
        defaultSuccess: function(data_, res, xhr){
            this.customSuccess.call(this, data_, res, xhr);
            var ev = $.Event( ApiSearcher.SEARCH, { response: data_,  result:res, xhr:xhr, target: this} ); 
            $(this).trigger(ev);
        },
        defaultError: function(data_, res, xhr){            
            this.customError.call(this, data_, res);
            var ev = $.Event( ApiSearcher.SEARCH, { response: data_,  result:res, xhr:xhr, target: this} ); 
            this.trigger(ev);
        },
        trigger: function(ev){
            $(this).trigger(ev);
        },
        on: function(ev, action){
          $(this).on(ev, action);  
        },
        off: function(ev, action){
          $(this).off(ev, action);  
        },
        
        prepareParams: function(val, token){
            return {q: val, access_token: token};
        },
        
        /**
         * Method to make the ajax call tto the API
         * @param {String} val string to search
         * @param {String} token_ authentication token, if null we use ApiSearcher.ACCESS_TOKEN
         */
        doSearch: function (val) {
            var data = this.prepareParams(val);
            if(!data || $.isEmptyObject(data)) return;          
            
            var self = this,                
                ajaxOptions = {
                    type: "GET",
                    url: self.apiUrl,
                    dataType: "json",
                    data: data,
                    success: function(response, res, xhr){
                        self.defaultSuccess(response, res, xhr);
                    },
                    error: function(response, res, xhr){
                        self.defaultError(response, res, xhr);
                    }
                };
            $.ajax(ajaxOptions);
        },
        /**
         * 
         * @param {type} val
         * @param {type} token_
         * @returns {undefined}
         */
        provide: function(val){
            this.doSearch(val);
        }
    }
    
    var GithubRepoApi = {
        /**
         * All the response headers
         */
        headers: null,
        
        /**
         * url of github Api
         */ 
        url: "",
        /**
         * current response page number
         */        
        current: 0,
        
        /**
         * Last page number the github API will return
         */        
        last: 0,
        
        /* See: https://developer.github.com/v3/#rate-limiting */
        /**
         * Total repositories we get from the github API
         */        
        items: [],
        
        /**
         * Repositories we got in the last API call
         */        
        currentItems: [],
        
        /**
         * The maximum number of requests that the consumer is permitted to make per hour.
         */        
        xRateLimit: 0,
        
        /**
         * The number of requests remaining in the current rate limit window.
         */
        xRateLimitRemain:0,
        
        /**
         * The time at which the current rate limit window resets in UTC epoch seconds.
         */
        xRateLimitReset: 0,
        
        /**
         * Id to check if we need to save a cache locally
         */
        cacheControl: "saveLocal",
        
        /**
         * Total number of repositories.
         */
        total: 0,
        
        Provider: function(url, defaultSuccessCb, defaultErrorCb){
            ApiSearcher.call(this, url, defaultSuccessCb, defaultErrorCb);
            this.currentSearch = {};
        },
        
        /**
         * We extract all the data from the response
         * @param {Object} ev event object with the response and the xhr object
         * @returns {undefined}
         */
        parseResponse: function(ev){
            if(!ev) return;
            //We get position of search in the pagination of github through the link header
            if(ev.xhr){
                this.last = 0;
                
                try{
                    var st = ev.xhr.getResponseHeader("link"),
                    re = /\<(https.+)\>.+(rel=["\']next["\']).+\<(https.+)\>.+(rel=["\']last["\'])/g,
                    res, splitTmp;
                
                    res = re.exec(st)
                    //if there are more than 1 page  
                    if(res && res.length === 5 && res[2].indexOf("next") !== -1 && res[4].indexOf("last") !== -1) {                    
                        splitTmp = res[1].split("page=");
                        this.url = splitTmp[0];
                        this.current = parseInt(splitTmp[1], 10) - 1;
                        splitTmp = res[3].split("page=");
                        this.last = parseInt(splitTmp[1], 10);
                    }else {
                        this.current = 1;
                    }             
                    this.xRateLimit = ev.xhr.getResponseHeader("X-RateLimit-Limit");
                    this.xRateLimitRemain = ev.xhr.getResponseHeader("X-RateLimit-Remaining");
                    this.xRateLimitReset = parseInt(ev.xhr.getResponseHeader("X-RateLimit-Reset"), 10) * 1000;
                    this.headers = ev.xhr.getAllResponseHeaders();
                }catch(e){
                    alert("Error: "+e.message)
                }
                 
            }
            if(ev.response){
                this.currentItems = ev.response.items || [];
                this.total = ev.response.total_count;
            }
        },
        
        /**
         * Utility method to transform a group of repostitories to GithubRepoApi.Repository instances
         * @param {type} repos_
         * @returns {Array}
         */
        toRepositoryArray: function(repos_){
            var repositories = [],
                repos,
                i = 0;
            if( !$.isArray(repos_) ){
                repos = this.currentItems;
            }
            for (; i<repos.length; i++){
                repositories.push( new GithubRepoApi.Repository(repos[i]) );
            }
            return repositories;
        }
    }
    GithubRepoApi.ACCESS_TOKEN = "2161f323efe781e7c9c8cb9986abb3c5ccf30cef";
    /**
     * We instance an object with the required data from each repository
     * We just save the properties we need to save memory
     * @param {Object} ob object with all the properties we can get from the github api
     */
    GithubRepoApi.Repository = function(ob){
        if( !ob || typeof ob !== "object" ) return;
        var default_ = "value not present";        
        this.name = ob.name || default_;
        this.owner = ob.owner && ob.owner.login ? ob.owner.login : default_;
        this.properties = {
            full_name: ob.full_name || default_,
            language: ob.language || default_,
            description: ob.description || default_,
            url: ob.html_url || default_,
            followers: ob.owner && ob.owner.followers_url ? ob.owner.followers_url : default_
        }

    }
    
    GithubRepoApi.Repository.prototype = {
        /**
         * Utility to correct a bug with some names creating the list
         */
        htmlEntities: function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },
        /**
         * Utility method to create a dom list of properties
         * @returns {Object} jQuery object with a list of properties
         */
        renderProperties: function(){
            var props = this.properties,
                ul = $("<ul />"), 
                li, fixProp, cleanProp,html;
          for(var prop in props){
              if( props.hasOwnProperty(prop) ){
                  fixProp = prop.replace("_", " ");
                  props[prop] = this.htmlEntities( props[prop] );
                  cleanProp = (prop === "url" || prop === "followers") ?
                            "<a href='"+props[prop]+"' target='_blank'>"+props[prop]+"</a>" 
                            : props[prop];
                  li = $("<li><span>"+fixProp+": </span>" + "<span>"+cleanProp+"</span></li>");
                  //html = "<li><span>"+fixProp+": </span>" + "<span>"+cleanProp+"</span></li>";
                  ul.append(li);
              }
          }
          return ul;
        },
        
        /**
         * Utility method to create a dom node with the required values of the repository.
         * @returns {Object} jQuery object with all the data from the repository
         */
        render: function(){
            var container = $("<div />"),
                name = $("<div><div class='owner'><em>Owner: </em><span>"+this.owner+"</span></div>" 
                        + "<div class='owner'><em>Name: </em><span>"+this.name+"</span></div></div>"),
                list = this.renderProperties();
            container.append(name);
            container.append(list);
            list.hide();
            name.attr("class", "githubrepo-has-action");
            name.on("click", function(){
                list.slideToggle("fast");
            });            
            return container;            
        }        
    }
    GithubRepoApi.Provider.prototype = new ApiSearcher();
    
    /**
     * We create the object that we'll pass to make the ajax call
     * @param {Object | Number} obj
     * @returns Object {q=query_val, page: num_page, access_token: access_token}
     */
    GithubRepoApi.Provider.prototype.createParams = function(obj){
        var ob = $.isPlainObject(ob)? obj : {},
            val = $("#search").val();
        if(!val) return {};
        if(!ob.q) ob.q = val;
        if(!ob.page) ob.page = !isNaN(obj) ? parseInt(obj, 10) : 1;
        ob["access_token"] = GithubRepoApi.ACCESS_TOKEN;
        return ob;
    }
    //
    GithubRepoApi.Provider.prototype.prepareParams = function(obj){
        if( $.isEmptyObject(this.currentSearch) ) {
            this.currentSearch = this.createParams(obj);
        }
        return this.currentSearch;
    };
    
    /**
     * The github API has a limit of 20 calls per minute for authorized users.
     * We check this limit here. 
     * 
     * @returns {Number} Number of seconds we have to wait to make the call
     */
    GithubRepoApi.Provider.prototype.timeLimit = function(){
        if( GithubRepoApi.xRateLimitRemain > 0){
            return 0;
        }
        return GithubRepoApi.xRateLimitReset - (new Date()).getTime();
    }
    
    GithubRepoApi.Provider.prototype.checkCache = function(){
        return $("#"+GithubRepoApi.cacheControl).is(":checked");
    }
    
    GithubRepoApi.Provider.prototype.saveCache = function(name, page, vals){
        if(!this.checkCache()) return false;
        var n = name ? name : this.currentSearch.q,
            p = page ? page : this.currentSearch.page,
            cache = this.getCache(n, p) || new Array(GithubRepoApi.last);
        if( !n || isNaN(p))return null;
        cache[p] = vals ? vals : GithubRepoApi.currentItems;
        sessionStorage.setItem(n, JSON.stringify(cache));
        return true;
    }
    
    GithubRepoApi.Provider.prototype.removeCache = function(name, page){
        var cache;
        if(name && isNaN(p)){
            cache = this.getCache(name);
            cache[page] = null;
            sessionStorage.setItem(n, JSON.stringify(cache));
        }else if(name && !isNaN(p)){
            sessionStorage.removeItem(name);
        }
    }
    
    GithubRepoApi.Provider.prototype.getCache = function(name){
        if(!this.checkCache()) return null;
        var cache = JSON.parse(sessionStorage.getItem(name));
        
        if(!cache || !cache.length) return null;
        return cache;
    }
    /**
     * We search the github API asynchronously and we check if we are within its time limits
     * @param {type} val
     * @returns {undefined}
     */
    GithubRepoApi.Provider.prototype.provide = function(val){
        var hasCache = false, self=this, cache, ev, limitSeconds;
        this.currentSearch = this.createParams(val);
        if(this.checkCache()){
            cache = this.getCache(this.currentSearch.q);
            if($.isArray(cache) && $.isArray(cache[this.currentSearch.page]) &&cache[this.currentSearch.page].length) {
                GithubRepoApi.currentItems = cache[this.currentSearch.page];
                
                this.totalPages = cache.length;
                this.current = this.currentSearch.page;
                ev = $.Event( ApiSearcher.PROVIDE, { currentItems: GithubRepoApi.toRepositoryArray(),
                                                    total: this.totalPages,
                                                    current: this.currentSearch.page
                                                    } );
                this.trigger(ev);
                return;
            }
        }
        limitSeconds = this.timeLimit();
        
        if( limitSeconds === 0 ){
            this.doSearch(val);
        } else {
            self = this;
            setTimeout(function(){
                self.doSearch(val);
            }, limitSeconds);
        }
        
    }
  
    /**
     * Quick paginator to show results.
     * @returns {app_L57.Paginator}
     */
    var Paginator = {    
        container: null,
        div: null,
        ul: null,
        items: null,
        numItemsPage: 30,
        currentPage:0,
        totalPages: 0,
        class: 'paginated',
        selected: 'page-selected',
        pages: 0,
        provider: null,
        buttons: null,
        preloader: null,
        preload: {
            show: function(){
                if(Paginator.preloader) Paginator.preloader.show();
                if(Paginator.ul) Paginator.ul.hide();
            },
            hide: function(){
                if(Paginator.preloader) Paginator.preloader.hide();
                if(Paginator.ul) Paginator.ul.show();
            }
        },
        /**
         * Object to create the buttons
         */
        buttonGenerator: {
            dots: "...",
            getRandomInt: function (min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },
            generateBegin: function (medium, current, end, nums) {
                
                var l = nums.length - 1,
                        index = null;
                for (var i = 1; i < l; i++) {
                    if (i <= medium) {
                        if(i === current){
                            index = i;
                        }
                        nums[i] = i;
                    } else if (i === medium + 1) {
                        nums[i] = this.dots;
                    } else {
                        nums[i] = end - (l - 1 - i);
                    }
                    
                }
                return {btnNums: nums, pos:index};
            },
            generateEnd: function (medium, current, end, nums) {
                var l = nums.length - 2,
                        index = null;
                for (var i = l; i >= 1; i--) {
                    if (i >= medium) {
                        //nums[i] = end === current ? "-" + end + "-" : end;
                        if(end === current){
                            index = i;
                        }
                        nums[i] = end;
                        end--;
                    } else if (i === medium - 1) {
                        nums[i] = this.dots;
                    } else {
                        nums[i] = i;
                    }
                }
                //return nums;
                return {btnNums: nums, pos:index};
            },
            generatePlain: function (current, total, nums) {                
                var l = nums.length - 1,
                        index = null;
                for (var i = 1; i < l; i++) {
                    if (i === current) {
                        nums[i] = i;
                        index = i;
                    } else {
                        if (i > total) {
                            nums[i] = null;
                        } else {
                            nums[i] = i;
                        }
                    }
                    //nums[i] = i === current ? "-" + i + "-" : i;
                }
                //return nums;
                return {btnNums: nums, pos:index};
            },
            generateMedium: function (medium, current, total, nums) {
                var l = nums.length - 2,
                        before = medium - 1,
                        after = medium + 1,
                        index = null;
                nums[medium] = current;
                nums[before] = this.dots;
                nums[after] = this.dots;
                
                for (var i = 1; i < before; i++) {
                    nums[i] = i;
                }
                for (var i = l; i > after; i--) {
                    nums[i] = total - (l - i);
                }
                //return nums;
                return {btnNums: nums, pos:medium};
            },
            
            /**
             * This function creates the paging structure.
             * @param {Number} total total pages the API returns
             * @param {Number} max máximum number of buttons displayed
             * @param {Number} current current page
             */
            generateButtonPositions: function (total, max, current) {
                var l = max + 2,
                        medium = (function () {
                            if (max % 2 === 0) {
                                max--;
                            }
                            return Math.floor(max / 2) + 1;
                        })(),
                        nums = new Array(max + 2),
                        beginning = current <= medium,
                        ending = medium > total - current;

                nums[0] = "<<";
                nums[l - 1] = ">>";
                if (total <= max) {
                    return this.generatePlain(current, total, nums);
                } else {
                    if (beginning) {
                        return this.generateBegin(medium, current, total, nums);
                    } else if (ending) {
                        return this.generateEnd(medium, current, total, nums);
                    } else {
                        return this.generateMedium(medium, current, total, nums);
                    }
                }
            },
            generateButtons: function(container, total, max, current){                
                var 
                    buttonNumbers = this.generateButtonPositions(total, max, parseInt(current, 10)),
                    txts = buttonNumbers.btnNums,
                    p = buttonNumbers.pos,
                    buttons = [],
                    dots = Paginator.dots,
                    lastPos = txts.length-1,
                    tmpBtn;
                
                
                if(p !== 1){
                    tmp = $("<span>"+txts[0]+"</span>");
                    container.append(tmp);
                    Paginator.addButtonActions(tmp, "goPrevious");
                    buttons[0] = tmp;
                }
                for(var i=1; i<txts.length-1; i++){
                    if(txts[i]){
                        tmp =$("<span>"+txts[i]+"</span>");
                        container.append(tmp);
                        Paginator.addButtonActions(tmp, "goToPage");
                        buttons[i] = tmp;
                    }
                }
                if(p !== max){
                    tmp = $("<span>"+txts[lastPos]+"</span>");
                    buttons.push(tmp);
                    Paginator.addButtonActions(tmp, "goNext");
                    container.append(buttons[buttons.length-1])
                }
                buttons[p].addClass(Paginator.selected);
                return buttons;
            }
        },        
        
        /**
         * Allows to render any kind of object
         * @param {Object} item
         * @returns {Object} jQuery node object 
         */
        renderer: function(item){
            var st = "";
            for (var ob in item){
                st += "<div>"+ob+": " +item[ob]+"</div>";
            }
            return $("<div>"+st+"</div>");
        },
        
        /**
         * Allows us to append each page of paginated elements
         * @param {Array} items elements to be displayed. If it is null we use the own Paginator items
         */
        render: function(items){
            var tmpLi;
            
            if( !$.isArray(items) ) {
                if($.isArray(this.items)){
                    var items = this.items;
                }else{
                    return;
                }
                
            }
            if(!this.div || !this.ul) {
                this.paginate();
            }            
           
            try{                
                for(var i=0; i<items.length; i++){
                    if(items[i]){                        
                        tmpLi = this.toLiNode(items[i]);
                        
                        if(tmpLi instanceof $){
                            try {
                                this.ul.append(tmpLi);
                            }catch(e){
                                console.log(e.message, i, tmpLi.html())
                            }
                        }
                        
                    }
                }
            }catch(e){
                throw Error("Could not render items: ",e);
            }

        },
        
        /**
         * Creates the dom structure of pages
         */
        paginate: function(){
            var div, ul;
            if(!this.container) {
                this.container = $("<div />");
                $("body").append(this.container);
            }
            this.container.empty();
            div = $("<div>").attr("class", this.class),
            ul = $("<ul>");
            div.append(ul);
            this.container.append(div);
            this.div = div;
            this.ul = ul;
            this.createPages();
        },
        
        /**
         * Creates pagination buttons
         */
        
        addButtonActions: function(button, action){
            var self = this;
            if( !$.isFunction(self[action]) || !button instanceof $ ) return;
            button.on("click", function(){
                var val = $(this).text();
                self[action].call(self, val)
            });
        },
        goNext: function(){
            if(this.currentPage < this.totalPages){
                this.preload.show();
                this.currentPage++;
                this.provider.provide(this.currentPage);
                //this.paginate();
            }
        },
        goPrevious: function(){
            if(this.currentPage > 1){
                this.preload.show();
                this.currentPage--;
                this.provider.provide(this.currentPage);
                //this.paginate();
            }
        },
        goToPage: function(page){
            this.preload.show();
            this.currentPage = page;
            this.provider.provide(this.currentPage);
            //this.paginate();
        },
        createPages: function(){
            if( !this.div instanceof $ ) return;
            var max = 7,//we only show a maximum of 7 buttons
                num = max <= this.totalPages ? max : this.totalPages, 
                container = $("<div>"),
                current = this.currentPage,
                total = this.totalPages,
                previous = $("<span><<</span>") ,
                next =  $("<span>>></span>"),
                dummy = $("<span>"+this.dots+"</span>");        
            container.attr("class", this.class+"-buttons");
            this.div.prepend(container);
            this.buttonGenerator.generateButtons(container, total, max, current);
            //this.buttons = layers;
            //this.addPageActions();
            
        },
        
        /**
         * Prepares each element as a list element wrapped in the li html tag
         * @param {Object} item to be wrapped
         * @returns {Object} jQuery li node
         */
        toLiNode: function(item){
            var li = $("<li />"), node;
            //if item doesn't have a way to be rendered:
            
            if( typeof item.render !== "function" ){
                node = this.renderer(item);
            }else{                
                node = item.render();
            }
            if( typeof node === "string" || node instanceof jQuery || node.nodeType){
                li.append(node);
            }
            li.attr("class", "page-list-element");
            return li.children().length ? li : "";
        }
        
    }
    
    function addButton(id, legend){
        return $("<button>"+legend+"</button>").attr("id", id);//Search github repositories
        
    }
    
    function addCheckbox(id){
        var html = "<label for='"+id+"'>Save results locally (session storage)? </label>"
                    +"<input type='checkbox' id='"+id+"' />";
        return $("<div class='left' />").html(html);
    }
    
    function drawControls(id){
        var container = $("#"+id).wrap("<div />").parent(),
            searchBtn = addButton("searchBtn", "Search github repositories"),
            clearBtn = addButton("clearBtn", "Clear"),
            checkbox = addCheckbox(GithubRepoApi.cacheControl),
            preload = $("<div id='preload'><div>loading</div></div>"),
            className = "content-layout";
            container.attr("class", className);
            container.append([searchBtn, clearBtn, checkbox, preload]);            
            preload.hide();
        return {searchButton: searchBtn,
                clearButton: clearBtn,
                checkbox: checkbox,
                preload: preload};
    }
    
    /**
     * Start app
     */
    function main(){
        var apisearcher = new GithubRepoApi.Provider(API_URL),
            resulDiv = $("#results"),
            searchInput = $("#search"),
            controls = drawControls("search");
         
         resulDiv.attr("class", "content-layout");
         
         Paginator.provider = apisearcher;
         Paginator.preloader = controls.preload;
         
         apisearcher.on(ApiSearcher.SEARCH, function(ev){
             GithubRepoApi.parseResponse(ev);
             Paginator.container = resulDiv;
             Paginator.items = GithubRepoApi.toRepositoryArray();
             Paginator.currentPage = GithubRepoApi.current;
             Paginator.totalPages = GithubRepoApi.last;
             Paginator.preload.hide();
             Paginator.paginate();
             Paginator.render();
             apisearcher.saveCache();
         });
         
         apisearcher.on(ApiSearcher.PROVIDE, function(ob){
             Paginator.container = resulDiv;
             Paginator.items = ob.currentItems;
             Paginator.totalPages = ob.total;
             Paginator.currentPage = ob.current;
             Paginator.preload.hide();
             Paginator.paginate();
             Paginator.render();
             
         })
         
         apisearcher.on(ApiSearcher.ERROR, function(ev){
             alert(ev)
         })
         
         controls.searchButton.on("click", function(){
             var val = searchInput.val();
             if(val) {
                controls.preload.show();
                apisearcher.provide({
                    q: val,
                    page: 1
                });
             }
         });
         
         controls.clearButton.on("click", function(){
             $("#results").empty();
         });
         
         searchInput.on("keyup", function (e) {
            if (e.keyCode == 13) { 
                var val = searchInput.val();
                if(val){
                    controls.preload.show();
                    apisearcher.provide({
                        q: val,
                        page: 1
                    });  
                }             
            }
        });
    }
    $(document).ready(function () {        
        main();
    })
})(jQuery)