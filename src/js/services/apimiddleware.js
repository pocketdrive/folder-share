(function(angular) {
    'use strict';
    angular.module('FileManagerApp').service('apiMiddleware', ['$window', 'fileManagerConfig', 'apiHandler', 
        function ($window, fileManagerConfig, ApiHandler) {

        var ApiMiddleware = function() {
            this.apiHandler = new ApiHandler();
        };

        ApiMiddleware.prototype.getPath = function(arrayPath) {
            return '/' + arrayPath.join('/');
        };

        ApiMiddleware.prototype.getFileList = function(files) {
            return (files || []).map(function(file) {
                return file && file.model.fullPath();
            });
        };

        ApiMiddleware.prototype.getFilePath = function(item) {
            return item && item.model.fullPath();
        };

        ApiMiddleware.prototype.list = function(path, customDeferredHandler) {
            return this.apiHandler.list(fileManagerConfig.listUrl, this.getPath(path), customDeferredHandler);
        };

        ApiMiddleware.prototype.shareLink = function(item) {
            return this.apiHandler.shareLink(fileManagerConfig.listUrl, item);
        };

        ApiMiddleware.prototype.shareFolder = function(path,users,candidates, removedCandidates, issharedFolder){
            return this.apiHandler.shareFolder(fileManagerConfig.sharefolderUrl, path,users,candidates,removedCandidates,issharedFolder);
        }


        ApiMiddleware.prototype.getUsers = function(path,issharedFolder){
            return this.apiHandler.getUsers(fileManagerConfig.getUsersUrl, path, issharedFolder);
        }

        ApiMiddleware.prototype.getContent = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.getContent(fileManagerConfig.getContentUrl, itemPath);
        };

        ApiMiddleware.prototype.getUrl = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.getUrl(fileManagerConfig.downloadFileUrl, itemPath);
        };


        return ApiMiddleware;

    }]);
})(angular);