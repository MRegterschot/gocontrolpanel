var Handlebars = require("handlebars/runtime");  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['action-group'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":24,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"main") : depth0),{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":26,"column":0},"end":{"line":28,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":30,"column":0},"end":{"line":46,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\" size=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"add")||(depth0 && lookupProperty(depth0,"add"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":3,"column":40},"end":{"line":3,"column":61}}}),1,{"name":"add","hash":{},"data":data,"loc":{"start":{"line":3,"column":35},"end":{"line":3,"column":64}}}),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":3,"column":23},"end":{"line":3,"column":69}}}))
    + " 5\" z-index=\"10\">\n  <frame size=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"add")||(depth0 && lookupProperty(depth0,"add"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":4,"column":32},"end":{"line":4,"column":53}}}),1,{"name":"add","hash":{},"data":data,"loc":{"start":{"line":4,"column":27},"end":{"line":4,"column":56}}}),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":4,"column":15},"end":{"line":4,"column":61}}}))
    + " 5\" pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":4,"column":82},"end":{"line":4,"column":103}}}),-5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":4,"column":70},"end":{"line":4,"column":109}}}))
    + " 0\">\n    <frame pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":5,"column":28},"end":{"line":5,"column":49}}}),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":5,"column":16},"end":{"line":5,"column":54}}}))
    + " 0\" size=\"5 5\">\n      <quad size=\"5 5\" bgcolor=\"222\" />\n      <label pos=\"2.6 -2.15\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"2.5\" textcolor=\"DDD\" />\n    </frame>\n\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":10,"column":4},"end":{"line":19,"column":13}}})) != null ? stack1 : "")
    + "\n    <quad class=\"trigger\" pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":21,"column":43},"end":{"line":21,"column":64}}}),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":21,"column":31},"end":{"line":21,"column":69}}}))
    + " 0\" z-index=\"2\" size=\"5 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\n  </frame>\n</frame>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <frame pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(data && lookupProperty(data,"index")),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":11,"column":18},"end":{"line":11,"column":41}}}))
    + " 0\" size=\"5 5\">\n        <quad size=\"5 5\" bgcolor=\"DDD\" action=\""
    + alias3(container.lambda((depth0 != null ? lookupProperty(depth0,"action") : depth0), depth0))
    + "\" />\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(lookupProperty(helpers,"eq")||(depth0 && lookupProperty(depth0,"eq"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"type") : depth0),"image",{"name":"eq","hash":{},"data":data,"loc":{"start":{"line":13,"column":14},"end":{"line":13,"column":36}}}),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":13,"column":8},"end":{"line":17,"column":15}}})) != null ? stack1 : "")
    + "      </frame>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <quad image=\""
    + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"icon") : depth0), depth0))
    + "\" size=\"3.5 3.5\" pos=\"0.75 -0.75\" />\n";
},"6":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <label pos=\"2.5 -2.1\" text=\""
    + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"icon") : depth0), depth0))
    + "\" halign=\"center\" valign=\"center\" textsize=\"2\" textcolor=\"222\" />\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare Boolean actionGroupIsOpen = false for This;\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\n  declare Boolean actionGroupIsOpen for This;\n\n  if (actionGroupIsOpen) {\n    AnimMgr.Add(event.Control.Parent, \"\"\"<frame pos='"
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":35,"column":65},"end":{"line":35,"column":86}}}),-5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":35,"column":53},"end":{"line":35,"column":92}}}))
    + " 0' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\n    declare triggerIcon <=> ((event.Control.Parent.Controls[0] as CMlFrame).Controls[1] as CMlLabel);\n    AnimMgr.Add(triggerIcon, \"\"\"<label rot='0' pos='2.6 -2.15' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\n  } else {\n    AnimMgr.Add(event.Control.Parent, \"\"\"<frame pos='0 0' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\n    declare triggerIcon <=> ((event.Control.Parent.Controls[0] as CMlFrame).Controls[1] as CMlLabel);\n    AnimMgr.Add(triggerIcon, \"\"\"<label rot='180' pos='2.25 -2.9' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\n  }\n\n  actionGroupIsOpen = !actionGroupIsOpen;\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":47,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['manialink'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?>\n<?xml-model href=\"https://raw.githubusercontent.com/reaby/manialink-xsd/main/manialink_v3.xsd\" ?>\n<manialink name=\"GCP:"
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":3,"column":21},"end":{"line":3,"column":29}}}) : helper)))
    + "\" id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":3,"column":35},"end":{"line":3,"column":43}}}) : helper)))
    + "\" version=\"3\">\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"content",{"name":"block","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":0},"end":{"line":4,"column":30}}})) != null ? stack1 : "")
    + "\n</manialink>\n";
},"useData":true});
templates['widget'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":52,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : (container.nullContext || {}), alias4=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame id=\"widget\" pos=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"position") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " "
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"position") : depth0)) != null ? lookupProperty(stack1,"y") : stack1), depth0))
    + "\" z-index=\"10\" hidden=\"1\">\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"widget",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":0},"end":{"line":4,"column":29}}})) != null ? stack1 : "")
    + "\n</frame>\n\n<script><!--\n#Include \"MathLib\" as ML\n#Include \"TextLib\" as TL\n#Include \"TimeLib\" as TimeLib\n#Include \"ColorLib\" as CL\n\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"globals",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":13,"column":0},"end":{"line":13,"column":30}}})) != null ? stack1 : "")
    + "\n\ndeclare CMlFrame widget;\n--></script>\n\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"scripts/hide"),depth0,{"name":"scripts/hide","hash":{"target":"widget"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n<script><!--\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"script",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":21,"column":29}}})) != null ? stack1 : "")
    + "\n--></script>\n\n<script><!--\nmain() {\n  widget <=> (Page.MainFrame.GetFirstChild(\"widget\") as CMlFrame);\n  widgetBasePosition = widget.AbsolutePosition_V3;\n\n  sleep(300);\n  widget.Show();\n\n  "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"main",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":32,"column":2},"end":{"line":32,"column":29}}})) != null ? stack1 : "")
    + "\n\n  while (True) {\n    yield;\n\n    foreach(event in PendingEvents){\n      if(event.Control == Null) continue;\n\n      "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"events",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":40,"column":6},"end":{"line":40,"column":35}}})) != null ? stack1 : "")
    + "\n    }\n\n    "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"loop",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":4},"end":{"line":43,"column":31}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias3,(depth0 != null ? lookupProperty(depth0,"hideWhileDriving") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":45,"column":4},"end":{"line":47,"column":11}}})) != null ? stack1 : "")
    + "  }\n}\n\n--></script>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "";
},"5":function(container,depth0,helpers,partials,data) {
    return "      hidescript();\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":53,"column":11}}})) != null ? stack1 : "");
},"usePartial":true,"useData":true});
templates['window'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":40,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4=container.lambda, alias5="function", lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame id=\"window\" pos=\"-"
    + alias3((lookupProperty(helpers,"divide")||(depth0 && lookupProperty(depth0,"divide"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),2,{"name":"divide","hash":{},"data":data,"loc":{"start":{"line":3,"column":25},"end":{"line":3,"column":46}}}))
    + " "
    + alias3((lookupProperty(helpers,"divide")||(depth0 && lookupProperty(depth0,"divide"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"y") : stack1),2,{"name":"divide","hash":{},"data":data,"loc":{"start":{"line":3,"column":47},"end":{"line":3,"column":67}}}))
    + "\" size=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " "
    + alias3((lookupProperty(helpers,"add")||(depth0 && lookupProperty(depth0,"add"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"y") : stack1),5,{"name":"add","hash":{},"data":data,"loc":{"start":{"line":3,"column":88},"end":{"line":3,"column":106}}}))
    + "\" z-index=\"10\">\n  <quad pos=\"0 0\" size=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " 5\" bgcolor=\"222\" />\n  <label pos=\"1.5 -2.25\" text=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias5 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":5,"column":31},"end":{"line":5,"column":42}}}) : helper)))
    + "\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),9.5,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":5,"column":50},"end":{"line":5,"column":75}}}))
    + " 5\" valign=\"center\" halign=\"left\" textsize=\"1\" color=\"DDD\" textfont=\"GameFontSemiBold\" />\n  <label pos=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),1.5,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":6,"column":14},"end":{"line":6,"column":39}}}))
    + " -2.25\" text=\"\" size=\"5 5\" valign=\"center\" halign=\"right\" textsize=\"1\" color=\"222\" action=\"close-window-"
    + alias3(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias5 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":6,"column":144},"end":{"line":6,"column":150}}}) : helper)))
    + "\" focusareacolor2=\"fff0\" />\n\n  <quad pos=\"0 -5\" size=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"y") : stack1), depth0))
    + "\" bgcolor=\"DDD\" />\n  <frame pos=\"0 -5\" size=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"y") : stack1), depth0))
    + "\">\n    "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"window",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":10,"column":4},"end":{"line":10,"column":33}}})) != null ? stack1 : "")
    + "\n  </frame>\n</frame>\n\n<script><!--\n#Include \"MathLib\" as ML\n#Include \"TextLib\" as TL\n#Include \"TimeLib\" as TimeLib\n#Include \"ColorLib\" as CL\n\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"globals",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":0},"end":{"line":20,"column":30}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"script",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":22,"column":0},"end":{"line":22,"column":29}}})) != null ? stack1 : "")
    + "\n\nmain() {\n  "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"main",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":25,"column":2},"end":{"line":25,"column":29}}})) != null ? stack1 : "")
    + "\n\n  while (True) {\n    yield;\n\n    foreach(event in PendingEvents){\n      if(event.Control == Null) continue;\n\n      "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"events",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":6},"end":{"line":33,"column":35}}})) != null ? stack1 : "")
    + "\n    }\n\n    "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"loop",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":36,"column":4},"end":{"line":36,"column":31}}})) != null ? stack1 : "")
    + "\n  }\n}\n--></script>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":41,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['scripts/hide'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script><!--\ndeclare Vec2 widgetBasePosition;\ndeclare CMlFrame HS_Target;\ndeclare Boolean HS_Hidden;\n\nVoid hs_hide(Integer duration) {\n  HS_Hidden = True;\n  declare Real x;\n  if (widgetBasePosition[0] < 0.0) {\n    x = (HS_Target.Size[0] * -HS_Target.RelativeScale) - 322.0;\n  } else {\n    x = 322.0;\n  }\n  AnimMgr.Add(HS_Target, \"<frame pos='\" ^ x ^ \" \" ^ widgetBasePosition[1] ^ \"' />\", duration, CAnimManager::EAnimManagerEasing::ExpInOut);\n}\n\nVoid hs_show(Integer duration) {\n  HS_Hidden = False;\n  AnimMgr.Add(HS_Target, \"<frame pos='\" ^ widgetBasePosition[0] ^ \" \" ^ widgetBasePosition[1] ^ \"' />\", duration, CAnimManager::EAnimManagerEasing::CircOut);\n}\n\nVoid hidescript() {\n  if (HS_Target == Null){\n    HS_Target <=> (Page.MainFrame.GetFirstChild(\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"target") || (depth0 != null ? lookupProperty(depth0,"target") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"target","hash":{},"data":data,"loc":{"start":{"line":24,"column":49},"end":{"line":24,"column":59}}}) : helper)))
    + "\") as CMlFrame);\n  }\n\n  declare hideSpeed = 10;\n\n  if (InputPlayer == Null) {\n    if (HS_Hidden) {\n      hs_show(600);\n    }\n    return;\n  }\n\n  declare Boolean overHidespeed = ML::Abs(InputPlayer.Speed * 3.6) > hideSpeed;\n\n  if (overHidespeed && !HS_Hidden) {\n    hs_hide(1000);\n\n    while(InputPlayer.Speed * 3.6 > hideSpeed){\n      yield;\n      hidescript();\n    }\n  }\n  \n  if (!overHidespeed && HS_Hidden) {\n    sleep(1000);\n    hs_show(600);\n  }\n}\n--></script>";
},"useData":true});
templates['widgets/live-ranking/live-ranking-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":26,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\n#Struct Ranking {\n  Text login;\n  Text name;\n  Integer rank;\n  Integer points;\n}\n\nmain(){\n  declare Ranking[] Rankings for This;\n  declare Text Mode for This;\n  declare Integer PointsLimit for This;\n  declare Integer LastRankingsUpdate for This;\n  declare Text rankingsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"rankingsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":17,"column":33},"end":{"line":17,"column":71}}})) != null ? stack1 : "")
    + "\"\"\";\n\n  Rankings.fromjson(rankingsJson);\n  Mode = \"\"\""
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"mode") : stack1),"rounds",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":20,"column":12},"end":{"line":20,"column":44}}}))
    + "\"\"\";\n  PointsLimit = "
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"pointsLimit") : stack1),-1,{"name":"default","hash":{},"data":data,"loc":{"start":{"line":21,"column":16},"end":{"line":21,"column":49}}}))
    + ";\n  LastRankingsUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":27,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/live-ranking/live-ranking'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":25,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":0},"end":{"line":35,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":0},"end":{"line":107,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":109,"column":0},"end":{"line":118,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":120,"column":0},"end":{"line":125,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":127,"column":0},"end":{"line":135,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Live Ranking\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\n</frame>\n\n<framemodel id=\"ranking\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"5 5\" bgcolor=\"222\"/>\n  <quad pos=\"5 0\" z-index=\"0\" size=\"50 5\" bgcolor=\"DDD\"/>\n  <label pos=\"2.4 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\n  <quad pos=\"6.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\n  <label pos=\"12 -2.25\" z-index=\"0\" size=\"32 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"7.5 5\" text=\"0\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\n\n  <quad class=\"trigger\" pos=\"0 0\" z-index=\"-2\" size=\"55 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\n</framemodel>\n\n<frame id=\"rankings\" pos=\"0 -5.25\" size=\"55 42\">\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":20,"column":15},"end":{"line":20,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":23,"column":10}}})) != null ? stack1 : "")
    + "</frame>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <frameinstance modelid=\"ranking\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":22,"column":42},"end":{"line":22,"column":64}}}))
    + "\" />\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct Ranking {\n  Text login;\n  Text name;\n  Integer rank;\n  Integer points;\n}\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Void updateRankingRow(Integer index, Ranking ranking, Text mode, Integer pointsLimit) {\n  declare rankingsFrame <=> (Page.MainFrame.GetFirstChild(\"rankings\") as CMlFrame);\n\n  if (index >= rankingsFrame.Controls.count) {\n    return;\n  }\n\n  declare rankingFrame <=> (rankingsFrame.Controls[index + 1] as CMlFrame);\n  (rankingFrame.Controls[2] as CMlLabel).SetText(TL::ToText(ranking.rank));\n  (rankingFrame.Controls[3] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ ranking.login ^ \"/country\";\n  (rankingFrame.Controls[4] as CMlLabel).SetText(ranking.name);\n  \n  declare Text pointsText = TL::ToText(ranking.points);\n  if (mode == \"cup\" && pointsLimit > 0) {\n    if (ranking.points > pointsLimit) {\n      pointsText = \"$2C2W\";\n    } else if (ranking.points == pointsLimit) {\n      pointsText = \"$D22F\";\n    }\n  } else if (mode == \"rounds\" && pointsLimit > 0) {\n    if (ranking.points >= pointsLimit) {\n      pointsText = \"$2C2W\";\n    }\n  } else if (mode == \"reversecup\") {\n    if (-2000 < ranking.points && ranking.points <= -1000) {\n      pointsText = \"$D22LC\";\n    } else if (ranking.points <= -2000) {\n      pointsText = \"$D22E\";\n    }\n  }\n\n  (rankingFrame.Controls[5] as CMlLabel).SetText(pointsText);\n  rankingFrame.DataAttributeSet(\"login\", ranking.login);\n  rankingFrame.Show();\n}\n\nVoid updateScroll(Ranking[] rankings) {\n  declare rankingsFrame <=> (Page.MainFrame.GetFirstChild(\"rankings\") as CMlFrame);\n  declare Integer rankingCount = rankings.count;\n  if (rankingCount > rankingsFrame.Controls.count) {\n    rankingCount = rankingsFrame.Controls.count;\n  }\n  declare Real maxY = rankingCount * 5.25 - 42;\n  if (maxY < 0) {\n    maxY = 0.;\n  }\n  rankingsFrame.ScrollMax = <0., maxY>;\n}\n\nVoid updateWidget(Ranking[] rankings, Text mode, Integer pointsLimit) {\n  declare rankingCount = rankings.count;\n  declare index = 0;\n\n  foreach (ranking in rankings) {\n    updateRankingRow(index, ranking, mode, pointsLimit);\n    index = index + 1;\n  }\n\n  declare rankingsFrame <=> (Page.MainFrame.GetFirstChild(\"rankings\") as CMlFrame);\n  // Hide unused rows\n  while (index < rankingsFrame.Controls.count - 1) {\n    declare rankingFrame <=> (rankingsFrame.Controls[index + 1] as CMlFrame);\n    rankingFrame.DataAttributeSet(\"login\", \"\");\n    rankingFrame.Hide();\n    index = index + 1;\n  }\n\n  updateScroll(rankings);\n}\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare Ranking[] Rankings for This;\ndeclare Text Mode for This = \"rounds\";\ndeclare Integer PointsLimit for This = -1;\ndeclare Integer LastRankingsUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\ndeclare rankingsFrame <=> (widget.GetFirstChild(\"rankings\") as CMlFrame);\nrankingsFrame.ScrollActive = True;\nrankingsFrame.ScrollMin = <0., 0.>;\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastRankingsUpdate != lastUpdate) {\n  lastUpdate = LastRankingsUpdate;\n  updateWidget(Rankings, Mode, PointsLimit);\n}\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\n  declare targetLogin = event.Control.Parent.DataAttributeGet(\"login\");\n  if (targetLogin != \"\") {\n    if(!IsSpectatorClient) RequestSpectatorClient(True);\n    SetSpectateTarget(targetLogin);\n  }\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":136,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/live-round/live-round-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":36,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\n#Struct Round {\n  Text login;\n  Text name;\n  Integer rank;\n  Integer points;\n  Integer[] checkpoints;\n  Integer time;\n}\n\n#Struct Finish {\n  Text login;\n  Integer points;\n}\n\nmain(){\n  declare Round[] Rounds for This;\n  declare Finish[] Finishes for This;\n  declare Text Mode for This;\n  declare Integer PointsLimit for This;\n  declare Integer LastRoundsUpdate for This;\n  declare Text roundsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"roundsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":25,"column":31},"end":{"line":25,"column":67}}})) != null ? stack1 : "")
    + "\"\"\";\n  declare Text finishesJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"finishesJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":26,"column":33},"end":{"line":26,"column":71}}})) != null ? stack1 : "")
    + "\"\"\";\n\n  Rounds.fromjson(roundsJson);\n  Finishes.fromjson(finishesJson);\n  Mode = \"\"\""
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"mode") : stack1),"rounds",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":30,"column":12},"end":{"line":30,"column":44}}}))
    + "\"\"\";\n  PointsLimit = "
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"pointsLimit") : stack1),-1,{"name":"default","hash":{},"data":data,"loc":{"start":{"line":31,"column":16},"end":{"line":31,"column":49}}}))
    + ";\n  LastRoundsUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":37,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/live-round/live-round'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":32,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":35,"column":0},"end":{"line":49,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":51,"column":0},"end":{"line":259,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":261,"column":0},"end":{"line":272,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":274,"column":0},"end":{"line":311,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":313,"column":0},"end":{"line":320,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Live Round\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\n</frame>\n\n<framemodel id=\"round\">\n  <quad pos =\"0 0\" z-index=\"0\" size=\"5 5\" bgcolor=\"222\"/>\n  <quad pos=\"5 0\" z-index=\"0\" size=\"35.5 5\" bgcolor=\"DDD\"/>\n  <quad pos=\"40.5 0\" z-index=\"0\" size=\"14.5 5\" bgcolor=\"BBB\"/>\n  <label pos=\"2.4 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\n  <quad pos=\"6.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\n  <label pos=\"12 -2.25\" z-index=\"0\" size=\"25.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\n  <label pos=\"39.75 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\n  <label pos=\"54 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\n  \n  <frame pos=\"47.5 0\" size=\"7 5\" id=\"finish\" z-index=\"-2\">\n    <quad pos=\"0 0\" size=\"7 5\" bgcolor=\"222\" z-index=\"-2\" />\n    <label pos=\"3.5 -2.25\" size=\"6 5\" z-index=\"-1\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" />\n  </frame>\n\n  <quad class=\"trigger\" pos=\"0 0\" z-index=\"-2\" size=\"57 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\n</framemodel>\n\n<frame id=\"rounds\" pos=\"0 -5.25\" size=\"62 42\">\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":27,"column":15},"end":{"line":27,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":0},"end":{"line":30,"column":10}}})) != null ? stack1 : "")
    + "</frame>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frameinstance modelid=\"round\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":29,"column":38},"end":{"line":29,"column":60}}}))
    + "\" />\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct Round {\n  Text login;\n  Text name;\n  Integer rank;\n  Integer points;\n  Integer[] checkpoints;\n  Integer time;\n}\n\n#Struct Finish {\n  Text login;\n  Integer points;\n}\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\n  declare Text secondString;\n  declare Text msString;\n\n  if (time < 0) {\n    return \"--:--.---\";\n  }\n\n  declare Integer seconds = time / 1000;\n  declare Integer minutes = seconds / 60;\n  declare Integer milliseconds = time - (seconds * 1000);\n  seconds = seconds - (minutes * 60);\n\n  secondString = TL::ToText(seconds);\n\n  if (seconds < 10) {\n    secondString = \"0\" ^ secondString;\n  }\n\n  if (milliseconds <= 0) {\n    msString = \"000\";\n  } else if (milliseconds < 10) {\n    msString = \"00\" ^ TL::ToText(milliseconds);\n  } else if (milliseconds < 100) {\n    msString = \"0\" ^ TL::ToText(milliseconds);\n  } else {\n    msString = TL::ToText(milliseconds);\n  }\n\n  if (minutes > 0) {\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\n  } else {\n    return secondString ^ \".\" ^ msString;\n  }\n\n  return \"\";\n}\n\nText getCheckpointDiffText(Round[] rounds, Text login) {\n  declare Round playerRound;\n  \n  foreach (round in rounds) {\n    if (round.login == login) {\n      playerRound = round;\n      break;\n    }\n  }\n\n  if (playerRound.login == \"\") {\n    return \"--:--.---\";\n  }\n\n  // If the player's time is -1, return DNF\n  if (playerRound.time == -1) {\n    return \"DNF\";\n  }\n\n  // If the player has no checkpoints, return --:--.---\n  if (playerRound.checkpoints.count == 0) {\n    return \"--:--.---\";\n  }\n\n  // If the player is rank 1, return their time\n  if (playerRound.rank == 1) {\n    return formatTime(playerRound.time);\n  }\n\n  declare Round firstPlaceRound;\n  foreach (round in rounds) {\n    if (round.rank == 1) {\n      firstPlaceRound = round;\n      break;\n    }\n  }\n  \n  if (firstPlaceRound.login == \"\") {\n    return \"--:--.---\";\n  }\n  \n  // Get the checkpoint difference to the first place player\n  declare Integer checkpointDiff = firstPlaceRound.checkpoints.count - playerRound.checkpoints.count;\n\n  // If the checkpoint difference is 0, return their time difference\n  if (checkpointDiff == 0) {\n    declare Integer timeDiff = playerRound.time - firstPlaceRound.time;\n    return \"+\" ^ formatTime(timeDiff);\n  } else {\n    return \"+\" ^ TL::ToText(checkpointDiff) ^ \" CP\";\n  }\n\n  return \"--:--.---\";\n}\n\nVoid updateRoundRow(Integer index, Round round, Round[] rounds, Text mode, Integer pointsLimit) {\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\n\n  if (index >= roundsFrame.Controls.count) {\n    return;\n  }\n\n  declare roundFrame <=> (roundsFrame.Controls[index + 1] as CMlFrame);\n  (roundFrame.Controls[3] as CMlLabel).SetText(TL::ToText(round.rank));\n  (roundFrame.Controls[4] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ round.login ^ \"/country\";\n  (roundFrame.Controls[5] as CMlLabel).SetText(round.name);\n\n  declare Text pointsText = TL::ToText(round.points);\n  if (mode == \"cup\" && pointsLimit > 0) {\n    if (round.points > pointsLimit) {\n      pointsText = \"$2C2W\";\n    } else if (round.points == pointsLimit) {\n      pointsText = \"$D22F\";\n    }\n  } else if (mode == \"rounds\" && pointsLimit > 0) {\n    if (round.points >= pointsLimit) {\n      pointsText = \"$2C2W\";\n    }\n  } else if (mode == \"reversecup\") {\n    if (-2000 < round.points && round.points <= -1000) {\n      pointsText = \"$D22LC\";\n    } else if (round.points <= -2000) {\n      pointsText = \"$D22E\";\n    }\n  }\n\n  (roundFrame.Controls[6] as CMlLabel).SetText(pointsText);\n  (roundFrame.Controls[7] as CMlLabel).SetText(getCheckpointDiffText(rounds, round.login));\n  roundFrame.DataAttributeSet(\"login\", round.login);\n  roundFrame.Show();\n}\n\nVoid updateFinish(Text login, Integer points, Boolean finished) {\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\n\n  foreach (control in roundsFrame.Controls) {\n    // Skip first control (invisible background quad)\n    if (control == roundsFrame.Controls[0]) {\n      continue;\n    }\n\n    declare roundFrame <=> (control as CMlFrame);\n    declare Text frameLogin = roundFrame.DataAttributeGet(\"login\");\n\n    if (frameLogin == login) {\n      declare frameFinish <=> (roundFrame.GetFirstChild(\"finish\") as CMlFrame);\n\n      AnimMgr.Flush(frameFinish);\n      \n      if (finished) {\n        if (points == 0) {\n          (frameFinish.Controls[1] as CMlLabel).SetText(\"\");\n        } else {\n          declare Text pointsText = \"+\" ^ TL::ToText(points);\n          if (points < 0) {\n            pointsText = \"-\" ^ TL::ToText(-points);\n          }\n          \n          (frameFinish.Controls[1] as CMlLabel).SetText(pointsText);\n        }\n        AnimMgr.Add(frameFinish, \"\"\"<frame pos='55 0' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\n      } else {\n        AnimMgr.Add(frameFinish, \"\"\"<frame pos='47.5 0' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\n      }\n\n      break;\n    }\n  }\n}\n\nVoid clearFinishes(Round[] rounds) {\n  foreach (round in rounds) {\n    updateFinish(round.login, 0, False);\n  }\n}\n\nVoid updateScroll(Round[] rounds) {\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\n  declare Integer roundCount = rounds.count;\n  if (roundCount > roundsFrame.Controls.count) {\n    roundCount = roundsFrame.Controls.count;\n  }\n  declare Real maxY = roundCount * 5.25 - 42;\n  if (maxY < 0) {\n    maxY = 0.;\n  }\n  roundsFrame.ScrollMax = <0., maxY>;\n}\n\nVoid updateWidget(Round[] rounds, Text mode, Integer pointsLimit) {\n  declare roundCount = rounds.count;\n  declare index = 0;\n\n  foreach (round in rounds) {\n    updateRoundRow(index, round, rounds, mode, pointsLimit);\n    index = index + 1;\n  }\n\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\n  // Hide unused rows\n  while (index < roundsFrame.Controls.count - 1) {\n    declare roundFrame <=> (roundsFrame.Controls[index + 1] as CMlFrame);\n    roundFrame.DataAttributeSet(\"login\", \"\");\n    roundFrame.Hide();\n    index = index + 1;\n  }\n\n  updateScroll(rounds);\n}\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare Round[] Rounds for This;\ndeclare Finish[] Finishes for This = [];\ndeclare Text Mode for This = \"rounds\";\ndeclare Integer PointsLimit for This = -1;\ndeclare Integer LastRoundsUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\ndeclare Finish[] prevFinishes = [];\ndeclare roundsFrame <=> (widget.GetFirstChild(\"rounds\") as CMlFrame);\nroundsFrame.ScrollActive = True;\nroundsFrame.ScrollMin = <0., 0.>;\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastRoundsUpdate != lastUpdate) {\n  lastUpdate = LastRoundsUpdate;\n  \n  updateWidget(Rounds, Mode, PointsLimit);\n\n  if (Finishes.count != prevFinishes.count) {\n    if (Finishes.count == 0) {\n      clearFinishes(Rounds);\n    } else {\n      if (Finishes.count > prevFinishes.count) {\n        // Find newly finished players\n        foreach (finish in Finishes) {\n          declare Boolean found = False;\n          foreach (prevFinish in prevFinishes) {\n            if (finish.login == prevFinish.login) {\n              found = True;\n              break;\n            }\n          }\n\n          if (!found) {\n            updateFinish(finish.login, finish.points, True);\n          }\n        }\n      } else {\n        clearFinishes(Rounds);\n        // Re-apply finished players\n        foreach (finish in Finishes) {\n          updateFinish(finish.login, finish.points, True);\n        }\n      }\n    }\n\n    prevFinishes = Finishes;\n  }\n}\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\n  declare targetLogin = event.Control.Parent.DataAttributeGet(\"login\");\n  if (targetLogin != \"\") {\n    SetSpectateTarget(targetLogin);\n  }\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":321,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/map-info/map-info-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":20,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\n#Struct Map {\n  Text name;\n  Text author;\n}\n\nmain(){\n  declare Map MapInfo for This;\n  declare Integer LastMapInfoUpdate for This;\n  declare Text mapJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"mapJson") : stack1),"{}",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":13,"column":28},"end":{"line":13,"column":61}}})) != null ? stack1 : "")
    + "\"\"\";\n\n  MapInfo.fromjson(mapJson);\n  LastMapInfoUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":21,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/map-info/map-info'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":10,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":13,"column":0},"end":{"line":18,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":0},"end":{"line":27,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":29,"column":0},"end":{"line":33,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":36,"column":0},"end":{"line":41,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    return "<frame pos=\"0 0\" id=\"map\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"10 10\" bgcolor=\"222\"/>\n  <quad pos=\"10 0\" z-index=\"0\" size=\"45 10\" bgcolor=\"DDD\"/>\n  <label pos=\"5 -4.75\" z-index=\"0\" size=\"10 10\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"2.5\" textcolor=\"DDD\" textfont=\"GameFontRegular\"/>\n  <label pos=\"12 -5.25\" z-index=\"0\" size=\"41 5\" text=\"-\" textcolor=\"222\" textsize=\"1.75\" textfont=\"GameFontSemiBold\" valign=\"bottom\"/>\n  <label pos=\"11.75 -5.5\" z-index=\"0\" size=\"41 5\" text=\"-\" textcolor=\"222\" textprefix=\"$i\" textfont=\"GameFontRegular\" valign=\"top\" textsize=\"1\"/>\n</frame>\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "#Struct Map {\n  Text name;\n  Text author;\n}\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "Void updateWidget(Map mapInfo) {\n  declare mapFrame <=> (Page.MainFrame.GetFirstChild(\"map\") as CMlFrame);\n\n  (mapFrame.Controls[3] as CMlLabel).SetText(mapInfo.name);\n  (mapFrame.Controls[4] as CMlLabel).SetText(mapInfo.author);\n}\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare Map MapInfo for This;\ndeclare Integer LastMapInfoUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "if (LastMapInfoUpdate != lastUpdate) {\n  lastUpdate = LastMapInfoUpdate;\n  updateWidget(MapInfo);\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":42,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/notify-admin/notify-admin'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":10,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\" id=\"notify-admin\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"36 8\" bgcolor=\"DDD\"/>\n  <quad pos=\"0 -8\" z-index=\"0\" size=\"36 0.5\" bgcolor=\"222\"/>\n  <label pos=\"18 -3.75\" z-index=\"0\" size=\"36 8\" text=\"Notify Admin\" halign=\"center\" valign=\"center\" textsize=\"2\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\n\n  <quad pos=\"0 0\" size=\"36 8.5\" z-index=\"-2\" scriptevents=\"1\" bgcolor=\"fff\" opacity=\"0\" action=\""
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"notifyAdminAction") : stack1), depth0))
    + "\" />\n</frame>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":11,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/player-info/player-info-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":24,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\n#Struct PlayerInfo {\n  Text login;\n  Text name;\n  Integer personalBest;\n  Integer localRecord;\n  Text device;\n  Text camera;\n}\n\nmain(){\n  declare PlayerInfo[] PlayerInfos for This;\n  declare Integer LastPlayerInfosUpdate for This;\n  declare Text playerInfosJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"playerInfosJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":17,"column":36},"end":{"line":17,"column":77}}})) != null ? stack1 : "")
    + "\"\"\";\n\n  PlayerInfos.fromjson(playerInfosJson);\n  LastPlayerInfosUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":25,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/player-info/player-info'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":40,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":0},"end":{"line":52,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":54,"column":0},"end":{"line":129,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":131,"column":0},"end":{"line":138,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":141,"column":0},"end":{"line":165,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    return "<frame pos=\"0 0\" id=\"player-info-container\" hidden=\"1\">\n  <frame pos=\"0 0\" id=\"player-name\">\n    <quad pos=\"0 0\" z-index=\"0\" size=\"7 7\" bgcolor=\"222\"/>\n    <quad pos=\"7 0\" z-index=\"0\" size=\"48 7\" bgcolor=\"DDD\"/>\n    <quad pos=\"3.5 -3.5\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"222\" image=\"file://Media/Flags/WOR.dds\" halign=\"center\" valign=\"center\" />\n    <label pos=\"8.5 -3.25\" z-index=\"0\" size=\"47 7\" text=\"\" valign=\"center\" textcolor=\"222\" textsize=\"2\" textfont=\"GameFontSemiBold\"/>\n  </frame>\n\n  <frame pos=\"0 -8\" id=\"player-info-title\">\n    <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\n    <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Player Info\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\n  </frame>\n\n  <frame pos=\"0 -13.25\" id=\"records-info\">\n    <quad pos=\"0 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\n    <quad pos=\"8 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\n    <label pos=\"4 -3.75\" z-index=\"0\" size=\"8 8\" text=\"PB\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\n    <label pos=\"17.75 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"--:--.---\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\n\n    <quad pos=\"27.5 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\n    <quad pos=\"35.5 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\n    <label pos=\"31.5 -3.75\" z-index=\"0\" size=\"8 8\" text=\"LR\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\n    <label pos=\"45.25 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"--:--.---\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\n  </frame>\n\n  <frame pos=\"0 -21.5\" id=\"other-info\">\n    <quad pos=\"0 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\n    <quad pos=\"8 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\n    <label pos=\"4 -3.75\" z-index=\"0\" size=\"8 8\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\n    <label pos=\"17.75 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\n\n    <quad pos=\"27.5 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\n    <quad pos=\"35.5 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\n    <label pos=\"31.5 -3.75\" z-index=\"0\" size=\"8 8\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\n    <label pos=\"45.25 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\n  </frame>\n</frame>\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "#Struct PlayerInfo {\n  Text login;\n  Text name;\n  Integer personalBest;\n  Integer localRecord;\n  Text device;\n  Text camera;\n}\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\n  declare Text secondString;\n  declare Text msString;\n\n  if (time <= 0) {\n    return \"--:--.---\";\n  }\n\n  declare Integer seconds = time / 1000;\n  declare Integer minutes = seconds / 60;\n  declare Integer milliseconds = time - (seconds * 1000);\n  seconds = seconds - (minutes * 60);\n\n  secondString = TL::ToText(seconds);\n\n  if (seconds < 10) {\n    secondString = \"0\" ^ secondString;\n  }\n\n  if (milliseconds <= 0) {\n    msString = \"000\";\n  } else if (milliseconds < 10) {\n    msString = \"00\" ^ TL::ToText(milliseconds);\n  } else if (milliseconds < 100) {\n    msString = \"0\" ^ TL::ToText(milliseconds);\n  } else {\n    msString = TL::ToText(milliseconds);\n  }\n\n  if (minutes > 0) {\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\n  } else {\n    return secondString ^ \".\" ^ msString;\n  }\n\n  return \"\";\n}\n\nVoid updateWidget(PlayerInfo[] playerInfos, Text spectatorTargetLogin, Text spectatorTargetName, Text playerLogin) {\n  declare playerInfoContainerFrame <=> (Page.MainFrame.GetFirstChild(\"player-info-container\") as CMlFrame);\n\n  if (spectatorTargetLogin == \"\" || spectatorTargetLogin == playerLogin) {\n    playerInfoContainerFrame.Hide();\n    return;\n  }\n\n  foreach (playerInfo in playerInfos) {\n    if (playerInfo.login != spectatorTargetLogin) {\n      continue;\n    }\n\n    declare playerNameFrame <=> (playerInfoContainerFrame.GetFirstChild(\"player-name\") as CMlFrame);\n    declare playerInfoTitleFrame <=> (playerInfoContainerFrame.GetFirstChild(\"player-info-title\") as CMlFrame);\n    declare recordsInfoFrame <=> (playerInfoContainerFrame.GetFirstChild(\"records-info\") as CMlFrame);\n    declare otherInfoFrame <=> (playerInfoContainerFrame.GetFirstChild(\"other-info\") as CMlFrame);\n\n    // Update Player Info\n    (playerNameFrame.Controls[2] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ spectatorTargetLogin ^ \"/country\";\n    (playerNameFrame.Controls[3] as CMlLabel).SetText(spectatorTargetName);\n\n    // Update Records Info\n    (recordsInfoFrame.Controls[3] as CMlLabel).SetText(formatTime(playerInfo.personalBest));\n    (recordsInfoFrame.Controls[7] as CMlLabel).SetText(formatTime(playerInfo.localRecord));\n\n    // Update Other Info\n    (otherInfoFrame.Controls[3] as CMlLabel).SetText(playerInfo.device);\n    (otherInfoFrame.Controls[7] as CMlLabel).SetText(playerInfo.camera);\n\n    playerInfoContainerFrame.Show();\n\n    break;\n  }\n\n}\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare PlayerInfo[] PlayerInfos for This;\ndeclare Integer LastPlayerInfosUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\ndeclare Text spectatorTargetLogin = \"\";\ndeclare Text spectatorTargetName = \"\";\ndeclare Text playerLogin = \"\";\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "if (playerLogin == \"\" && InputPlayer != Null) {\n  playerLogin = InputPlayer.User.Login;\n  updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\n}\n\nif (LastPlayerInfosUpdate != lastUpdate) {\n  lastUpdate = LastPlayerInfosUpdate;\n  updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\n}\n\nif (GUIPlayer != Null) {\n  if (spectatorTargetLogin != GUIPlayer.User.Login) {\n    spectatorTargetLogin = GUIPlayer.User.Login;\n    spectatorTargetName = GUIPlayer.User.Name;\n    updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\n  }\n} else {\n  if (spectatorTargetLogin != \"\") {\n    spectatorTargetLogin = \"\";\n    spectatorTargetName = \"\";\n    updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\n  }\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":166,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/records-info/records-info-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":25,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\n#Struct RecordInfo {\n  Integer time;\n  Text nickName;\n}\n\n#Struct RecordsInfo {\n  RecordInfo worldRecord;\n  RecordInfo localRecord;\n}\n\nmain(){\n  declare RecordsInfo RecordsInfos for This;\n  declare Integer LastRecordsInfosUpdate for This;\n  declare Text recordsInfoJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"recordsInfoJson") : stack1),"{}",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":18,"column":36},"end":{"line":18,"column":77}}})) != null ? stack1 : "")
    + "\"\"\";\n\n  RecordsInfos.fromjson(recordsInfoJson);\n  LastRecordsInfosUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":26,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/records-info/records-info'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":18,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":31,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":0},"end":{"line":90,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":92,"column":0},"end":{"line":96,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":99,"column":0},"end":{"line":104,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    return "<frame pos=\"0 0\" id=\"world-record\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"10 5\" bgcolor=\"222\"/>\n  <quad pos=\"10 0\" z-index=\"0\" size=\"45 5\" bgcolor=\"DDD\"/>\n  <label pos=\"5 -2.25\" z-index=\"0\" size=\"10 5\" text=\"WR\" halign=\"center\" valign=\"center\" textsize=\"1\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\n  <label pos=\"11.5 -2.25\" z-index=\"0\" size=\"32.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontRegular\" valign=\"center\" textprefix=\"$i\"/>\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontSemiBold\"/>\n</frame>\n\n<frame pos=\"0 -5.25\" id=\"local-record\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"10 5\" bgcolor=\"222\"/>\n  <quad pos=\"10 0\" z-index=\"0\" size=\"45 5\" bgcolor=\"DDD\"/>\n  <label pos=\"5 -2.25\" z-index=\"0\" size=\"10 5\" text=\"LR\" halign=\"center\" valign=\"center\" textsize=\"1\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\n  <label pos=\"11.5 -2.25\" z-index=\"0\" size=\"32.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontRegular\" valign=\"center\" textprefix=\"$i\"/>\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontSemiBold\"/>\n</frame>\n";
},"4":function(container,depth0,helpers,partials,data) {
    return " #Struct RecordInfo {\n  Integer time;\n  Text nickName;\n}\n\n#Struct RecordsInfo {\n  RecordInfo worldRecord;\n  RecordInfo localRecord;\n}\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\n  declare Text secondString;\n  declare Text msString;\n\n  if (time <= 0) {\n    return \"--:--.---\";\n  }\n\n  declare Integer seconds = time / 1000;\n  declare Integer minutes = seconds / 60;\n  declare Integer milliseconds = time - (seconds * 1000);\n  seconds = seconds - (minutes * 60);\n\n  secondString = TL::ToText(seconds);\n\n  if (seconds < 10) {\n    secondString = \"0\" ^ secondString;\n  }\n\n  if (milliseconds <= 0) {\n    msString = \"000\";\n  } else if (milliseconds < 10) {\n    msString = \"00\" ^ TL::ToText(milliseconds);\n  } else if (milliseconds < 100) {\n    msString = \"0\" ^ TL::ToText(milliseconds);\n  } else {\n    msString = TL::ToText(milliseconds);\n  }\n\n  if (minutes > 0) {\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\n  } else {\n    return secondString ^ \".\" ^ msString;\n  }\n\n  return \"\";\n}\n\nVoid updateWidget(RecordsInfo recordsInfo) {\n  declare worldRecordFrame <=> (Page.MainFrame.GetFirstChild(\"world-record\") as CMlFrame);\n  declare localRecordFrame <=> (Page.MainFrame.GetFirstChild(\"local-record\") as CMlFrame);\n\n  // Update World Record\n  declare Text wrName = recordsInfo.worldRecord.nickName;\n  declare Integer wrTime = recordsInfo.worldRecord.time;\n\n  (worldRecordFrame.Controls[3] as CMlLabel).SetText(wrName);\n  (worldRecordFrame.Controls[4] as CMlLabel).SetText(formatTime(wrTime));\n\n  // Update Local Record\n  declare Text lrName = recordsInfo.localRecord.nickName;\n  declare Integer lrTime = recordsInfo.localRecord.time;\n\n  (localRecordFrame.Controls[3] as CMlLabel).SetText(lrName);\n  (localRecordFrame.Controls[4] as CMlLabel).SetText(formatTime(lrTime));\n}\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare RecordsInfo RecordsInfos for This;\ndeclare Integer LastRecordsInfosUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "if (LastRecordsInfosUpdate != lastUpdate) {\n  lastUpdate = LastRecordsInfosUpdate;\n  updateWidget(RecordsInfos);\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":105,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/ta-active-runs/ta-active-runs-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":22,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\n#Struct ActiveRun {\n  Text login;\n  Text name;\n  Integer time;\n  Integer checkpoint;\n}\n\nmain(){\n  declare ActiveRun[] ActiveRuns for This;\n  declare Integer LastActiveRunsUpdate for This;\n  declare Text activeRunsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"activeRunsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":15,"column":35},"end":{"line":15,"column":75}}})) != null ? stack1 : "")
    + "\"\"\";\n\n  ActiveRuns.fromjson(activeRunsJson);\n  LastActiveRunsUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":23,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/ta-active-runs/ta-active-runs'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":25,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":0},"end":{"line":35,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":0},"end":{"line":131,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":133,"column":0},"end":{"line":140,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":143,"column":0},"end":{"line":148,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":150,"column":0},"end":{"line":157,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Active Runs\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\n</frame>\n\n<framemodel id=\"active-run\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"40.5 5\" bgcolor=\"DDD\"/>\n  <quad pos=\"40.5 0\" z-index=\"0\" size=\"14.5 5\" bgcolor=\"BBB\"/>\n  <quad pos=\"1.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\n  <label pos=\"7 -2.25\" z-index=\"0\" size=\"30.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\n  <label pos=\"39.75 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontRegular\" valign=\"center\"/>\n  <label pos=\"54 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\n  \n  <quad class=\"trigger\" pos=\"0 0\" z-index=\"-2\" size=\"55 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\n</framemodel>\n\n<frame id=\"active-runs\" pos=\"0 -5.25\" size=\"55 42\">\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":20,"column":15},"end":{"line":20,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":23,"column":10}}})) != null ? stack1 : "")
    + "</frame>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frameinstance modelid=\"active-run\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":22,"column":43},"end":{"line":22,"column":65}}}))
    + "\" />\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct ActiveRun {\n  Text login;\n  Text name;\n  Integer time;\n  Integer checkpoint;\n}\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\n  declare Text secondString;\n  declare Text msString;\n\n  if (time <= 0) {\n    return \"--:--.---\";\n  }\n\n  declare Integer seconds = time / 1000;\n  declare Integer minutes = seconds / 60;\n  declare Integer milliseconds = time - (seconds * 1000);\n  seconds = seconds - (minutes * 60);\n\n  secondString = TL::ToText(seconds);\n\n  if (seconds < 10) {\n    secondString = \"0\" ^ secondString;\n  }\n\n  if (milliseconds <= 0) {\n    msString = \"000\";\n  } else if (milliseconds < 10) {\n    msString = \"00\" ^ TL::ToText(milliseconds);\n  } else if (milliseconds < 100) {\n    msString = \"0\" ^ TL::ToText(milliseconds);\n  } else {\n    msString = TL::ToText(milliseconds);\n  }\n\n  if (minutes > 0) {\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\n  } else {\n    return secondString ^ \".\" ^ msString;\n  }\n\n  return \"\";\n}\n\nVoid updateActiveRunRow(Integer index, ActiveRun activeRun) {\n  declare activeRunsFrame <=> (Page.MainFrame.GetFirstChild(\"active-runs\") as CMlFrame);\n\n  if (index >= activeRunsFrame.Controls.count) {\n    return;\n  }\n\n  declare activeRunFrame <=> (activeRunsFrame.Controls[index + 1] as CMlFrame);\n  (activeRunFrame.Controls[2] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ activeRun.login ^ \"/country\";\n  (activeRunFrame.Controls[3] as CMlLabel).SetText(activeRun.name);\n  declare Text checkpointText = \"0\";\n  if (activeRun.checkpoint == -69) {\n    checkpointText = \"\";\n  } else {\n    checkpointText = TL::ToText(activeRun.checkpoint);\n  }\n  (activeRunFrame.Controls[4] as CMlLabel).SetText(checkpointText);\n  (activeRunFrame.Controls[5] as CMlLabel).SetText(formatTime(activeRun.time));\n  activeRunFrame.DataAttributeSet(\"login\", activeRun.login);\n  activeRunFrame.Show();\n}\n\nVoid updateScroll(ActiveRun[] activeRuns) {\n  declare activeRunsFrame <=> (Page.MainFrame.GetFirstChild(\"active-runs\") as CMlFrame);\n  declare Integer activeRunCount = activeRuns.count;\n  if (activeRunCount > activeRunsFrame.Controls.count) {\n    activeRunCount = activeRunsFrame.Controls.count;\n  }\n  declare Real maxY = activeRunCount * 5.25 - 42;\n  if (maxY < 0) {\n    maxY = 0.;\n  }\n  activeRunsFrame.ScrollMax = <0., maxY>;\n}\n\nVoid updateWidget(ActiveRun[] activeRuns) {\n  declare activeRunCount = activeRuns.count;\n  declare index = 0;\n\n  foreach (activeRun in activeRuns) {\n    updateActiveRunRow(index, activeRun);\n    index = index + 1;\n  }\n\n  declare activeRunsFrame <=> (Page.MainFrame.GetFirstChild(\"active-runs\") as CMlFrame);\n  // Hide unused rows\n  while (index < activeRunsFrame.Controls.count - 1) {\n    declare activeRunFrame <=> (activeRunsFrame.Controls[index + 1] as CMlFrame);\n    activeRunFrame.DataAttributeSet(\"login\", \"\");\n    activeRunFrame.Hide();\n    index = index + 1;\n  }\n\n  updateScroll(activeRuns);\n}\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare ActiveRun[] ActiveRuns for This;\ndeclare Integer LastActiveRunsUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\ndeclare activeRunsFrame <=> (widget.GetFirstChild(\"active-runs\") as CMlFrame);\nactiveRunsFrame.ScrollActive = True;\nactiveRunsFrame.ScrollMin = <0., 0.>;\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastActiveRunsUpdate != lastUpdate) {\n  lastUpdate = LastActiveRunsUpdate;\n  updateWidget(ActiveRuns);\n}\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\n  declare targetLogin = event.Control.Parent.DataAttributeGet(\"login\");\n  if (targetLogin != \"\") {\n    SetSpectateTarget(targetLogin);\n  }\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":158,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/ta-leaderboard/ta-leaderboard-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":22,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\n#Struct Record {\n  Integer rank;\n  Integer time;\n  Text name;\n  Text login;\n}\n\nmain(){\n  declare Record[] Records for This;\n  declare Integer LastRecordsUpdate for This;\n  declare Text recordsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"recordsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":15,"column":32},"end":{"line":15,"column":69}}})) != null ? stack1 : "")
    + "\"\"\";\n\n  Records.fromjson(recordsJson);\n  LastRecordsUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":23,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['widgets/ta-leaderboard/ta-leaderboard'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":28,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":31,"column":0},"end":{"line":43,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":45,"column":0},"end":{"line":193,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":195,"column":0},"end":{"line":203,"column":12}}})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":206,"column":0},"end":{"line":219,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Leaderboard\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\n</frame>\n\n<framemodel id=\"record\">\n  <quad pos=\"0 0\" z-index=\"0\" size=\"5 5\" bgcolor=\"222\"/>\n  <quad pos=\"5 0\" z-index=\"0\" size=\"50 5\" bgcolor=\"DDD\"/>\n  <label pos=\"2.4 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\n  <quad pos=\"6.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\n  <label pos=\"12 -2.25\" z-index=\"0\" size=\"27 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\n\n  <frame pos=\"56 0\" size=\"14.5 5\" z-index=\"2\" id=\"personalBest\">\n    <quad pos=\"0 0\" size=\"14.5 5\" bgcolor=\"22D\" z-index=\"2\" />\n    <label pos=\"7.25 -2.25\" size=\"14.5 5\" text=\"-00.000\" z-index=\"2\" halign=\"center\" valign=\"center\" textsize=\"1\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\n  </frame>\n</framemodel>\n\n<frame id=\"records\" pos=\"0 -5.25\" size=\"55 42\">\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":23,"column":15},"end":{"line":23,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":24,"column":0},"end":{"line":26,"column":10}}})) != null ? stack1 : "")
    + "</frame>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frameinstance modelid=\"record\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":25,"column":39},"end":{"line":25,"column":61}}}))
    + "\" />\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct Record {\n  Integer rank;\n  Integer time;\n  Text name;\n  Text login;\n}\n\n#Struct PersonalBest {\n  Text login;\n  Integer timeDiff;\n}\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\n  declare Text secondString;\n  declare Text msString;\n\n  if (time <= 0) {\n    return \"--:--.---\";\n  }\n\n  declare Integer seconds = time / 1000;\n  declare Integer minutes = seconds / 60;\n  declare Integer milliseconds = time - (seconds * 1000);\n  seconds = seconds - (minutes * 60);\n\n  secondString = TL::ToText(seconds);\n\n  if (seconds < 10) {\n    secondString = \"0\" ^ secondString;\n  }\n\n  if (milliseconds <= 0) {\n    msString = \"000\";\n  } else if (milliseconds < 10) {\n    msString = \"00\" ^ TL::ToText(milliseconds);\n  } else if (milliseconds < 100) {\n    msString = \"0\" ^ TL::ToText(milliseconds);\n  } else {\n    msString = TL::ToText(milliseconds);\n  }\n\n  if (minutes > 0) {\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\n  } else {\n    return secondString ^ \".\" ^ msString;\n  }\n\n  return \"\";\n}\n\nPersonalBest[] getPersonalBests(Record[] previousRecords, Record[] currentRecords) {\n  declare PersonalBest[] personalBests = [];\n\n  foreach (prevRecord in previousRecords) {\n    foreach (currRecord in currentRecords) {\n      if (currRecord.time <= 0) {\n        // Skip invalid times\n        continue;\n      }\n\n      if (prevRecord.login == currRecord.login) {\n        if (currRecord.time < prevRecord.time) {\n          personalBests.add(PersonalBest{\n            login = currRecord.login,\n            timeDiff = prevRecord.time - currRecord.time\n          });\n        }\n        break;\n      }\n    }\n  }\n\n  return personalBests;\n}\n\nVoid updateRecordRow(Integer index, Record record) {\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\n\n  if (index >= recordsFrame.Controls.count) {\n    return;\n  }\n\n  declare recordFrame <=> (recordsFrame.Controls[index + 1] as CMlFrame);\n  (recordFrame.Controls[2] as CMlLabel).SetText(TL::ToText(record.rank));\n  (recordFrame.Controls[3] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ record.login ^ \"/country\";\n  (recordFrame.Controls[4] as CMlLabel).SetText(record.name);\n  (recordFrame.Controls[5] as CMlLabel).SetText(formatTime(record.time));\n  recordFrame.DataAttributeSet(\"login\", record.login);\n  recordFrame.Show();\n}\n\nVoid updateScroll(Record[] records) {\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\n  declare Integer recordCount = records.count;\n  if (recordCount > recordsFrame.Controls.count) {\n    recordCount = recordsFrame.Controls.count;\n  }\n  declare Real maxY = recordCount * 5.25 - 42;\n  if (maxY < 0) {\n    maxY = 0.;\n  }\n  recordsFrame.ScrollMax = <0., maxY>;\n}\n\nVoid updateWidget(Record[] records) {\n  declare recordCount = records.count;\n  declare index = 0;\n\n  foreach (record in records) {\n    updateRecordRow(index, record);\n    index = index + 1;\n  }\n\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\n  // Hide unused rows\n  while (index < recordsFrame.Controls.count - 1) {\n    declare recordFrame <=> (recordsFrame.Controls[index + 1] as CMlFrame);\n    recordFrame.DataAttributeSet(\"login\", \"\");\n    recordFrame.Hide();\n    index = index + 1;\n  }\n\n  updateScroll(records);\n}\n\nVoid updatePersonalBest(PersonalBest pb) {\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\n\n  foreach (control in recordsFrame.Controls) {\n    // Skip first control (invisible background quad)\n    if (control == recordsFrame.Controls[0]) {\n      continue;\n    }\n\n    declare recordFrame <=> (control as CMlFrame);\n    declare Text login = recordFrame.DataAttributeGet(\"login\");\n\n    if (login == pb.login) {\n      declare CMlFrame personalBestFrame <=> (recordFrame.GetFirstChild(\"personalBest\") as CMlFrame);\n      declare CMlLabel personalBestLabel = personalBestFrame.Controls[1] as CMlLabel;\n\n      // Update personal best label\n      personalBestLabel.SetText(\"-\" ^ formatTime(pb.timeDiff));\n\n      AnimMgr.Flush(personalBestFrame); // Clear any ongoing animations\n\n      // Start animation\n      AnimMgr.Add(personalBestFrame, \"\"\"<frame pos='\"\"\" ^ \"40.5 0\" ^ \"\"\"' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\n      \n      // Hold position while not blocking code\n      AnimMgr.AddChain(personalBestFrame, \"\"\"<frame pos='\"\"\" ^ \"40.5 0\" ^ \"\"\"' />\"\"\", 3000, CAnimManager::EAnimManagerEasing::ExpInOut);\n\n      // Hide animation\n      AnimMgr.AddChain(personalBestFrame, \"\"\"<frame pos='\"\"\" ^ \"56 0\" ^ \"\"\"' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\n\n      break;\n    }\n  }\n}\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare Record[] Records for This;\ndeclare Record[] lastRecords = [];\ndeclare Integer LastRecordsUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\ndeclare recordsFrame <=> (widget.GetFirstChild(\"records\") as CMlFrame);\nrecordsFrame.ScrollActive = True;\nrecordsFrame.ScrollMin = <0., 0.>;\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastRecordsUpdate != lastUpdate) {\n  lastUpdate = LastRecordsUpdate;\n\n  declare PersonalBest[] personalBests = getPersonalBests(lastRecords, Records);\n  lastRecords = Records;\n\n  updateWidget(Records);\n  \n  foreach (pb in personalBests) {\n    updatePersonalBest(pb);\n  }\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"widget",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":220,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['windows/ecm/ecm-window-update'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"content",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":20,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4=container.lambda, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<script>\n<!--\nmain(){\n  declare Boolean ECMIsEditor for This;\n  declare Text ECMAPIKey for This;\n  declare Boolean ECMIsRecording for This;\n  declare Integer ECMCurrentRound for This;\n  declare Integer LastECMUpdate for This;\n  \n  ECMIsEditor = "
    + alias3((lookupProperty(helpers,"bool")||(depth0 && lookupProperty(depth0,"bool"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isEditor") : stack1),{"name":"bool","hash":{},"data":data,"loc":{"start":{"line":12,"column":16},"end":{"line":12,"column":40}}}))
    + ";\n  ECMAPIKey = \""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"apiKey") : stack1), depth0))
    + "\";\n  ECMIsRecording = "
    + alias3((lookupProperty(helpers,"bool")||(depth0 && lookupProperty(depth0,"bool"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"bool","hash":{},"data":data,"loc":{"start":{"line":14,"column":19},"end":{"line":14,"column":46}}}))
    + ";\n  ECMCurrentRound = "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"currentRound") : stack1), depth0))
    + ";\n  LastECMUpdate = GameTime;\n}\n-->\n</script>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"manialink",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":21,"column":11}}})) != null ? stack1 : "");
},"useData":true});
templates['windows/ecm/ecm-window'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"window",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":53,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":55,"column":0},"end":{"line":125,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":127,"column":0},"end":{"line":134,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":136,"column":0},"end":{"line":141,"column":12}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(21, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":143,"column":0},"end":{"line":170,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4=container.lambda, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"2 -2\" id=\"ecm-window\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":3,"column":40},"end":{"line":3,"column":63}}}))
    + " "
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"y") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":3,"column":64},"end":{"line":3,"column":87}}}))
    + "\" hidden=\"1\">\n  <frame id=\"recording-status\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":4,"column":37},"end":{"line":4,"column":60}}}))
    + " 5\">\n    <label text=\"\" pos=\"0 -2.25\" textcolor=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(5, data, 0),"data":data,"loc":{"start":{"line":5,"column":45},"end":{"line":5,"column":90}}})) != null ? stack1 : "")
    + "\" textsize=\"1\" valign=\"center\" />\n    <label text=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.program(9, data, 0),"data":data,"loc":{"start":{"line":6,"column":17},"end":{"line":6,"column":78}}})) != null ? stack1 : "")
    + "\" pos=\"3.5 -2.25\" size=\"20 5\" textsize=\"1\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontRegular\" />\n\n    <frame id=\"toggle-recording\" pos=\"25 0\" size=\"25 5\">\n      <quad pos=\"0 0\" size=\"25 5\" bgcolor=\"CCC\" action=\"ecm-toggle-recording\" />\n      <quad pos=\"0 -4.75\" size=\"25 0.25\" bgcolor=\"222\" />\n      <label pos=\"12.5 -2.25\" text=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.program(13, data, 0),"data":data,"loc":{"start":{"line":11,"column":36},"end":{"line":11,"column":84}}})) != null ? stack1 : "")
    + " recording\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\n    </frame>\n  </frame>\n\n  <frame id=\"api-key-frame\" pos=\"0 -6\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":15,"column":45},"end":{"line":15,"column":68}}}))
    + " 12.25\">\n    <label text=\"API Key\" pos=\"0 -2.25\" size=\"25 3\" textsize=\"0.6\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontSemiBold\" />\n    <frame id=\"input-frame\" pos=\"0 -4.5\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":17,"column":47},"end":{"line":17,"column":70}}}))
    + " 7.75\">\n      <quad pos=\"0 -4.75\" size=\"37 0.25\" bgcolor=\"222\" />\n      <entry pos=\"0 -2.25\" default=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"apiKey") : stack1), depth0))
    + "\" size=\"32 5\" name=\"ecm-api-key-entry\" id=\"ecm-api-key-entry\" class=\"ecm-api-key-entry\" textsize=\"1\" focusareacolor1=\"CCC\" focusareacolor2=\"CCC\" textcolor=\"222\" scriptevents=\"1\" textformat=\"Password\" valuetype=\"Ml_String\" valign=\"center\" textfont=\"GameFontRegular\" />\n      <label pos=\"34.5 -2.25\" size=\"5 5\" text=\"\" textcolor=\"222\" focusareacolor1=\"CCC\" focusareacolor2=\"CCC\" halign=\"center\" valign=\"center\" textsize=\"1\" scriptevents=\"1\" class=\"ecm-api-key-entry-toggle\" />\n\n      <frame id=\"save-api-key\" pos=\"38 0\" size=\"12 5\">\n        <quad pos=\"0 0\" size=\"12 5\" bgcolor=\"CCC\" action=\"ecm-save-api-key\" />\n        <quad pos=\"0 -4.75\" size=\"12 0.25\" bgcolor=\"222\" />\n        <label pos=\"6 -2.25\" text=\"Save\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\n      </frame>\n\n      <label id=\"error-label\" pos=\"0 -6.25\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":28,"column":50},"end":{"line":28,"column":73}}}))
    + " 3\" textsize=\"0.6\" textcolor=\"D22\" valign=\"center\" textfont=\"GameFontRegular\" />\n    </frame>\n  </frame>\n\n  <frame id=\"round-info-frame\" pos=\"0 -19\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":32,"column":49},"end":{"line":32,"column":72}}}))
    + " 9.5\">\n    <label text=\"Round info\" pos=\"0 -2.25\" size=\"25 3\" textsize=\"0.6\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontSemiBold\" />\n    <frame id=\"round-info\" pos=\"0 -4.5\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":34,"column":46},"end":{"line":34,"column":69}}}))
    + " 5\">\n      <label text=\"Round "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"currentRound") : stack1), depth0))
    + "\" pos=\"0 -2.25\" size=\"12 5\" textsize=\"1\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontRegular\" />\n\n      <frame id=\"round-controls\">\n        <frame id=\"decrease-round-offset\" pos=\"14 0\" size=\"5 5\">\n          <quad pos=\"0 0\" size=\"5 5\" bgcolor=\"CCC\" action=\"ecm-decrease-round-offset\" />\n          <quad pos=\"0 -4.75\" size=\"5 0.25\" bgcolor=\"222\" />\n          <label pos=\"2.5 -2.25\" text=\"-\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\n        </frame>\n\n        <frame id=\"increase-round-offset\" pos=\"20 0\" size=\"5 5\">\n          <quad pos=\"0 0\" size=\"5 5\" bgcolor=\"CCC\" action=\"ecm-increase-round-offset\" />\n          <quad pos=\"0 -4.75\" size=\"5 0.25\" bgcolor=\"222\" />\n          <label pos=\"2.5 -2.25\" text=\"+\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\n        </frame>\n      </frame>\n    </frame>\n  </frame>\n</frame>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "2D2";
},"5":function(container,depth0,helpers,partials,data) {
    return "D22";
},"7":function(container,depth0,helpers,partials,data) {
    return "Recording";
},"9":function(container,depth0,helpers,partials,data) {
    return "Not Recording";
},"11":function(container,depth0,helpers,partials,data) {
    return "Stop";
},"13":function(container,depth0,helpers,partials,data) {
    return "Start";
},"15":function(container,depth0,helpers,partials,data) {
    return "Void updateIsEditor(Boolean isEditor) {\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\n  declare toggleRecordingFrame <=> ((window.GetFirstChild(\"recording-status\") as CMlFrame).GetFirstChild(\"toggle-recording\") as CMlFrame);\n  declare apiKeyFrame <=> (window.GetFirstChild(\"api-key-frame\") as CMlFrame);\n  declare roundInfoFrame <=> (window.GetFirstChild(\"round-info-frame\") as CMlFrame);\n  declare roundControlsFrame <=> ((roundInfoFrame.GetFirstChild(\"round-info\") as CMlFrame).GetFirstChild(\"round-controls\") as CMlFrame);\n\n  if (isEditor) {\n    toggleRecordingFrame.Show();\n    apiKeyFrame.Show();\n    roundInfoFrame.RelativePosition_V3 = <0., -19.>;\n    roundControlsFrame.Show();\n  } else {\n    toggleRecordingFrame.Hide();\n    apiKeyFrame.Hide();\n    roundInfoFrame.RelativePosition_V3 = <0., -6.>;\n    roundControlsFrame.Hide();\n  }\n\n  window.Show();\n}\n\nVoid updateRecording(Boolean isRecording) {\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\n  declare statusFrame <=> (window.GetFirstChild(\"recording-status\") as CMlFrame);\n  declare toggleRecordingFrame <=> (statusFrame.GetFirstChild(\"toggle-recording\") as CMlFrame);\n\n  declare recordingStatusLabel <=> statusFrame.Controls[0] as CMlLabel;\n  declare labelText <=> statusFrame.Controls[1] as CMlLabel;\n  declare toggleRecordingLabel <=> toggleRecordingFrame.Controls[2] as CMlLabel;\n\n  declare Real low = 2./16.;\n  declare Real high = 14./16.;\n\n  if (isRecording) {\n    recordingStatusLabel.TextColor = <low,high,low>;\n    labelText.SetText(\"Recording\");\n    toggleRecordingLabel.SetText(\"Stop recording\");\n  } else {\n    recordingStatusLabel.TextColor = <high,low,low>;\n    labelText.SetText(\"Not Recording\");\n    toggleRecordingLabel.SetText(\"Start recording\");\n  }\n}\n\nVoid updateApiKey(Text apiKey) {\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\n  declare apiKeyFrame <=> (window.GetFirstChild(\"api-key-frame\") as CMlFrame);\n  declare inputFrame <=> (apiKeyFrame.GetFirstChild(\"input-frame\") as CMlFrame);\n  declare apiKeyEntry <=> (inputFrame.GetFirstChild(\"ecm-api-key-entry\") as CMlEntry);\n\n  apiKeyEntry.SetText(apiKey, False);\n}\n\nVoid updateRoundInfo(Integer currentRound) {\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\n  declare roundInfoFrame <=> (window.GetFirstChild(\"round-info-frame\") as CMlFrame);\n  declare roundInfo <=> (roundInfoFrame.GetFirstChild(\"round-info\") as CMlFrame);\n  declare roundInfoLabel <=> (roundInfo.Controls[0] as CMlLabel);\n\n  roundInfoLabel.SetText(\"Round \" ^ currentRound);\n}\n\nVoid updateWindow(Boolean ecmIsEditor, Text ecmAPIKey, Boolean ecmIsRecording, Integer ecmCurrentRound) {\n  updateIsEditor(ecmIsEditor);\n  updateRecording(ecmIsRecording);\n  updateApiKey(ecmAPIKey);\n  updateRoundInfo(ecmCurrentRound);\n}\n";
},"17":function(container,depth0,helpers,partials,data) {
    return "declare Boolean ECMIsEditor for This = False;\ndeclare Text ECMAPIKey for This = \"\";\ndeclare Boolean ECMIsRecording for This = False;\ndeclare Integer ECMCurrentRound for This = 1;\ndeclare Integer LastECMUpdate for This = -1;\ndeclare Integer lastUpdate = -1;\n";
},"19":function(container,depth0,helpers,partials,data) {
    return "if (LastECMUpdate != lastUpdate) {\n  lastUpdate = LastECMUpdate;\n  updateWindow(ECMIsEditor, ECMAPIKey, ECMIsRecording, ECMCurrentRound);\n}\n";
},"21":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"ecm-api-key-entry\") && event.Type == CMlScriptEvent::Type::EntrySubmit) {\n  declare entryControl <=> (event.Control as CMlEntry);\n  declare errorLabel <=> (entryControl.Parent.GetFirstChild(\"error-label\") as CMlLabel);\n\n  declare Integer nbUnderscores = TL::Split(\"_\", entryControl.Value, False).count - 1;\n  if (nbUnderscores < 0) {\n    nbUnderscores = 0;\n  }\n\n  if (TL::Length(entryControl.Value) > 0 && nbUnderscores != 1) {\n    errorLabel.SetText(\"Expected 1 underscore, found \" ^ nbUnderscores);\n  } else {\n    errorLabel.SetText(\"\");\n  }\n}\n\nif (event.Control.HasClass(\"ecm-api-key-entry-toggle\") && event.Type == CMlScriptEvent::Type::MouseClick) {\n  declare entryControl <=> (event.Control.Parent.GetFirstChild(\"ecm-api-key-entry\") as CMlEntry);\n  if (entryControl.TextFormat == CMlEntry::ETextFormat::Password) {\n    entryControl.TextFormat = CMlEntry::ETextFormat::Basic;\n    (event.Control as CMlLabel).SetText(\"\");\n  } else {\n    entryControl.TextFormat = CMlEntry::ETextFormat::Password;\n    (event.Control as CMlLabel).SetText(\"\");\n  }\n}\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"window",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":171,"column":11}}})) != null ? stack1 : "");
},"useData":true});
