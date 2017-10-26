(function (angular, $) {
    'use strict';
    angular.module('FileManagerApp').service('apiHandler', ['$http', '$rootScope', '$q', '$window', '$translate', 'Upload', 'fileManagerConfig',
        function ($http, $rootScope, $q, $window, $translate, Upload, fileManagerConfig) {

            $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

            var ApiHandler = function () {
                this.inprocess = false;
                this.asyncSuccess = false;
                this.deviceName = "";
                this.error = '';
                this.username = (new URLSearchParams(window.location.search)).get('username');
            };

            ApiHandler.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {

                if (!data || typeof data !== 'object') {
                    this.error = 'Error %s - Bridge response error, please check the API docs or this ajax response.'.replace('%s', code);
                }
                if (code === 404) {
                    this.error = 'Error 404 - Backend bridge is not working, please check the ajax response.';
                }
                if (code === 503) {
                    this.error = 'Error - Pocket Drive device ' + this.deviceName + ' cannot be reached at the momentttttt.';
                }
                if (data.result && data.result.error) {
                    this.error = data.result.error;
                }
                if (!this.error && data.error) {
                    this.error = data.error.message;
                }
                if (!this.error && defaultMsg) {
                    this.error = defaultMsg;
                }
                if (this.error) {
                    return deferred.reject(data);
                }
                return deferred.resolve(data);
            };

            ApiHandler.prototype.list = function (apiUrl, path, customDeferredHandler, exts) {
                var self = this;
                var dfHandler = customDeferredHandler || self.deferredHandler;
                var deferred = $q.defer();
                var data = {
                    action: 'list',
                    path: path,
                    username: self.username,
                    fileExtensions: exts && exts.length ? exts : undefined
                };


                self.inprocess = true;
                self.error = '';

                $http.post(apiUrl, data).then(function (response) {
                    dfHandler(response.data, deferred, response.status);
                }, function (response) {
                    dfHandler(response.data, deferred, response.status, 'Unknown error listing, check the response');
                })['finally'](function () {
                    self.inprocess = false;
                });
                return deferred.promise;
            };

            ApiHandler.prototype.getContent = function (apiUrl, itemPath) {
                var self = this;
                var deferred = $q.defer();
                var data = {
                    action: 'getContent',
                    item: itemPath
                };

                self.inprocess = true;
                self.error = '';
                $http.post(apiUrl, data).success(function (data, code) {
                    self.deferredHandler(data, deferred, code);
                }).error(function (data, code) {
                    self.deferredHandler(data, deferred, code, $translate.instant('error_getting_content'));
                })['finally'](function () {
                    self.inprocess = false;
                });
                return deferred.promise;
            };

            ApiHandler.prototype.shareFolder = function (apiUrl, path, users, candidates, removedCandidates, issharedFolder) {
                // Obtain the username from APIpo
                var self = this;
                var deferred = $q.defer();
                var data = {
                    action: 'sharefolder',
                    username: self.username,
                    path: path,
                    users: users,
                    candidates: candidates,
                    removedcandidates: removedCandidates,
                    issharedFolder: issharedFolder
                };

                $http.post(apiUrl, data).then(function (response) {
                    self.deferredHandler(response.data, deferred, response.status);
                }, function (response) {
                    self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_copying'));
                })['finally'](function () {
                    self.inprocess = false;
                });
                // self.inprocess = true;
                // self.error = '';
                // sh.send(data, (message) => {
                //     if (message.type === 'webConsoleRelay') {
                //         self.deferredHandler(message.message, deferred, 200);
                //         self.inprocess = false;
                //     }
                //     if (message === 'error') {
                //         self.deferredHandler({}, deferred, 503);
                //     }
                // });

                return deferred.promise;

            };

            ApiHandler.prototype.getUsers = function (apiUrl, path, issharedFolder) {
                var self = this;
                var deferred = $q.defer();
                var data = {
                    action: 'getusers',
                    path: path,
                    username: self.username,
                    issharedFolder: issharedFolder
                };

                self.inprocess = true;
                self.error = '';

                self.inprocess = true;
                self.error = '';

                $http.post(apiUrl, data).then(function (response) {
                    self.deferredHandler(response.data, deferred, response.status);
                }, function (response) {
                    self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_copying'));
                })['finally'](function () {
                    self.inprocess = false;
                });

                return deferred.promise;
            };

            ApiHandler.prototype.shareLink = function (apiUrl, item) {
                var self = this;
                var deferred = $q.defer();
                var data = {
                    action: 'linkshare',
                    item: item
                };

                self.inprocess = true;
                self.error = '';

                sh.send(data, (message) => {
                    if (message.type === 'webConsoleRelay') {
                        self.deferredHandler(message.message, deferred, 200);
                        self.inprocess = false;
                    }
                    if (message === 'error') {
                        self.deferredHandler({}, deferred, 503);
                    }
                });

                return deferred.promise;
            };


            return ApiHandler;

        }]);
})(angular, jQuery);