import season
import time
wiz = framework.model("wiz")
config = wiz.config.load("wiz")

WIZ_CONTROLLER = '### get request query\n### wiz.request.query(<KEY>, <DEFAULT_VALUE>)\n# data = wiz.request.query() # get all queries as dict type\n# value = wiz.request.query("key", "test") # get `key` value, if not exist in query, return default value\n# value = wiz.request.query("key", True) # if default value is True, this key required\n\n### load text from dictionary\n# hello = dic("hello")\n# title = dic("title.text")\n\n### use selected controller\n# controller.custom_function()\n\n### use segments\n### Route: /board/<category>/list\n### View URI: /board/notice/list\n# segment = framework.request.segment\n\n### Build view variables, you can use\n# kwargs[\'message\'] = "Hello, World!"\n'
WIZ_JS = 'let wiz_controller = async ($sce, $scope, $timeout) => {\n    // call wiz api\n    let status = await wiz.API.async(\'status\', {});\n    console.log(status);\n\n    /*\n    // WIZ JS API Variables\n    wiz.id // random generated wiz workspace app id\n    wiz.namespace // defined namespace at view\n    wiz.app_namespace // defined namespace at wiz workspace \n    wiz.render_id // random generated view instance id\n    */\n\n    /*\n    // bind event. allow access form another wiz\n    wiz.bind("modal-show", (data) => {\n        $scope.data = data;\n        $(\'#\' + wiz.render_id).modal("show");\n        $timeout();\n    });\n\n    // response to caller, when event end.\n    $scope.event = {};\n    $scope.event.submit = async () => {\n        $(\'#\' + wiz.render_id).modal("hide");\n        let resp = true;\n        wiz.response("modal-show", resp);\n    }\n\n    $scope.event.close = async () => {\n        $(\'#\' + wiz.render_id).modal("hide");\n        let resp = false;\n        wiz.response("modal-show", resp);\n    }\n    */\n\n    // call another wiz\'s event.\n    /*\n    $scope.call_view = async () => {\n        let resp = await wiz.connect("view namespace")\n            .data({\n                title: "Confirm",\n                message: "Are you sure?",\n                btn_close: "Cancel",\n                btn_action: "Confirm",\n                btn_class: "btn-success"\n            })\n            .event("modal-show");\n\n        console.log("[response]", resp);\n    }\n    */\n\n    /*\n    let socket = wiz.socket.get();\n    // let socket = wiz.socket.get(\'app_namespace\');\n    \n    socket.on("connect", function (data) {\n        socket.emit("response", "hello");\n    });\n\n    socket.on("disconnect", function (data) {\n    });\n\n    socket.on("response", function (data) {\n        console.log("response", data);\n    });\n    */\n}\n'
WIZ_API = "def __startup__(framework):\n    # TODO: Setup Access Level, etc.\n    pass\n\ndef status(framework):\n    # build response\n    framework.response.status(200, 'hello')\n    # framework.response.status(200, hello='hello', world='world')\n"
WIZ_PUG = '.container\n    h3= message\n    // {$ wiz.render("app-namespace-1", "view-instance-namespace") $}\n    // {$ wiz.render("app-namespace-2", data=\'hello\') $}\n'
WIZ_SOCKET = '# import datetime\n\n# class Controller:\n#     def __init__(self, wiz):\n#         print("master")\n#         self.cache = wiz.cache\n#         self.room = "public"\n        \n#     def join(self, wiz, data):\n#         wiz.flask_socketio.join_room(self.room, namespace=wiz.socket.namespace)\n#         msg = dict()\n#         msg["type"] = "init"\n#         msg["data"] = self.cache.get("message", [])\n#         wiz.socket.emit("message", msg, to=self.room, broadcast=True)\n\n#     def message(self, wiz, data):\n#         message = data["message"]\n#         user_id = wiz.lib.util.randomstring(6)\n#         msg = dict()\n#         msg["type"] = "message"\n#         msg["user"] = user_id\n#         msg["message"] = message\n#         msg["time"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")\n#         with self.cache.open("message", []) as cache:\n#             try:\n#                 cache[\'message\'].append(msg)\n#                 cache[\'message\'] = cache[\'message\'][-100:]\n#             except:\n#                 cache[\'message\'] = []\n#                 cache[\'message\'].append(msg)\n#                 cache[\'message\'] = cache[\'message\'][-100:]\n\n#         wiz.socket.emit("message", msg, to=self.room)\n    \n#     def connect(self, wiz, data):\n#         pass\n\n#     def disconnect(self, wiz, data):            \n#         msg = dict()\n#         msg["type"] = "users"\n#         wiz.socket.emit("message", msg, to=self.room, broadcast=True)\n'

app_id = framework.request.segment.app_id
if app_id is None:
    framework.response.redirect("apps/list")

if app_id == 'new':
    pkg = dict()
    pkg["id"] = framework.lib.util.randomstring(12) + str(int(time.time()))
    pkg["title"] = "New App"
    pkg["namespace"] = pkg["id"]
    pkg["properties"] = {"html": "pug", "js": "javascript", "css": "scss"}
    pkg["viewuri"] = ""

    info = dict()
    info["package"] = pkg
    info["controller"] = WIZ_CONTROLLER
    info["api"] = WIZ_API
    info["socketio"] = WIZ_SOCKET
    info["html"] = WIZ_PUG
    info["js"] = WIZ_JS
    info["css"] = ""
    info["dic"] = dict()
    info["dic"]["default"] = dict()
    info["dic"]["default"]["hello"] = "hello"
    info["dic"]["ko"] = dict()
    info["dic"]["ko"]["hello"] = "안녕하세요"

    wiz.data.update(info, mode='app')
    framework.response.redirect("apps/editor/" + pkg["id"])

info = wiz.data.get(app_id, mode='app')
if info is None:
    framework.response.redirect("list")

kwargs['IS_DEV'] = wiz.is_dev()
kwargs['BRANCH'] = wiz.workspace.branch()
kwargs['BRANCHES'] = wiz.workspace.branches()
kwargs['CTRLS'] = wiz.controllers()
kwargs['THEMES'] = wiz.themes()
kwargs['CATEGORIES'] = config.get("category")
kwargs['APPID'] = app_id