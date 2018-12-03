define(["modules/jquery-mozu", 'modules/api', "underscore", "hyprlive", "modules/backbone-mozu", "hyprlivecontext", 'modules/mozu-grid/mozugrid-view', 'modules/mozu-grid/mozugrid-pagedCollection', "modules/views-paging", "modules/models-product", "modules/models-b2b-accounts", "modules/search-autocomplete", "modules/models-cart", "modules/product-picker/product-picker-view", "modules/backbone-pane-switcher", "modules/models-dialog", "modules/views-modal-dialog"], function ($, api, _, Hypr, Backbone, HyprLiveContext, MozuGrid, MozuGridCollection, PagingViews, ProductModels, B2BAccountModels, SearchAutoComplete, CartModels, ProductPicker, PaneSwitcher, DialogModels, ModalDialogView) {

    var UsersEditModel = Backbone.MozuModel.extend({
        relations: {
            user: B2BAccountModels.b2bUser
        },
        defaults: {
            b2bAccountId: require.mozuData('user').accountId
        },
        saveUser: function(){
            var user = this.get('user');
            user.set('accountId', this.get('b2bAccountId'));
            user.set('localeCode', "en-US");
            user.set('acceptsMarketing', false);
            user.set('externalPassword', "");
            user.set('isImport', false);
            user.set('isRemoved', false);
            user.set('userName', user.get('emailAddress'));
            if (user.get('id')) {
                return user.apiUpdate.then(function(){

                });
            }
            var createPayload = {
                b2bUser: this.get('user')
            }
            return user.apiCreate(createPayload).then(function () {
                window.usersGridView.refreshGrid();
            }); 
        },
        setUser: function(user){
            this.get('user').clear();
            this.set('user', user);

        },
        removeUser: function(){
            return this.get('user').apiDelete.then(function () {

            });  
        }
    });

    var UsersEditForm = Backbone.MozuView.extend({
        templateName: "modules/b2b-account/users/edit-user-form",
        autoUpdate: [
            'user.firstName',
            'user.lastName',
            'user.emailAddress',
            'user.isActive',
            'user.userRole'
        ]
    });

    var UserModalModel = DialogModels.extend({});

    var UsersModalView = ModalDialogView.extend({
        templateName: "modules/b2b-account/users/users-modal",
        handleDialogOpen: function () {
            this.model.trigger('dialogOpen');
            this.bootstrapInstance.show();
        },
        handleDialogCancel: function () {
            var self = this;
            this.bootstrapInstance.hide();
        },
        handleDialogSave: function () {
            var self = this;
            if (self._userForm ) {
                self._userForm.model.saveUser();
            }
            this.bootstrapInstance.hide();
        },
        setInit: function () {
            var self = this;
            self.loadUserEditView();
            self.handleDialogOpen();
        },
        loadUserEditView: function (user) {
            var self = this;
            user = user || new B2BAccountModels.b2bUser({});
            var userEditForm = new UsersEditForm({
                el: self.$el.find('.mz-user-modal-content'),
                model: new UsersEditModel({user:user})
            });
            self._userForm = userEditForm;
            userEditForm.render();
        },
        render: function () {
            var self = this;
            self.setInit();
        }
    });

    var UsersGridCollectionModel = MozuGridCollection.extend({
        mozuType: 'b2busers',
        defaults: {
            accountId: require.mozuData('user').accountId
        },
        columns: [
            {
                index: 'emailAddress',
                displayName: 'Email',
                sortable: true
            },
            {
                index: 'firstName',
                displayName: 'First Name',
                sortable: false
            },
            {
                index: 'lastName',
                displayName: 'Last Name',
                sortable: false
            },
            {
                index: 'islocked',
                displayName: 'Is locked',
                renderer: function(value){
                    return (value) ? 'Locked' : ''
                },
                sortable: false
            }
        ],
        rowActions: [
            {
                displayName: 'Edit',
                action: 'editUser'
            },
            {
                displayName: 'Delete',
                action: 'deleteUser'
            }
        ],
        relations: {
            items: Backbone.Collection.extend({
                model: B2BAccountModels.b2bUser
            })
        },
        deleteUser: function (e, row) {
            var self = this;
            user.apiDelete().then(function(){
                self.refreshGrid();
            });
        },
        editUser: function (e, row) {
            window.userModalView.loadUserEditView(row);
            window.userModalView.handleDialogOpen();
        }
    });

    var UsersModel = Backbone.MozuModel.extend({

    });

    var UsersView = Backbone.MozuView.extend({
        templateName: "modules/b2b-account/users/users",
        addNewUser: function () {
            window.userModalView.loadUserEditView();
            window.userModalView.handleDialogOpen();
        },
        render: function () {
            Backbone.MozuView.prototype.render.apply(this, arguments);
            var self = this;
            var collection = new UsersGridCollectionModel({});

            var usersGrid = new MozuGrid({
                el: self.el.find('.mz-b2baccount-users'),
                model: collection
            });

            var usersModalView = new UsersModalView({
                el: self.el.find('.mz-b2baccount-users-modal'),
                model: new UserModalModel({})
            });

            window.userModalView = usersModalView;
            window.usersGridView = usersGrid;

            usersGrid.render();
        }
    });

    return {
        'UsersView': UsersView,
        'UsersModel': UsersModel,
        'UsersModalView': UsersModalView
    };
});
