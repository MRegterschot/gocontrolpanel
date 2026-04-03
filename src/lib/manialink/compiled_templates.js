var Handlebars = require("handlebars/runtime");  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['action-group'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"widget",{"name":"content","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":24,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"main") : depth0),{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":26,"column":0},"end":{"line":28,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
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
    + " 5\" z-index=\"10\">\r\n  <frame size=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"add")||(depth0 && lookupProperty(depth0,"add"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":4,"column":32},"end":{"line":4,"column":53}}}),1,{"name":"add","hash":{},"data":data,"loc":{"start":{"line":4,"column":27},"end":{"line":4,"column":56}}}),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":4,"column":15},"end":{"line":4,"column":61}}}))
    + " 5\" pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":4,"column":82},"end":{"line":4,"column":103}}}),-5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":4,"column":70},"end":{"line":4,"column":109}}}))
    + " 0\">\r\n    <frame pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":5,"column":28},"end":{"line":5,"column":49}}}),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":5,"column":16},"end":{"line":5,"column":54}}}))
    + " 0\" size=\"5 5\">\r\n      <quad size=\"5 5\" bgcolor=\"222\" />\r\n      <label pos=\"2.6 -2.15\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"2.5\" textcolor=\"DDD\" />\r\n    </frame>\r\n\r\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":10,"column":4},"end":{"line":19,"column":13}}})) != null ? stack1 : "")
    + "\r\n    <quad class=\"trigger\" pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":21,"column":43},"end":{"line":21,"column":64}}}),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":21,"column":31},"end":{"line":21,"column":69}}}))
    + " 0\" z-index=\"2\" size=\"5 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\r\n  </frame>\r\n</frame>\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <frame pos=\""
    + alias3((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(data && lookupProperty(data,"index")),5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":11,"column":18},"end":{"line":11,"column":41}}}))
    + " 0\" size=\"5 5\">\r\n        <quad size=\"5 5\" bgcolor=\"DDD\" action=\""
    + alias3(container.lambda((depth0 != null ? lookupProperty(depth0,"action") : depth0), depth0))
    + "\" />\r\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(lookupProperty(helpers,"eq")||(depth0 && lookupProperty(depth0,"eq"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"type") : depth0),"image",{"name":"eq","hash":{},"data":data,"loc":{"start":{"line":13,"column":14},"end":{"line":13,"column":36}}}),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":13,"column":8},"end":{"line":17,"column":15}}})) != null ? stack1 : "")
    + "      </frame>\r\n";
},"4":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <quad image=\""
    + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"icon") : depth0), depth0))
    + "\" size=\"3.5 3.5\" pos=\"0.75 -0.75\" />\r\n";
},"6":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <label pos=\"2.5 -2.1\" text=\""
    + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"icon") : depth0), depth0))
    + "\" halign=\"center\" valign=\"center\" textsize=\"2\" textcolor=\"222\" />\r\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare Boolean actionGroupIsOpen = false for This;\r\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\r\n  declare Boolean actionGroupIsOpen for This;\r\n\r\n  if (actionGroupIsOpen) {\r\n    AnimMgr.Add(event.Control.Parent, \"\"\"<frame pos='"
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,(lookupProperty(helpers,"length")||(depth0 && lookupProperty(depth0,"length"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"actions") : stack1),{"name":"length","hash":{},"data":data,"loc":{"start":{"line":35,"column":65},"end":{"line":35,"column":86}}}),-5,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":35,"column":53},"end":{"line":35,"column":92}}}))
    + " 0' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n    declare triggerIcon <=> ((event.Control.Parent.Controls[0] as CMlFrame).Controls[1] as CMlLabel);\r\n    AnimMgr.Add(triggerIcon, \"\"\"<label rot='0' pos='2.6 -2.15' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n  } else {\r\n    AnimMgr.Add(event.Control.Parent, \"\"\"<frame pos='0 0' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n    declare triggerIcon <=> ((event.Control.Parent.Controls[0] as CMlFrame).Controls[1] as CMlLabel);\r\n    AnimMgr.Add(triggerIcon, \"\"\"<label rot='180' pos='2.25 -2.9' />\"\"\", 200, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n  }\r\n\r\n  actionGroupIsOpen = !actionGroupIsOpen;\r\n}\r\n";
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

  return "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?>\r\n<?xml-model href=\"https://raw.githubusercontent.com/reaby/manialink-xsd/main/manialink_v3.xsd\" ?>\r\n<manialink name=\"GCP:"
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":3,"column":21},"end":{"line":3,"column":29}}}) : helper)))
    + "\" id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":3,"column":35},"end":{"line":3,"column":43}}}) : helper)))
    + "\" version=\"3\">\r\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"content",{"name":"block","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":0},"end":{"line":4,"column":30}}})) != null ? stack1 : "")
    + "\r\n</manialink>\r\n";
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
    + "\" z-index=\"10\" hidden=\"1\">\r\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"widget",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":0},"end":{"line":4,"column":29}}})) != null ? stack1 : "")
    + "\r\n</frame>\r\n\r\n<script><!--\r\n#Include \"MathLib\" as ML\r\n#Include \"TextLib\" as TL\r\n#Include \"TimeLib\" as TimeLib\r\n#Include \"ColorLib\" as CL\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"globals",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":13,"column":0},"end":{"line":13,"column":30}}})) != null ? stack1 : "")
    + "\r\n\r\ndeclare CMlFrame widget;\r\n--></script>\r\n\r\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"scripts/hide"),depth0,{"name":"scripts/hide","hash":{"target":"widget"},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\r\n<script><!--\r\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"script",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":21,"column":29}}})) != null ? stack1 : "")
    + "\r\n--></script>\r\n\r\n<script><!--\r\nmain() {\r\n  widget <=> (Page.MainFrame.GetFirstChild(\"widget\") as CMlFrame);\r\n  widgetBasePosition = widget.AbsolutePosition_V3;\r\n\r\n  sleep(300);\r\n  widget.Show();\r\n\r\n  "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"main",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":32,"column":2},"end":{"line":32,"column":29}}})) != null ? stack1 : "")
    + "\r\n\r\n  while (True) {\r\n    yield;\r\n\r\n    foreach(event in PendingEvents){\r\n      if(event.Control == Null) continue;\r\n\r\n      "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"events",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":40,"column":6},"end":{"line":40,"column":35}}})) != null ? stack1 : "")
    + "\r\n    }\r\n\r\n    "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias4).call(alias3,"loop",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":4},"end":{"line":43,"column":31}}})) != null ? stack1 : "")
    + "\r\n\r\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias3,(depth0 != null ? lookupProperty(depth0,"hideWhileDriving") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":45,"column":4},"end":{"line":47,"column":11}}})) != null ? stack1 : "")
    + "  }\r\n}\r\n\r\n--></script>\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "";
},"5":function(container,depth0,helpers,partials,data) {
    return "      hidescript();\r\n";
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
    + "\" z-index=\"10\">\r\n  <quad pos=\"0 0\" size=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " 5\" bgcolor=\"222\" />\r\n  <label pos=\"1.5 -2.25\" text=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias5 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":5,"column":31},"end":{"line":5,"column":42}}}) : helper)))
    + "\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),9.5,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":5,"column":50},"end":{"line":5,"column":75}}}))
    + " 5\" valign=\"center\" halign=\"left\" textsize=\"1\" color=\"DDD\" textfont=\"GameFontSemiBold\" />\r\n  <label pos=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),1.5,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":6,"column":14},"end":{"line":6,"column":39}}}))
    + " -2.25\" text=\"\" size=\"5 5\" valign=\"center\" halign=\"right\" textsize=\"1\" color=\"222\" action=\"close-window-"
    + alias3(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias5 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":6,"column":144},"end":{"line":6,"column":150}}}) : helper)))
    + "\" focusareacolor2=\"fff0\" />\r\n\r\n  <quad pos=\"0 -5\" size=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"y") : stack1), depth0))
    + "\" bgcolor=\"DDD\" />\r\n  <frame pos=\"0 -5\" size=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1), depth0))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"y") : stack1), depth0))
    + "\">\r\n    "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"window",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":10,"column":4},"end":{"line":10,"column":33}}})) != null ? stack1 : "")
    + "\r\n  </frame>\r\n</frame>\r\n\r\n<script><!--\r\n#Include \"MathLib\" as ML\r\n#Include \"TextLib\" as TL\r\n#Include \"TimeLib\" as TimeLib\r\n#Include \"ColorLib\" as CL\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"globals",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":0},"end":{"line":20,"column":30}}})) != null ? stack1 : "")
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"script",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":22,"column":0},"end":{"line":22,"column":29}}})) != null ? stack1 : "")
    + "\r\n\r\nmain() {\r\n  "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"main",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":25,"column":2},"end":{"line":25,"column":29}}})) != null ? stack1 : "")
    + "\r\n\r\n  while (True) {\r\n    yield;\r\n\r\n    foreach(event in PendingEvents){\r\n      if(event.Control == Null) continue;\r\n\r\n      "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"events",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":6},"end":{"line":33,"column":35}}})) != null ? stack1 : "")
    + "\r\n    }\r\n\r\n    "
    + ((stack1 = (lookupProperty(helpers,"block")||(depth0 && lookupProperty(depth0,"block"))||alias2).call(alias1,"loop",{"name":"block","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":36,"column":4},"end":{"line":36,"column":31}}})) != null ? stack1 : "")
    + "\r\n  }\r\n}\r\n--></script>\r\n";
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

  return "<script><!--\r\ndeclare Vec2 widgetBasePosition;\r\ndeclare CMlFrame HS_Target;\r\ndeclare Boolean HS_Hidden;\r\n\r\nVoid hs_hide(Integer duration) {\r\n  HS_Hidden = True;\r\n  declare Real x;\r\n  if (widgetBasePosition[0] < 0.0) {\r\n    x = (HS_Target.Size[0] * -HS_Target.RelativeScale) - 322.0;\r\n  } else {\r\n    x = 322.0;\r\n  }\r\n  AnimMgr.Add(HS_Target, \"<frame pos='\" ^ x ^ \" \" ^ widgetBasePosition[1] ^ \"' />\", duration, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n}\r\n\r\nVoid hs_show(Integer duration) {\r\n  HS_Hidden = False;\r\n  AnimMgr.Add(HS_Target, \"<frame pos='\" ^ widgetBasePosition[0] ^ \" \" ^ widgetBasePosition[1] ^ \"' />\", duration, CAnimManager::EAnimManagerEasing::CircOut);\r\n}\r\n\r\nVoid hidescript() {\r\n  if (HS_Target == Null){\r\n    HS_Target <=> (Page.MainFrame.GetFirstChild(\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"target") || (depth0 != null ? lookupProperty(depth0,"target") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"target","hash":{},"data":data,"loc":{"start":{"line":24,"column":49},"end":{"line":24,"column":59}}}) : helper)))
    + "\") as CMlFrame);\r\n  }\r\n\r\n  declare hideSpeed = 10;\r\n\r\n  if (InputPlayer == Null) {\r\n    if (HS_Hidden) {\r\n      hs_show(600);\r\n    }\r\n    return;\r\n  }\r\n\r\n  declare Boolean overHidespeed = ML::Abs(InputPlayer.Speed * 3.6) > hideSpeed;\r\n\r\n  if (overHidespeed && !HS_Hidden) {\r\n    hs_hide(1000);\r\n\r\n    while(InputPlayer.Speed * 3.6 > hideSpeed){\r\n      yield;\r\n      hidescript();\r\n    }\r\n  }\r\n  \r\n  if (!overHidespeed && HS_Hidden) {\r\n    sleep(1000);\r\n    hs_show(600);\r\n  }\r\n}\r\n--></script>";
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

  return "<script>\r\n<!--\r\n#Struct Ranking {\r\n  Text login;\r\n  Text name;\r\n  Integer rank;\r\n  Integer points;\r\n}\r\n\r\nmain(){\r\n  declare Ranking[] Rankings for This;\r\n  declare Text Mode for This;\r\n  declare Integer PointsLimit for This;\r\n  declare Integer LastRankingsUpdate for This;\r\n  declare Text rankingsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"rankingsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":17,"column":33},"end":{"line":17,"column":71}}})) != null ? stack1 : "")
    + "\"\"\";\r\n\r\n  Rankings.fromjson(rankingsJson);\r\n  Mode = \"\"\""
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"mode") : stack1),"rounds",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":20,"column":12},"end":{"line":20,"column":44}}}))
    + "\"\"\";\r\n  PointsLimit = "
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"pointsLimit") : stack1),-1,{"name":"default","hash":{},"data":data,"loc":{"start":{"line":21,"column":16},"end":{"line":21,"column":49}}}))
    + ";\r\n  LastRankingsUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":0},"end":{"line":35,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":0},"end":{"line":107,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":109,"column":0},"end":{"line":118,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":120,"column":0},"end":{"line":125,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":127,"column":0},"end":{"line":135,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\r\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Live Ranking\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\r\n</frame>\r\n\r\n<framemodel id=\"ranking\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"5 5\" bgcolor=\"222\"/>\r\n  <quad pos=\"5 0\" z-index=\"0\" size=\"50 5\" bgcolor=\"DDD\"/>\r\n  <label pos=\"2.4 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\r\n  <quad pos=\"6.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\r\n  <label pos=\"12 -2.25\" z-index=\"0\" size=\"32 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\r\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"7.5 5\" text=\"0\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\r\n\r\n  <quad class=\"trigger\" pos=\"0 0\" z-index=\"-2\" size=\"55 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\r\n</framemodel>\r\n\r\n<frame id=\"rankings\" pos=\"0 -5.25\" size=\"55 42\">\r\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":20,"column":15},"end":{"line":20,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\r\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":23,"column":10}}})) != null ? stack1 : "")
    + "</frame>\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <frameinstance modelid=\"ranking\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":22,"column":42},"end":{"line":22,"column":64}}}))
    + "\" />\r\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct Ranking {\r\n  Text login;\r\n  Text name;\r\n  Integer rank;\r\n  Integer points;\r\n}\r\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Void updateRankingRow(Integer index, Ranking ranking, Text mode, Integer pointsLimit) {\r\n  declare rankingsFrame <=> (Page.MainFrame.GetFirstChild(\"rankings\") as CMlFrame);\r\n\r\n  if (index >= rankingsFrame.Controls.count) {\r\n    return;\r\n  }\r\n\r\n  declare rankingFrame <=> (rankingsFrame.Controls[index + 1] as CMlFrame);\r\n  (rankingFrame.Controls[2] as CMlLabel).SetText(TL::ToText(ranking.rank));\r\n  (rankingFrame.Controls[3] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ ranking.login ^ \"/country\";\r\n  (rankingFrame.Controls[4] as CMlLabel).SetText(ranking.name);\r\n  \r\n  declare Text pointsText = TL::ToText(ranking.points);\r\n  if (mode == \"cup\" && pointsLimit > 0) {\r\n    if (ranking.points > pointsLimit) {\r\n      pointsText = \"$2C2W\";\r\n    } else if (ranking.points == pointsLimit) {\r\n      pointsText = \"$D22F\";\r\n    }\r\n  } else if (mode == \"rounds\" && pointsLimit > 0) {\r\n    if (ranking.points >= pointsLimit) {\r\n      pointsText = \"$2C2W\";\r\n    }\r\n  } else if (mode == \"reversecup\") {\r\n    if (-2000 < ranking.points && ranking.points <= -1000) {\r\n      pointsText = \"$D22LC\";\r\n    } else if (ranking.points <= -2000) {\r\n      pointsText = \"$D22E\";\r\n    }\r\n  }\r\n\r\n  (rankingFrame.Controls[5] as CMlLabel).SetText(pointsText);\r\n  rankingFrame.DataAttributeSet(\"login\", ranking.login);\r\n  rankingFrame.Show();\r\n}\r\n\r\nVoid updateScroll(Ranking[] rankings) {\r\n  declare rankingsFrame <=> (Page.MainFrame.GetFirstChild(\"rankings\") as CMlFrame);\r\n  declare Integer rankingCount = rankings.count;\r\n  if (rankingCount > rankingsFrame.Controls.count) {\r\n    rankingCount = rankingsFrame.Controls.count;\r\n  }\r\n  declare Real maxY = rankingCount * 5.25 - 42;\r\n  if (maxY < 0) {\r\n    maxY = 0.;\r\n  }\r\n  rankingsFrame.ScrollMax = <0., maxY>;\r\n}\r\n\r\nVoid updateWidget(Ranking[] rankings, Text mode, Integer pointsLimit) {\r\n  declare rankingCount = rankings.count;\r\n  declare index = 0;\r\n\r\n  foreach (ranking in rankings) {\r\n    updateRankingRow(index, ranking, mode, pointsLimit);\r\n    index = index + 1;\r\n  }\r\n\r\n  declare rankingsFrame <=> (Page.MainFrame.GetFirstChild(\"rankings\") as CMlFrame);\r\n  // Hide unused rows\r\n  while (index < rankingsFrame.Controls.count - 1) {\r\n    declare rankingFrame <=> (rankingsFrame.Controls[index + 1] as CMlFrame);\r\n    rankingFrame.DataAttributeSet(\"login\", \"\");\r\n    rankingFrame.Hide();\r\n    index = index + 1;\r\n  }\r\n\r\n  updateScroll(rankings);\r\n}\r\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare Ranking[] Rankings for This;\r\ndeclare Text Mode for This = \"rounds\";\r\ndeclare Integer PointsLimit for This = -1;\r\ndeclare Integer LastRankingsUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\ndeclare rankingsFrame <=> (widget.GetFirstChild(\"rankings\") as CMlFrame);\r\nrankingsFrame.ScrollActive = True;\r\nrankingsFrame.ScrollMin = <0., 0.>;\r\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastRankingsUpdate != lastUpdate) {\r\n  lastUpdate = LastRankingsUpdate;\r\n  updateWidget(Rankings, Mode, PointsLimit);\r\n}\r\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\r\n  declare targetLogin = event.Control.Parent.DataAttributeGet(\"login\");\r\n  if (targetLogin != \"\") {\r\n    if(!IsSpectatorClient) RequestSpectatorClient(True);\r\n    SetSpectateTarget(targetLogin);\r\n  }\r\n}\r\n";
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

  return "<script>\r\n<!--\r\n#Struct Round {\r\n  Text login;\r\n  Text name;\r\n  Integer rank;\r\n  Integer points;\r\n  Integer[] checkpoints;\r\n  Integer time;\r\n}\r\n\r\n#Struct Finish {\r\n  Text login;\r\n  Integer points;\r\n}\r\n\r\nmain(){\r\n  declare Round[] Rounds for This;\r\n  declare Finish[] Finishes for This;\r\n  declare Text Mode for This;\r\n  declare Integer PointsLimit for This;\r\n  declare Integer LastRoundsUpdate for This;\r\n  declare Text roundsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"roundsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":25,"column":31},"end":{"line":25,"column":67}}})) != null ? stack1 : "")
    + "\"\"\";\r\n  declare Text finishesJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"finishesJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":26,"column":33},"end":{"line":26,"column":71}}})) != null ? stack1 : "")
    + "\"\"\";\r\n\r\n  Rounds.fromjson(roundsJson);\r\n  Finishes.fromjson(finishesJson);\r\n  Mode = \"\"\""
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"mode") : stack1),"rounds",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":30,"column":12},"end":{"line":30,"column":44}}}))
    + "\"\"\";\r\n  PointsLimit = "
    + alias3((lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"pointsLimit") : stack1),-1,{"name":"default","hash":{},"data":data,"loc":{"start":{"line":31,"column":16},"end":{"line":31,"column":49}}}))
    + ";\r\n  LastRoundsUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":35,"column":0},"end":{"line":49,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":51,"column":0},"end":{"line":259,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":261,"column":0},"end":{"line":272,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":274,"column":0},"end":{"line":311,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":313,"column":0},"end":{"line":320,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\r\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Live Round\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\r\n</frame>\r\n\r\n<framemodel id=\"round\">\r\n  <quad pos =\"0 0\" z-index=\"0\" size=\"5 5\" bgcolor=\"222\"/>\r\n  <quad pos=\"5 0\" z-index=\"0\" size=\"35.5 5\" bgcolor=\"DDD\"/>\r\n  <quad pos=\"40.5 0\" z-index=\"0\" size=\"14.5 5\" bgcolor=\"BBB\"/>\r\n  <label pos=\"2.4 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\r\n  <quad pos=\"6.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\r\n  <label pos=\"12 -2.25\" z-index=\"0\" size=\"25.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\r\n  <label pos=\"39.75 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\r\n  <label pos=\"54 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\r\n  \r\n  <frame pos=\"47.5 0\" size=\"7 5\" id=\"finish\" z-index=\"-2\">\r\n    <quad pos=\"0 0\" size=\"7 5\" bgcolor=\"222\" z-index=\"-2\" />\r\n    <label pos=\"3.5 -2.25\" size=\"6 5\" z-index=\"-1\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" />\r\n  </frame>\r\n\r\n  <quad class=\"trigger\" pos=\"0 0\" z-index=\"-2\" size=\"57 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\r\n</framemodel>\r\n\r\n<frame id=\"rounds\" pos=\"0 -5.25\" size=\"62 42\">\r\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":27,"column":15},"end":{"line":27,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\r\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":0},"end":{"line":30,"column":10}}})) != null ? stack1 : "")
    + "</frame>\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frameinstance modelid=\"round\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":29,"column":38},"end":{"line":29,"column":60}}}))
    + "\" />\r\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct Round {\r\n  Text login;\r\n  Text name;\r\n  Integer rank;\r\n  Integer points;\r\n  Integer[] checkpoints;\r\n  Integer time;\r\n}\r\n\r\n#Struct Finish {\r\n  Text login;\r\n  Integer points;\r\n}\r\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\r\n  declare Text secondString;\r\n  declare Text msString;\r\n\r\n  if (time < 0) {\r\n    return \"--:--.---\";\r\n  }\r\n\r\n  declare Integer seconds = time / 1000;\r\n  declare Integer minutes = seconds / 60;\r\n  declare Integer milliseconds = time - (seconds * 1000);\r\n  seconds = seconds - (minutes * 60);\r\n\r\n  secondString = TL::ToText(seconds);\r\n\r\n  if (seconds < 10) {\r\n    secondString = \"0\" ^ secondString;\r\n  }\r\n\r\n  if (milliseconds <= 0) {\r\n    msString = \"000\";\r\n  } else if (milliseconds < 10) {\r\n    msString = \"00\" ^ TL::ToText(milliseconds);\r\n  } else if (milliseconds < 100) {\r\n    msString = \"0\" ^ TL::ToText(milliseconds);\r\n  } else {\r\n    msString = TL::ToText(milliseconds);\r\n  }\r\n\r\n  if (minutes > 0) {\r\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\r\n  } else {\r\n    return secondString ^ \".\" ^ msString;\r\n  }\r\n\r\n  return \"\";\r\n}\r\n\r\nText getCheckpointDiffText(Round[] rounds, Text login) {\r\n  declare Round playerRound;\r\n  \r\n  foreach (round in rounds) {\r\n    if (round.login == login) {\r\n      playerRound = round;\r\n      break;\r\n    }\r\n  }\r\n\r\n  if (playerRound.login == \"\") {\r\n    return \"--:--.---\";\r\n  }\r\n\r\n  // If the player's time is -1, return DNF\r\n  if (playerRound.time == -1) {\r\n    return \"DNF\";\r\n  }\r\n\r\n  // If the player has no checkpoints, return --:--.---\r\n  if (playerRound.checkpoints.count == 0) {\r\n    return \"--:--.---\";\r\n  }\r\n\r\n  // If the player is rank 1, return their time\r\n  if (playerRound.rank == 1) {\r\n    return formatTime(playerRound.time);\r\n  }\r\n\r\n  declare Round firstPlaceRound;\r\n  foreach (round in rounds) {\r\n    if (round.rank == 1) {\r\n      firstPlaceRound = round;\r\n      break;\r\n    }\r\n  }\r\n  \r\n  if (firstPlaceRound.login == \"\") {\r\n    return \"--:--.---\";\r\n  }\r\n  \r\n  // Get the checkpoint difference to the first place player\r\n  declare Integer checkpointDiff = firstPlaceRound.checkpoints.count - playerRound.checkpoints.count;\r\n\r\n  // If the checkpoint difference is 0, return their time difference\r\n  if (checkpointDiff == 0) {\r\n    declare Integer timeDiff = playerRound.time - firstPlaceRound.time;\r\n    return \"+\" ^ formatTime(timeDiff);\r\n  } else {\r\n    return \"+\" ^ TL::ToText(checkpointDiff) ^ \" CP\";\r\n  }\r\n\r\n  return \"--:--.---\";\r\n}\r\n\r\nVoid updateRoundRow(Integer index, Round round, Round[] rounds, Text mode, Integer pointsLimit) {\r\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\r\n\r\n  if (index >= roundsFrame.Controls.count) {\r\n    return;\r\n  }\r\n\r\n  declare roundFrame <=> (roundsFrame.Controls[index + 1] as CMlFrame);\r\n  (roundFrame.Controls[3] as CMlLabel).SetText(TL::ToText(round.rank));\r\n  (roundFrame.Controls[4] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ round.login ^ \"/country\";\r\n  (roundFrame.Controls[5] as CMlLabel).SetText(round.name);\r\n\r\n  declare Text pointsText = TL::ToText(round.points);\r\n  if (mode == \"cup\" && pointsLimit > 0) {\r\n    if (round.points > pointsLimit) {\r\n      pointsText = \"$2C2W\";\r\n    } else if (round.points == pointsLimit) {\r\n      pointsText = \"$D22F\";\r\n    }\r\n  } else if (mode == \"rounds\" && pointsLimit > 0) {\r\n    if (round.points >= pointsLimit) {\r\n      pointsText = \"$2C2W\";\r\n    }\r\n  } else if (mode == \"reversecup\") {\r\n    if (-2000 < round.points && round.points <= -1000) {\r\n      pointsText = \"$D22LC\";\r\n    } else if (round.points <= -2000) {\r\n      pointsText = \"$D22E\";\r\n    }\r\n  }\r\n\r\n  (roundFrame.Controls[6] as CMlLabel).SetText(pointsText);\r\n  (roundFrame.Controls[7] as CMlLabel).SetText(getCheckpointDiffText(rounds, round.login));\r\n  roundFrame.DataAttributeSet(\"login\", round.login);\r\n  roundFrame.Show();\r\n}\r\n\r\nVoid updateFinish(Text login, Integer points, Boolean finished) {\r\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\r\n\r\n  foreach (control in roundsFrame.Controls) {\r\n    // Skip first control (invisible background quad)\r\n    if (control == roundsFrame.Controls[0]) {\r\n      continue;\r\n    }\r\n\r\n    declare roundFrame <=> (control as CMlFrame);\r\n    declare Text frameLogin = roundFrame.DataAttributeGet(\"login\");\r\n\r\n    if (frameLogin == login) {\r\n      declare frameFinish <=> (roundFrame.GetFirstChild(\"finish\") as CMlFrame);\r\n\r\n      AnimMgr.Flush(frameFinish);\r\n      \r\n      if (finished) {\r\n        if (points == 0) {\r\n          (frameFinish.Controls[1] as CMlLabel).SetText(\"\");\r\n        } else {\r\n          declare Text pointsText = \"+\" ^ TL::ToText(points);\r\n          if (points < 0) {\r\n            pointsText = \"-\" ^ TL::ToText(-points);\r\n          }\r\n          \r\n          (frameFinish.Controls[1] as CMlLabel).SetText(pointsText);\r\n        }\r\n        AnimMgr.Add(frameFinish, \"\"\"<frame pos='55 0' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n      } else {\r\n        AnimMgr.Add(frameFinish, \"\"\"<frame pos='47.5 0' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n      }\r\n\r\n      break;\r\n    }\r\n  }\r\n}\r\n\r\nVoid clearFinishes(Round[] rounds) {\r\n  foreach (round in rounds) {\r\n    updateFinish(round.login, 0, False);\r\n  }\r\n}\r\n\r\nVoid updateScroll(Round[] rounds) {\r\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\r\n  declare Integer roundCount = rounds.count;\r\n  if (roundCount > roundsFrame.Controls.count) {\r\n    roundCount = roundsFrame.Controls.count;\r\n  }\r\n  declare Real maxY = roundCount * 5.25 - 42;\r\n  if (maxY < 0) {\r\n    maxY = 0.;\r\n  }\r\n  roundsFrame.ScrollMax = <0., maxY>;\r\n}\r\n\r\nVoid updateWidget(Round[] rounds, Text mode, Integer pointsLimit) {\r\n  declare roundCount = rounds.count;\r\n  declare index = 0;\r\n\r\n  foreach (round in rounds) {\r\n    updateRoundRow(index, round, rounds, mode, pointsLimit);\r\n    index = index + 1;\r\n  }\r\n\r\n  declare roundsFrame <=> (Page.MainFrame.GetFirstChild(\"rounds\") as CMlFrame);\r\n  // Hide unused rows\r\n  while (index < roundsFrame.Controls.count - 1) {\r\n    declare roundFrame <=> (roundsFrame.Controls[index + 1] as CMlFrame);\r\n    roundFrame.DataAttributeSet(\"login\", \"\");\r\n    roundFrame.Hide();\r\n    index = index + 1;\r\n  }\r\n\r\n  updateScroll(rounds);\r\n}\r\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare Round[] Rounds for This;\r\ndeclare Finish[] Finishes for This = [];\r\ndeclare Text Mode for This = \"rounds\";\r\ndeclare Integer PointsLimit for This = -1;\r\ndeclare Integer LastRoundsUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\ndeclare Finish[] prevFinishes = [];\r\ndeclare roundsFrame <=> (widget.GetFirstChild(\"rounds\") as CMlFrame);\r\nroundsFrame.ScrollActive = True;\r\nroundsFrame.ScrollMin = <0., 0.>;\r\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastRoundsUpdate != lastUpdate) {\r\n  lastUpdate = LastRoundsUpdate;\r\n  \r\n  updateWidget(Rounds, Mode, PointsLimit);\r\n\r\n  if (Finishes.count != prevFinishes.count) {\r\n    if (Finishes.count == 0) {\r\n      clearFinishes(Rounds);\r\n    } else {\r\n      if (Finishes.count > prevFinishes.count) {\r\n        // Find newly finished players\r\n        foreach (finish in Finishes) {\r\n          declare Boolean found = False;\r\n          foreach (prevFinish in prevFinishes) {\r\n            if (finish.login == prevFinish.login) {\r\n              found = True;\r\n              break;\r\n            }\r\n          }\r\n\r\n          if (!found) {\r\n            updateFinish(finish.login, finish.points, True);\r\n          }\r\n        }\r\n      } else {\r\n        clearFinishes(Rounds);\r\n        // Re-apply finished players\r\n        foreach (finish in Finishes) {\r\n          updateFinish(finish.login, finish.points, True);\r\n        }\r\n      }\r\n    }\r\n\r\n    prevFinishes = Finishes;\r\n  }\r\n}\r\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\r\n  declare targetLogin = event.Control.Parent.DataAttributeGet(\"login\");\r\n  if (targetLogin != \"\") {\r\n    SetSpectateTarget(targetLogin);\r\n  }\r\n}\r\n";
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

  return "<script>\r\n<!--\r\n#Struct Map {\r\n  Text name;\r\n  Text author;\r\n}\r\n\r\nmain(){\r\n  declare Map MapInfo for This;\r\n  declare Integer LastMapInfoUpdate for This;\r\n  declare Text mapJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"mapJson") : stack1),"{}",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":13,"column":28},"end":{"line":13,"column":61}}})) != null ? stack1 : "")
    + "\"\"\";\r\n\r\n  MapInfo.fromjson(mapJson);\r\n  LastMapInfoUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":13,"column":0},"end":{"line":18,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":0},"end":{"line":27,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":29,"column":0},"end":{"line":33,"column":12}}})) != null ? stack1 : "")
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":36,"column":0},"end":{"line":41,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    return "<frame pos=\"0 0\" id=\"map\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"10 10\" bgcolor=\"222\"/>\r\n  <quad pos=\"10 0\" z-index=\"0\" size=\"45 10\" bgcolor=\"DDD\"/>\r\n  <label pos=\"5 -4.75\" z-index=\"0\" size=\"10 10\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"2.5\" textcolor=\"DDD\" textfont=\"GameFontRegular\"/>\r\n  <label pos=\"12 -5.25\" z-index=\"0\" size=\"41 5\" text=\"-\" textcolor=\"222\" textsize=\"1.75\" textfont=\"GameFontSemiBold\" valign=\"bottom\"/>\r\n  <label pos=\"11.75 -5.5\" z-index=\"0\" size=\"41 5\" text=\"-\" textcolor=\"222\" textprefix=\"$i\" textfont=\"GameFontRegular\" valign=\"top\" textsize=\"1\"/>\r\n</frame>\r\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "#Struct Map {\r\n  Text name;\r\n  Text author;\r\n}\r\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "Void updateWidget(Map mapInfo) {\r\n  declare mapFrame <=> (Page.MainFrame.GetFirstChild(\"map\") as CMlFrame);\r\n\r\n  (mapFrame.Controls[3] as CMlLabel).SetText(mapInfo.name);\r\n  (mapFrame.Controls[4] as CMlLabel).SetText(mapInfo.author);\r\n}\r\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare Map MapInfo for This;\r\ndeclare Integer LastMapInfoUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "if (LastMapInfoUpdate != lastUpdate) {\r\n  lastUpdate = LastMapInfoUpdate;\r\n  updateWidget(MapInfo);\r\n}\r\n";
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

  return "<frame pos=\"0 0\" id=\"notify-admin\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"36 8\" bgcolor=\"DDD\"/>\r\n  <quad pos=\"0 -8\" z-index=\"0\" size=\"36 0.5\" bgcolor=\"222\"/>\r\n  <label pos=\"18 -3.75\" z-index=\"0\" size=\"36 8\" text=\"Notify Admin\" halign=\"center\" valign=\"center\" textsize=\"2\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\r\n\r\n  <quad pos=\"0 0\" size=\"36 8.5\" z-index=\"-2\" scriptevents=\"1\" bgcolor=\"fff\" opacity=\"0\" action=\""
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"notifyAdminAction") : stack1), depth0))
    + "\" />\r\n</frame>\r\n";
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

  return "<script>\r\n<!--\r\n#Struct PlayerInfo {\r\n  Text login;\r\n  Text name;\r\n  Integer personalBest;\r\n  Integer localRecord;\r\n  Text device;\r\n  Text camera;\r\n}\r\n\r\nmain(){\r\n  declare PlayerInfo[] PlayerInfos for This;\r\n  declare Integer LastPlayerInfosUpdate for This;\r\n  declare Text playerInfosJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"playerInfosJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":17,"column":36},"end":{"line":17,"column":77}}})) != null ? stack1 : "")
    + "\"\"\";\r\n\r\n  PlayerInfos.fromjson(playerInfosJson);\r\n  LastPlayerInfosUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":0},"end":{"line":52,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":54,"column":0},"end":{"line":129,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":131,"column":0},"end":{"line":138,"column":12}}})) != null ? stack1 : "")
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":141,"column":0},"end":{"line":165,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    return "<frame pos=\"0 0\" id=\"player-info-container\" hidden=\"1\">\r\n  <frame pos=\"0 0\" id=\"player-name\">\r\n    <quad pos=\"0 0\" z-index=\"0\" size=\"7 7\" bgcolor=\"222\"/>\r\n    <quad pos=\"7 0\" z-index=\"0\" size=\"48 7\" bgcolor=\"DDD\"/>\r\n    <quad pos=\"3.5 -3.5\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"222\" image=\"file://Media/Flags/WOR.dds\" halign=\"center\" valign=\"center\" />\r\n    <label pos=\"8.5 -3.25\" z-index=\"0\" size=\"47 7\" text=\"\" valign=\"center\" textcolor=\"222\" textsize=\"2\" textfont=\"GameFontSemiBold\"/>\r\n  </frame>\r\n\r\n  <frame pos=\"0 -8\" id=\"player-info-title\">\r\n    <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\r\n    <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Player Info\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\r\n  </frame>\r\n\r\n  <frame pos=\"0 -13.25\" id=\"records-info\">\r\n    <quad pos=\"0 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\r\n    <quad pos=\"8 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\r\n    <label pos=\"4 -3.75\" z-index=\"0\" size=\"8 8\" text=\"PB\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\r\n    <label pos=\"17.75 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"--:--.---\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\r\n\r\n    <quad pos=\"27.5 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\r\n    <quad pos=\"35.5 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\r\n    <label pos=\"31.5 -3.75\" z-index=\"0\" size=\"8 8\" text=\"LR\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\r\n    <label pos=\"45.25 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"--:--.---\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\r\n  </frame>\r\n\r\n  <frame pos=\"0 -21.5\" id=\"other-info\">\r\n    <quad pos=\"0 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\r\n    <quad pos=\"8 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\r\n    <label pos=\"4 -3.75\" z-index=\"0\" size=\"8 8\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\r\n    <label pos=\"17.75 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\r\n\r\n    <quad pos=\"27.5 0\" z-index=\"0\" size=\"8 8\" bgcolor=\"222\"/>\r\n    <quad pos=\"35.5 0\" z-index=\"0\" size=\"19.5 8\" bgcolor=\"DDD\"/>\r\n    <label pos=\"31.5 -3.75\" z-index=\"0\" size=\"8 8\" text=\"\" halign=\"center\" valign=\"center\" textsize=\"1.5\" textcolor=\"DDD\" textfont=\"GameFontBlack\"/>\r\n    <label pos=\"45.25 -3.75\" z-index=\"0\" size=\"15.5 8\" text=\"\" valign=\"center\" halign=\"center\" textcolor=\"222\" textsize=\"1.5\" textfont=\"GameFontSemiBold\"/>\r\n  </frame>\r\n</frame>\r\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "#Struct PlayerInfo {\r\n  Text login;\r\n  Text name;\r\n  Integer personalBest;\r\n  Integer localRecord;\r\n  Text device;\r\n  Text camera;\r\n}\r\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\r\n  declare Text secondString;\r\n  declare Text msString;\r\n\r\n  if (time <= 0) {\r\n    return \"--:--.---\";\r\n  }\r\n\r\n  declare Integer seconds = time / 1000;\r\n  declare Integer minutes = seconds / 60;\r\n  declare Integer milliseconds = time - (seconds * 1000);\r\n  seconds = seconds - (minutes * 60);\r\n\r\n  secondString = TL::ToText(seconds);\r\n\r\n  if (seconds < 10) {\r\n    secondString = \"0\" ^ secondString;\r\n  }\r\n\r\n  if (milliseconds <= 0) {\r\n    msString = \"000\";\r\n  } else if (milliseconds < 10) {\r\n    msString = \"00\" ^ TL::ToText(milliseconds);\r\n  } else if (milliseconds < 100) {\r\n    msString = \"0\" ^ TL::ToText(milliseconds);\r\n  } else {\r\n    msString = TL::ToText(milliseconds);\r\n  }\r\n\r\n  if (minutes > 0) {\r\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\r\n  } else {\r\n    return secondString ^ \".\" ^ msString;\r\n  }\r\n\r\n  return \"\";\r\n}\r\n\r\nVoid updateWidget(PlayerInfo[] playerInfos, Text spectatorTargetLogin, Text spectatorTargetName, Text playerLogin) {\r\n  declare playerInfoContainerFrame <=> (Page.MainFrame.GetFirstChild(\"player-info-container\") as CMlFrame);\r\n\r\n  if (spectatorTargetLogin == \"\" || spectatorTargetLogin == playerLogin) {\r\n    playerInfoContainerFrame.Hide();\r\n    return;\r\n  }\r\n\r\n  foreach (playerInfo in playerInfos) {\r\n    if (playerInfo.login != spectatorTargetLogin) {\r\n      continue;\r\n    }\r\n\r\n    declare playerNameFrame <=> (playerInfoContainerFrame.GetFirstChild(\"player-name\") as CMlFrame);\r\n    declare playerInfoTitleFrame <=> (playerInfoContainerFrame.GetFirstChild(\"player-info-title\") as CMlFrame);\r\n    declare recordsInfoFrame <=> (playerInfoContainerFrame.GetFirstChild(\"records-info\") as CMlFrame);\r\n    declare otherInfoFrame <=> (playerInfoContainerFrame.GetFirstChild(\"other-info\") as CMlFrame);\r\n\r\n    // Update Player Info\r\n    (playerNameFrame.Controls[2] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ spectatorTargetLogin ^ \"/country\";\r\n    (playerNameFrame.Controls[3] as CMlLabel).SetText(spectatorTargetName);\r\n\r\n    // Update Records Info\r\n    (recordsInfoFrame.Controls[3] as CMlLabel).SetText(formatTime(playerInfo.personalBest));\r\n    (recordsInfoFrame.Controls[7] as CMlLabel).SetText(formatTime(playerInfo.localRecord));\r\n\r\n    // Update Other Info\r\n    (otherInfoFrame.Controls[3] as CMlLabel).SetText(playerInfo.device);\r\n    (otherInfoFrame.Controls[7] as CMlLabel).SetText(playerInfo.camera);\r\n\r\n    playerInfoContainerFrame.Show();\r\n\r\n    break;\r\n  }\r\n\r\n}\r\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare PlayerInfo[] PlayerInfos for This;\r\ndeclare Integer LastPlayerInfosUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\ndeclare Text spectatorTargetLogin = \"\";\r\ndeclare Text spectatorTargetName = \"\";\r\ndeclare Text playerLogin = \"\";\r\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "if (playerLogin == \"\" && InputPlayer != Null) {\r\n  playerLogin = InputPlayer.User.Login;\r\n  updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\r\n}\r\n\r\nif (LastPlayerInfosUpdate != lastUpdate) {\r\n  lastUpdate = LastPlayerInfosUpdate;\r\n  updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\r\n}\r\n\r\nif (GUIPlayer != Null) {\r\n  if (spectatorTargetLogin != GUIPlayer.User.Login) {\r\n    spectatorTargetLogin = GUIPlayer.User.Login;\r\n    spectatorTargetName = GUIPlayer.User.Name;\r\n    updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\r\n  }\r\n} else {\r\n  if (spectatorTargetLogin != \"\") {\r\n    spectatorTargetLogin = \"\";\r\n    spectatorTargetName = \"\";\r\n    updateWidget(PlayerInfos, spectatorTargetLogin, spectatorTargetName, playerLogin);\r\n  }\r\n}\r\n";
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

  return "<script>\r\n<!--\r\n#Struct RecordInfo {\r\n  Integer time;\r\n  Text nickName;\r\n}\r\n\r\n#Struct RecordsInfo {\r\n  RecordInfo worldRecord;\r\n  RecordInfo localRecord;\r\n}\r\n\r\nmain(){\r\n  declare RecordsInfo RecordsInfos for This;\r\n  declare Integer LastRecordsInfosUpdate for This;\r\n  declare Text recordsInfoJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"recordsInfoJson") : stack1),"{}",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":18,"column":36},"end":{"line":18,"column":77}}})) != null ? stack1 : "")
    + "\"\"\";\r\n\r\n  RecordsInfos.fromjson(recordsInfoJson);\r\n  LastRecordsInfosUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":31,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":0},"end":{"line":90,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":92,"column":0},"end":{"line":96,"column":12}}})) != null ? stack1 : "")
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":99,"column":0},"end":{"line":104,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    return "<frame pos=\"0 0\" id=\"world-record\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"10 5\" bgcolor=\"222\"/>\r\n  <quad pos=\"10 0\" z-index=\"0\" size=\"45 5\" bgcolor=\"DDD\"/>\r\n  <label pos=\"5 -2.25\" z-index=\"0\" size=\"10 5\" text=\"WR\" halign=\"center\" valign=\"center\" textsize=\"1\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\r\n  <label pos=\"11.5 -2.25\" z-index=\"0\" size=\"32.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontRegular\" valign=\"center\" textprefix=\"$i\"/>\r\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontSemiBold\"/>\r\n</frame>\r\n\r\n<frame pos=\"0 -5.25\" id=\"local-record\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"10 5\" bgcolor=\"222\"/>\r\n  <quad pos=\"10 0\" z-index=\"0\" size=\"45 5\" bgcolor=\"DDD\"/>\r\n  <label pos=\"5 -2.25\" z-index=\"0\" size=\"10 5\" text=\"LR\" halign=\"center\" valign=\"center\" textsize=\"1\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\r\n  <label pos=\"11.5 -2.25\" z-index=\"0\" size=\"32.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontRegular\" valign=\"center\" textprefix=\"$i\"/>\r\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontSemiBold\"/>\r\n</frame>\r\n";
},"4":function(container,depth0,helpers,partials,data) {
    return " #Struct RecordInfo {\r\n  Integer time;\r\n  Text nickName;\r\n}\r\n\r\n#Struct RecordsInfo {\r\n  RecordInfo worldRecord;\r\n  RecordInfo localRecord;\r\n}\r\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\r\n  declare Text secondString;\r\n  declare Text msString;\r\n\r\n  if (time <= 0) {\r\n    return \"--:--.---\";\r\n  }\r\n\r\n  declare Integer seconds = time / 1000;\r\n  declare Integer minutes = seconds / 60;\r\n  declare Integer milliseconds = time - (seconds * 1000);\r\n  seconds = seconds - (minutes * 60);\r\n\r\n  secondString = TL::ToText(seconds);\r\n\r\n  if (seconds < 10) {\r\n    secondString = \"0\" ^ secondString;\r\n  }\r\n\r\n  if (milliseconds <= 0) {\r\n    msString = \"000\";\r\n  } else if (milliseconds < 10) {\r\n    msString = \"00\" ^ TL::ToText(milliseconds);\r\n  } else if (milliseconds < 100) {\r\n    msString = \"0\" ^ TL::ToText(milliseconds);\r\n  } else {\r\n    msString = TL::ToText(milliseconds);\r\n  }\r\n\r\n  if (minutes > 0) {\r\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\r\n  } else {\r\n    return secondString ^ \".\" ^ msString;\r\n  }\r\n\r\n  return \"\";\r\n}\r\n\r\nVoid updateWidget(RecordsInfo recordsInfo) {\r\n  declare worldRecordFrame <=> (Page.MainFrame.GetFirstChild(\"world-record\") as CMlFrame);\r\n  declare localRecordFrame <=> (Page.MainFrame.GetFirstChild(\"local-record\") as CMlFrame);\r\n\r\n  // Update World Record\r\n  declare Text wrName = recordsInfo.worldRecord.nickName;\r\n  declare Integer wrTime = recordsInfo.worldRecord.time;\r\n\r\n  (worldRecordFrame.Controls[3] as CMlLabel).SetText(wrName);\r\n  (worldRecordFrame.Controls[4] as CMlLabel).SetText(formatTime(wrTime));\r\n\r\n  // Update Local Record\r\n  declare Text lrName = recordsInfo.localRecord.nickName;\r\n  declare Integer lrTime = recordsInfo.localRecord.time;\r\n\r\n  (localRecordFrame.Controls[3] as CMlLabel).SetText(lrName);\r\n  (localRecordFrame.Controls[4] as CMlLabel).SetText(formatTime(lrTime));\r\n}\r\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "declare RecordsInfo RecordsInfos for This;\r\ndeclare Integer LastRecordsInfosUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "if (LastRecordsInfosUpdate != lastUpdate) {\r\n  lastUpdate = LastRecordsInfosUpdate;\r\n  updateWidget(RecordsInfos);\r\n}\r\n";
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

  return "<script>\r\n<!--\r\n#Struct ActiveRun {\r\n  Text login;\r\n  Text name;\r\n  Integer time;\r\n  Integer checkpoint;\r\n}\r\n\r\nmain(){\r\n  declare ActiveRun[] ActiveRuns for This;\r\n  declare Integer LastActiveRunsUpdate for This;\r\n  declare Text activeRunsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"activeRunsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":15,"column":35},"end":{"line":15,"column":75}}})) != null ? stack1 : "")
    + "\"\"\";\r\n\r\n  ActiveRuns.fromjson(activeRunsJson);\r\n  LastActiveRunsUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":0},"end":{"line":35,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":0},"end":{"line":131,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":133,"column":0},"end":{"line":140,"column":12}}})) != null ? stack1 : "")
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":143,"column":0},"end":{"line":148,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"events",{"name":"content","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":150,"column":0},"end":{"line":157,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\r\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Active Runs\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\r\n</frame>\r\n\r\n<framemodel id=\"active-run\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"40.5 5\" bgcolor=\"DDD\"/>\r\n  <quad pos=\"40.5 0\" z-index=\"0\" size=\"14.5 5\" bgcolor=\"BBB\"/>\r\n  <quad pos=\"1.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\r\n  <label pos=\"7 -2.25\" z-index=\"0\" size=\"30.5 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\r\n  <label pos=\"39.75 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"right\" textcolor=\"222\" textsize=\"1\" textfont=\"GameFontRegular\" valign=\"center\"/>\r\n  <label pos=\"54 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\r\n  \r\n  <quad class=\"trigger\" pos=\"0 0\" z-index=\"-2\" size=\"55 5\" bgcolor=\"000\" opacity=\"0\" scriptevents=\"1\" />\r\n</framemodel>\r\n\r\n<frame id=\"active-runs\" pos=\"0 -5.25\" size=\"55 42\">\r\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":20,"column":15},"end":{"line":20,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\r\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":23,"column":10}}})) != null ? stack1 : "")
    + "</frame>\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frameinstance modelid=\"active-run\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":22,"column":43},"end":{"line":22,"column":65}}}))
    + "\" />\r\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct ActiveRun {\r\n  Text login;\r\n  Text name;\r\n  Integer time;\r\n  Integer checkpoint;\r\n}\r\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\r\n  declare Text secondString;\r\n  declare Text msString;\r\n\r\n  if (time <= 0) {\r\n    return \"--:--.---\";\r\n  }\r\n\r\n  declare Integer seconds = time / 1000;\r\n  declare Integer minutes = seconds / 60;\r\n  declare Integer milliseconds = time - (seconds * 1000);\r\n  seconds = seconds - (minutes * 60);\r\n\r\n  secondString = TL::ToText(seconds);\r\n\r\n  if (seconds < 10) {\r\n    secondString = \"0\" ^ secondString;\r\n  }\r\n\r\n  if (milliseconds <= 0) {\r\n    msString = \"000\";\r\n  } else if (milliseconds < 10) {\r\n    msString = \"00\" ^ TL::ToText(milliseconds);\r\n  } else if (milliseconds < 100) {\r\n    msString = \"0\" ^ TL::ToText(milliseconds);\r\n  } else {\r\n    msString = TL::ToText(milliseconds);\r\n  }\r\n\r\n  if (minutes > 0) {\r\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\r\n  } else {\r\n    return secondString ^ \".\" ^ msString;\r\n  }\r\n\r\n  return \"\";\r\n}\r\n\r\nVoid updateActiveRunRow(Integer index, ActiveRun activeRun) {\r\n  declare activeRunsFrame <=> (Page.MainFrame.GetFirstChild(\"active-runs\") as CMlFrame);\r\n\r\n  if (index >= activeRunsFrame.Controls.count) {\r\n    return;\r\n  }\r\n\r\n  declare activeRunFrame <=> (activeRunsFrame.Controls[index + 1] as CMlFrame);\r\n  (activeRunFrame.Controls[2] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ activeRun.login ^ \"/country\";\r\n  (activeRunFrame.Controls[3] as CMlLabel).SetText(activeRun.name);\r\n  declare Text checkpointText = \"0\";\r\n  if (activeRun.checkpoint == -69) {\r\n    checkpointText = \"\";\r\n  } else {\r\n    checkpointText = TL::ToText(activeRun.checkpoint);\r\n  }\r\n  (activeRunFrame.Controls[4] as CMlLabel).SetText(checkpointText);\r\n  (activeRunFrame.Controls[5] as CMlLabel).SetText(formatTime(activeRun.time));\r\n  activeRunFrame.DataAttributeSet(\"login\", activeRun.login);\r\n  activeRunFrame.Show();\r\n}\r\n\r\nVoid updateScroll(ActiveRun[] activeRuns) {\r\n  declare activeRunsFrame <=> (Page.MainFrame.GetFirstChild(\"active-runs\") as CMlFrame);\r\n  declare Integer activeRunCount = activeRuns.count;\r\n  if (activeRunCount > activeRunsFrame.Controls.count) {\r\n    activeRunCount = activeRunsFrame.Controls.count;\r\n  }\r\n  declare Real maxY = activeRunCount * 5.25 - 42;\r\n  if (maxY < 0) {\r\n    maxY = 0.;\r\n  }\r\n  activeRunsFrame.ScrollMax = <0., maxY>;\r\n}\r\n\r\nVoid updateWidget(ActiveRun[] activeRuns) {\r\n  declare activeRunCount = activeRuns.count;\r\n  declare index = 0;\r\n\r\n  foreach (activeRun in activeRuns) {\r\n    updateActiveRunRow(index, activeRun);\r\n    index = index + 1;\r\n  }\r\n\r\n  declare activeRunsFrame <=> (Page.MainFrame.GetFirstChild(\"active-runs\") as CMlFrame);\r\n  // Hide unused rows\r\n  while (index < activeRunsFrame.Controls.count - 1) {\r\n    declare activeRunFrame <=> (activeRunsFrame.Controls[index + 1] as CMlFrame);\r\n    activeRunFrame.DataAttributeSet(\"login\", \"\");\r\n    activeRunFrame.Hide();\r\n    index = index + 1;\r\n  }\r\n\r\n  updateScroll(activeRuns);\r\n}\r\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare ActiveRun[] ActiveRuns for This;\r\ndeclare Integer LastActiveRunsUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\ndeclare activeRunsFrame <=> (widget.GetFirstChild(\"active-runs\") as CMlFrame);\r\nactiveRunsFrame.ScrollActive = True;\r\nactiveRunsFrame.ScrollMin = <0., 0.>;\r\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastActiveRunsUpdate != lastUpdate) {\r\n  lastUpdate = LastActiveRunsUpdate;\r\n  updateWidget(ActiveRuns);\r\n}\r\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"trigger\") && event.Type == CMlScriptEvent::Type::MouseClick) {\r\n  declare targetLogin = event.Control.Parent.DataAttributeGet(\"login\");\r\n  if (targetLogin != \"\") {\r\n    SetSpectateTarget(targetLogin);\r\n  }\r\n}\r\n";
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

  return "<script>\r\n<!--\r\n#Struct Record {\r\n  Integer rank;\r\n  Integer time;\r\n  Text name;\r\n  Text login;\r\n}\r\n\r\nmain(){\r\n  declare Record[] Records for This;\r\n  declare Integer LastRecordsUpdate for This;\r\n  declare Text recordsJson = \"\"\""
    + ((stack1 = (lookupProperty(helpers,"default")||(depth0 && lookupProperty(depth0,"default"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"recordsJson") : stack1),"[]",{"name":"default","hash":{},"data":data,"loc":{"start":{"line":15,"column":32},"end":{"line":15,"column":69}}})) != null ? stack1 : "")
    + "\"\"\";\r\n\r\n  Records.fromjson(recordsJson);\r\n  LastRecordsUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"globals",{"name":"content","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":31,"column":0},"end":{"line":43,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":45,"column":0},"end":{"line":193,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":195,"column":0},"end":{"line":203,"column":12}}})) != null ? stack1 : "")
    + "\r\n\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":206,"column":0},"end":{"line":219,"column":12}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frame pos=\"0 0\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"55 5\" bgcolor=\"222\"/>\r\n  <label pos=\"27.5 -2.25\" z-index=\"0\" size=\"55 5\" text=\"Leaderboard\" halign=\"center\" textsize=\"1\" textfont=\"GameFontSemiBold\" valign=\"center\"/>\r\n</frame>\r\n\r\n<framemodel id=\"record\">\r\n  <quad pos=\"0 0\" z-index=\"0\" size=\"5 5\" bgcolor=\"222\"/>\r\n  <quad pos=\"5 0\" z-index=\"0\" size=\"50 5\" bgcolor=\"DDD\"/>\r\n  <label pos=\"2.4 -2.25\" z-index=\"0\" size=\"5 5\" text=\"0\" halign=\"center\" valign=\"center\" textsize=\"1.25\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\r\n  <quad pos=\"6.25 -1\" z-index=\"0\" size=\"4.5 3\" bgcolor=\"DDD\" image=\"file://Media/Flags/WOR.dds\"/>\r\n  <label pos=\"12 -2.25\" z-index=\"0\" size=\"27 5\" text=\"-\" textcolor=\"222\" textsize=\"1.2\" textfont=\"GameFontRegular\" valign=\"center\"/>\r\n  <label pos=\"53 -2.25\" z-index=\"0\" size=\"12.5 5\" text=\"--:--.---\" valign=\"center\" halign=\"right\" textsize=\"1\" textcolor=\"222\" textfont=\"GameFontSemiBold\"/>\r\n\r\n  <frame pos=\"56 0\" size=\"14.5 5\" z-index=\"2\" id=\"personalBest\">\r\n    <quad pos=\"0 0\" size=\"14.5 5\" bgcolor=\"22D\" z-index=\"2\" />\r\n    <label pos=\"7.25 -2.25\" size=\"14.5 5\" text=\"-00.000\" z-index=\"2\" halign=\"center\" valign=\"center\" textsize=\"1\" textcolor=\"DDD\" textfont=\"GameFontSemiBold\"/>\r\n  </frame>\r\n</framemodel>\r\n\r\n<frame id=\"records\" pos=\"0 -5.25\" size=\"55 42\">\r\n<quad size=\"55 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||alias2).call(alias1,100,5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":23,"column":15},"end":{"line":23,"column":38}}}))
    + "\" bgcolor=\"fff\" opacity=\"0\" scriptevents=\"1\"/>\r\n"
    + ((stack1 = (lookupProperty(helpers,"range")||(depth0 && lookupProperty(depth0,"range"))||alias2).call(alias1,0,100,{"name":"range","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":24,"column":0},"end":{"line":26,"column":10}}})) != null ? stack1 : "")
    + "</frame>\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<frameinstance modelid=\"record\" pos=\"0 "
    + container.escapeExpression((lookupProperty(helpers,"multiply")||(depth0 && lookupProperty(depth0,"multiply"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"i") : depth0),-5.25,{"name":"multiply","hash":{},"data":data,"loc":{"start":{"line":25,"column":39},"end":{"line":25,"column":61}}}))
    + "\" />\r\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "#Struct Record {\r\n  Integer rank;\r\n  Integer time;\r\n  Text name;\r\n  Text login;\r\n}\r\n\r\n#Struct PersonalBest {\r\n  Text login;\r\n  Integer timeDiff;\r\n}\r\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "Text formatTime(Integer time) {\r\n  declare Text secondString;\r\n  declare Text msString;\r\n\r\n  if (time <= 0) {\r\n    return \"--:--.---\";\r\n  }\r\n\r\n  declare Integer seconds = time / 1000;\r\n  declare Integer minutes = seconds / 60;\r\n  declare Integer milliseconds = time - (seconds * 1000);\r\n  seconds = seconds - (minutes * 60);\r\n\r\n  secondString = TL::ToText(seconds);\r\n\r\n  if (seconds < 10) {\r\n    secondString = \"0\" ^ secondString;\r\n  }\r\n\r\n  if (milliseconds <= 0) {\r\n    msString = \"000\";\r\n  } else if (milliseconds < 10) {\r\n    msString = \"00\" ^ TL::ToText(milliseconds);\r\n  } else if (milliseconds < 100) {\r\n    msString = \"0\" ^ TL::ToText(milliseconds);\r\n  } else {\r\n    msString = TL::ToText(milliseconds);\r\n  }\r\n\r\n  if (minutes > 0) {\r\n    return TL::ToText(minutes) ^ \":\" ^ secondString ^ \".\" ^ msString;\r\n  } else {\r\n    return secondString ^ \".\" ^ msString;\r\n  }\r\n\r\n  return \"\";\r\n}\r\n\r\nPersonalBest[] getPersonalBests(Record[] previousRecords, Record[] currentRecords) {\r\n  declare PersonalBest[] personalBests = [];\r\n\r\n  foreach (prevRecord in previousRecords) {\r\n    foreach (currRecord in currentRecords) {\r\n      if (currRecord.time <= 0) {\r\n        // Skip invalid times\r\n        continue;\r\n      }\r\n\r\n      if (prevRecord.login == currRecord.login) {\r\n        if (currRecord.time < prevRecord.time) {\r\n          personalBests.add(PersonalBest{\r\n            login = currRecord.login,\r\n            timeDiff = prevRecord.time - currRecord.time\r\n          });\r\n        }\r\n        break;\r\n      }\r\n    }\r\n  }\r\n\r\n  return personalBests;\r\n}\r\n\r\nVoid updateRecordRow(Integer index, Record record) {\r\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\r\n\r\n  if (index >= recordsFrame.Controls.count) {\r\n    return;\r\n  }\r\n\r\n  declare recordFrame <=> (recordsFrame.Controls[index + 1] as CMlFrame);\r\n  (recordFrame.Controls[2] as CMlLabel).SetText(TL::ToText(record.rank));\r\n  (recordFrame.Controls[3] as CMlQuad).ImageUrl = \"file://ZoneFlags/Login/\" ^ record.login ^ \"/country\";\r\n  (recordFrame.Controls[4] as CMlLabel).SetText(record.name);\r\n  (recordFrame.Controls[5] as CMlLabel).SetText(formatTime(record.time));\r\n  recordFrame.DataAttributeSet(\"login\", record.login);\r\n  recordFrame.Show();\r\n}\r\n\r\nVoid updateScroll(Record[] records) {\r\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\r\n  declare Integer recordCount = records.count;\r\n  if (recordCount > recordsFrame.Controls.count) {\r\n    recordCount = recordsFrame.Controls.count;\r\n  }\r\n  declare Real maxY = recordCount * 5.25 - 42;\r\n  if (maxY < 0) {\r\n    maxY = 0.;\r\n  }\r\n  recordsFrame.ScrollMax = <0., maxY>;\r\n}\r\n\r\nVoid updateWidget(Record[] records) {\r\n  declare recordCount = records.count;\r\n  declare index = 0;\r\n\r\n  foreach (record in records) {\r\n    updateRecordRow(index, record);\r\n    index = index + 1;\r\n  }\r\n\r\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\r\n  // Hide unused rows\r\n  while (index < recordsFrame.Controls.count - 1) {\r\n    declare recordFrame <=> (recordsFrame.Controls[index + 1] as CMlFrame);\r\n    recordFrame.DataAttributeSet(\"login\", \"\");\r\n    recordFrame.Hide();\r\n    index = index + 1;\r\n  }\r\n\r\n  updateScroll(records);\r\n}\r\n\r\nVoid updatePersonalBest(PersonalBest pb) {\r\n  declare recordsFrame <=> (Page.MainFrame.GetFirstChild(\"records\") as CMlFrame);\r\n\r\n  foreach (control in recordsFrame.Controls) {\r\n    // Skip first control (invisible background quad)\r\n    if (control == recordsFrame.Controls[0]) {\r\n      continue;\r\n    }\r\n\r\n    declare recordFrame <=> (control as CMlFrame);\r\n    declare Text login = recordFrame.DataAttributeGet(\"login\");\r\n\r\n    if (login == pb.login) {\r\n      declare CMlFrame personalBestFrame <=> (recordFrame.GetFirstChild(\"personalBest\") as CMlFrame);\r\n      declare CMlLabel personalBestLabel = personalBestFrame.Controls[1] as CMlLabel;\r\n\r\n      // Update personal best label\r\n      personalBestLabel.SetText(\"-\" ^ formatTime(pb.timeDiff));\r\n\r\n      AnimMgr.Flush(personalBestFrame); // Clear any ongoing animations\r\n\r\n      // Start animation\r\n      AnimMgr.Add(personalBestFrame, \"\"\"<frame pos='\"\"\" ^ \"40.5 0\" ^ \"\"\"' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n      \r\n      // Hold position while not blocking code\r\n      AnimMgr.AddChain(personalBestFrame, \"\"\"<frame pos='\"\"\" ^ \"40.5 0\" ^ \"\"\"' />\"\"\", 3000, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n\r\n      // Hide animation\r\n      AnimMgr.AddChain(personalBestFrame, \"\"\"<frame pos='\"\"\" ^ \"56 0\" ^ \"\"\"' />\"\"\", 600, CAnimManager::EAnimManagerEasing::ExpInOut);\r\n\r\n      break;\r\n    }\r\n  }\r\n}\r\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "declare Record[] Records for This;\r\ndeclare Record[] lastRecords = [];\r\ndeclare Integer LastRecordsUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\ndeclare recordsFrame <=> (widget.GetFirstChild(\"records\") as CMlFrame);\r\nrecordsFrame.ScrollActive = True;\r\nrecordsFrame.ScrollMin = <0., 0.>;\r\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "if (LastRecordsUpdate != lastUpdate) {\r\n  lastUpdate = LastRecordsUpdate;\r\n\r\n  declare PersonalBest[] personalBests = getPersonalBests(lastRecords, Records);\r\n  lastRecords = Records;\r\n\r\n  updateWidget(Records);\r\n  \r\n  foreach (pb in personalBests) {\r\n    updatePersonalBest(pb);\r\n  }\r\n}\r\n";
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

  return "<script>\r\n<!--\r\nmain(){\r\n  declare Boolean ECMIsEditor for This;\r\n  declare Text ECMAPIKey for This;\r\n  declare Boolean ECMIsRecording for This;\r\n  declare Integer ECMCurrentRound for This;\r\n  declare Integer LastECMUpdate for This;\r\n  \r\n  ECMIsEditor = "
    + alias3((lookupProperty(helpers,"bool")||(depth0 && lookupProperty(depth0,"bool"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isEditor") : stack1),{"name":"bool","hash":{},"data":data,"loc":{"start":{"line":12,"column":16},"end":{"line":12,"column":40}}}))
    + ";\r\n  ECMAPIKey = \""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"apiKey") : stack1), depth0))
    + "\";\r\n  ECMIsRecording = "
    + alias3((lookupProperty(helpers,"bool")||(depth0 && lookupProperty(depth0,"bool"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"bool","hash":{},"data":data,"loc":{"start":{"line":14,"column":19},"end":{"line":14,"column":46}}}))
    + ";\r\n  ECMCurrentRound = "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"currentRound") : stack1), depth0))
    + ";\r\n  LastECMUpdate = GameTime;\r\n}\r\n-->\r\n</script>\r\n";
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
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"script",{"name":"content","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":55,"column":0},"end":{"line":125,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"main",{"name":"content","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":127,"column":0},"end":{"line":134,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
    + ((stack1 = (lookupProperty(helpers,"content")||(depth0 && lookupProperty(depth0,"content"))||alias2).call(alias1,"loop",{"name":"content","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":136,"column":0},"end":{"line":141,"column":12}}})) != null ? stack1 : "")
    + "\r\n"
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
    + "\" hidden=\"1\">\r\n  <frame id=\"recording-status\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":4,"column":37},"end":{"line":4,"column":60}}}))
    + " 5\">\r\n    <label text=\"\" pos=\"0 -2.25\" textcolor=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(5, data, 0),"data":data,"loc":{"start":{"line":5,"column":45},"end":{"line":5,"column":90}}})) != null ? stack1 : "")
    + "\" textsize=\"1\" valign=\"center\" />\r\n    <label text=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.program(9, data, 0),"data":data,"loc":{"start":{"line":6,"column":17},"end":{"line":6,"column":78}}})) != null ? stack1 : "")
    + "\" pos=\"3.5 -2.25\" size=\"20 5\" textsize=\"1\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontRegular\" />\r\n\r\n    <frame id=\"toggle-recording\" pos=\"25 0\" size=\"25 5\">\r\n      <quad pos=\"0 0\" size=\"25 5\" bgcolor=\"CCC\" action=\"ecm-toggle-recording\" />\r\n      <quad pos=\"0 -4.75\" size=\"25 0.25\" bgcolor=\"222\" />\r\n      <label pos=\"12.5 -2.25\" text=\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"isRecording") : stack1),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.program(13, data, 0),"data":data,"loc":{"start":{"line":11,"column":36},"end":{"line":11,"column":84}}})) != null ? stack1 : "")
    + " recording\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\r\n    </frame>\r\n  </frame>\r\n\r\n  <frame id=\"api-key-frame\" pos=\"0 -6\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":15,"column":45},"end":{"line":15,"column":68}}}))
    + " 12.25\">\r\n    <label text=\"API Key\" pos=\"0 -2.25\" size=\"25 3\" textsize=\"0.6\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontSemiBold\" />\r\n    <frame id=\"input-frame\" pos=\"0 -4.5\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":17,"column":47},"end":{"line":17,"column":70}}}))
    + " 7.75\">\r\n      <quad pos=\"0 -4.75\" size=\"37 0.25\" bgcolor=\"222\" />\r\n      <entry pos=\"0 -2.25\" default=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"apiKey") : stack1), depth0))
    + "\" size=\"32 5\" name=\"ecm-api-key-entry\" id=\"ecm-api-key-entry\" class=\"ecm-api-key-entry\" textsize=\"1\" focusareacolor1=\"CCC\" focusareacolor2=\"CCC\" textcolor=\"222\" scriptevents=\"1\" textformat=\"Password\" valuetype=\"Ml_String\" valign=\"center\" textfont=\"GameFontRegular\" />\r\n      <label pos=\"34.5 -2.25\" size=\"5 5\" text=\"\" textcolor=\"222\" focusareacolor1=\"CCC\" focusareacolor2=\"CCC\" halign=\"center\" valign=\"center\" textsize=\"1\" scriptevents=\"1\" class=\"ecm-api-key-entry-toggle\" />\r\n\r\n      <frame id=\"save-api-key\" pos=\"38 0\" size=\"12 5\">\r\n        <quad pos=\"0 0\" size=\"12 5\" bgcolor=\"CCC\" action=\"ecm-save-api-key\" />\r\n        <quad pos=\"0 -4.75\" size=\"12 0.25\" bgcolor=\"222\" />\r\n        <label pos=\"6 -2.25\" text=\"Save\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\r\n      </frame>\r\n\r\n      <label id=\"error-label\" pos=\"0 -6.25\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":28,"column":50},"end":{"line":28,"column":73}}}))
    + " 3\" textsize=\"0.6\" textcolor=\"D22\" valign=\"center\" textfont=\"GameFontRegular\" />\r\n    </frame>\r\n  </frame>\r\n\r\n  <frame id=\"round-info-frame\" pos=\"0 -19\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":32,"column":49},"end":{"line":32,"column":72}}}))
    + " 9.5\">\r\n    <label text=\"Round info\" pos=\"0 -2.25\" size=\"25 3\" textsize=\"0.6\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontSemiBold\" />\r\n    <frame id=\"round-info\" pos=\"0 -4.5\" size=\""
    + alias3((lookupProperty(helpers,"subtract")||(depth0 && lookupProperty(depth0,"subtract"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"x") : stack1),4,{"name":"subtract","hash":{},"data":data,"loc":{"start":{"line":34,"column":46},"end":{"line":34,"column":69}}}))
    + " 5\">\r\n      <label text=\"Round "
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"data") : depth0)) != null ? lookupProperty(stack1,"currentRound") : stack1), depth0))
    + "\" pos=\"0 -2.25\" size=\"12 5\" textsize=\"1\" textcolor=\"222\" valign=\"center\" textfont=\"GameFontRegular\" />\r\n\r\n      <frame id=\"round-controls\">\r\n        <frame id=\"decrease-round-offset\" pos=\"14 0\" size=\"5 5\">\r\n          <quad pos=\"0 0\" size=\"5 5\" bgcolor=\"CCC\" action=\"ecm-decrease-round-offset\" />\r\n          <quad pos=\"0 -4.75\" size=\"5 0.25\" bgcolor=\"222\" />\r\n          <label pos=\"2.5 -2.25\" text=\"-\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\r\n        </frame>\r\n\r\n        <frame id=\"increase-round-offset\" pos=\"20 0\" size=\"5 5\">\r\n          <quad pos=\"0 0\" size=\"5 5\" bgcolor=\"CCC\" action=\"ecm-increase-round-offset\" />\r\n          <quad pos=\"0 -4.75\" size=\"5 0.25\" bgcolor=\"222\" />\r\n          <label pos=\"2.5 -2.25\" text=\"+\" textsize=\"1\" textcolor=\"222\" valign=\"center\" halign=\"center\" textfont=\"GameFontRegular\" />\r\n        </frame>\r\n      </frame>\r\n    </frame>\r\n  </frame>\r\n</frame>\r\n";
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
    return "Void updateIsEditor(Boolean isEditor) {\r\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\r\n  declare toggleRecordingFrame <=> ((window.GetFirstChild(\"recording-status\") as CMlFrame).GetFirstChild(\"toggle-recording\") as CMlFrame);\r\n  declare apiKeyFrame <=> (window.GetFirstChild(\"api-key-frame\") as CMlFrame);\r\n  declare roundInfoFrame <=> (window.GetFirstChild(\"round-info-frame\") as CMlFrame);\r\n  declare roundControlsFrame <=> ((roundInfoFrame.GetFirstChild(\"round-info\") as CMlFrame).GetFirstChild(\"round-controls\") as CMlFrame);\r\n\r\n  if (isEditor) {\r\n    toggleRecordingFrame.Show();\r\n    apiKeyFrame.Show();\r\n    roundInfoFrame.RelativePosition_V3 = <0., -19.>;\r\n    roundControlsFrame.Show();\r\n  } else {\r\n    toggleRecordingFrame.Hide();\r\n    apiKeyFrame.Hide();\r\n    roundInfoFrame.RelativePosition_V3 = <0., -6.>;\r\n    roundControlsFrame.Hide();\r\n  }\r\n\r\n  window.Show();\r\n}\r\n\r\nVoid updateRecording(Boolean isRecording) {\r\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\r\n  declare statusFrame <=> (window.GetFirstChild(\"recording-status\") as CMlFrame);\r\n  declare toggleRecordingFrame <=> (statusFrame.GetFirstChild(\"toggle-recording\") as CMlFrame);\r\n\r\n  declare recordingStatusLabel <=> statusFrame.Controls[0] as CMlLabel;\r\n  declare labelText <=> statusFrame.Controls[1] as CMlLabel;\r\n  declare toggleRecordingLabel <=> toggleRecordingFrame.Controls[2] as CMlLabel;\r\n\r\n  declare Real low = 2./16.;\r\n  declare Real high = 14./16.;\r\n\r\n  if (isRecording) {\r\n    recordingStatusLabel.TextColor = <low,high,low>;\r\n    labelText.SetText(\"Recording\");\r\n    toggleRecordingLabel.SetText(\"Stop recording\");\r\n  } else {\r\n    recordingStatusLabel.TextColor = <high,low,low>;\r\n    labelText.SetText(\"Not Recording\");\r\n    toggleRecordingLabel.SetText(\"Start recording\");\r\n  }\r\n}\r\n\r\nVoid updateApiKey(Text apiKey) {\r\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\r\n  declare apiKeyFrame <=> (window.GetFirstChild(\"api-key-frame\") as CMlFrame);\r\n  declare inputFrame <=> (apiKeyFrame.GetFirstChild(\"input-frame\") as CMlFrame);\r\n  declare apiKeyEntry <=> (inputFrame.GetFirstChild(\"ecm-api-key-entry\") as CMlEntry);\r\n\r\n  apiKeyEntry.SetText(apiKey, False);\r\n}\r\n\r\nVoid updateRoundInfo(Integer currentRound) {\r\n  declare window <=> (Page.MainFrame.GetFirstChild(\"ecm-window\") as CMlFrame);\r\n  declare roundInfoFrame <=> (window.GetFirstChild(\"round-info-frame\") as CMlFrame);\r\n  declare roundInfo <=> (roundInfoFrame.GetFirstChild(\"round-info\") as CMlFrame);\r\n  declare roundInfoLabel <=> (roundInfo.Controls[0] as CMlLabel);\r\n\r\n  roundInfoLabel.SetText(\"Round \" ^ currentRound);\r\n}\r\n\r\nVoid updateWindow(Boolean ecmIsEditor, Text ecmAPIKey, Boolean ecmIsRecording, Integer ecmCurrentRound) {\r\n  updateIsEditor(ecmIsEditor);\r\n  updateRecording(ecmIsRecording);\r\n  updateApiKey(ecmAPIKey);\r\n  updateRoundInfo(ecmCurrentRound);\r\n}\r\n";
},"17":function(container,depth0,helpers,partials,data) {
    return "declare Boolean ECMIsEditor for This = False;\r\ndeclare Text ECMAPIKey for This = \"\";\r\ndeclare Boolean ECMIsRecording for This = False;\r\ndeclare Integer ECMCurrentRound for This = 1;\r\ndeclare Integer LastECMUpdate for This = -1;\r\ndeclare Integer lastUpdate = -1;\r\n";
},"19":function(container,depth0,helpers,partials,data) {
    return "if (LastECMUpdate != lastUpdate) {\r\n  lastUpdate = LastECMUpdate;\r\n  updateWindow(ECMIsEditor, ECMAPIKey, ECMIsRecording, ECMCurrentRound);\r\n}\r\n";
},"21":function(container,depth0,helpers,partials,data) {
    return "if (event.Control.HasClass(\"ecm-api-key-entry\") && event.Type == CMlScriptEvent::Type::EntrySubmit) {\r\n  declare entryControl <=> (event.Control as CMlEntry);\r\n  declare errorLabel <=> (entryControl.Parent.GetFirstChild(\"error-label\") as CMlLabel);\r\n\r\n  declare Integer nbUnderscores = TL::Split(\"_\", entryControl.Value, False).count - 1;\r\n  if (nbUnderscores < 0) {\r\n    nbUnderscores = 0;\r\n  }\r\n\r\n  if (TL::Length(entryControl.Value) > 0 && nbUnderscores != 1) {\r\n    errorLabel.SetText(\"Expected 1 underscore, found \" ^ nbUnderscores);\r\n  } else {\r\n    errorLabel.SetText(\"\");\r\n  }\r\n}\r\n\r\nif (event.Control.HasClass(\"ecm-api-key-entry-toggle\") && event.Type == CMlScriptEvent::Type::MouseClick) {\r\n  declare entryControl <=> (event.Control.Parent.GetFirstChild(\"ecm-api-key-entry\") as CMlEntry);\r\n  if (entryControl.TextFormat == CMlEntry::ETextFormat::Password) {\r\n    entryControl.TextFormat = CMlEntry::ETextFormat::Basic;\r\n    (event.Control as CMlLabel).SetText(\"\");\r\n  } else {\r\n    entryControl.TextFormat = CMlEntry::ETextFormat::Password;\r\n    (event.Control as CMlLabel).SetText(\"\");\r\n  }\r\n}\r\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"extend")||(depth0 && lookupProperty(depth0,"extend"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"window",{"name":"extend","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":171,"column":11}}})) != null ? stack1 : "");
},"useData":true});
