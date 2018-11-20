define(["modules/jquery-mozu", 'modules/api', "underscore", "hyprlive", "modules/backbone-mozu", "hyprlivecontext", 'modules/mozu-grid/mozugrid-view', 'modules/mozu-grid/mozugrid-pagedCollection', "modules/views-paging", "modules/models-product", "modules/models-wishlist", "modules/search-autocomplete", "modules/models-cart", "modules/product-picker/product-picker-view"], function ($, api, _, Hypr, Backbone, HyprLiveContext, MozuGrid, MozuGridCollection, PagingViews, ProductModels, WishlistModels, SearchAutoComplete, CartModels, ProductPicker) {

    var QuoteModel = WishlistModels.Wishlist.extend({
        deleteWishlist: function(id) {
            if(id) {
                return this.apiModel['delete']({id:id}); 
            }
        },
        saveWishlist: function(){
            this.set('customerAccountId', require.mozuData('user').accountId);
            if (!this.get('name') || this.get('name') === " "){
                this.set('name', 'New List - ' + Date.now()); 
            }
            this.set('customerAccountId', require.mozuData('user').accountId);
            
            if (this.get('id')) {
                this.syncApiModel();
                return this.apiModel.update();
            }
            return this.apiModel.create();
        },
        
        addQuoteItem: function(item, quantity){
            var self = this;
            if (!this.get('id')) {
                
                return this.saveWishlist().then(function(){
                    var payload = {
                        wishlistId: self.get('id'),
                        quantity: 1,
                        product: item
                    };
                    self.apiModel.addItemTo(payload, { silent: true }).then(function (data) {
                        self.get('items').add(new WishlistModels.WishlistItem(data.data), { merge: true });
                    }); 
                });    
            }
            var payload = {
                wishlistId: this.get('id'),
                quantity: quantity || 1,
                product: item
            };
            
            return this.apiModel.addItemTo(payload, { silent: true }).then(function(data){
                self.get('items').add(new WishlistModels.WishlistItem(data.data), {merge: true});
            }); 
        }
    });

    var QuotesModel = Backbone.MozuModel.extend({
        defaults: {
            isEditMode : false
        },
        relations: {
            quote: QuoteModel
        },
        setQuote: function (quote) {
            if (!(quote instanceof QuoteModel)){
                if (quote.toJSON)
                    quote = quote.toJSON();
                quote = new QuoteModel(quote);
            }
            this.set('quote').clear();
            if (this.get('quote').get('items').length) {
                this.get('quote').get('items').reset();
            }
            this.set('quote', quote);
        },
        setEditMode: function(flag) {
            return this.set('isEditMode', flag);
        },
        toggleEditMode: function(){
            if(this.get('isEditMode')) {
                return this.setEditMode(false);
            }
            return this.setEditMode(true);
        }
    });

    var QuotesView = Backbone.MozuView.extend({
        templateName: 'modules/b2b-account/quotes/my-quotes',
        newQuote: function () {
            console.log('Create Wishlist');
            this.model.setQuote({});
            this.model.setEditMode(true);
            this.render();
            //Just the Edit Page that is empty?
        },
        removeQuote: function(id){
            var self = this;
            return this.model.get('quote').deleteWishlist(id).then(function(){
                self.render();
            });
        },
        copyQuote: function (quote) {
            var self = this;
            quote.unset('id');
            if(quote.toJSON){
                quote = quote.toJSON();
            }
            self.model.isLoading(true);
            return this.model.get('quote').apiCreate(quote).then(function () {
                self.render();
            }).done(function(){
                self.model.isLoading(false);
            });
        },
        createOrder: function () {
            console.log('Create Order');
            //Move to Cart?
        },
        shareQuote: function () {
            console.log('Share Quote');
            //Move to Cart?
        },
        render: function(){
            Backbone.MozuView.prototype.render.apply(this, arguments);
            var self = this;
            var editQuoteView = new EditQuoteView({
                el: self.$el.find('.mz-b2b-quotes-product-picker'),
                model: self.model.get('quote')
            });
            $(document).ready(function () {
                if (!self.model.get('isEditMode')){
                    var collection = new MozuGridCollectionModel();

                    var quotesGrid = new MozuGrid({
                        el: $('.mz-b2b-quotes-grid'),
                        model: collection
                    });

                    quotesGrid.render();
                    return;
                } else {
                    editQuoteView.render();
                }
               

                
            });
        }
    });

    var EditQuoteView = Backbone.MozuView.extend({
        templateName: 'modules/b2b-account/quotes/edit-quote',
        autoUpdate: [
            'name',
            'pickerItemQuantity'
        ],
        defaults: {
          'pickerItemQuantity' : 1  
        },
        initialize: function() {
            var self = this;
            this.listenTo(this.model, "productSelected", function (product) {
                self.addWishlistItem(product);
            });
        },
        saveQuote: function () {
            console.log('Create Wishlist');
            var self = this;
            this.model.saveWishlist().then(function(){
                self.model.parent.setEditMode(false);
                self.model.parent.trigger('render');
            });
            
            //Just the Edit Page that is empty?
        },
        cancelQuoteEdit: function () {
            console.log('Create Wishlist');
            this.model.parent.setEditMode(false);
            window.quoteViews.quotesView.render();
            //Just the Edit Page that is empty?
        },
        addWishlistItem: function(product){
            var self = this;
            
            window.quoteViews.quotesView.model.get('quote').addQuoteItem(product, self.model.get('pickerItemQuantity'));
            self.model.unset('selectedProduct');
            $('.mz-b2b-quotes .mz-searchbox-input.tt-input').val('');
            $('.mz-b2b-quotes #pickerItemQuantity').val(1);
        },
        render: function() {
            Backbone.MozuView.prototype.render.apply(this, arguments);
            var self = this;
            $('#wishlistName').focusout(function(){
                self.model.saveWishlist();    
            });
            var quoteListView = new QuoteListView ({
                el: self.$el.find('.mz-b2b-quote-list'),
                model: self.model
            });
            quoteListView.render();

            var productPickerView = new ProductPicker({
                el: self.$el.find('[mz-quote-product-picker]'),
                model: self.model
            });
            
            productPickerView.render();
        }
    });

    var QuoteListView = Backbone.MozuView.extend({
        templateName: 'modules/b2b-account/quotes/quote-list',
        additionalEvents: {
            "change [data-mz-value='quantity']": "onQuantityChange"
        },
        initialize: function() {
            var self = this;
            this.listenTo(this.model.get('items'), "remove", function(){
                self.render();
            });
            this.listenTo(this.model.get('items'), "add", function () {
                self.render();
            });
            this.listenTo(this.model.get('items'), "change", function () {
                self.render();
            });
        },
        onQuantityChange: _.debounce(function (e) {
            var $qField = $(e.currentTarget),
                newQuantity = parseInt($qField.val(), 10);
            if (!isNaN(newQuantity)) {
                this.updateQuantity(newQuantity);
            }
        }, 500),
        updateQuantity: _.debounce(function (e) {
            var self = this,
                $qField = $(e.currentTarget),
                newQuantity = parseInt($qField.val(), 10),
                id = $qField.data('mz-cart-item'),
                item = this.model.get("items").get(id);

            if (item && !isNaN(newQuantity)) {
                item.set('quantity', newQuantity);
                var payload = item.toJSON();
                    payload.id = self.model.get('id');
                    payload.itemId = item.get('id');

                return this.model.apiModel.editItem(payload, {silent: true});
            }
        }, 400),
        beginRemoveItem: function (e) {
            var self = this;
            var id = $(e.currentTarget).data('mzItemId');
            if (id) {
                var removeWishId = id;
                return this.model.apiModel.deleteItem({id: self.model.get('id'), itemId: id}, { silent: true }).then(function () { 
                    var itemToRemove = self.model.get('items').where({
                        id: removeWishId
                    });
                    if (itemToRemove) {
                        self.model.get('items').remove(itemToRemove);
                        self.render();
                    }
                });
            }
        }
    });

    var MozuGridCollectionModel = MozuGridCollection.extend({
        mozuType: 'wishlists',
        columns: [
            {
                index: 'name',
                displayName: 'Wishlist Name',
                sortable: true
            },
            {
                index: 'items',
                displayName: 'Product Count',
                displayTemplate: function (items) {
                    items = items || [];
                    return items.length;
                },
                sortable: false
            }
        ],
        rowActions: [
            {
                displayName: 'Edit',
                action: 'editWishlist'
            },
            {
                displayName: 'Delete',
                action: 'deleteWishlist'
            },
            {
                displayName: 'Copy',
                action: 'copyWishlist'
            },
            {
                displayName: 'Order',
                action: 'addWishlistToCart'
            }
        ],
        relations: {
            items: Backbone.Collection.extend({
                model: QuoteModel
            })
        },
        deleteWishlist: function (e, row) {
            console.log('Remove Wishlist');
            //var rowIndex = $(e.target).parents('.mz-grid-row').data('mzRowIndex');
            //var wishlistId = e.target.data("mzQuoteId");
            //Confirmation Modal
            window.quoteViews.quotesView.removeQuote(row.get('id'));
        },
        editWishlist: function (e, row) {
            console.log('Edit Wishlist');
            //var rowIndex = $(e.target).parents('.mz-grid-row').data('mzRowIndex');
           
            window.quoteViews.quotesView.model.setQuote(row);
            window.quoteViews.quotesView.model.setEditMode(true);
            window.quoteViews.quotesView.render();
        },
        addWishlistToCart: function (e, row){
            var cart = CartModels.Cart.fromCurrent();
            var products = row.get('items').toJSON();
            cart.apiModel.addBulkProducts({ postdata: products}).then(function(){
                window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/cart";
            });
        },
        copyWishlist: function(e, row){
            var wishlistName = 'copy - ' + row.get('name');
            row.set('name', wishlistName);
            window.quoteViews.quotesView.copyQuote(row);
        }
    });


    $(document).ready(function () {

        var quotesModel = new QuotesModel({});
        var views = {
            quotesView: new QuotesView({
                el: $('.mz-b2b-quote-wrapper'),
                model: quotesModel
            })
        };

        window.quoteViews = views;
        _.invoke(views, 'render');

    });
});