const THEMES = wiz.data.THEMES;
const BRANCHPATH = wiz.data.BRANCHPATH;
let API_URL = wiz.API.url("");
API_URL = API_URL.substring(0, API_URL.length-1);

const TREE_DATA = [];

for (let i = 0; i < THEMES.length; i++) {
    let theme = THEMES[i];
    let obj = {
        path: BRANCHPATH + "/themes", name: theme, type: 'folder', icon: 'fa-layer-group',
        onFolder: async (item) => {
            item.checked = false;
            for (var i = 0; i < item.sub.length; i++) {
                item.sub[i].hide_menu = true;
                if (item.sub[i].type == 'file') item.sub[i].icon = 'fa-file'
                else if (item.sub[i].type == 'folder') item.sub[i].icon = 'fa-folder'
                else if (item.sub[i].type == 'layout') item.sub[i].icon = 'fa-columns'
                else item.sub[i].icon = 'fa-caret-right'
            }
            return item;
        }
    };
    TREE_DATA.push(obj)
}

TREE_DATA.push({
    path: '', name: "New Theme", icon: 'fa-plus-square', click: async ($scope, item) => {
        $scope.modal.data.newtheme = {};
        $scope.modal.data.newtheme.title = "";
        $scope.modal.data.newtheme.create = async (title) => {
            if(!title) {
                toastr.error("Empty Theme Name");
                return;
            }
            if($scope.tree.data.slice(0, -1).map(obj => obj.name).includes(title)) {
                toastr.error("Duplicated Theme Name");
                return;
            }
            if($scope.modal.data.import.file) {
                //this
                const url = API_URL + '/create_import';
                const fd = new FormData();
                fd.append("file[]", $scope.modal.data.import.file);
                fd.append("path", BRANCHPATH + "/themes");
                fd.append("name", title);
                try {
                    let res = await fetch(url, {
                        method: 'post',
                        body: fd,
                    });
                    res = await res.json();
                    if (res.code !== 200) {
                        toastr.error(res.data);
                        return;
                    }
                    $('#modal-new-theme').modal('hide');
                    location.reload();
                    return;
                }
                catch(err) {
                    toastr.error("FAILED")
                }
            }
            let data = { path: BRANCHPATH + "/themes", name: title, rename: title };
            await $scope.API.rename(data);
            $('#modal-new-theme').modal('hide');
            location.reload();
        };
        $('#modal-new-theme').modal('show');
    }
});

const VIEWER_IMAGE_URL = (item) => {
    let url = item.url;
    url = url.split("/");
    let themename = url[4];
    url = url.splice(6);
    url = url.join("/");
    url = "/resources/themes/" + themename + "/" + url;
    return url;
};

const BUILD_INIT = async ($scope) => {
    console.log($scope);
}

