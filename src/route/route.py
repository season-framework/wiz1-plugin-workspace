segment = framework.match("routes/<view>/<path:path>")
if segment is not None:
    if segment.view is None:
        framework.response.redirect("routes/list")    
    framework.layout('core.theme.layout', navbar=True, monaco=False)
    framework.render("routes/list", "core.workspace.routes.list")

    framework.layout('core.theme.layout', navbar=False, monaco=True)
    framework.render("routes/editor/<app_id>", "core.workspace.routes.editor")

segment = framework.match("apps/<view>/<app_id>/<path:path>")
if segment is not None:
    if segment.view is None:
        framework.response.redirect("apps/list")
    
    framework.layout('core.theme.layout', navbar=True, monaco=False)
    framework.render("apps/list", "core.workspace.apps.list")

    framework.layout('core.theme.layout', navbar=False, monaco=True)
    framework.render("apps/editor/<app_id>", "core.workspace.apps.editor")

    if segment.view == 'preview':
        app_id = segment.app_id
        framework.request.segment = season.stdClass()
        wiz = framework.model('wiz').instance()
        wiz.cache.disable()
        wiz.response.render(app_id)

        framework.response.status(200)

framework.layout('core.theme.layout', navbar=True, monaco=True)
framework.render("res", "core.workspace.resources")
framework.render("ctrls", "core.workspace.controllers")
framework.render("models", "core.workspace.models")
framework.render("config", "core.workspace.config")
framework.render("themes", "core.workspace.themes")

framework.layout('core.theme.layout', navbar=False, monaco=False)
framework.render("logger/<branch>", "core.workspace.logger")

framework.response.redirect("/wiz/admin/workspace/routes/list")