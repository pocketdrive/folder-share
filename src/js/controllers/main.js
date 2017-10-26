(function (angular, $) {
    'use strict';
    angular.module('FileManagerApp').controller('FileManagerCtrl', [
        '$scope', '$rootScope', '$window', '$translate', 'fileManagerConfig', 'item', 'fileNavigator', 'apiMiddleware',
        function ($scope, $rootScope, $window, $translate, fileManagerConfig, Item, FileNavigator, ApiMiddleware) {

            var $storage = $window.localStorage;
            $scope.config = fileManagerConfig;
            $scope.reverse = false;
            $scope.users = null;
            $scope.candidates = null;
            $scope.removedCandidates = [];
            $scope.predicate = ['model.type', 'model.name'];
            $scope.order = function (predicate) {
                $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
                $scope.predicate[1] = predicate;
            };
            $scope.query = '';
            $scope.fileNavigator = new FileNavigator();
            $scope.apiMiddleware = new ApiMiddleware();
            $scope.uploadFileList = [];
            $scope.viewTemplate = $storage.getItem('viewTemplate') || 'main-icons.html';
            $scope.fileList = [];
            $scope.temps = [];
            $scope.shareLinkTemp = null;
            $scope.tempdata = {};

            $scope.$watch('temps', function () {
                if ($scope.singleSelection()) {
                    $scope.temp = $scope.singleSelection();
                } else {
                    $scope.temp = new Item({rights: 644});
                    $scope.temp.multiple = true;
                }
                $scope.temp.revert();
            });

            $scope.fileNavigator.onRefresh = function () {
                $scope.temps = [];
                $scope.query = '';
                $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
            };

            $scope.setTemplate = function (name) {
                $storage.setItem('viewTemplate', name);
                $scope.viewTemplate = name;
            };

            $scope.changeLanguage = function (locale) {
                if (locale) {
                    $storage.setItem('language', locale);
                    return $translate.use(locale);
                }
                $translate.use($storage.getItem('language') || fileManagerConfig.defaultLang);
            };

            $scope.clearLink = function () {
                $scope.shareLinkTemp = null;
                return true;
            }

            $scope.isSelected = function (item) {
                return $scope.temps.indexOf(item) !== -1;
            };

            $scope.selectOrUnselect = function (item, $event) {
                var indexInTemp = $scope.temps.indexOf(item);
                var isRightClick = $event && $event.which == 3;

                if ($event && $event.target.hasAttribute('prevent')) {
                    $scope.temps = [];
                    return;
                }
                if (!item || (isRightClick && $scope.isSelected(item))) {
                    return;
                }
                if ($event && $event.shiftKey && !isRightClick) {
                    var list = $scope.fileList;
                    var indexInList = list.indexOf(item);
                    var lastSelected = $scope.temps[0];
                    var i = list.indexOf(lastSelected);
                    var current = undefined;
                    if (lastSelected && list.indexOf(lastSelected) < indexInList) {
                        $scope.temps = [];
                        while (i <= indexInList) {
                            current = list[i];
                            !$scope.isSelected(current) && $scope.temps.push(current);
                            i++;
                        }
                        return;
                    }
                    if (lastSelected && list.indexOf(lastSelected) > indexInList) {
                        $scope.temps = [];
                        while (i >= indexInList) {
                            current = list[i];
                            !$scope.isSelected(current) && $scope.temps.push(current);
                            i--;
                        }
                        return;
                    }
                }
                if ($event && !isRightClick && ($event.ctrlKey || $event.metaKey)) {
                    $scope.isSelected(item) ? $scope.temps.splice(indexInTemp, 1) : $scope.temps.push(item);
                    return;
                }
                $scope.temps = [item];
            };

            $scope.singleSelection = function () {
                return $scope.temps.length === 1 && $scope.temps[0];
            };

            $scope.totalSelecteds = function () {
                return {
                    total: $scope.temps.length
                };
            };

            $scope.selectionHas = function (type) {
                return $scope.temps.find(function (item) {
                    return item && item.model.type === type;
                });
            };


            $scope.removeUser = function (user) {
                $scope.removedCandidates.push(user);
                $scope.candidates.splice($scope.candidates.indexOf(user),1);
            };

            $scope.getUsers = function () {
                $scope.candidates = null;
                $scope.users = null;
                $scope.tempdata.selectedList = [];
                var path = $scope.singleSelection().tempModel.fullPath();
                var issharedFolder = $scope.singleSelection().tempModel.issharedFolder;
                $scope.apiMiddleware.getUsers( path, issharedFolder).then(function (data) {
                    $scope.users = data.result.users;
                    console.log(data.result);
                    if (issharedFolder) {
                        $scope.candidates = data.result.candidates;
                        for(let user of $scope.candidates){

                            let userIndex = $scope.users.findIndex(us=>us.username===user.username);
                            user.name = $scope.users[userIndex].name;
                            user.fullname = $scope.users[userIndex].fullname;
                            $scope.users.splice(userIndex,1);
                        }

                    }
                });
            };

            $scope.smartClick = function (item) {
                var pick = $scope.config.allowedActions.pickFiles;
                if (item.isFolder()) {
                    return $scope.fileNavigator.folderClick(item);
                }

                if (typeof $scope.config.pickCallback === 'function' && pick) {
                    var callbackSuccess = $scope.config.pickCallback(item.model);
                    if (callbackSuccess === true) {
                        return;
                    }
                }

                if (item.isImage()) {
                    if ($scope.config.previewImagesInModal) {
                        return $scope.openImagePreview(item);
                    }
                    return $scope.apiMiddleware.download(item, true);
                }

                if (item.isEditable()) {
                    return $scope.openEditItem(item);
                }
            };
            $scope.openImagePreview = function () {
                var item = $scope.singleSelection();
                $scope.apiMiddleware.apiHandler.inprocess = true;
                $scope.modal('imagepreview', null, true)
                    .find('#imagepreview-target')
                    .attr('src', $scope.apiMiddleware.getUrl(item))
                    .unbind('load error')
                    .on('load error', function () {
                        $scope.apiMiddleware.apiHandler.inprocess = false;
                        $scope.$apply();
                    });
            };

            $scope.openEditItem = function () {
                var item = $scope.singleSelection();
                $scope.apiMiddleware.getContent(item).then(function (data) {
                    item.tempModel.content = item.model.content = data.result;
                });
                $scope.modal('edit');
            };

            $scope.modal = function (id, hide, returnElement) {
                var element = $('#' + id);
                element.modal(hide ? 'hide' : 'show');
                $scope.apiMiddleware.apiHandler.error = '';
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
                return returnElement ? element : true;
            };

            $scope.modalWithPathSelector = function (id) {
                $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;

                return $scope.modal(id);
            };

            $scope.isInThisPath = function (path) {
                var currentPath = $scope.fileNavigator.currentPath.join('/') + '/';
                return currentPath.indexOf(path + '/') !== -1;
            };

            $scope.shareFolder = function () {
                let path = $scope.singleSelection().tempModel.fullPath();
                let issharedFolder = $scope.singleSelection().tempModel.issharedFolder;
                if ($scope.tempdata.perms && $scope.tempdata.selectedList.length > 0 || $scope.candidates && $scope.candidates.length>0 || $scope.removedCandidates.length>0) {
                    let candidates = []
                    for (let user of $scope.tempdata.selectedList) {
                        let candidate = {
                            username: user.username,
                            permission: $scope.tempdata.perms[user.username]
                        };
                        candidates.push(candidate);
                    }
                    if ($scope.candidates && $scope.candidates.length>0) {

                        for (let user of $scope.candidates) {
                                if (user.permission !== $scope.tempdata.cand[user.username]) {
                                    user.permission = $scope.tempdata.cand[user.username];
                                    user.changepermission = true;
                                }else{
                                    user.changepermission = false;
                                }

                        }
                    }
                    $scope.apiMiddleware.shareFolder(path, candidates, $scope.candidates, $scope.removedCandidates, issharedFolder).then(() => {
                        $scope.fileNavigator.refresh();
                    });
                } else {
                    $scope.apiMiddleware.apiHandler.error = "Please select a user to share";
                }

            };

            $scope.getSharableLink = function () {
                $scope.shareLinkTemp = null;
                const item = $scope.singleSelection().model.fullPath();
                const user = $rootScope.globals.currentUser;

                $scope.apiMiddleware.shareLink($scope.singleSelection().model.fullPath()).then(function (data) {
                    $scope.shareLinkTemp = `http://${fileManagerConfig.apiUrl}:${fileManagerConfig.linkSharePort}/${user.username}/${user.device.uuid}/${data.result.id}`;
                });
            };

            $scope.removeFromUpload = function (index) {
                $scope.uploadFileList.splice(index, 1);
            };


            var validateSamePath = function (item) {
                var selectedPath = $rootScope.selectedModalPath.join('');
                var selectedItemsPath = item && item.model.path.join('');
                return selectedItemsPath === selectedPath;
            };

            var getQueryParam = function (param) {
                var found = $window.location.search.substr(1).split('&').filter(function (item) {
                    return param === item.split('=')[0];
                });
                return found[0] && found[0].split('=')[1] || undefined;
            };

            $scope.changeLanguage(getQueryParam('lang'));
            $scope.isWindows = getQueryParam('server') === 'Windows';
            $scope.fileNavigator.refresh();

        }]);
})(angular, jQuery);