let wiz_controller = async ($sce, $scope, $timeout) => {
    _builder($scope, $timeout);

    $scope.math = Math;
    $scope.trustAsHtml = $sce.trustAsHtml;

    $scope.configuration = {};       // state data for maintaining ui
    $scope.tree = {};
    $scope.viewer = {};
    $scope.shortcut = {};
    $scope.loading = {};
    $scope.modal = {};
    $scope.upload = {};

    /*
     * define variables
     */
    let BUILDER = {};

    let API = {
        load: (item) => new Promise((resolve) => {
            let url = API_URL + '/tree';
            $.post(url, { path: item.path, name: item.name, type: item.type }, function (res) {
                resolve(res);
            });
        }),
        upload: (data) => new Promise((resolve) => {
            let url = API_URL + '/upload';
            $.ajax({
                url: url,
                type: 'POST',
                xhr: () => {
                    let myXhr = $.ajaxSettings.xhr();
                    if (myXhr.upload) {
                        myXhr.upload.addEventListener('progress', function (event) {
                            let percent = 0;
                            let position = event.loaded || event.position;
                            let total = event.total;
                            if (event.lengthComputable) {
                                percent = Math.round(position / total * 10000) / 100;
                            }
                            $scope.upload.process = percent;
                            $timeout();
                        }, false);
                    }
                    return myXhr;
                },
                data: data,
                cache: false,
                contentType: false,
                processData: false
            }).always(function (res) {
                resolve(res);
            });
        }),
        update: (data) => new Promise((resolve) => {
            let url = API_URL + '/update';
            $.post(url, data, function (res) {
                resolve(res);
            });
        }),
        delete: (data) => new Promise((resolve) => {
            let url = API_URL + '/delete';
            $.post(url, data, function (res) {
                resolve(res);
            });
        }),
        delete_bulk: (data) => new Promise((resolve) => {
            let url = API_URL + '/delete_bulk';
            $.post(url, { data: JSON.stringify(data) }, function (res) {
                resolve(res);
            });
        }),
        del_zip: (data) => new Promise((resolve) => {
            let url = API_URL + '/del_zip';
            data = angular.copy(data);
            $.post(url, data, resolve);
        }),
        rename: (data) => new Promise((resolve) => {
            let url = API_URL + '/rename';
            $.post(url, data, function (res) {
                resolve(res);
            });
        }),
        timeout: (ts) => new Promise((resolve) => {
            $timeout(resolve, ts);
        })
    };

    $scope.API = API;

    BUILDER.tree = async () => {
        $scope.tree.data = TREE_DATA;
        $scope.tree.parents = {};
        $scope.tree.current = null;

        $scope.tree.init = async () => {
            for (let i = 0; i < $scope.tree.data.length; i++) {
                let item = $scope.tree.data[i];
                if (item.type == "folder" && !item.sub) {
                    await $scope.tree.load(item, i > 0, false);
                }
            }
        }

        $scope.tree.load = async (item, tree, refresh) => {
            if (!item) {
                location.reload();
                return;
            }
            $scope.tree.current = item;

            if ($scope.viewer.has_parent(item) && !refresh) {
                if (item.sub.length > 0) {
                    item.sub = [];
                    if (item.path == $scope.viewer.data.path && item.name == $scope.viewer.data.name)
                        $scope.viewer.parent(true);
                    await API.timeout();
                    return;
                }
            }

            if (item.click) {
                await item.click($scope, item);
                return;
            }

            let res = await API.load(item);

            // if result is list of files or folder
            if (res.code == 200) {
                item.checked = false;
                item.sub = res.data;

                if (item.onFolder) {
                    item = await item.onFolder(item);
                } else {
                    item.sub.sort(function (a, b) {
                        if (a.type == 'folder' && b.type != 'folder') return -1;
                        if (a.type != 'folder' && b.type == 'folder') return 1;
                        return a.name.localeCompare(b.name);
                    });

                    for (var i = 0; i < item.sub.length; i++) {
                        if (item.sub[i].type == 'file') item.sub[i].icon = 'fa-file'
                        else if (item.sub[i].type == 'folder') item.sub[i].icon = 'fa-folder'
                        else item.sub[i].icon = 'fa-caret-right'
                    }
                }

                for (var i = 0; i < item.sub.length; i++) {
                    $scope.tree.parents[item.sub[i].path + "/" + item.sub[i].name] = item;
                }

                if (!tree) {
                    await $scope.viewer.folder(item);
                }

                await API.timeout();
                return;
            }

            if (res.code == 201) {
                await $scope.viewer.editor.load(res.data);
                return;
            }

            if (res.code == 202) {
                await $scope.viewer.image(res.data);
                return;
            }
        };
    }

    BUILDER.upload = async () => {
        $scope.upload.status = false;
        $scope.upload.process = 0;

        $scope.upload.run = async (data) => {
            $scope.upload.status = true;
            $scope.upload.process = 0;
            await API.timeout();
            await API.upload(data);
            $scope.upload.status = false;
            await API.timeout();
            $scope.upload.process = 0;
            await $scope.tree.load($scope.viewer.data, false, true);
        }
    }

    BUILDER.viewer = {};

    BUILDER.viewer.base = async () => {
        $scope.viewer.parent = async (notreload) => {
            if (!$scope.viewer.data) return;
            if (!$scope.viewer.has_parent()) return;
            let parent = $scope.tree.parents[$scope.viewer.data.path + "/" + $scope.viewer.data.name];
            if (!notreload) {

                await $scope.tree.load(parent, false, true);
            } else if (parent) {
                $scope.viewer.data = parent;
            }
            await API.timeout();
        }

        $scope.viewer.drop = {};
        $scope.viewer.drop = {};
        $scope.viewer.drop.text = "Drop File Here!"
        $scope.viewer.drop.ondrop = async (e, files) => {
            let fd = new FormData();
            let filepath = [];
            fd.append("path", $scope.viewer.data.path);
            fd.append("name", $scope.viewer.data.name);
            for (let i = 0; i < files.length; i++) {
                fd.append('file[]', files[i]);
                filepath.push(files[i].filepath);
            }

            fd.append("filepath", JSON.stringify(filepath));
            await $scope.upload.run(fd);
        }

        $scope.viewer.upload = function () {
            $('#file-upload').click();
        };

        let fileinput = document.getElementById('file-upload');
        fileinput.onchange = async () => {
            let fd = new FormData($('#file-form')[0]);
            fd.append("path", $scope.viewer.data.path);
            fd.append("name", $scope.viewer.data.name);
            await $scope.upload.run(fd);
        };
    }

    BUILDER.viewer.folder = async () => {
        $scope.viewer.folder = async (item) => {
            $scope.viewer.mode = "folder";
            $scope.viewer.data = item;
            await API.timeout();
        }

        $scope.viewer.has_parent = (item) => {
            if (!item) item = $scope.viewer.data;
            if ($scope.tree.parents[item.path + '/' + item.name])
                return true;
            return false;
        }

        $scope.viewer.check = async (item) => {
            item.checked = !item.checked;
            await API.timeout();
        }

        $scope.viewer.check_all = async (item) => {
            item.checked = !item.checked;
            for (let i = 0; i < item.sub.length; i++)
                item.sub[i].checked = item.checked;
            await API.timeout();
        }

        $scope.viewer.create = async (item, ftype) => {
            let obj = {};
            obj.path = item.path + "/" + item.name;
            obj.type = ftype;
            obj.name = "";
            item.sub.push(obj);

            await API.timeout();
            await $scope.viewer.change_name(item.sub[item.sub.length - 1]);
        }

        $scope.viewer.save_name = async () => {
            let data = angular.copy($scope.viewer.selected);
            let res = await API.rename(data);

            if (res.code == 402) {
                toastr.error(res.data);
                return;
            }

            if (res.code == 401) {
                toastr.error(res.data);
                return;
            }

            if (res.code == 200) {
                $scope.viewer.selected.edit = false;
                $scope.viewer.selected.name = $scope.viewer.selected.rename;
            }

            await $scope.tree.load($scope.viewer.data, false, true);
            await API.timeout();
        }

        $scope.viewer.change_name = async (item) => {
            if ($scope.viewer.selected)
                $scope.viewer.selected.edit = false;

            item.edit = true;
            item.rename = item.name + "";
            $scope.viewer.selected = item;
            await API.timeout();
        }

        $scope.viewer.delete = async (item) => {
            let data = angular.copy(item);
            let parent = $scope.tree.parents[data.path + "/" + data.name];
            if (data.bulk) {
                parent = data;
                let sub = [];
                for (let i = 0; i < data.sub.length; i++) {
                    if (data.sub[i].checked) {
                        sub.push(data.sub[i]);
                    }
                }
                await API.delete_bulk(sub);
            } else {
                await API.delete(data);
            }
            $scope.modal.data.delete_selected = null;
            await $scope.tree.load(parent, false, true);
            $('#modal-delete').modal('hide');
        }
    }

    BUILDER.viewer.image = async () => {
        $scope.viewer.image = async (item) => {
            let url = VIEWER_IMAGE_URL(item);
            if (!url) return;
            $scope.viewer.mode = "image";
            $scope.viewer.data = item;
            item.url = url;
            await API.timeout();
        }
    }

    BUILDER.viewer.editor = async () => {
        $scope.viewer.editor = {};
        $scope.viewer.editor.properties = $scope.monaco("python");
        $scope.viewer.editor.status = false;
        $scope.viewer.editor.properties.onLoad = async (editor) => {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function () {
                $scope.viewer.save();
                shortcuts();
            });
        };

        $scope.viewer.editor.load = async (item) => {
            $scope.viewer.mode = "editor";
            $scope.viewer.editor.properties.language = item.language;
            $scope.viewer.editor.status = false;
            await API.timeout();

            $scope.viewer.data = item;
            await API.timeout();
            $scope.viewer.editor.status = true;
            await API.timeout();
        }

        $scope.viewer.save = async () => {
            let data = angular.copy($scope.viewer.data);
            let res = await API.update(data);
            if (res.code == 200) toastr.success('Saved');
            else toastr.error('Error');
        }
    }

    /*
     * define loading
     */
    BUILDER.loading = async () => {
        $scope.loading.status = true;
        $scope.loading.show = async () => {
            $scope.loading.status = true;
            await API.timeout();
        }

        $scope.loading.hide = async () => {
            $scope.loading.status = false;
            await API.timeout();
        }
    }

    /*
     * define modal events
     */

    BUILDER.modal = async () => {
        $scope.modal.import_drop = {
            text: 'ㅤ',
            ondrop: async (e, files) => {
                if(files.length === 0) return;
                const app = files[0];
                try {
                    const ext = app.name.split(".").slice(-1)[0];
                    if(ext !== "zip") {
                        toastr.error("Support only ZIP file");
                        return;
                    }
                }
                catch(err){console.log(err)}
                $scope.modal.data.import.name = app.name;
                let size = app.size / 1024;
                size = +(Math.round(size + "e+2")  + "e-2");
                if(size > 1024) {
                    size /= 1024;
                    size = +(Math.round(size + "e+2")  + "e-2");
                    size += " MB";
                }
                else {
                    size += " KB";
                }
                $scope.modal.data.import.size = size;
                $scope.modal.data.import.file = app;
                $timeout();
            },
        };
        $scope.modal.data = {};
        $scope.modal.data.import = {
            name: "",
            size: "",
        };
        $scope.modal.delete = async (item) => {
            $scope.modal.data.delete_selected = item;
            $('#modal-delete').modal('show');
        }

        $scope.modal.export = async ({ path, name }) => {
            const url = API_URL + '/export';
            const fd = new FormData();
            fd.append('path', path);
            fd.append('name', name);
            try {
                let res = await fetch(url, {
                    method: 'post',
                    body: fd,
                });
                const blob = await res.blob();
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = window.URL.createObjectURL(blob);
                a.download = `${name}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                await API.del_zip({path, name});
            }
            catch (err) {
                toastr.error(err);
                return;
            }
        }

        $scope.modal.delete_bulk = async (item) => {
            $scope.modal.data.delete_selected = item;
            $scope.modal.data.delete_selected.bulk = true;
            $('#modal-delete').modal('show');
        }
    }

    BUILDER.init = async () => {
        await $scope.tree.init();
        await $scope.loading.hide();
    }

    BUILDER.upload();
    BUILDER.viewer.base();
    BUILDER.viewer.folder();
    BUILDER.viewer.image();
    BUILDER.viewer.editor();
    BUILDER.tree();
    BUILDER.loading();
    BUILDER.modal();
    BUILDER.init();

    // shortcut
    function shortcuts() {
        $(window).unbind();
        shortcutjs(window, {
            'Ctrl KeyS': function (ev) {
                ev.preventDefault();
                $scope.viewer.save();
            }
        });
    }

    shortcuts();
    window.addEventListener("focus", shortcuts, false);

    if (window.BUILD_INIT) {
        BUILD_INIT($scope);
    }
}