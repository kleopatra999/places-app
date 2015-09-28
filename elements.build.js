(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var user = window.Polymer || {};
location.search.slice(1).split('&').forEach(function (o) {
o = o.split('=');
o[0] && (user[o[0]] = o[1] || true);
});
var wantShadow = user.dom === 'shadow';
var hasShadow = Boolean(Element.prototype.createShadowRoot);
var nativeShadow = hasShadow && !window.ShadowDOMPolyfill;
var useShadow = wantShadow && hasShadow;
var hasNativeImports = Boolean('import' in document.createElement('link'));
var useNativeImports = hasNativeImports;
var useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
return {
wantShadow: wantShadow,
hasShadow: hasShadow,
nativeShadow: nativeShadow,
useShadow: useShadow,
useNativeShadow: useShadow && nativeShadow,
useNativeImports: useNativeImports,
useNativeCustomElements: useNativeCustomElements
};
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
window.Polymer = Polymer;
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
this._callbacks.forEach(function (cb) {
cb();
});
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
this._doBehavior('registered');
},
createdCallback: function () {
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
attachedCallback: function () {
Polymer.RenderStatus.whenReady(function () {
this.isAttached = true;
this._doBehavior('attached');
}.bind(this));
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', arguments);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
Object.getOwnPropertyNames(api).forEach(function (n) {
this.copyOwnProperty(n, api, prototype);
}, this);
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
var id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDocumentUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDocumentUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument;
if (doc) {
CustomElements.upgradeAll(doc);
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
this._mixinBehavior(behaviors[i]);
}
return behaviors;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
behaviors.forEach(function (b) {
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}, this);
return flat;
},
_mixinBehavior: function (b) {
Object.getOwnPropertyNames(b).forEach(function (n) {
switch (n) {
case 'hostAttributes':
case 'registered':
case 'properties':
case 'observers':
case 'listeners':
case 'created':
case 'attached':
case 'detached':
case 'attributeChanged':
case 'configure':
case 'ready':
break;
default:
if (!this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
break;
}
}, this);
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
this.behaviors.forEach(function (b) {
this._invokeBehavior(b, name, args);
}, this);
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
this.behaviors.forEach(function (b) {
this._marshalBehavior(b);
}, this);
this._marshalBehavior(this);
}
});
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
this.behaviors.some(function (b) {
return info = this._getPropertyInfo(property, b.properties);
}, this);
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
}
});
Polymer.CaseMap = {
_caseMap: {},
dashToCamelCase: function (dash) {
var mapped = Polymer.CaseMap._caseMap[dash];
if (mapped) {
return mapped;
}
if (dash.indexOf('-') < 0) {
return Polymer.CaseMap._caseMap[dash] = dash;
}
return Polymer.CaseMap._caseMap[dash] = dash.replace(/-([a-z])/g, function (m) {
return m[1].toUpperCase();
});
},
camelToDashCase: function (camel) {
var mapped = Polymer.CaseMap._caseMap[camel];
if (mapped) {
return mapped;
}
return Polymer.CaseMap._caseMap[camel] = camel.replace(/([a-z][A-Z])/g, function (g) {
return g[0] + '-' + g[1].toLowerCase();
});
}
};
Polymer.Base._addFeature({
_prepAttributes: function () {
this._aggregatedAttributes = {};
},
_addHostAttributes: function (attributes) {
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
this._applyAttributes(this, this._aggregatedAttributes);
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
this.serializeValueToAttribute(attr$[n], n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
for (var i = 0, l = this.attributes.length; i < l; i++) {
this._setAttributeToProperty(model, this.attributes[i].name);
}
},
_setAttributeToProperty: function (model, attrName) {
if (!this._serializing) {
var propName = Polymer.CaseMap.dashToCamelCase(attrName);
var info = this.getPropertyInfo(propName);
if (info.defined || this._propertyEffects && this._propertyEffects[propName]) {
var val = this.getAttribute(attrName);
model[propName] = this.deserialize(val, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (name) {
this._serializing = true;
this.serializeValueToAttribute(this[name], Polymer.CaseMap.camelToDashCase(name));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
(node || this)[str === undefined ? 'removeAttribute' : 'setAttribute'](attribute, str);
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value !== null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value;
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return debouncer && debouncer.finish;
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.version = '1.1.4';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
this._template = this._template || Polymer.DomModule.import(this.is, 'template');
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && HTMLTemplateElement.bootstrap) {
HTMLTemplateElement.decorate(this._template);
HTMLTemplateElement.bootstrap(this._template.content);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_pushHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._beginHost();
},
_beginHost: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_popHost: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
this._setupRoot();
this._readyClients();
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
this._finishDistribute();
this._clientsReadied = true;
this._clients = null;
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (var i = 1; i < rowCount; i++) {
for (var j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
var splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.EventApi = function () {
var Settings = Polymer.Settings;
var EventApi = function (event) {
this.event = event;
};
if (Settings.useShadow) {
EventApi.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
return this.event.path;
}
};
} else {
EventApi.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var o = this.rootTarget;
while (o) {
path.push(o);
o = Polymer.dom(o).parentNode || o.host;
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new EventApi(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
c$ = composed ? node._composedChildren : c$;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
var nativeAppendChild = Element.prototype.appendChild;
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
var DomApi = function (node) {
this.node = node;
if (this.patch) {
this.patch();
}
};
if (window.wrap && Settings.useShadow && !Settings.useNativeShadow) {
DomApi = function (node) {
this.node = wrap(node);
if (this.patch) {
this.patch();
}
};
}
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this._addNode(node);
},
insertBefore: function (node, ref_node) {
return this._addNode(node, ref_node);
},
_addNode: function (node, ref_node) {
this._removeNodeFromHost(node, true);
var addedInsertionPoint;
var root = this.getOwnerRoot();
if (root) {
addedInsertionPoint = this._maybeAddInsertionPoint(node, this.node);
}
if (this._nodeHasLogicalChildren(this.node)) {
if (ref_node) {
var children = this.childNodes;
var index = children.indexOf(ref_node);
if (index < 0) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
}
this._addLogicalInfo(node, this.node, index);
}
this._addNodeToHost(node);
if (!this._maybeDistribute(node, this.node) && !this._tryRemoveUndistributedNode(node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
addToComposedParent(container, node, ref_node);
if (ref_node) {
nativeInsertBefore.call(container, node, ref_node);
} else {
nativeAppendChild.call(container, node);
}
}
if (addedInsertionPoint) {
this._updateInsertionPoints(root.host);
}
return node;
},
removeChild: function (node) {
if (factory(node).parentNode !== this.node) {
console.warn('The node to be removed is not a child of this node', node);
}
this._removeNodeFromHost(node);
if (!this._maybeDistribute(node, this.node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (container === node.parentNode) {
removeFromComposedParent(container, node);
nativeRemoveChild.call(container, node);
}
}
return node;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
if (node._ownerShadyRoot === undefined) {
var root;
if (node._isShadyRoot) {
root = node;
} else {
var parent = Polymer.dom(node).parentNode;
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
node._ownerShadyRoot = root;
}
return node._ownerShadyRoot;
},
_maybeDistribute: function (node, parent) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && Polymer.dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && Polymer.dom(fragContent).parentNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this._ownerShadyRootForNode(parent);
if (root) {
var host = root.host;
this._lazyDistribute(host);
}
}
var parentNeedsDist = this._parentNeedsDistribution(parent);
if (parentNeedsDist) {
this._lazyDistribute(parent);
}
return parentNeedsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = factory(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = factory(n).parentNode;
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
saveLightChildrenIfNeeded(parent);
saveLightChildrenIfNeeded(node);
added = true;
}
return added;
},
_tryRemoveUndistributedNode: function (node) {
if (this.node.shadyRoot) {
var parent = getComposedParent(node);
if (parent) {
nativeRemoveChild.call(parent, node);
}
return true;
}
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = factory(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(factory(c).parentNode);
}
},
_nodeHasLogicalChildren: function (node) {
return Boolean(node._lightChildren !== undefined);
},
_parentNeedsDistribution: function (parent) {
return parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot);
},
_removeNodeFromHost: function (node, ensureComposedRemoval) {
var hostNeedsDist;
var root;
var parent = node._lightParent;
if (parent) {
factory(node)._distributeParent();
root = this._ownerShadyRootForNode(node);
if (root) {
root.host._elementRemove(node);
hostNeedsDist = this._removeDistributedChildren(root, node);
}
this._removeLogicalInfo(node, node._lightParent);
}
this._removeOwnerShadyRoot(node);
if (root && hostNeedsDist) {
this._updateInsertionPoints(root.host);
this._lazyDistribute(root.host);
} else if (ensureComposedRemoval) {
removeFromComposedParent(getComposedParent(node), node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = factory(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = node.parentNode;
if (parent) {
removeFromComposedParent(parent, node);
nativeRemoveChild.call(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = factory(node).parentNode;
}
},
_addNodeToHost: function (node) {
var root = this.getOwnerRoot();
if (root) {
root.host._elementAdd(node);
}
},
_addLogicalInfo: function (node, container, index) {
var children = factory(container).childNodes;
index = index === undefined ? children.length : index;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
children.splice(index++, 0, n);
n._lightParent = container;
}
} else {
children.splice(index, 0, node);
node._lightParent = container;
}
},
_removeLogicalInfo: function (node, container) {
var children = factory(container).childNodes;
var index = children.indexOf(node);
if (index < 0 || container !== node._lightParent) {
throw Error('The node to be removed is not a child of this node');
}
children.splice(index, 1);
node._lightParent = null;
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = factory(node).childNodes;
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = factory(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = factory(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
return this.querySelectorAll(selector)[0];
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return matchesSelector.call(n, selector);
}, this.node);
},
_query: function (matcher, node) {
node = node || this.node;
var list = [];
this._queryElements(factory(node).childNodes, matcher, list);
return list;
},
_queryElements: function (elements, matcher, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
this._queryElement(c, matcher, list);
}
}
},
_queryElement: function (node, matcher, list) {
if (matcher(node)) {
list.push(node);
}
this._queryElements(factory(node).childNodes, matcher, list);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
queryDistributedElements: function (selector) {
var c$ = this.childNodes;
var list = [];
this._distributedFilter(selector, c$, list);
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
this._distributedFilter(selector, factory(c).getDistributedNodes(), list);
}
}
return list;
},
_distributedFilter: function (selector, list, results) {
results = results || [];
for (var i = 0, l = list.length, d; i < l && (d = list[i]); i++) {
if (d.nodeType === Node.ELEMENT_NODE && d.localName !== CONTENT && matchesSelector.call(d, selector)) {
results.push(d);
}
}
return results;
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._distributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._distributeParent();
},
_distributeParent: function () {
if (this._parentNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = factory(externalNode).childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
}
};
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
if (!Settings.useShadow) {
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
var c$ = getLightChildren(this.node);
return Array.isArray(c$) ? c$ : Array.prototype.slice.call(c$);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
configurable: true
},
parentNode: {
get: function () {
return this.node._lightParent || getComposedParent(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return this.childNodes[0];
},
configurable: true
},
lastChild: {
get: function () {
var c$ = this.childNodes;
return c$[c$.length - 1];
},
configurable: true
},
nextSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
firstElementChild: {
get: function () {
return this.children[0];
},
configurable: true
},
lastElementChild: {
get: function () {
var c$ = this.children;
return c$[c$.length - 1];
},
configurable: true
},
nextElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = Array.prototype.slice.call(d.childNodes);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.prototype._getComposedInnerHTML = function () {
return getInnerHTML(this.node, true);
};
} else {
var forwardMethods = [
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild'
];
forwardMethods.forEach(function (name) {
DomApi.prototype[name] = function () {
return this.node[name].apply(this.node, arguments);
};
});
DomApi.prototype.querySelectorAll = function (selector) {
return Array.prototype.slice.call(this.node.querySelectorAll(selector));
};
DomApi.prototype.getOwnerRoot = function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
};
DomApi.prototype.importNode = function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
};
DomApi.prototype.getDestinationInsertionPoints = function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype.getDistributedNodes = function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype._distributeParent = function () {
};
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
return Array.prototype.slice.call(this.node.childNodes);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.slice.call(this.node.children);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardProperties = [
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
];
forwardProperties.forEach(function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
});
}
var CONTENT = 'content';
var factory = function (node, patch) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi(node, patch);
}
return node.__domApi;
};
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return factory(obj, patch);
}
};
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_finishDebouncer: null,
flush: function () {
for (var i = 0; i < this._debouncers.length; i++) {
this._debouncers[i].complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._flushPolyfills();
if (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
this._flushGuard++;
this.flush();
} else {
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
this._flushGuard = 0;
}
},
_flushPolyfills: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
function getLightChildren(node) {
var children = node._lightChildren;
return children ? children : node.childNodes;
}
function getComposedChildren(node) {
if (!node._composedChildren) {
node._composedChildren = Array.prototype.slice.call(node.childNodes);
}
return node._composedChildren;
}
function addToComposedParent(parent, node, ref_node) {
var children = getComposedChildren(parent);
var i = ref_node ? children.indexOf(ref_node) : -1;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var fragChildren = getComposedChildren(node);
for (var j = 0; j < fragChildren.length; j++) {
addNodeToComposedChildren(fragChildren[j], parent, children, i + j);
}
node._composedChildren = null;
} else {
addNodeToComposedChildren(node, parent, children, i);
}
}
function getComposedParent(node) {
return node.__patched ? node._composedParent : node.parentNode;
}
function addNodeToComposedChildren(node, parent, children, i) {
node._composedParent = parent;
children.splice(i >= 0 ? i : children.length, 0, node);
}
function removeFromComposedParent(parent, node) {
node._composedParent = null;
if (parent) {
var children = getComposedChildren(parent);
var i = children.indexOf(node);
if (i >= 0) {
children.splice(i, 1);
}
}
}
function saveLightChildrenIfNeeded(node) {
if (!node._lightChildren) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
child._lightParent = child._lightParent || node;
}
node._lightChildren = c$;
}
}
function hasInsertionPoint(root) {
return Boolean(root && root._insertionPoints.length);
}
var p = Element.prototype;
var matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return {
getLightChildren: getLightChildren,
getComposedParent: getComposedParent,
getComposedChildren: getComposedChildren,
removeFromComposedParent: removeFromComposedParent,
saveLightChildrenIfNeeded: saveLightChildrenIfNeeded,
matchesSelector: matchesSelector,
hasInsertionPoint: hasInsertionPoint,
ctor: DomApi,
factory: factory
};
}();
(function () {
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_poolContent: function () {
if (this._useContent) {
saveLightChildrenIfNeeded(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLightChildren(this._lightChildren);
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
saveLightChildrenIfNeeded(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
var dom = Polymer.dom(this);
if (updateInsertionPoints) {
dom._updateInsertionPoints(this);
}
var host = getTopDistributingHost(this);
dom._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
} else {
if (!this.shadyRoot._hasDistributed) {
this.textContent = '';
this._composedChildren = null;
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = getLightChildren(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = p._lightParent || p.parentNode;
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = getLightChildren(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = getComposedChildren(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (getComposedParent(n) === container) {
remove(n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (var j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
ensureComposedParent(container, children);
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
var saveLightChildrenIfNeeded = Polymer.DomApi.saveLightChildrenIfNeeded;
var getLightChildren = Polymer.DomApi.getLightChildren;
var matchesSelector = Polymer.DomApi.matchesSelector;
var hasInsertionPoint = Polymer.DomApi.hasInsertionPoint;
var getComposedChildren = Polymer.DomApi.getComposedChildren;
var getComposedParent = Polymer.DomApi.getComposedParent;
var removeFromComposedParent = Polymer.DomApi.removeFromComposedParent;
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = content._lightParent;
if (parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
function insertBefore(parentNode, newChild, refChild) {
var newChildParent = getComposedParent(newChild);
if (newChildParent !== parentNode) {
removeFromComposedParent(newChildParent, newChild);
}
remove(newChild);
nativeInsertBefore.call(parentNode, newChild, refChild || null);
newChild._composedParent = parentNode;
}
function remove(node) {
var parentNode = getComposedParent(node);
if (parentNode) {
node._composedParent = null;
nativeRemoveChild.call(parentNode, node);
}
}
function ensureComposedParent(parent, children) {
for (var i = 0, n; i < children.length; i++) {
children[i]._composedParent = parent;
}
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = Polymer.dom(host).children;
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName === 'content') {
return host.domHost;
}
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLightChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list);
return list;
},
_parseNodeAnnotations: function (node, list) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list);
},
_testEscape: function (value) {
var escape = value.slice(0, 2);
if (escape === '{{' || escape === '[[') {
return escape;
}
},
_parseTextNodeAnnotation: function (node, list) {
var v = node.textContent;
var escape = this._testEscape(v);
if (escape) {
node.textContent = ' ';
var annote = {
bindings: [{
kind: 'text',
mode: escape[0],
value: v.slice(2, -2).trim()
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, callback) {
if (root.firstChild) {
for (var i = 0, node = root.firstChild; node; node = node.nextSibling, i++) {
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = node.nextSibling;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
root.removeChild(n);
n = n.nextSibling;
}
}
var childAnnotation = this._parseNodeAnnotations(node, list, callback);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
for (var i = node.attributes.length - 1, a; a = node.attributes[i]; i--) {
var n = a.name, v = a.value;
if (n === 'id' && !this._testEscape(v)) {
annotation.id = v;
} else if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else {
var b = this._parseNodeAttributeAnnotation(node, n, v);
if (b) {
annotation.bindings.push(b);
}
}
}
},
_parseNodeAttributeAnnotation: function (node, n, v) {
var escape = this._testEscape(v);
if (escape) {
var customEvent;
var name = n;
var mode = escape[0];
v = v.slice(2, -2).trim();
var not = false;
if (v[0] == '!') {
v = v.substring(1);
not = true;
}
var kind = 'property';
if (n[n.length - 1] == '$') {
name = n.slice(0, -1);
kind = 'attribute';
}
var notifyEvent, colon;
if (mode == '{' && (colon = v.indexOf('::')) > 0) {
notifyEvent = v.substring(colon + 2);
v = v.substring(0, colon);
customEvent = true;
}
if (node.localName == 'input' && n == 'value') {
node.setAttribute(n, '');
}
node.removeAttribute(n);
if (kind === 'property') {
name = Polymer.CaseMap.dashToCamelCase(name);
}
return {
kind: kind,
mode: mode,
name: name,
value: v,
negate: not,
event: notifyEvent,
customEvent: customEvent
};
}
},
_localSubTree: function (node, host) {
return node === host ? node.childNodes : node._lightChildren || node.childNodes;
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
return !parent ? root : Polymer.Annotations._localSubTree(parent, root)[annote.index];
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
Polymer.Annotations.prepElement = this._prepElement.bind(this);
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
}
this._processAnnotations(this._notes);
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
b.signature = this._parseMethod(b.value);
if (!b.signature) {
b.model = this._modelForPath(b.value);
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
mode: '{',
name: '_parent_' + prop,
model: prop,
value: prop
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
notes.forEach(function (n) {
n.bindings.forEach(function (b) {
if (b.signature) {
var args = b.signature.args;
for (var k = 0; k < args.length; k++) {
pp[args[k].model] = true;
}
} else {
pp[b.model] = true;
}
});
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
});
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
this._configureTemplateContent();
},
_configureTemplateContent: function () {
this._notes.forEach(function (note, i) {
if (note.templateContent) {
this._nodes[i]._content = note.templateContent;
}
}, this);
},
_marshalIdNodes: function () {
this.$ = {};
this._notes.forEach(function (a) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}, this);
},
_marshalAnnotatedNodes: function () {
if (this._nodes) {
this._nodes = this._nodes.map(function (a) {
return this._findAnnotatedNode(this.root, a);
}, this);
}
},
_marshalAnnotatedListeners: function () {
this._notes.forEach(function (a) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
a.events.forEach(function (e) {
this.listen(node, e.name, e.value);
}, this);
}
}, this);
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, key;
for (key in listeners) {
if (key.indexOf('.') < 0) {
node = this;
name = key;
} else {
name = key.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[key]);
}
},
listen: function (node, eventName, methodName) {
this._listen(node, eventName, this._createEventHandler(node, eventName, methodName));
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = ev.currentTarget;
var gobj = node[GESTURE_KEY];
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend') {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1) {
if (r.reset) {
r.reset();
}
}
}
}
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: function () {
},
upfn: function () {
}
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
var self = this;
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: Gestures.prevent.bind(Gestures)
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: function () {
},
upfn: function () {
},
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
Gestures.prevent('tap');
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
Gestures.prevent('tap');
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new (window.MutationObserver || JsMutationObserver)(Polymer.Async._atEndOfMicrotask.bind(Polymer.Async)).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
this.boundComplete = this.complete.bind(this);
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
var detail = detail === null || detail === undefined ? Polymer.nob : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var event = new CustomEvent(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable,
detail: detail
});
node.dispatchEvent(event);
return event;
},
async: function (callback, waitTime) {
return Polymer.Async.run(callback.bind(this), waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this.get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
if (onload) {
l.onload = onload.bind(this);
}
if (onerror) {
l.onerror = onerror.bind(this);
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
}
});
Polymer.Bind = {
prepareModel: function (model) {
model._propertyEffects = {};
model._bindListeners = [];
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (property) {
var eventName = Polymer.CaseMap.camelToDashCase(property) + '-changed';
Polymer.Base.fire(eventName, { value: this[property] }, {
bubbles: false,
node: this
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
effects.forEach(function (fx) {
var fn = Polymer.Bind['_' + fx.kind + 'Effect'];
if (fn) {
fn.call(this, property, value, fx.effect, old, fromAbove);
}
}, this);
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
fx.push({
kind: kind,
effect: effect
});
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'computedAnnotation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event) {
var fn = this._notedListenerFactory(property, path, this._isStructured(path), this._isEventBogus);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, bogusTest) {
return function (e, target) {
if (!bogusTest(e, target)) {
if (e.detail && e.detail.path) {
this.notifyPath(this._fixPath(path, property, e.detail.path), e.detail.value);
} else {
var value = target[property];
if (!isStructured) {
this[path] = target[property];
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
inst._bindListeners.forEach(function (info) {
var node = inst._nodes[info.index];
node.addEventListener(info.event, inst._notifyListener.bind(inst, info.changedFn));
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.mode === '{' && !effect.negate && effect.kind != 'attribute';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this.get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(calc, effect);
}
},
_reflectEffect: function (source) {
this.reflectPropertyToAttribute(source);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var fn = this[effect.method];
if (fn) {
this.__setProperty(effect.property, fn.apply(this, args));
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(computedvalue, effect);
}
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base.get(name, model);
} else {
v = model[name];
}
if (args.length > 1 && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
Polymer.Bind.addPropertyEffect(this, property, kind, effect);
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify');
}
if (prop.reflectToAttribute) {
this._addPropertyEffect(p, 'reflect');
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
property: name
});
}, this);
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
observers.forEach(function (observer) {
this._addComplexObserverEffect(observer);
}, this);
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg
});
}, this);
},
_addAnnotationEffects: function (notes) {
this._nodes = [];
notes.forEach(function (note) {
var index = this._nodes.push(note) - 1;
note.bindings.forEach(function (binding) {
this._addAnnotationEffect(binding, index);
}, this);
}, this);
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.value, note.event);
}
if (note.signature) {
this._addAnnotatedComputationEffect(note, index);
} else {
note.index = index;
this._addPropertyEffect(note.model, 'annotation', note);
}
},
_addAnnotatedComputationEffect: function (note, index) {
var sig = note.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, sig, null);
} else {
sig.args.forEach(function (arg) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, sig, arg);
}
}, this);
}
},
__addAnnotatedComputationEffect: function (property, index, note, sig, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
kind: note.kind,
property: note.name,
negate: note.negate,
method: sig.method,
args: sig.args,
trigger: trigger
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+)\((.*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = {
name: arg,
model: this._modelForPath(arg)
};
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
Polymer.Bind.setupBindListeners(this);
},
_applyEffectValue: function (value, info) {
var node = this._nodes[info.index];
var property = info.property || info.name || 'textContent';
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
return node[property] = value;
}
},
_executeStaticEffects: function () {
if (this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
this._handlers = [];
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
this._config[name] = value;
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
this.behaviors.forEach(function (b) {
this._configureProperties(b.properties, config);
}, this);
this._configureProperties(this.properties, config);
this._mixinConfigure(config, this._aboveConfig);
this._config = config;
this._distributeConfig(this._config);
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_mixinConfigure: function (a, b) {
for (var prop in b) {
if (!this.getPropertyInfo(prop).readOnly) {
a[prop] = b[prop];
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation') {
var node = this._nodes[x.effect.index];
if (node._configValue) {
var value = p === x.effect.value ? config[p] : this.get(x.effect.value, config);
node._configValue(x.effect.name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!this._clientsReadied) {
this._queueHandler([
fn,
e,
e.target
]);
} else {
return fn.call(this, e, e.target);
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2]);
}
this._handlers = [];
}
});
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPath(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
prop = prop[part];
if (array && parseInt(part) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array && parseInt(last) == last) {
var coll = Polymer.Collection.get(array);
var old = prop[last];
var key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
prop[last] = value;
if (!root) {
this.notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var last = parts.pop();
while (parts.length) {
prop = prop[parts.shift()];
if (!prop) {
return;
}
}
return prop[last];
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects[model];
if (fx$) {
fx$.forEach(function (fx) {
var fxFn = this['_' + fx.kind + 'PathEffect'];
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}, this);
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node.notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node.notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this.notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this.notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPath: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, { bubbles: false });
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
_notifySplice: function (array, path, index, added, removed) {
var splices = [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}];
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
this.set(path + '.splices', change);
if (added != removed.length) {
this.notifyPath(path + '.length', array.length);
}
change.keySplices = null;
change.indexSplices = null;
},
push: function (path) {
var array = this.get(path);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var array = this.get(path);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start, deleteCount) {
var array = this.get(path);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var array = this.get(path);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var array = this.get(path);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, path, 0, args.length, []);
}
return ret;
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
var api = {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, s = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) >= 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^|[\s;])--[^;{]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^|[\s;])--[^;{]*?:[^{;]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*var[^;]*(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
return api;
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachStyleRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, callback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachStyleRule(this.rulesForStyle(s), callback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
clearStyleRules: function (style) {
style.__cssRules = null;
},
forEachStyleRule: function (node, callback) {
if (!node) {
return;
}
var s = node.parsedSelector;
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
callback(node);
} else if (node.type === this.ruleTypes.KEYFRAMES_RULE || node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachStyleRule(r, callback);
}
}
},
applyCss: function (cssText, moniker, target, afterNode) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
target = target || document.head;
if (!afterNode) {
var n$ = target.querySelectorAll('style[scope]');
afterNode = n$[n$.length - 1];
}
target.insertBefore(style, afterNode && afterNode.nextSibling || target.firstChild);
return style;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this._cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
_cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Array.prototype.slice.call(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this._cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, c + (c ? ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s, text; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)([^\s>+~]+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(\:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?:\:host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /\:\:content|\:\:shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachStyleRule(rules, function (rule) {
var map = self._mapRule(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRule: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || (target.extends = []);
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow && Boolean(this._template);
}
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
if (cssText && this._template) {
var style = styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null);
if (!nativeShadow) {
this._scopeStyle = style;
}
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
node.className = self._scopeElementClass(node, node.className);
var n$ = node.querySelectorAll('*');
Array.prototype.forEach.call(n$, function (n) {
n.className = self._scopeElementClass(n, n.className);
});
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
mxns.forEach(function (m) {
if (m.addedNodes) {
for (var i = 0; i < m.addedNodes.length; i++) {
scopify(m.addedNodes[i]);
}
}
});
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {};
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
});
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
var customCssText = '';
var cssText = rule.parsedCssText;
cssText = cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
var parts = cssText.split(';');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
if (p.match(this.rx.MIXIN_MATCH) || p.match(this.rx.VAR_MATCH)) {
customCssText += p + ';\n';
}
}
return customCssText;
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var pp = p.split(':');
if (pp[1]) {
pp[1] = pp[1].trim();
pp[1] = this.valueForProperty(pp[1], props) || pp[1];
}
p = pp.join(':');
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (rule.cssText && !nativeShadow) {
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, hostSelector + scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.className;
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.className = v;
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\n]\s*)(--[\w-]*?):\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\n])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,)]*)|(?:[^;]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleUtil = Polymer.StyleUtil;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles ? propertyUtils.decorateStyles(this._styles) : [];
},
customStyle: {},
_setupStyleProperties: function () {
this.customStyle = {};
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = Polymer.dom(node);
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector += (selector ? ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepConstructor();
this._prepTemplate();
this._prepStyles();
this._prepStyleProperties();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._setupConfigure();
this._setupStyleProperties();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalAnnotationReferences();
this._setupDebouncers();
this._marshalInstanceEffects();
this._marshalHostAttributes();
this._marshalBehaviors();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
this._listenListeners(b.listeners);
}
});
(function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply();
} else {
var observer = new MutationObserver(function () {
observer.disconnect();
this._apply();
}.bind(this));
observer.observe(e, { childList: true });
}
}
}
},
_apply: function () {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachStyleRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
this._applyCustomProperties(e);
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepBindings();
this._prepParentProperties(archetype, template);
archetype._notifyPath = this._notifyPathImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function (debouncerExpired) {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (var prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = rootDataHost._prepElement.bind(rootDataHost);
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop)
},
{ kind: 'notify' }
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = this._forwardParentProp.bind(this);
}
this._extendTemplate(template, proto);
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
Object.getOwnPropertyNames(proto).forEach(function (n) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
});
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffector: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
this._forwardParentPath(path.substring(8), value);
}
}
Polymer.Base._pathEffector.apply(this, arguments);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._pushHost(host);
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._popHost();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
for (var prop in this._parentProps) {
model[prop] = this[this._parentPropPrefix + prop];
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return key;
},
removeKey: function (key) {
this._removeFromMap(this.store[key]);
delete this.store[key];
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
if (item && typeof item == 'object') {
return this.omap.get(item);
} else {
return this.pmap[item];
}
},
getKeys: function () {
return Object.keys(this.store);
},
setItem: function (key, item) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
},
getItem: function (key) {
return this.store[key];
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key, i;
splices.forEach(function (s) {
s.addedKeys = [];
for (i = 0; i < s.removed.length; i++) {
key = this.getKey(s.removed[i]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (i = 0; i < s.addedCount; i++) {
var item = this.userArray[s.index + i];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}, this);
var removed = [];
var added = [];
for (var key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
},
detached: function () {
for (var i = 0; i < this._instances.length; i++) {
this._detachRow(i);
}
},
attached: function () {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < this._instances.length; i++) {
Polymer.dom(parentNode).insertBefore(this._instances[i].root, this);
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function () {
var dataHost = this._getRootDataHost();
var sort = this.sort;
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function () {
var dataHost = this._getRootDataHost();
var filter = this.filter;
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
var c = this.collection;
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = 0; i < this._instances.length; i++) {
var inst = this._instances[i];
keyToIdx[inst.__key__] = i;
inst.__setProperty(this.indexAs, i, true);
}
this.fire('dom-change');
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
if (this._filterFn) {
keys = keys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
if (this._sortFn) {
keys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
}
for (var i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__setProperty('__key__', key, true);
inst.__setProperty(this.as, c.getItem(key), true);
} else {
this._instances.push(this._insertRow(i, key));
}
}
for (; i < this._instances.length; i++) {
this._detachRow(i);
}
this._instances.splice(keys.length, this._instances.length - keys.length);
},
_keySort: function (a, b) {
return this.collection.getKey(a) - this.collection.getKey(b);
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var instances = this._instances;
var keyMap = {};
var pool = [];
var sortFn = this._sortFn || this._keySort.bind(this);
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var key = s.removed[i];
keyMap[key] = keyMap[key] ? null : -1;
}
for (var i = 0; i < s.added.length; i++) {
var key = s.added[i];
keyMap[key] = keyMap[key] ? null : 1;
}
}, this);
var removedIdxs = [];
var addedKeys = [];
for (var key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (var i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
pool.push(this._detachRow(idx));
instances.splice(idx, 1);
}
}
}
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
addedKeys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
var start = 0;
for (var i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i], pool);
}
}
},
_insertRowUserSort: function (start, key, pool) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
var sortFn = this._sortFn || this._keySort.bind(this);
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._instances.splice(idx, 0, this._insertRow(idx, key, pool));
return idx;
},
_applySplicesArrayOrder: function (splices) {
var pool = [];
var c = this.collection;
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var inst = this._detachRow(s.index + i);
if (!inst.isPlaceholder) {
pool.push(inst);
}
}
this._instances.splice(s.index, s.removed.length);
for (var i = 0; i < s.addedKeys.length; i++) {
var inst = {
isPlaceholder: true,
key: s.addedKeys[i]
};
this._instances.splice(s.index + i, 0, inst);
}
}, this);
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder) {
this._instances[i] = this._insertRow(i, inst.key, pool, true);
}
}
},
_detachRow: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
}
return inst;
},
_insertRow: function (idx, key, pool, replace) {
var inst;
if (inst = pool && pool.pop()) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._generateRow(idx, key);
}
var beforeRow = this._instances[replace ? idx + 1 : idx];
var beforeNode = beforeRow ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
return inst;
},
_generateRow: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
var inst = this.stamp(model);
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this.notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
this._instances.forEach(function (inst) {
inst.__setProperty(prop, value, true);
}, this);
},
_forwardParentPath: function (path, value) {
this._instances.forEach(function (inst) {
inst.notifyPath(path, value, true);
}, this);
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst.notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
this._teardownInstance();
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
parent.insertBefore(root, this);
}
},
_teardownInstance: function () {
if (this._instance) {
var c = this._instance._children;
if (c) {
var parent = Polymer.dom(Polymer.dom(c[0]).parentNode);
c.forEach(function (n) {
parent.removeChild(n);
});
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance.notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
created: function () {
Polymer.RenderStatus.whenReady(this._markImportsReady.bind(this));
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
this._setupConfigure = this._setupConfigure.bind(this, config);
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
Polymer.Base._initFeatures.call(this);
this._children = Array.prototype.slice.call(this.root.childNodes);
}
this._insertChildren();
this.fire('dom-change');
}
});
(function() {
  "use strict";
  /**
    `Polymer.IronJsonpLibraryBehavior` loads a jsonp library.
    Multiple components can request same library, only one copy will load.

    Some libraries require a specific global function be defined.
    If this is the case, specify the `callbackName` property.

    You should use an HTML Import to load library dependencies
    when possible instead of using this element.

    @hero hero.svg
    @demo demo/index.html
    @polymerBehavior
   */
  Polymer.IronJsonpLibraryBehavior = {

    properties: {
      /**
       * True if library has been successfully loaded
       */
      libraryLoaded: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true
      },
      /**
       * Not null if library has failed to load
       */
      libraryErrorMessage: {
        type: String,
        value: null,
        notify: true,
        readOnly: true
      }
      // Following properties are to be set by behavior users
      /**
       * Library url. Must contain string `%%callback_name%%`.
       *
       * `%%callback_name%%` is a placeholder for jsonp wrapper function name
       *
       * Ex: https://maps.googleapis.com/maps/api/js?callback=%%callback%%
       * @property libraryUrl
       */
      /**
       * Set if library requires specific callback name.
       * Name will be automatically generated if not set.
       * @property callbackName
       */
      /**
       * name of event to be emitted when library loads. Standard is `api-load`
       * @property notifyEvent
       */
      /**
       * event with name specified in `notifyEvent` attribute
       * will fire upon successful load2
       * @event `notifyEvent`
       */
    },

    observers: [
      '_libraryUrlChanged(libraryUrl)'
    ],

    _libraryUrlChanged: function(libraryUrl) {
      // can't load before ready because notifyEvent might not be set
      if (this._isReady && this.libraryUrl)
        this._loadLibrary();
    },

    _libraryLoadCallback: function(err, result) {
      if (err) {
        console.warn("Library load failed:", err.message);
        this._setLibraryErrorMessage(err.message);
      }
      else {
        this._setLibraryErrorMessage(null);
        this._setLibraryLoaded(true);
        if (this.notifyEvent)
          this.fire(this.notifyEvent, result);
      }
    },

    /** loads the library, and fires this.notifyEvent upon completion */
    _loadLibrary: function() {
      LoaderMap.require(
        this.libraryUrl,
        this._libraryLoadCallback.bind(this),
        this.callbackName
      );
    },

    ready: function() {
      this._isReady = true;
      if (this.libraryUrl)
        this._loadLibrary();
    }
  };

  /**
   * LoaderMap keeps track of all Loaders
   */
  var LoaderMap = {
    apiMap: {}, // { hash -> Loader }

    /**
     * @param {Function} notifyCallback loaded callback fn(result)
     * @param {string} jsonpCallbackName name of jsonpcallback. If API does not provide it, leave empty. Optional.
     */
    require: function(url, notifyCallback, jsonpCallbackName) {

      // make hashable string form url
      var name = this.nameFromUrl(url);

      // create a loader as needed
      if (!this.apiMap[name])
        this.apiMap[name] = new Loader(name, url, jsonpCallbackName);

      // ask for notification
      this.apiMap[name].requestNotify(notifyCallback);
    },

    nameFromUrl: function(url) {
      return url.replace(/[\:\/\%\?\&\.\=\-\,]/g, '_') + '_api';
    }
  };

  /** @constructor */
  var Loader = function(name, url, callbackName) {
    this.notifiers = [];  // array of notifyFn [ notifyFn* ]

    // callback is specified either as callback name
    // or computed dynamically if url has callbackMacro in it
    if (!callbackName) {
      if (url.indexOf(this.callbackMacro) >= 0) {
        callbackName = name + '_loaded';
        url = url.replace(this.callbackMacro, callbackName);
      } else {
        this.error = new Error('IronJsonpLibraryBehavior a %%callback_name%% parameter is required in libraryUrl');
        // TODO(sjmiles): we should probably fallback to listening to script.load
        return;
      }
    }
    this.callbackName = callbackName;
    window[this.callbackName] = this.success.bind(this);
    this.addScript(url);
  };

  Loader.prototype = {

    callbackMacro: '%%callback%%',
    loaded: false,

    addScript: function(src) {
      var script = document.createElement('script');
      script.src = src;
      script.onerror = this.handleError.bind(this);
      var s = document.querySelector('script') || document.body;
      s.parentNode.insertBefore(script, s);
      this.script = script;
    },

    removeScript: function() {
      if (this.script.parentNode) {
        this.script.parentNode.removeChild(this.script);
      }
      this.script = null;
    },

    handleError: function(ev) {
      this.error = new Error("Library failed to load");
      this.notifyAll();
      this.cleanup();
    },

    success: function() {
      this.loaded = true;
      this.result = Array.prototype.slice.call(arguments);
      this.notifyAll();
      this.cleanup();
    },

    cleanup: function() {
      delete window[this.callbackName];
    },

    notifyAll: function() {
      this.notifiers.forEach( function(notifyCallback) {
        notifyCallback(this.error, this.result);
      }.bind(this));
      this.notifiers = [];
    },

    requestNotify: function(notifyCallback) {
      if (this.loaded || this.error) {
        notifyCallback( this.error, this.result);
      } else {
        this.notifiers.push(notifyCallback);
      }
    }
  };
})();
Polymer({

    is: 'iron-jsonp-library',

    behaviors: [ Polymer.IronJsonpLibraryBehavior ],

    properties: {
      /**
       * Library url. Must contain string `%%callback_name%%`.
       *
       * `%%callback_name%%` is a placeholder for jsonp wrapper function name
       *
       * Ex: https://maps.googleapis.com/maps/api/js?callback=%%callback%%
       */
      libraryUrl: String,
      /**
       * Set if library requires specific callback name.
       * Name will be automatically generated if not set.
       */
      callbackName: String,
      /**
       * event with name specified in 'notifyEvent' attribute
       * will fire upon successful load
       */
      notifyEvent: String
      /**
       * event with name specified in 'notifyEvent' attribute
       * will fire upon successful load
       * @event `notifyEvent`
       */

    }
  });
/**
Dynamically loads the Google Maps JavaScript API, firing the `api-load` event when ready.

#### Example

    <google-maps-api api-key="abc123" version="3.exp"></google-maps-api>
    <script>
      var mapsAPI = document.querySelector('google-maps-api');
      mapsAPI.addEventListener('api-load', function(e) {
        // this.api === google.maps
      });
    <script>

Any number of components can use `<google-maps-api>` elements, and the library will only be loaded once.

@blurb Element wrapper around Google Maps API.

 */
  Polymer({

    is: 'google-maps-api',

    behaviors: [
      Polymer.IronJsonpLibraryBehavior
    ],

    properties: {

      /** @private */
      mapsUrl: {
        type: String,
        value: 'https://maps.googleapis.com/maps/api/js?callback=%%callback%%'
      },

      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: {
        type: String,
        value: ''
      },

      /**
       * A Maps API for Business Client ID. To obtain a Maps API for Business Client ID, see developers.google.com/maps/documentation/business/.
       * If set, a Client ID will take precedence over an API Key.
       */
      clientId: {
        type: String,
        value: ''
      },

      /**
       * The libraries to load with this map. For more information
       * see https://developers.google.com/maps/documentation/javascript/libraries.
       */
      libraries: {
        type: String,
        value: ''
      },

      /**
       * Version of the Maps API to use.
       */
      version: {
        type: String,
        value: '3.exp'
      },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String,
        value: ''
      },
      /**
       * If true, sign-in is enabled.
       * See https://developers.google.com/maps/documentation/javascript/signedin#enable_sign_in
       */
      signedIn: {
        type: Boolean,
        value: false
      },

      /**
       * Fired when the Maps API library is loaded and ready.
       * @event api-load
       */
      /**
       * Name of event fired when library is loaded and available.
       */
      notifyEvent: {
        type: String,
        value: 'api-load'
      },

      /** @private */
      libraryUrl: {
        type: String,
        computed: '_computeUrl(mapsUrl, version, libraries, apiKey, clientId, language, signedIn)'
      }
    },

    _computeUrl: function(mapsUrl, version, libraries, apiKey, clientId, language, signedIn) {
      var url = mapsUrl + '&v=' + version;

      if (libraries) {
        url += "&libraries=" + libraries;
      }

      if (apiKey && !clientId) {
        url += '&key=' + apiKey;
      }

      if (clientId) {
        url += '&client=' + clientId;
      }

      if (language) {
        url += '&language=' + language;
      }

      if (signedIn) {
        url += '&signed_in=' + signedIn;
      }
      return url;
    },

    /**
     * Provides the google.maps JS API namespace.
     */
    get api() {
      return google.maps;
    }
  });
/**
   * `IronResizableBehavior` is a behavior that can be used in Polymer elements to
   * coordinate the flow of resize events between "resizers" (elements that control the
   * size or hidden state of their children) and "resizables" (elements that need to be
   * notified when they are resized or un-hidden by their parents in order to take
   * action on their new measurements).
   * Elements that perform measurement should add the `IronResizableBehavior` behavior to
   * their element definition and listen for the `iron-resize` event on themselves.
   * This event will be fired when they become showing after having been hidden,
   * when they are resized explicitly by another resizable, or when the window has been
   * resized.
   * Note, the `iron-resize` event is non-bubbling.
   *
   * @polymerBehavior Polymer.IronResizableBehavior
   * @demo demo/index.html
   **/
  Polymer.IronResizableBehavior = {
    properties: {
      /**
       * The closest ancestor element that implements `IronResizableBehavior`.
       */
      _parentResizable: {
        type: Object,
        observer: '_parentResizableChanged'
      },

      /**
       * True if this element is currently notifying its descedant elements of
       * resize.
       */
      _notifyingDescendant: {
        type: Boolean,
        value: false
      }
    },

    listeners: {
      'iron-request-resize-notifications': '_onIronRequestResizeNotifications'
    },

    created: function() {
      // We don't really need property effects on these, and also we want them
      // to be created before the `_parentResizable` observer fires:
      this._interestedResizables = [];
      this._boundNotifyResize = this.notifyResize.bind(this);
    },

    attached: function() {
      this.fire('iron-request-resize-notifications', null, {
        node: this,
        bubbles: true,
        cancelable: true
      });

      if (!this._parentResizable) {
        window.addEventListener('resize', this._boundNotifyResize);
        this.notifyResize();
      }
    },

    detached: function() {
      if (this._parentResizable) {
        this._parentResizable.stopResizeNotificationsFor(this);
      } else {
        window.removeEventListener('resize', this._boundNotifyResize);
      }

      this._parentResizable = null;
    },

    /**
     * Can be called to manually notify a resizable and its descendant
     * resizables of a resize change.
     */
    notifyResize: function() {
      if (!this.isAttached) {
        return;
      }

      this._interestedResizables.forEach(function(resizable) {
        if (this.resizerShouldNotify(resizable)) {
          this._notifyDescendant(resizable);
        }
      }, this);

      this._fireResize();
    },

    /**
     * Used to assign the closest resizable ancestor to this resizable
     * if the ancestor detects a request for notifications.
     */
    assignParentResizable: function(parentResizable) {
      this._parentResizable = parentResizable;
    },

    /**
     * Used to remove a resizable descendant from the list of descendants
     * that should be notified of a resize change.
     */
    stopResizeNotificationsFor: function(target) {
      var index = this._interestedResizables.indexOf(target);

      if (index > -1) {
        this._interestedResizables.splice(index, 1);
        this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
      }
    },

    /**
     * This method can be overridden to filter nested elements that should or
     * should not be notified by the current element. Return true if an element
     * should be notified, or false if it should not be notified.
     *
     * @param {HTMLElement} element A candidate descendant element that
     * implements `IronResizableBehavior`.
     * @return {boolean} True if the `element` should be notified of resize.
     */
    resizerShouldNotify: function(element) { return true; },

    _onDescendantIronResize: function(event) {
      if (this._notifyingDescendant) {
        event.stopPropagation();
        return;
      }

      // NOTE(cdata): In ShadowDOM, event retargetting makes echoing of the
      // otherwise non-bubbling event "just work." We do it manually here for
      // the case where Polymer is not using shadow roots for whatever reason:
      if (!Polymer.Settings.useShadow) {
        this._fireResize();
      }
    },

    _fireResize: function() {
      this.fire('iron-resize', null, {
        node: this,
        bubbles: false
      });
    },

    _onIronRequestResizeNotifications: function(event) {
      var target = event.path ? event.path[0] : event.target;

      if (target === this) {
        return;
      }

      if (this._interestedResizables.indexOf(target) === -1) {
        this._interestedResizables.push(target);
        this.listen(target, 'iron-resize', '_onDescendantIronResize');
      }

      target.assignParentResizable(this);
      this._notifyDescendant(target);

      event.stopPropagation();
    },

    _parentResizableChanged: function(parentResizable) {
      if (parentResizable) {
        window.removeEventListener('resize', this._boundNotifyResize);
      }
    },

    _notifyDescendant: function(descendant) {
      // NOTE(cdata): In IE10, attached is fired on children first, so it's
      // important not to notify them if the parent is not attached yet (or
      // else they will get redundantly notified when the parent attaches).
      if (!this.isAttached) {
        return;
      }

      this._notifyingDescendant = true;
      descendant.notifyResize();
      this._notifyingDescendant = false;
    }
  };
Polymer({

    is: 'google-map-search',

    properties: {

      /**
       * The Google map object.
       */
      map: {
        type: Object,
        value: null
      },

      /**
       * The search query.
       */
      query: {
        type: String,
        value: null
      },

      /**
       * Latitude of the center of the search area.
       * Ignored if `globalSearch` is true.
       */
      latitude: {
        type: Number,
        value: null
      },

      /**
       * Longitude of the center of the search area.
       * Ignored if `globalSearch` is true.
       */
      longitude: {
        type: Number,
        value: null
      },

      /**
       * Search radius, in meters.
       * If `latitude` and `longitude` are not specified,
       * the center of the currently visible map area is used.
       *
       * If not set, search will be restricted to the currently visible
       * map area, unless `globalSearch` is set to true.
       */
      radius: {
        type: Number,
        value: null
      },

      /**
       * By default, search is restricted to the currently visible map area.
       * Set this to true to search everywhere.
       *
       * Ignored if `radius` is set.
       */
      globalSearch: {
        type: Boolean,
        value: false
      },

      /**
       * Space-separated list of result types.
       * The search will only return results of the listed types.
       * See https://developers.google.com/places/documentation/supported_types
       * for a list of supported types.
       * Leave empty or null to search for all result types.
       */
      types: {
        type: String,
        value: null
      },

      /**
       * The search results.
       */
      results: {
        type: Array,
        value: function() { return []; },
        notify: true
      },

      /**
       * The lat/lng location.
       */
      location: {
        type: Object,
        value: null,
        readOnly: true
      }
    },

    observers: [
      'search(query,map,location,radius,types,globalSearch)',
      '_updateLocation(latitude,longitude)'
    ],

    /**
     * Fired when the details of a place are returned.
     *
     * @event google-map-search-place-detail
     *   @param {google.maps.MarkerPlace} detail The place details.
     */

    /**
     * Fired when the search element returns a result.
     *
     * @event google-map-search-results
     *   @param {Array} detail An array of search results
     *   @param {number} detail.latitude Latitude of the result.
     *   @param {number} detail.longitude Longitude of the result.
     *   @param {bool} detail.show Whether to show the result on the map.
     */

    /**
     * Perform a search using for `query` for the search term.
     */
    search: function() {
      if (this.query && this.map) {
        var places = new google.maps.places.PlacesService(this.map);

        if (this.types && typeof this.types == 'string') {
          var types = this.types.split(' ');
        }

        if (!this.globalSearch) {
          var bounds = this.map.getBounds();
        } else if (this.radius) {
          var radius = this.radius;
          var location = this.location ? this.location : this.map.getCenter();
        }

        places.textSearch({
          query: this.query,
          types: types,
          bounds: bounds,
          radius: radius,
          location: location
        }, this._gotResults.bind(this));
      }
    },

    /**
     * Fetches details for a given place.
     * @param {String} placeId The place id.
     * @return {Promise} place The place information.
     */
    getDetails: function(placeId) {
      var places = new google.maps.places.PlacesService(this.map);

      return new Promise(function(resolve, reject) {
        places.getDetails({placeId: placeId}, function(place, status) {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(place);
            this.fire('google-map-search-place-detail', place);
          } else {
            reject(status);
          }
        }.bind(this));
      }.bind(this));
    },

    _gotResults: function(results, status) {
      this.results = results.map(function(result) {
        // obtain lat/long from geometry
        result.latitude  = result.geometry.location.lat();
        result.longitude = result.geometry.location.lng();
        return result;
      });
      this.fire('google-map-search-results', this.results);
    },

    _updateLocation: function() {
      if (!this.map) {
        return;
      } else if (typeof this.latitude !== 'number' || isNaN(this.latitude)) {
        throw new TypeError('latitude must be a number');
      } else if (typeof this.longitude !== 'number' || isNaN(this.longitude)) {
        throw new TypeError('longitude must be a number');
      }

      // Update location. This will trigger a new search.
      this._setLocation({lat: this.latitude, lng: this.longitude});
    }
  });
(function() {

    // monostate data
    var metaDatas = {};
    var metaArrays = {};

    Polymer.IronMeta = Polymer({

      is: 'iron-meta',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * The key used to store `value` under the `type` namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          observer: '_valueChanged'
        },

        /**
         * If true, `value` is set to the iron-meta instance itself.
         */
         self: {
          type: Boolean,
          observer: '_selfChanged'
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      /**
       * Only runs if someone invokes the factory/constructor directly
       * e.g. `new Polymer.IronMeta()`
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
              case 'value':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key, old) {
        this._resetRegistration(old);
      },

      _valueChanged: function(value) {
        this._resetRegistration(this.key);
      },

      _selfChanged: function(self) {
        if (self) {
          this.value = this;
        }
      },

      _typeChanged: function(type) {
        this._unregisterKey(this.key);
        if (!metaDatas[type]) {
          metaDatas[type] = {};
        }
        this._metaData = metaDatas[type];
        if (!metaArrays[type]) {
          metaArrays[type] = [];
        }
        this.list = metaArrays[type];
        this._registerKeyValue(this.key, this.value);
      },

      /**
       * Retrieves meta data value by key.
       *
       * @method byKey
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      },

      _resetRegistration: function(oldKey) {
        this._unregisterKey(oldKey);
        this._registerKeyValue(this.key, this.value);
      },

      _unregisterKey: function(key) {
        this._unregister(key, this._metaData, this.list);
      },

      _registerKeyValue: function(key, value) {
        this._register(key, value, this._metaData, this.list);
      },

      _register: function(key, value, data, list) {
        if (key && data && value !== undefined) {
          data[key] = value;
          list.push(value);
        }
      },

      _unregister: function(key, data, list) {
        if (key && data) {
          if (key in data) {
            var value = data[key];
            delete data[key];
            this.arrayDelete(list, value);
          }
        }
      }

    });

    /**
    `iron-meta-query` can be used to access infomation stored in `iron-meta`.

    Examples:

    If I create an instance like this:

        <iron-meta key="info" value="foo/bar"></iron-meta>

    Note that value="foo/bar" is the metadata I've defined. I could define more
    attributes or use child nodes to define additional metadata.

    Now I can access that element (and it's metadata) from any `iron-meta-query` instance:

         var value = new Polymer.IronMetaQuery({key: 'info'}).value;

    @group Polymer Iron Elements
    @element iron-meta-query
    */
    Polymer.IronMetaQuery = Polymer({

      is: 'iron-meta-query',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * Specifies a key to use for retrieving `value` from the `type`
         * namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          readOnly: true
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      /**
       * Actually a factory method, not a true constructor. Only runs if
       * someone invokes it directly (via `new Polymer.IronMeta()`);
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key) {
        this._setValue(this._metaData && this._metaData[key]);
      },

      _typeChanged: function(type) {
        this._metaData = metaDatas[type];
        this.list = metaArrays[type];
        if (this.key) {
          this._keyChanged(this.key);
        }
      },

      /**
       * Retrieves meta data value by key.
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      }

    });

  })();
/**
   * The `iron-iconset-svg` element allows users to define their own icon sets
   * that contain svg icons. The svg icon elements should be children of the
   * `iron-iconset-svg` element. Multiple icons should be given distinct id's.
   *
   * Using svg elements to create icons has a few advantages over traditional
   * bitmap graphics like jpg or png. Icons that use svg are vector based so they
   * are resolution independent and should look good on any device. They are
   * stylable via css. Icons can be themed, colorized, and even animated.
   *
   * Example:
   *
   *     <iron-iconset-svg name="my-svg-icons" size="24">
   *       <svg>
   *         <defs>
   *           <g id="shape">
   *             <rect x="50" y="50" width="50" height="50" />
   *             <circle cx="50" cy="50" r="50" />
   *           </g>
   *         </defs>
   *       </svg>
   *     </iron-iconset-svg>
   *
   * This will automatically register the icon set "my-svg-icons" to the iconset
   * database.  To use these icons from within another element, make a
   * `iron-iconset` element and call the `byId` method
   * to retrieve a given iconset. To apply a particular icon inside an
   * element use the `applyIcon` method. For example:
   *
   *     iconset.applyIcon(iconNode, 'car');
   *
   * @element iron-iconset-svg
   * @demo demo/index.html
   */
  Polymer({

    is: 'iron-iconset-svg',

    properties: {

      /**
       * The name of the iconset.
       *
       * @attribute name
       * @type string
       */
      name: {
        type: String,
        observer: '_nameChanged'
      },

      /**
       * The size of an individual icon. Note that icons must be square.
       *
       * @attribute iconSize
       * @type number
       * @default 24
       */
      size: {
        type: Number,
        value: 24
      }

    },

    /**
     * Construct an array of all icon names in this iconset.
     *
     * @return {!Array} Array of icon names.
     */
    getIconNames: function() {
      this._icons = this._createIconMap();
      return Object.keys(this._icons).map(function(n) {
        return this.name + ':' + n;
      }, this);
    },

    /**
     * Applies an icon to the given element.
     *
     * An svg icon is prepended to the element's shadowRoot if it exists,
     * otherwise to the element itself.
     *
     * @method applyIcon
     * @param {Element} element Element to which the icon is applied.
     * @param {string} iconName Name of the icon to apply.
     * @return {Element} The svg element which renders the icon.
     */
    applyIcon: function(element, iconName) {
      // insert svg element into shadow root, if it exists
      element = element.root || element;
      // Remove old svg element
      this.removeIcon(element);
      // install new svg element
      var svg = this._cloneIcon(iconName);
      if (svg) {
        var pde = Polymer.dom(element);
        pde.insertBefore(svg, pde.childNodes[0]);
        return element._svgIcon = svg;
      }
      return null;
    },

    /**
     * Remove an icon from the given element by undoing the changes effected
     * by `applyIcon`.
     *
     * @param {Element} element The element from which the icon is removed.
     */
    removeIcon: function(element) {
      // Remove old svg element
      if (element._svgIcon) {
        Polymer.dom(element).removeChild(element._svgIcon);
        element._svgIcon = null;
      }
    },

    /**
     *
     * When name is changed, register iconset metadata
     *
     */
    _nameChanged: function() {
      new Polymer.IronMeta({type: 'iconset', key: this.name, value: this});
    },

    /**
     * Create a map of child SVG elements by id.
     *
     * @return {!Object} Map of id's to SVG elements.
     */
    _createIconMap: function() {
      // Objects chained to Object.prototype (`{}`) have members. Specifically,
      // on FF there is a `watch` method that confuses the icon map, so we
      // need to use a null-based object here.
      var icons = Object.create(null);
      Polymer.dom(this).querySelectorAll('[id]')
        .forEach(function(icon) {
          icons[icon.id] = icon;
        });
      return icons;
    },

    /**
     * Produce installable clone of the SVG element matching `id` in this
     * iconset, or `undefined` if there is no matching element.
     *
     * @return {Element} Returns an installable clone of the SVG element
     * matching `id`.
     */
    _cloneIcon: function(id) {
      // create the icon map on-demand, since the iconset itself has no discrete
      // signal to know when it's children are fully parsed
      this._icons = this._icons || this._createIconMap();
      return this._prepareSvgClone(this._icons[id], this.size);
    },

    /**
     * @param {Element} sourceSvg
     * @param {number} size
     * @return {Element}
     */
    _prepareSvgClone: function(sourceSvg, size) {
      if (sourceSvg) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', ['0', '0', size, size].join(' '));
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // TODO(dfreedm): `pointer-events: none` works around https://crbug.com/370136
        // TODO(sjmiles): inline style may not be ideal, but avoids requiring a shadow-root
        svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
        svg.appendChild(sourceSvg.cloneNode(true)).removeAttribute('id');
        return svg;
      }
      return null;
    }

  });
(function() {
    'use strict';

    /**
     * Chrome uses an older version of DOM Level 3 Keyboard Events
     *
     * Most keys are labeled as text, but some are Unicode codepoints.
     * Values taken from: http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/keyset.html#KeySet-Set
     */
    var KEY_IDENTIFIER = {
      'U+0009': 'tab',
      'U+001B': 'esc',
      'U+0020': 'space',
      'U+002A': '*',
      'U+0030': '0',
      'U+0031': '1',
      'U+0032': '2',
      'U+0033': '3',
      'U+0034': '4',
      'U+0035': '5',
      'U+0036': '6',
      'U+0037': '7',
      'U+0038': '8',
      'U+0039': '9',
      'U+0041': 'a',
      'U+0042': 'b',
      'U+0043': 'c',
      'U+0044': 'd',
      'U+0045': 'e',
      'U+0046': 'f',
      'U+0047': 'g',
      'U+0048': 'h',
      'U+0049': 'i',
      'U+004A': 'j',
      'U+004B': 'k',
      'U+004C': 'l',
      'U+004D': 'm',
      'U+004E': 'n',
      'U+004F': 'o',
      'U+0050': 'p',
      'U+0051': 'q',
      'U+0052': 'r',
      'U+0053': 's',
      'U+0054': 't',
      'U+0055': 'u',
      'U+0056': 'v',
      'U+0057': 'w',
      'U+0058': 'x',
      'U+0059': 'y',
      'U+005A': 'z',
      'U+007F': 'del'
    };

    /**
     * Special table for KeyboardEvent.keyCode.
     * KeyboardEvent.keyIdentifier is better, and KeyBoardEvent.key is even better
     * than that.
     *
     * Values from: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.keyCode#Value_of_keyCode
     */
    var KEY_CODE = {
      9: 'tab',
      13: 'enter',
      27: 'esc',
      33: 'pageup',
      34: 'pagedown',
      35: 'end',
      36: 'home',
      32: 'space',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      46: 'del',
      106: '*'
    };

    /**
     * MODIFIER_KEYS maps the short name for modifier keys used in a key
     * combo string to the property name that references those same keys
     * in a KeyboardEvent instance.
     */
    var MODIFIER_KEYS = {
      'shift': 'shiftKey',
      'ctrl': 'ctrlKey',
      'alt': 'altKey',
      'meta': 'metaKey'
    };

    /**
     * KeyboardEvent.key is mostly represented by printable character made by
     * the keyboard, with unprintable keys labeled nicely.
     *
     * However, on OS X, Alt+char can make a Unicode character that follows an
     * Apple-specific mapping. In this case, we
     * fall back to .keyCode.
     */
    var KEY_CHAR = /[a-z0-9*]/;

    /**
     * Matches a keyIdentifier string.
     */
    var IDENT_CHAR = /U\+/;

    /**
     * Matches arrow keys in Gecko 27.0+
     */
    var ARROW_KEY = /^arrow/;

    /**
     * Matches space keys everywhere (notably including IE10's exceptional name
     * `spacebar`).
     */
    var SPACE_KEY = /^space(bar)?/;

    function transformKey(key) {
      var validKey = '';
      if (key) {
        var lKey = key.toLowerCase();
        if (lKey.length == 1) {
          if (KEY_CHAR.test(lKey)) {
            validKey = lKey;
          }
        } else if (ARROW_KEY.test(lKey)) {
          validKey = lKey.replace('arrow', '');
        } else if (SPACE_KEY.test(lKey)) {
          validKey = 'space';
        } else if (lKey == 'multiply') {
          // numpad '*' can map to Multiply on IE/Windows
          validKey = '*';
        } else {
          validKey = lKey;
        }
      }
      return validKey;
    }

    function transformKeyIdentifier(keyIdent) {
      var validKey = '';
      if (keyIdent) {
        if (IDENT_CHAR.test(keyIdent)) {
          validKey = KEY_IDENTIFIER[keyIdent];
        } else {
          validKey = keyIdent.toLowerCase();
        }
      }
      return validKey;
    }

    function transformKeyCode(keyCode) {
      var validKey = '';
      if (Number(keyCode)) {
        if (keyCode >= 65 && keyCode <= 90) {
          // ascii a-z
          // lowercase is 32 offset from uppercase
          validKey = String.fromCharCode(32 + keyCode);
        } else if (keyCode >= 112 && keyCode <= 123) {
          // function keys f1-f12
          validKey = 'f' + (keyCode - 112);
        } else if (keyCode >= 48 && keyCode <= 57) {
          // top 0-9 keys
          validKey = String(48 - keyCode);
        } else if (keyCode >= 96 && keyCode <= 105) {
          // num pad 0-9
          validKey = String(96 - keyCode);
        } else {
          validKey = KEY_CODE[keyCode];
        }
      }
      return validKey;
    }

    function normalizedKeyForEvent(keyEvent) {
      // fall back from .key, to .keyIdentifier, to .keyCode, and then to
      // .detail.key to support artificial keyboard events
      return transformKey(keyEvent.key) ||
        transformKeyIdentifier(keyEvent.keyIdentifier) ||
        transformKeyCode(keyEvent.keyCode) ||
        transformKey(keyEvent.detail.key) || '';
    }

    function keyComboMatchesEvent(keyCombo, keyEvent) {
      return normalizedKeyForEvent(keyEvent) === keyCombo.key &&
        !!keyEvent.shiftKey === !!keyCombo.shiftKey &&
        !!keyEvent.ctrlKey === !!keyCombo.ctrlKey &&
        !!keyEvent.altKey === !!keyCombo.altKey &&
        !!keyEvent.metaKey === !!keyCombo.metaKey;
    }

    function parseKeyComboString(keyComboString) {
      return keyComboString.split('+').reduce(function(parsedKeyCombo, keyComboPart) {
        var eventParts = keyComboPart.split(':');
        var keyName = eventParts[0];
        var event = eventParts[1];

        if (keyName in MODIFIER_KEYS) {
          parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
        } else {
          parsedKeyCombo.key = keyName;
          parsedKeyCombo.event = event || 'keydown';
        }

        return parsedKeyCombo;
      }, {
        combo: keyComboString.split(':').shift()
      });
    }

    function parseEventString(eventString) {
      return eventString.split(' ').map(function(keyComboString) {
        return parseKeyComboString(keyComboString);
      });
    }


    /**
     * `Polymer.IronA11yKeysBehavior` provides a normalized interface for processing
     * keyboard commands that pertain to [WAI-ARIA best practices](http://www.w3.org/TR/wai-aria-practices/#kbd_general_binding).
     * The element takes care of browser differences with respect to Keyboard events
     * and uses an expressive syntax to filter key presses.
     *
     * Use the `keyBindings` prototype property to express what combination of keys
     * will trigger the event to fire.
     *
     * Use the `key-event-target` attribute to set up event handlers on a specific
     * node.
     * The `keys-pressed` event will fire when one of the key combinations set with the
     * `keys` property is pressed.
     *
     * @demo demo/index.html
     * @polymerBehavior IronA11yKeysBehavior
     */
    Polymer.IronA11yKeysBehavior = {
      properties: {
        /**
         * The HTMLElement that will be firing relevant KeyboardEvents.
         */
        keyEventTarget: {
          type: Object,
          value: function() {
            return this;
          }
        },

        _boundKeyHandlers: {
          type: Array,
          value: function() {
            return [];
          }
        },

        // We use this due to a limitation in IE10 where instances will have
        // own properties of everything on the "prototype".
        _imperativeKeyBindings: {
          type: Object,
          value: function() {
            return {};
          }
        }
      },

      observers: [
        '_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'
      ],

      keyBindings: {},

      registered: function() {
        this._prepKeyBindings();
      },

      attached: function() {
        this._listenKeyEventListeners();
      },

      detached: function() {
        this._unlistenKeyEventListeners();
      },

      /**
       * Can be used to imperatively add a key binding to the implementing
       * element. This is the imperative equivalent of declaring a keybinding
       * in the `keyBindings` prototype property.
       */
      addOwnKeyBinding: function(eventString, handlerName) {
        this._imperativeKeyBindings[eventString] = handlerName;
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      /**
       * When called, will remove all imperatively-added key bindings.
       */
      removeOwnKeyBindings: function() {
        this._imperativeKeyBindings = {};
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      keyboardEventMatchesKeys: function(event, eventString) {
        var keyCombos = parseEventString(eventString);
        var index;

        for (index = 0; index < keyCombos.length; ++index) {
          if (keyComboMatchesEvent(keyCombos[index], event)) {
            return true;
          }
        }

        return false;
      },

      _collectKeyBindings: function() {
        var keyBindings = this.behaviors.map(function(behavior) {
          return behavior.keyBindings;
        });

        if (keyBindings.indexOf(this.keyBindings) === -1) {
          keyBindings.push(this.keyBindings);
        }

        return keyBindings;
      },

      _prepKeyBindings: function() {
        this._keyBindings = {};

        this._collectKeyBindings().forEach(function(keyBindings) {
          for (var eventString in keyBindings) {
            this._addKeyBinding(eventString, keyBindings[eventString]);
          }
        }, this);

        for (var eventString in this._imperativeKeyBindings) {
          this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
        }
      },

      _addKeyBinding: function(eventString, handlerName) {
        parseEventString(eventString).forEach(function(keyCombo) {
          this._keyBindings[keyCombo.event] =
            this._keyBindings[keyCombo.event] || [];

          this._keyBindings[keyCombo.event].push([
            keyCombo,
            handlerName
          ]);
        }, this);
      },

      _resetKeyEventListeners: function() {
        this._unlistenKeyEventListeners();

        if (this.isAttached) {
          this._listenKeyEventListeners();
        }
      },

      _listenKeyEventListeners: function() {
        Object.keys(this._keyBindings).forEach(function(eventName) {
          var keyBindings = this._keyBindings[eventName];
          var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);

          this._boundKeyHandlers.push([this.keyEventTarget, eventName, boundKeyHandler]);

          this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
        }, this);
      },

      _unlistenKeyEventListeners: function() {
        var keyHandlerTuple;
        var keyEventTarget;
        var eventName;
        var boundKeyHandler;

        while (this._boundKeyHandlers.length) {
          // My kingdom for block-scope binding and destructuring assignment..
          keyHandlerTuple = this._boundKeyHandlers.pop();
          keyEventTarget = keyHandlerTuple[0];
          eventName = keyHandlerTuple[1];
          boundKeyHandler = keyHandlerTuple[2];

          keyEventTarget.removeEventListener(eventName, boundKeyHandler);
        }
      },

      _onKeyBindingEvent: function(keyBindings, event) {
        keyBindings.forEach(function(keyBinding) {
          var keyCombo = keyBinding[0];
          var handlerName = keyBinding[1];

          if (!event.defaultPrevented && keyComboMatchesEvent(keyCombo, event)) {
            this._triggerKeyHandler(keyCombo, handlerName, event);
          }
        }, this);
      },

      _triggerKeyHandler: function(keyCombo, handlerName, keyboardEvent) {
        var detail = Object.create(keyCombo);
        detail.keyboardEvent = keyboardEvent;

        this[handlerName].call(this, new CustomEvent(keyCombo.event, {
          detail: detail
        }));
      }
    };
  })();
/**
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronControlState = {

    properties: {

      /**
       * If true, the element currently has focus.
       */
      focused: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true,
        reflectToAttribute: true
      },

      /**
       * If true, the user cannot interact with this element.
       */
      disabled: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_disabledChanged',
        reflectToAttribute: true
      },

      _oldTabIndex: {
        type: Number
      },

      _boundFocusBlurHandler: {
        type: Function,
        value: function() {
          return this._focusBlurHandler.bind(this);
        }
      }

    },

    observers: [
      '_changedControlState(focused, disabled)'
    ],

    ready: function() {
      this.addEventListener('focus', this._boundFocusBlurHandler, true);
      this.addEventListener('blur', this._boundFocusBlurHandler, true);
    },

    _focusBlurHandler: function(event) {
      // NOTE(cdata):  if we are in ShadowDOM land, `event.target` will
      // eventually become `this` due to retargeting; if we are not in
      // ShadowDOM land, `event.target` will eventually become `this` due
      // to the second conditional which fires a synthetic event (that is also
      // handled). In either case, we can disregard `event.path`.

      if (event.target === this) {
        var focused = event.type === 'focus';
        this._setFocused(focused);
      } else if (!this.shadowRoot) {
        this.fire(event.type, {sourceEvent: event}, {
          node: this,
          bubbles: event.bubbles,
          cancelable: event.cancelable
        });
      }
    },

    _disabledChanged: function(disabled, old) {
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      this.style.pointerEvents = disabled ? 'none' : '';
      if (disabled) {
        this._oldTabIndex = this.tabIndex;
        this.focused = false;
        this.tabIndex = -1;
      } else if (this._oldTabIndex !== undefined) {
        this.tabIndex = this._oldTabIndex;
      }
    },

    _changedControlState: function() {
      // _controlStateChanged is abstract, follow-on behaviors may implement it
      if (this._controlStateChanged) {
        this._controlStateChanged();
      }
    }

  };
/**
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronButtonState
   */
  Polymer.IronButtonStateImpl = {

    properties: {

      /**
       * If true, the user is currently holding down the button.
       */
      pressed: {
        type: Boolean,
        readOnly: true,
        value: false,
        reflectToAttribute: true,
        observer: '_pressedChanged'
      },

      /**
       * If true, the button toggles the active state with each tap or press
       * of the spacebar.
       */
      toggles: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      /**
       * If true, the button is a toggle and is currently in the active state.
       */
      active: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * True if the element is currently being pressed by a "pointer," which
       * is loosely defined as mouse or touch input (but specifically excluding
       * keyboard input).
       */
      pointerDown: {
        type: Boolean,
        readOnly: true,
        value: false
      },

      /**
       * True if the input device that caused the element to receive focus
       * was a keyboard.
       */
      receivedFocusFromKeyboard: {
        type: Boolean,
        readOnly: true
      },

      /**
       * The aria attribute to be set if the button is a toggle and in the
       * active state.
       */
      ariaActiveAttribute: {
        type: String,
        value: 'aria-pressed',
        observer: '_ariaActiveAttributeChanged'
      }
    },

    listeners: {
      down: '_downHandler',
      up: '_upHandler',
      tap: '_tapHandler'
    },

    observers: [
      '_detectKeyboardFocus(focused)',
      '_activeChanged(active, ariaActiveAttribute)'
    ],

    keyBindings: {
      'enter:keydown': '_asyncClick',
      'space:keydown': '_spaceKeyDownHandler',
      'space:keyup': '_spaceKeyUpHandler',
    },

    _mouseEventRe: /^mouse/,

    _tapHandler: function() {
      if (this.toggles) {
       // a tap is needed to toggle the active state
        this._userActivate(!this.active);
      } else {
        this.active = false;
      }
    },

    _detectKeyboardFocus: function(focused) {
      this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
    },

    // to emulate native checkbox, (de-)activations from a user interaction fire
    // 'change' events
    _userActivate: function(active) {
      if (this.active !== active) {
        this.active = active;
        this.fire('change');
      }
    },

    _eventSourceIsPrimaryInput: function(event) {
      event = event.detail.sourceEvent || event;

      // Always true for non-mouse events....
      if (!this._mouseEventRe.test(event.type)) {
        return true;
      }

      // http://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
      if ('buttons' in event) {
        return event.buttons === 1;
      }

      // http://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/which
      if (typeof event.which === 'number') {
        return event.which < 2;
      }

      // http://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
      return event.button < 1;
    },

    _downHandler: function(event) {
      if (!this._eventSourceIsPrimaryInput(event)) {
        return;
      }

      this._setPointerDown(true);
      this._setPressed(true);
      this._setReceivedFocusFromKeyboard(false);
    },

    _upHandler: function() {
      this._setPointerDown(false);
      this._setPressed(false);
    },

    _spaceKeyDownHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      keyboardEvent.preventDefault();
      keyboardEvent.stopImmediatePropagation();
      this._setPressed(true);
    },

    _spaceKeyUpHandler: function() {
      if (this.pressed) {
        this._asyncClick();
      }
      this._setPressed(false);
    },

    // trigger click asynchronously, the asynchrony is useful to allow one
    // event handler to unwind before triggering another event
    _asyncClick: function() {
      this.async(function() {
        this.click();
      }, 1);
    },

    // any of these changes are considered a change to button state

    _pressedChanged: function(pressed) {
      this._changedButtonState();
    },

    _ariaActiveAttributeChanged: function(value, oldValue) {
      if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
        this.removeAttribute(oldValue);
      }
    },

    _activeChanged: function(active, ariaActiveAttribute) {
      if (this.toggles) {
        this.setAttribute(this.ariaActiveAttribute,
                          active ? 'true' : 'false');
      } else {
        this.removeAttribute(this.ariaActiveAttribute);
      }
      this._changedButtonState();
    },

    _controlStateChanged: function() {
      if (this.disabled) {
        this._setPressed(false);
      } else {
        this._changedButtonState();
      }
    },

    // provide hook for follow-on behaviors to react to button-state

    _changedButtonState: function() {
      if (this._buttonStateChanged) {
        this._buttonStateChanged(); // abstract
      }
    }

  };

  /** @polymerBehavior */
  Polymer.IronButtonState = [
    Polymer.IronA11yKeysBehavior,
    Polymer.IronButtonStateImpl
  ];
/** @polymerBehavior */
  Polymer.PaperButtonBehaviorImpl = {

    properties: {

      _elevation: {
        type: Number
      }

    },

    observers: [
      '_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)'
    ],

    hostAttributes: {
      role: 'button',
      tabindex: '0'
    },

    _calculateElevation: function() {
      var e = 1;
      if (this.disabled) {
        e = 0;
      } else if (this.active || this.pressed) {
        e = 4;
      } else if (this.receivedFocusFromKeyboard) {
        e = 3;
      }
      this._elevation = e;
    }
  };

  /** @polymerBehavior */
  Polymer.PaperButtonBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperButtonBehaviorImpl
  ];
/**
   * `Polymer.PaperInkyFocusBehavior` implements a ripple when the element has keyboard focus.
   *
   * @polymerBehavior Polymer.PaperInkyFocusBehavior
   */
  Polymer.PaperInkyFocusBehaviorImpl = {

    observers: [
      '_focusedChanged(receivedFocusFromKeyboard)'
    ],

    _focusedChanged: function(receivedFocusFromKeyboard) {
      if (!this.$.ink) {
        return;
      }

      this.$.ink.holdDown = receivedFocusFromKeyboard;
    }

  };

  /** @polymerBehavior Polymer.PaperInkyFocusBehavior */
  Polymer.PaperInkyFocusBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperInkyFocusBehaviorImpl
  ];
/** 
 * `iron-range-behavior` provides the behavior for something with a minimum to maximum range.
 *
 * @demo demo/index.html
 * @polymerBehavior 
 */
 Polymer.IronRangeBehavior = {

  properties: {

    /**
     * The number that represents the current value.
     */
    value: {
      type: Number,
      value: 0,
      notify: true,
      reflectToAttribute: true
    },

    /**
     * The number that indicates the minimum value of the range.
     */
    min: {
      type: Number,
      value: 0,
      notify: true
    },

    /**
     * The number that indicates the maximum value of the range.
     */
    max: {
      type: Number,
      value: 100,
      notify: true
    },

    /**
     * Specifies the value granularity of the range's value.
     */
    step: {
      type: Number,
      value: 1,
      notify: true
    },

    /**
     * Returns the ratio of the value.
     */
    ratio: {
      type: Number,
      value: 0,
      readOnly: true,
      notify: true
    },
  },

  observers: [
    '_update(value, min, max, step)'
  ],

  _calcRatio: function(value) {
    return (this._clampValue(value) - this.min) / (this.max - this.min);
  },

  _clampValue: function(value) {
    return Math.min(this.max, Math.max(this.min, this._calcStep(value)));
  },

  _calcStep: function(value) {
   /**
    * if we calculate the step using
    * `Math.round(value / step) * step` we may hit a precision point issue 
    * eg. 0.1 * 0.2 =  0.020000000000000004
    * http://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
    *
    * as a work around we can divide by the reciprocal of `step`
    */
    return this.step ? (Math.round(value / this.step) / (1 / this.step)) : value;
  },

  _validateValue: function() {
    var v = this._clampValue(this.value);
    this.value = this.oldValue = isNaN(v) ? this.oldValue : v;
    return this.value !== v;
  },

  _update: function() {
    this._validateValue();
    this._setRatio(this._calcRatio(this.value) * 100);
  }

};
/**
   * Use `Polymer.NeonAnimationBehavior` to implement an animation.
   * @polymerBehavior
   */
  Polymer.NeonAnimationBehavior = {

    properties: {

      /**
       * Defines the animation timing.
       */
      animationTiming: {
        type: Object,
        value: function() {
          return {
            duration: 500,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'both'
          }
        }
      }

    },

    registered: function() {
      new Polymer.IronMeta({type: 'animation', key: this.is, value: this.constructor});
    },

    /**
     * Do any animation configuration here.
     */
    // configure: function(config) {
    // },

    /**
     * Returns the animation timing by mixing in properties from `config` to the defaults defined
     * by the animation.
     */
    timingFromConfig: function(config) {
      if (config.timing) {
        for (var property in config.timing) {
          this.animationTiming[property] = config.timing[property];
        }
      }
      return this.animationTiming;
    },

    /**
     * Sets `transform` and `transformOrigin` properties along with the prefixed versions.
     */
    setPrefixedProperty: function(node, property, value) {
      var map = {
        'transform': ['webkitTransform'],
        'transformOrigin': ['mozTransformOrigin', 'webkitTransformOrigin']
      };
      var prefixes = map[property];
      for (var prefix, index = 0; prefix = prefixes[index]; index++) {
        node.style[prefix] = value;
      }
      node.style[property] = value;
    },

    /**
     * Called when the animation finishes.
     */
    complete: function() {}

  };
// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

!function(a,b){b["true"]=a;var c={},d={},e={},f=null;!function(a){function b(a){if("number"==typeof a)return a;var b={};for(var c in a)b[c]=a[c];return b}function c(){this._delay=0,this._endDelay=0,this._fill="none",this._iterationStart=0,this._iterations=1,this._duration=0,this._playbackRate=1,this._direction="normal",this._easing="linear"}function d(b,d){var e=new c;return d&&(e.fill="both",e.duration="auto"),"number"!=typeof b||isNaN(b)?void 0!==b&&Object.getOwnPropertyNames(b).forEach(function(c){if("auto"!=b[c]){if(("number"==typeof e[c]||"duration"==c)&&("number"!=typeof b[c]||isNaN(b[c])))return;if("fill"==c&&-1==s.indexOf(b[c]))return;if("direction"==c&&-1==t.indexOf(b[c]))return;if("playbackRate"==c&&1!==b[c]&&a.isDeprecated("AnimationEffectTiming.playbackRate","2014-11-28","Use Animation.playbackRate instead."))return;e[c]=b[c]}}):e.duration=b,e}function e(a){return"number"==typeof a&&(a=isNaN(a)?{duration:0}:{duration:a}),a}function f(b,c){b=a.numericTimingToObject(b);var e=d(b,c);return e._easing=i(e.easing),e}function g(a,b,c,d){return 0>a||a>1||0>c||c>1?B:function(e){function f(a,b,c){return 3*a*(1-c)*(1-c)*c+3*b*(1-c)*c*c+c*c*c}if(0==e||1==e)return e;for(var g=0,h=1;;){var i=(g+h)/2,j=f(a,c,i);if(Math.abs(e-j)<.001)return f(b,d,i);e>j?g=i:h=i}}}function h(a,b){return function(c){if(c>=1)return 1;var d=1/a;return c+=b*d,c-c%d}}function i(a){var b=z.exec(a);if(b)return g.apply(this,b.slice(1).map(Number));var c=A.exec(a);if(c)return h(Number(c[1]),{start:u,middle:v,end:w}[c[2]]);var d=x[a];return d?d:B}function j(a){return Math.abs(k(a)/a.playbackRate)}function k(a){return a.duration*a.iterations}function l(a,b,c){return null==b?C:b<c.delay?D:b>=c.delay+a?E:F}function m(a,b,c,d,e){switch(d){case D:return"backwards"==b||"both"==b?0:null;case F:return c-e;case E:return"forwards"==b||"both"==b?a:null;case C:return null}}function n(a,b,c,d){return(d.playbackRate<0?b-a:b)*d.playbackRate+c}function o(a,b,c,d,e){return 1/0===c||c===-1/0||c-d==b&&e.iterations&&(e.iterations+e.iterationStart)%1==0?a:c%a}function p(a,b,c,d){return 0===c?0:b==a?d.iterationStart+d.iterations-1:Math.floor(c/a)}function q(a,b,c,d){var e=a%2>=1,f="normal"==d.direction||d.direction==(e?"alternate-reverse":"alternate"),g=f?c:b-c,h=g/b;return b*d.easing(h)}function r(a,b,c){var d=l(a,b,c),e=m(a,c.fill,b,d,c.delay);if(null===e)return null;if(0===a)return d===D?0:1;var f=c.iterationStart*c.duration,g=n(a,e,f,c),h=o(c.duration,k(c),g,f,c),i=p(c.duration,h,g,c);return q(i,c.duration,h,c)/c.duration}var s="backwards|forwards|both|none".split("|"),t="reverse|alternate|alternate-reverse".split("|");c.prototype={_setMember:function(b,c){this["_"+b]=c,this._effect&&(this._effect._timingInput[b]=c,this._effect._timing=a.normalizeTimingInput(a.normalizeTimingInput(this._effect._timingInput)),this._effect.activeDuration=a.calculateActiveDuration(this._effect._timing),this._effect._animation&&this._effect._animation._rebuildUnderlyingAnimation())},get playbackRate(){return this._playbackRate},set delay(a){this._setMember("delay",a)},get delay(){return this._delay},set endDelay(a){this._setMember("endDelay",a)},get endDelay(){return this._endDelay},set fill(a){this._setMember("fill",a)},get fill(){return this._fill},set iterationStart(a){this._setMember("iterationStart",a)},get iterationStart(){return this._iterationStart},set duration(a){this._setMember("duration",a)},get duration(){return this._duration},set direction(a){this._setMember("direction",a)},get direction(){return this._direction},set easing(a){this._setMember("easing",a)},get easing(){return this._easing},set iterations(a){this._setMember("iterations",a)},get iterations(){return this._iterations}};var u=1,v=.5,w=0,x={ease:g(.25,.1,.25,1),"ease-in":g(.42,0,1,1),"ease-out":g(0,0,.58,1),"ease-in-out":g(.42,0,.58,1),"step-start":h(1,u),"step-middle":h(1,v),"step-end":h(1,w)},y="\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*",z=new RegExp("cubic-bezier\\("+y+","+y+","+y+","+y+"\\)"),A=/steps\(\s*(\d+)\s*,\s*(start|middle|end)\s*\)/,B=function(a){return a},C=0,D=1,E=2,F=3;a.cloneTimingInput=b,a.makeTiming=d,a.numericTimingToObject=e,a.normalizeTimingInput=f,a.calculateActiveDuration=j,a.calculateTimeFraction=r,a.calculatePhase=l,a.toTimingFunction=i}(c,f),function(a){function b(a,b){return a in h?h[a][b]||b:b}function c(a,c,d){var g=e[a];if(g){f.style[a]=c;for(var h in g){var i=g[h],j=f.style[i];d[i]=b(i,j)}}else d[a]=b(a,c)}function d(b){function d(){var a=e.length;null==e[a-1].offset&&(e[a-1].offset=1),a>1&&null==e[0].offset&&(e[0].offset=0);for(var b=0,c=e[0].offset,d=1;a>d;d++){var f=e[d].offset;if(null!=f){for(var g=1;d-b>g;g++)e[b+g].offset=c+(f-c)*g/(d-b);b=d,c=f}}}if(!Array.isArray(b)&&null!==b)throw new TypeError("Keyframes must be null or an array of keyframes");if(null==b)return[];for(var e=b.map(function(b){var d={};for(var e in b){var f=b[e];if("offset"==e){if(null!=f&&(f=Number(f),!isFinite(f)))throw new TypeError("keyframe offsets must be numbers.")}else{if("composite"==e)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"add compositing is not supported"};f="easing"==e?a.toTimingFunction(f):""+f}c(e,f,d)}return void 0==d.offset&&(d.offset=null),void 0==d.easing&&(d.easing=a.toTimingFunction("linear")),d}),f=!0,g=-1/0,h=0;h<e.length;h++){var i=e[h].offset;if(null!=i){if(g>i)throw{code:DOMException.INVALID_MODIFICATION_ERR,name:"InvalidModificationError",message:"Keyframes are not loosely sorted by offset. Sort or specify offsets."};g=i}else f=!1}return e=e.filter(function(a){return a.offset>=0&&a.offset<=1}),f||d(),e}var e={background:["backgroundImage","backgroundPosition","backgroundSize","backgroundRepeat","backgroundAttachment","backgroundOrigin","backgroundClip","backgroundColor"],border:["borderTopColor","borderTopStyle","borderTopWidth","borderRightColor","borderRightStyle","borderRightWidth","borderBottomColor","borderBottomStyle","borderBottomWidth","borderLeftColor","borderLeftStyle","borderLeftWidth"],borderBottom:["borderBottomWidth","borderBottomStyle","borderBottomColor"],borderColor:["borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"],borderLeft:["borderLeftWidth","borderLeftStyle","borderLeftColor"],borderRadius:["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],borderRight:["borderRightWidth","borderRightStyle","borderRightColor"],borderTop:["borderTopWidth","borderTopStyle","borderTopColor"],borderWidth:["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"],flex:["flexGrow","flexShrink","flexBasis"],font:["fontFamily","fontSize","fontStyle","fontVariant","fontWeight","lineHeight"],margin:["marginTop","marginRight","marginBottom","marginLeft"],outline:["outlineColor","outlineStyle","outlineWidth"],padding:["paddingTop","paddingRight","paddingBottom","paddingLeft"]},f=document.createElementNS("http://www.w3.org/1999/xhtml","div"),g={thin:"1px",medium:"3px",thick:"5px"},h={borderBottomWidth:g,borderLeftWidth:g,borderRightWidth:g,borderTopWidth:g,fontSize:{"xx-small":"60%","x-small":"75%",small:"89%",medium:"100%",large:"120%","x-large":"150%","xx-large":"200%"},fontWeight:{normal:"400",bold:"700"},outlineWidth:g,textShadow:{none:"0px 0px 0px transparent"},boxShadow:{none:"0px 0px 0px 0px transparent"}};a.normalizeKeyframes=d}(c,f),function(a){var b={};a.isDeprecated=function(a,c,d,e){var f=e?"are":"is",g=new Date,h=new Date(c);return h.setMonth(h.getMonth()+3),h>g?(a in b||console.warn("Web Animations: "+a+" "+f+" deprecated and will stop working on "+h.toDateString()+". "+d),b[a]=!0,!1):!0},a.deprecated=function(b,c,d,e){var f=e?"are":"is";if(a.isDeprecated(b,c,d,e))throw new Error(b+" "+f+" no longer supported. "+d)}}(c),function(){if(document.documentElement.animate){var a=document.documentElement.animate([],0),b=!0;if(a&&(b=!1,"play|currentTime|pause|reverse|playbackRate|cancel|finish|startTime|playState".split("|").forEach(function(c){void 0===a[c]&&(b=!0)})),!b)return}!function(a,b){function c(a){for(var b={},c=0;c<a.length;c++)for(var d in a[c])if("offset"!=d&&"easing"!=d&&"composite"!=d){var e={offset:a[c].offset,easing:a[c].easing,value:a[c][d]};b[d]=b[d]||[],b[d].push(e)}for(var f in b){var g=b[f];if(0!=g[0].offset||1!=g[g.length-1].offset)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"Partial keyframes are not supported"}}return b}function d(a){var c=[];for(var d in a)for(var e=a[d],f=0;f<e.length-1;f++){var g=e[f].offset,h=e[f+1].offset,i=e[f].value,j=e[f+1].value;g==h&&(1==h?i=j:j=i),c.push({startTime:g,endTime:h,easing:e[f].easing,property:d,interpolation:b.propertyInterpolation(d,i,j)})}return c.sort(function(a,b){return a.startTime-b.startTime}),c}b.convertEffectInput=function(e){var f=a.normalizeKeyframes(e),g=c(f),h=d(g);return function(a,c){if(null!=c)h.filter(function(a){return 0>=c&&0==a.startTime||c>=1&&1==a.endTime||c>=a.startTime&&c<=a.endTime}).forEach(function(d){var e=c-d.startTime,f=d.endTime-d.startTime,g=0==f?0:d.easing(e/f);b.apply(a,d.property,d.interpolation(g))});else for(var d in g)"offset"!=d&&"easing"!=d&&"composite"!=d&&b.clear(a,d)}}}(c,d,f),function(a){function b(a,b,c){e[c]=e[c]||[],e[c].push([a,b])}function c(a,c,d){for(var e=0;e<d.length;e++){var f=d[e];b(a,c,f),/-/.test(f)&&b(a,c,f.replace(/-(.)/g,function(a,b){return b.toUpperCase()}))}}function d(b,c,d){if("initial"==c||"initial"==d){var g=b.replace(/-(.)/g,function(a,b){return b.toUpperCase()});"initial"==c&&(c=f[g]),"initial"==d&&(d=f[g])}for(var h=c==d?[]:e[b],i=0;h&&i<h.length;i++){var j=h[i][0](c),k=h[i][0](d);if(void 0!==j&&void 0!==k){var l=h[i][1](j,k);if(l){var m=a.Interpolation.apply(null,l);return function(a){return 0==a?c:1==a?d:m(a)}}}}return a.Interpolation(!1,!0,function(a){return a?d:c})}var e={};a.addPropertiesHandler=c;var f={backgroundColor:"transparent",backgroundPosition:"0% 0%",borderBottomColor:"currentColor",borderBottomLeftRadius:"0px",borderBottomRightRadius:"0px",borderBottomWidth:"3px",borderLeftColor:"currentColor",borderLeftWidth:"3px",borderRightColor:"currentColor",borderRightWidth:"3px",borderSpacing:"2px",borderTopColor:"currentColor",borderTopLeftRadius:"0px",borderTopRightRadius:"0px",borderTopWidth:"3px",bottom:"auto",clip:"rect(0px, 0px, 0px, 0px)",color:"black",fontSize:"100%",fontWeight:"400",height:"auto",left:"auto",letterSpacing:"normal",lineHeight:"120%",marginBottom:"0px",marginLeft:"0px",marginRight:"0px",marginTop:"0px",maxHeight:"none",maxWidth:"none",minHeight:"0px",minWidth:"0px",opacity:"1.0",outlineColor:"invert",outlineOffset:"0px",outlineWidth:"3px",paddingBottom:"0px",paddingLeft:"0px",paddingRight:"0px",paddingTop:"0px",right:"auto",textIndent:"0px",textShadow:"0px 0px 0px transparent",top:"auto",transform:"",verticalAlign:"0px",visibility:"visible",width:"auto",wordSpacing:"normal",zIndex:"auto"};a.propertyInterpolation=d}(d,f),function(a,b){function c(b){var c=a.calculateActiveDuration(b),d=function(d){return a.calculateTimeFraction(c,d,b)};return d._totalDuration=b.delay+c+b.endDelay,d._isCurrent=function(d){var e=a.calculatePhase(c,d,b);return e===PhaseActive||e===PhaseBefore},d}b.KeyframeEffect=function(d,e,f){var g,h=c(a.normalizeTimingInput(f)),i=b.convertEffectInput(e),j=function(){i(d,g)};return j._update=function(a){return g=h(a),null!==g},j._clear=function(){i(d,null)},j._hasSameTarget=function(a){return d===a},j._isCurrent=h._isCurrent,j._totalDuration=h._totalDuration,j},b.NullEffect=function(a){var b=function(){a&&(a(),a=null)};return b._update=function(){return null},b._totalDuration=0,b._isCurrent=function(){return!1},b._hasSameTarget=function(){return!1},b}}(c,d,f),function(a){a.apply=function(b,c,d){b.style[a.propertyName(c)]=d},a.clear=function(b,c){b.style[a.propertyName(c)]=""}}(d,f),function(a){window.Element.prototype.animate=function(b,c){return a.timeline._play(a.KeyframeEffect(this,b,c))}}(d),function(a){function b(a,c,d){if("number"==typeof a&&"number"==typeof c)return a*(1-d)+c*d;if("boolean"==typeof a&&"boolean"==typeof c)return.5>d?a:c;if(a.length==c.length){for(var e=[],f=0;f<a.length;f++)e.push(b(a[f],c[f],d));return e}throw"Mismatched interpolation arguments "+a+":"+c}a.Interpolation=function(a,c,d){return function(e){return d(b(a,c,e))}}}(d,f),function(a,b){a.sequenceNumber=0;var c=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="finish",this.bubbles=!1,this.cancelable=!1,this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()};b.Animation=function(b){this._sequenceNumber=a.sequenceNumber++,this._currentTime=0,this._startTime=null,this._paused=!1,this._playbackRate=1,this._inTimeline=!0,this._finishedFlag=!1,this.onfinish=null,this._finishHandlers=[],this._effect=b,this._inEffect=this._effect._update(0),this._idle=!0,this._currentTimePending=!1},b.Animation.prototype={_ensureAlive:function(){this._inEffect=this._effect._update(this.playbackRate<0&&0===this.currentTime?-1:this.currentTime),this._inTimeline||!this._inEffect&&this._finishedFlag||(this._inTimeline=!0,b.timeline._animations.push(this))},_tickCurrentTime:function(a,b){a!=this._currentTime&&(this._currentTime=a,this._isFinished&&!b&&(this._currentTime=this._playbackRate>0?this._totalDuration:0),this._ensureAlive())},get currentTime(){return this._idle||this._currentTimePending?null:this._currentTime},set currentTime(a){a=+a,isNaN(a)||(b.restart(),this._paused||null==this._startTime||(this._startTime=this._timeline.currentTime-a/this._playbackRate),this._currentTimePending=!1,this._currentTime!=a&&(this._tickCurrentTime(a,!0),b.invalidateEffects()))},get startTime(){return this._startTime},set startTime(a){a=+a,isNaN(a)||this._paused||this._idle||(this._startTime=a,this._tickCurrentTime((this._timeline.currentTime-this._startTime)*this.playbackRate),b.invalidateEffects())},get playbackRate(){return this._playbackRate},set playbackRate(a){if(a!=this._playbackRate){var b=this.currentTime;this._playbackRate=a,this._startTime=null,"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!=b&&(this.currentTime=b)}},get _isFinished(){return!this._idle&&(this._playbackRate>0&&this._currentTime>=this._totalDuration||this._playbackRate<0&&this._currentTime<=0)},get _totalDuration(){return this._effect._totalDuration},get playState(){return this._idle?"idle":null==this._startTime&&!this._paused&&0!=this.playbackRate||this._currentTimePending?"pending":this._paused?"paused":this._isFinished?"finished":"running"},play:function(){this._paused=!1,(this._isFinished||this._idle)&&(this._currentTime=this._playbackRate>0?0:this._totalDuration,this._startTime=null,b.invalidateEffects()),this._finishedFlag=!1,b.restart(),this._idle=!1,this._ensureAlive()},pause:function(){this._isFinished||this._paused||this._idle||(this._currentTimePending=!0),this._startTime=null,this._paused=!0},finish:function(){this._idle||(this.currentTime=this._playbackRate>0?this._totalDuration:0,this._startTime=this._totalDuration-this.currentTime,this._currentTimePending=!1)},cancel:function(){this._inEffect&&(this._inEffect=!1,this._idle=!0,this.currentTime=0,this._startTime=null,this._effect._update(null),b.invalidateEffects(),b.restart())},reverse:function(){this.playbackRate*=-1,this.play()},addEventListener:function(a,b){"function"==typeof b&&"finish"==a&&this._finishHandlers.push(b)},removeEventListener:function(a,b){if("finish"==a){var c=this._finishHandlers.indexOf(b);c>=0&&this._finishHandlers.splice(c,1)}},_fireEvents:function(a){var b=this._isFinished;if((b||this._idle)&&!this._finishedFlag){var d=new c(this,this._currentTime,a),e=this._finishHandlers.concat(this.onfinish?[this.onfinish]:[]);setTimeout(function(){e.forEach(function(a){a.call(d.target,d)})},0)}this._finishedFlag=b},_tick:function(a){return this._idle||this._paused||(null==this._startTime?this.startTime=a-this._currentTime/this.playbackRate:this._isFinished||this._tickCurrentTime((a-this._startTime)*this.playbackRate)),this._currentTimePending=!1,this._fireEvents(a),!this._idle&&(this._inEffect||!this._finishedFlag)}}}(c,d,f),function(a,b){function c(a){var b=i;i=[],a<s.currentTime&&(a=s.currentTime),g(a),b.forEach(function(b){b[1](a)}),o&&g(a),f(),l=void 0}function d(a,b){return a._sequenceNumber-b._sequenceNumber}function e(){this._animations=[],this.currentTime=window.performance&&performance.now?performance.now():0}function f(){p.forEach(function(a){a()}),p.length=0}function g(a){n=!1;var c=b.timeline;c.currentTime=a,c._animations.sort(d),m=!1;var e=c._animations;c._animations=[];var f=[],g=[];e=e.filter(function(b){return b._inTimeline=b._tick(a),b._inEffect?g.push(b._effect):f.push(b._effect),b._isFinished||b._paused||b._idle||(m=!0),b._inTimeline}),p.push.apply(p,f),p.push.apply(p,g),c._animations.push.apply(c._animations,e),o=!1,m&&requestAnimationFrame(function(){})}var h=window.requestAnimationFrame,i=[],j=0;window.requestAnimationFrame=function(a){var b=j++;return 0==i.length&&h(c),i.push([b,a]),b},window.cancelAnimationFrame=function(a){i.forEach(function(b){b[0]==a&&(b[1]=function(){})})},e.prototype={_play:function(c){c._timing=a.normalizeTimingInput(c.timing);var d=new b.Animation(c);return d._idle=!1,d._timeline=this,this._animations.push(d),b.restart(),b.invalidateEffects(),d}};var k,l=void 0,k=function(){return void 0==l&&(l=performance.now()),l},m=!1,n=!1;b.restart=function(){return m||(m=!0,requestAnimationFrame(function(){}),n=!0),n};var o=!1;b.invalidateEffects=function(){o=!0};var p=[],q=1e3/60,r=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){if(o){var a=k();a-s.currentTime>0&&(s.currentTime+=q*(Math.floor((a-s.currentTime)/q)+1)),g(s.currentTime)}return f(),r.apply(this,arguments)}});var s=new e;b.timeline=s}(c,d,f),function(a){function b(a,b){var c=a.exec(b);return c?(c=a.ignoreCase?c[0].toLowerCase():c[0],[c,b.substr(c.length)]):void 0}function c(a,b){b=b.replace(/^\s*/,"");var c=a(b);return c?[c[0],c[1].replace(/^\s*/,"")]:void 0}function d(a,d,e){a=c.bind(null,a);for(var f=[];;){var g=a(e);if(!g)return[f,e];if(f.push(g[0]),e=g[1],g=b(d,e),!g||""==g[1])return[f,e];e=g[1]}}function e(a,b){for(var c=0,d=0;d<b.length&&(!/\s|,/.test(b[d])||0!=c);d++)if("("==b[d])c++;else if(")"==b[d]&&(c--,0==c&&d++,0>=c))break;var e=a(b.substr(0,d));return void 0==e?void 0:[e,b.substr(d)]}function f(a,b){for(var c=a,d=b;c&&d;)c>d?c%=d:d%=c;return c=a*b/(c+d)}function g(a){return function(b){var c=a(b);return c&&(c[0]=void 0),c}}function h(a,b){return function(c){var d=a(c);return d?d:[b,c]}}function i(b,c){for(var d=[],e=0;e<b.length;e++){var f=a.consumeTrimmed(b[e],c);if(!f||""==f[0])return;void 0!==f[0]&&d.push(f[0]),c=f[1]}return""==c?d:void 0}function j(a,b,c,d,e){for(var g=[],h=[],i=[],j=f(d.length,e.length),k=0;j>k;k++){var l=b(d[k%d.length],e[k%e.length]);if(!l)return;g.push(l[0]),h.push(l[1]),i.push(l[2])}return[g,h,function(b){var d=b.map(function(a,b){return i[b](a)}).join(c);return a?a(d):d}]}function k(a,b,c){for(var d=[],e=[],f=[],g=0,h=0;h<c.length;h++)if("function"==typeof c[h]){var i=c[h](a[g],b[g++]);d.push(i[0]),e.push(i[1]),f.push(i[2])}else!function(a){d.push(!1),e.push(!1),f.push(function(){return c[a]})}(h);return[d,e,function(a){for(var b="",c=0;c<a.length;c++)b+=f[c](a[c]);return b}]}a.consumeToken=b,a.consumeTrimmed=c,a.consumeRepeated=d,a.consumeParenthesised=e,a.ignore=g,a.optional=h,a.consumeList=i,a.mergeNestedRepeated=j.bind(null,null),a.mergeWrappedNestedRepeated=j,a.mergeList=k}(d),function(a){function b(b){function c(b){var c=a.consumeToken(/^inset/i,b);if(c)return d.inset=!0,c;var c=a.consumeLengthOrPercent(b);if(c)return d.lengths.push(c[0]),c;var c=a.consumeColor(b);return c?(d.color=c[0],c):void 0}var d={inset:!1,lengths:[],color:null},e=a.consumeRepeated(c,/^/,b);return e&&e[0].length?[d,e[1]]:void 0}function c(c){var d=a.consumeRepeated(b,/^,/,c);return d&&""==d[1]?d[0]:void 0}function d(b,c){for(;b.lengths.length<Math.max(b.lengths.length,c.lengths.length);)b.lengths.push({px:0});for(;c.lengths.length<Math.max(b.lengths.length,c.lengths.length);)c.lengths.push({px:0});if(b.inset==c.inset&&!!b.color==!!c.color){for(var d,e=[],f=[[],0],g=[[],0],h=0;h<b.lengths.length;h++){var i=a.mergeDimensions(b.lengths[h],c.lengths[h],2==h);f[0].push(i[0]),g[0].push(i[1]),e.push(i[2])}if(b.color&&c.color){var j=a.mergeColors(b.color,c.color);f[1]=j[0],g[1]=j[1],d=j[2]}return[f,g,function(a){for(var c=b.inset?"inset ":" ",f=0;f<e.length;f++)c+=e[f](a[0][f])+" ";return d&&(c+=d(a[1])),c}]}}function e(b,c,d,e){function f(a){return{inset:a,color:[0,0,0,0],lengths:[{px:0},{px:0},{px:0},{px:0}]}}for(var g=[],h=[],i=0;i<d.length||i<e.length;i++){var j=d[i]||f(e[i].inset),k=e[i]||f(d[i].inset);g.push(j),h.push(k)}return a.mergeNestedRepeated(b,c,g,h)}var f=e.bind(null,d,", ");a.addPropertiesHandler(c,f,["box-shadow","text-shadow"])}(d),function(a){function b(a){return a.toFixed(3).replace(".000","")}function c(a,b,c){return Math.min(b,Math.max(a,c))}function d(a){return/^\s*[-+]?(\d*\.)?\d+\s*$/.test(a)?Number(a):void 0}function e(a,c){return[a,c,b]}function f(a,b){return 0!=a?h(0,1/0)(a,b):void 0}function g(a,b){return[a,b,function(a){return Math.round(c(1,1/0,a))}]}function h(a,d){return function(e,f){return[e,f,function(e){return b(c(a,d,e))}]}}function i(a,b){return[a,b,Math.round]}a.clamp=c,a.addPropertiesHandler(d,h(0,1/0),["border-image-width","line-height"]),a.addPropertiesHandler(d,h(0,1),["opacity","shape-image-threshold"]),a.addPropertiesHandler(d,f,["flex-grow","flex-shrink"]),a.addPropertiesHandler(d,g,["orphans","widows"]),a.addPropertiesHandler(d,i,["z-index"]),a.parseNumber=d,a.mergeNumbers=e,a.numberToString=b}(d,f),function(a){function b(a,b){return"visible"==a||"visible"==b?[0,1,function(c){return 0>=c?a:c>=1?b:"visible"}]:void 0}a.addPropertiesHandler(String,b,["visibility"])}(d),function(a){function b(a){a=a.trim(),e.fillStyle="#000",e.fillStyle=a;var b=e.fillStyle;if(e.fillStyle="#fff",e.fillStyle=a,b==e.fillStyle){e.fillRect(0,0,1,1);var c=e.getImageData(0,0,1,1).data;e.clearRect(0,0,1,1);var d=c[3]/255;return[c[0]*d,c[1]*d,c[2]*d,d]}}function c(b,c){return[b,c,function(b){function c(a){return Math.max(0,Math.min(255,a))}if(b[3])for(var d=0;3>d;d++)b[d]=Math.round(c(b[d]/b[3]));return b[3]=a.numberToString(a.clamp(0,1,b[3])),"rgba("+b.join(",")+")"}]}var d=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");d.width=d.height=1;var e=d.getContext("2d");a.addPropertiesHandler(b,c,["background-color","border-bottom-color","border-left-color","border-right-color","border-top-color","color","outline-color","text-decoration-color"]),a.consumeColor=a.consumeParenthesised.bind(null,b),a.mergeColors=c}(d,f),function(a,b){function c(a,b){if(b=b.trim().toLowerCase(),"0"==b&&"px".search(a)>=0)return{px:0};if(/^[^(]*$|^calc/.test(b)){b=b.replace(/calc\(/g,"(");var c={};b=b.replace(a,function(a){return c[a]=null,"U"+a});for(var d="U("+a.source+")",e=b.replace(/[-+]?(\d*\.)?\d+/g,"N").replace(new RegExp("N"+d,"g"),"D").replace(/\s[+-]\s/g,"O").replace(/\s/g,""),f=[/N\*(D)/g,/(N|D)[*/]N/g,/(N|D)O\1/g,/\((N|D)\)/g],g=0;g<f.length;)f[g].test(e)?(e=e.replace(f[g],"$1"),g=0):g++;if("D"==e){for(var h in c){var i=eval(b.replace(new RegExp("U"+h,"g"),"").replace(new RegExp(d,"g"),"*0"));if(!isFinite(i))return;c[h]=i}return c}}}function d(a,b){return e(a,b,!0)}function e(b,c,d){var e,f=[];for(e in b)f.push(e);for(e in c)f.indexOf(e)<0&&f.push(e);return b=f.map(function(a){return b[a]||0}),c=f.map(function(a){return c[a]||0}),[b,c,function(b){var c=b.map(function(c,e){return 1==b.length&&d&&(c=Math.max(c,0)),a.numberToString(c)+f[e]}).join(" + ");return b.length>1?"calc("+c+")":c}]}var f="px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc",g=c.bind(null,new RegExp(f,"g")),h=c.bind(null,new RegExp(f+"|%","g")),i=c.bind(null,/deg|rad|grad|turn/g);a.parseLength=g,a.parseLengthOrPercent=h,a.consumeLengthOrPercent=a.consumeParenthesised.bind(null,h),a.parseAngle=i,a.mergeDimensions=e;var j=a.consumeParenthesised.bind(null,g),k=a.consumeRepeated.bind(void 0,j,/^/),l=a.consumeRepeated.bind(void 0,k,/^,/);a.consumeSizePairList=l;var m=function(a){var b=l(a);return b&&""==b[1]?b[0]:void 0},n=a.mergeNestedRepeated.bind(void 0,d," "),o=a.mergeNestedRepeated.bind(void 0,n,",");a.mergeNonNegativeSizePair=n,a.addPropertiesHandler(m,o,["background-size"]),a.addPropertiesHandler(h,d,["border-bottom-width","border-image-width","border-left-width","border-right-width","border-top-width","flex-basis","font-size","height","line-height","max-height","max-width","outline-width","width"]),a.addPropertiesHandler(h,e,["border-bottom-left-radius","border-bottom-right-radius","border-top-left-radius","border-top-right-radius","bottom","left","letter-spacing","margin-bottom","margin-left","margin-right","margin-top","min-height","min-width","outline-offset","padding-bottom","padding-left","padding-right","padding-top","perspective","right","shape-margin","text-indent","top","vertical-align","word-spacing"])}(d,f),function(a){function b(b){return a.consumeLengthOrPercent(b)||a.consumeToken(/^auto/,b)}function c(c){var d=a.consumeList([a.ignore(a.consumeToken.bind(null,/^rect/)),a.ignore(a.consumeToken.bind(null,/^\(/)),a.consumeRepeated.bind(null,b,/^,/),a.ignore(a.consumeToken.bind(null,/^\)/))],c);return d&&4==d[0].length?d[0]:void 0}function d(b,c){return"auto"==b||"auto"==c?[!0,!1,function(d){var e=d?b:c;if("auto"==e)return"auto";var f=a.mergeDimensions(e,e);return f[2](f[0])}]:a.mergeDimensions(b,c)}function e(a){return"rect("+a+")"}var f=a.mergeWrappedNestedRepeated.bind(null,e,d,", ");a.parseBox=c,a.mergeBoxes=f,a.addPropertiesHandler(c,f,["clip"])}(d,f),function(a){function b(a){return function(b){var c=0;return a.map(function(a){return a===j?b[c++]:a})}}function c(a){return a}function d(b){if(b=b.toLowerCase().trim(),"none"==b)return[];for(var c,d=/\s*(\w+)\(([^)]*)\)/g,e=[],f=0;c=d.exec(b);){if(c.index!=f)return;f=c.index+c[0].length;var g=c[1],h=m[g];if(!h)return;var i=c[2].split(","),j=h[0];if(j.length<i.length)return;for(var n=[],o=0;o<j.length;o++){var p,q=i[o],r=j[o];if(p=q?{A:function(b){return"0"==b.trim()?l:a.parseAngle(b)},N:a.parseNumber,T:a.parseLengthOrPercent,L:a.parseLength}[r.toUpperCase()](q):{a:l,n:n[0],t:k}[r],void 0===p)return;n.push(p)}if(e.push({t:g,d:n}),d.lastIndex==b.length)return e}}function e(a){return a.toFixed(6).replace(".000000","")}function f(b,c){if(b.decompositionPair!==c){b.decompositionPair=c;var d=a.makeMatrixDecomposition(b)}if(c.decompositionPair!==b){c.decompositionPair=b;var f=a.makeMatrixDecomposition(c)}return null==d[0]||null==f[0]?[[!1],[!0],function(a){return a?c[0].d:b[0].d}]:(d[0].push(0),f[0].push(1),[d,f,function(b){var c=a.quat(d[0][3],f[0][3],b[5]),g=a.composeMatrix(b[0],b[1],b[2],c,b[4]),h=g.map(e).join(",");return h}])}function g(a){return a.replace(/[xy]/,"")}function h(a){return a.replace(/(x|y|z|3d)?$/,"3d")}function i(b,c){var d=a.makeMatrixDecomposition&&!0,e=!1;if(!b.length||!c.length){b.length||(e=!0,b=c,c=[]);for(var i=0;i<b.length;i++){var j=b[i].t,k=b[i].d,l="scale"==j.substr(0,5)?1:0;c.push({t:j,d:k.map(function(a){if("number"==typeof a)return l;var b={};for(var c in a)b[c]=l;return b})})}}var n=function(a,b){return"perspective"==a&&"perspective"==b||("matrix"==a||"matrix3d"==a)&&("matrix"==b||"matrix3d"==b)},o=[],p=[],q=[];if(b.length!=c.length){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]]}else for(var i=0;i<b.length;i++){var j,s=b[i].t,t=c[i].t,u=b[i].d,v=c[i].d,w=m[s],x=m[t];if(n(s,t)){if(!d)return;var r=f([b[i]],[c[i]]);o.push(r[0]),p.push(r[1]),q.push(["matrix",[r[2]]])}else{if(s==t)j=s;else if(w[2]&&x[2]&&g(s)==g(t))j=g(s),u=w[2](u),v=x[2](v);else{if(!w[1]||!x[1]||h(s)!=h(t)){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]];break}j=h(s),u=w[1](u),v=x[1](v)}for(var y=[],z=[],A=[],B=0;B<u.length;B++){var C="number"==typeof u[B]?a.mergeNumbers:a.mergeDimensions,r=C(u[B],v[B]);y[B]=r[0],z[B]=r[1],A.push(r[2])}o.push(y),p.push(z),q.push([j,A])}}if(e){var D=o;o=p,p=D}return[o,p,function(a){return a.map(function(a,b){var c=a.map(function(a,c){return q[b][1][c](a)}).join(",");return"matrix"==q[b][0]&&16==c.split(",").length&&(q[b][0]="matrix3d"),q[b][0]+"("+c+")"}).join(" ")}]}var j=null,k={px:0},l={deg:0},m={matrix:["NNNNNN",[j,j,0,0,j,j,0,0,0,0,1,0,j,j,0,1],c],matrix3d:["NNNNNNNNNNNNNNNN",c],rotate:["A"],rotatex:["A"],rotatey:["A"],rotatez:["A"],rotate3d:["NNNA"],perspective:["L"],scale:["Nn",b([j,j,1]),c],scalex:["N",b([j,1,1]),b([j,1])],scaley:["N",b([1,j,1]),b([1,j])],scalez:["N",b([1,1,j])],scale3d:["NNN",c],skew:["Aa",null,c],skewx:["A",null,b([j,l])],skewy:["A",null,b([l,j])],translate:["Tt",b([j,j,k]),c],translatex:["T",b([j,k,k]),b([j,k])],translatey:["T",b([k,j,k]),b([k,j])],translatez:["L",b([k,k,j])],translate3d:["TTL",c]};a.addPropertiesHandler(d,i,["transform"])}(d,f),function(a){function b(a,b){b.concat([a]).forEach(function(b){b in document.documentElement.style&&(c[a]=b)})}var c={};b("transform",["webkitTransform","msTransform"]),b("transformOrigin",["webkitTransformOrigin"]),b("perspective",["webkitPerspective"]),b("perspectiveOrigin",["webkitPerspectiveOrigin"]),a.propertyName=function(a){return c[a]||a}}(d,f)}(),!function(a,b){function c(a){var b=window.document.timeline;b.currentTime=a,b._discardAnimations(),0==b._animations.length?e=!1:requestAnimationFrame(c)}var d=window.requestAnimationFrame;window.requestAnimationFrame=function(a){return d(function(b){window.document.timeline._updateAnimationsPromises(),a(b),window.document.timeline._updateAnimationsPromises()})},b.AnimationTimeline=function(){this._animations=[],this.currentTime=void 0},b.AnimationTimeline.prototype={getAnimations:function(){return this._discardAnimations(),this._animations.slice()},_updateAnimationsPromises:function(){b.animationsWithPromises=b.animationsWithPromises.filter(function(a){return a._updatePromises()})},_discardAnimations:function(){this._updateAnimationsPromises(),this._animations=this._animations.filter(function(a){return"finished"!=a.playState&&"idle"!=a.playState})},_play:function(a){var c=new b.Animation(a,this);return this._animations.push(c),b.restartWebAnimationsNextTick(),c._updatePromises(),c._animation.play(),c._updatePromises(),c},play:function(a){return a&&a.remove(),this._play(a)}};var e=!1;b.restartWebAnimationsNextTick=function(){e||(e=!0,requestAnimationFrame(c))};var f=new b.AnimationTimeline;b.timeline=f;try{Object.defineProperty(window.document,"timeline",{configurable:!0,get:function(){return f}})}catch(g){}try{window.document.timeline=f}catch(g){}}(c,e,f),function(a,b){b.animationsWithPromises=[],b.Animation=function(b,c){if(this.effect=b,b&&(b._animation=this),!c)throw new Error("Animation with null timeline is not supported");this._timeline=c,this._sequenceNumber=a.sequenceNumber++,this._holdTime=0,this._paused=!1,this._isGroup=!1,this._animation=null,this._childAnimations=[],this._callback=null,this._oldPlayState="idle",this._rebuildUnderlyingAnimation(),this._animation.cancel(),this._updatePromises()},b.Animation.prototype={_updatePromises:function(){var a=this._oldPlayState,b=this.playState;return this._readyPromise&&b!==a&&("idle"==b?(this._rejectReadyPromise(),this._readyPromise=void 0):"pending"==a?this._resolveReadyPromise():"pending"==b&&(this._readyPromise=void 0)),this._finishedPromise&&b!==a&&("idle"==b?(this._rejectFinishedPromise(),this._finishedPromise=void 0):"finished"==b?this._resolveFinishedPromise():"finished"==a&&(this._finishedPromise=void 0)),this._oldPlayState=this.playState,this._readyPromise||this._finishedPromise},_rebuildUnderlyingAnimation:function(){this._updatePromises();var a,c,d,e,f=this._animation?!0:!1;f&&(a=this.playbackRate,c=this._paused,d=this.startTime,e=this.currentTime,this._animation.cancel(),this._animation._wrapper=null,this._animation=null),(!this.effect||this.effect instanceof window.KeyframeEffect)&&(this._animation=b.newUnderlyingAnimationForKeyframeEffect(this.effect),b.bindAnimationForKeyframeEffect(this)),(this.effect instanceof window.SequenceEffect||this.effect instanceof window.GroupEffect)&&(this._animation=b.newUnderlyingAnimationForGroup(this.effect),b.bindAnimationForGroup(this)),this.effect&&this.effect._onsample&&b.bindAnimationForCustomEffect(this),f&&(1!=a&&(this.playbackRate=a),null!==d?this.startTime=d:null!==e?this.currentTime=e:null!==this._holdTime&&(this.currentTime=this._holdTime),c&&this.pause()),this._updatePromises()
},_updateChildren:function(){if(this.effect&&"idle"!=this.playState){var a=this.effect._timing.delay;this._childAnimations.forEach(function(c){this._arrangeChildren(c,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c.effect))}.bind(this))}},_setExternalAnimation:function(a){if(this.effect&&this._isGroup)for(var b=0;b<this.effect.children.length;b++)this.effect.children[b]._animation=a,this._childAnimations[b]._setExternalAnimation(a)},_constructChildAnimations:function(){if(this.effect&&this._isGroup){var a=this.effect._timing.delay;this._removeChildAnimations(),this.effect.children.forEach(function(c){var d=window.document.timeline._play(c);this._childAnimations.push(d),d.playbackRate=this.playbackRate,this._paused&&d.pause(),c._animation=this.effect._animation,this._arrangeChildren(d,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c))}.bind(this))}},_arrangeChildren:function(a,b){null===this.startTime?a.currentTime=this.currentTime-b/this.playbackRate:a.startTime!==this.startTime+b/this.playbackRate&&(a.startTime=this.startTime+b/this.playbackRate)},get timeline(){return this._timeline},get playState(){return this._animation?this._animation.playState:"idle"},get finished(){return window.Promise?(this._finishedPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._finishedPromise=new Promise(function(a,b){this._resolveFinishedPromise=function(){a(this)},this._rejectFinishedPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"finished"==this.playState&&this._resolveFinishedPromise()),this._finishedPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get ready(){return window.Promise?(this._readyPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._readyPromise=new Promise(function(a,b){this._resolveReadyPromise=function(){a(this)},this._rejectReadyPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"pending"!==this.playState&&this._resolveReadyPromise()),this._readyPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get onfinish(){return this._onfinish},set onfinish(a){"function"==typeof a?(this._onfinish=a,this._animation.onfinish=function(b){b.target=this,a.call(this,b)}.bind(this)):(this._animation.onfinish=a,this.onfinish=this._animation.onfinish)},get currentTime(){this._updatePromises();var a=this._animation.currentTime;return this._updatePromises(),a},set currentTime(a){this._updatePromises(),this._animation.currentTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.currentTime=a-c}),this._updatePromises()},get startTime(){return this._animation.startTime},set startTime(a){this._updatePromises(),this._animation.startTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.startTime=a+c}),this._updatePromises()},get playbackRate(){return this._animation.playbackRate},set playbackRate(a){this._updatePromises();var b=this.currentTime;this._animation.playbackRate=a,this._forEachChild(function(b){b.playbackRate=a}),"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!==b&&(this.currentTime=b),this._updatePromises()},play:function(){this._updatePromises(),this._paused=!1,this._animation.play(),-1==this._timeline._animations.indexOf(this)&&this._timeline._animations.push(this),this._register(),b.awaitStartTime(this),this._forEachChild(function(a){var b=a.currentTime;a.play(),a.currentTime=b}),this._updatePromises()},pause:function(){this._updatePromises(),this.currentTime&&(this._holdTime=this.currentTime),this._animation.pause(),this._register(),this._forEachChild(function(a){a.pause()}),this._paused=!0,this._updatePromises()},finish:function(){this._updatePromises(),this._animation.finish(),this._register(),this._updatePromises()},cancel:function(){this._updatePromises(),this._animation.cancel(),this._register(),this._removeChildAnimations(),this._updatePromises()},reverse:function(){this._updatePromises();var a=this.currentTime;this._animation.reverse(),this._forEachChild(function(a){a.reverse()}),null!==a&&(this.currentTime=a),this._updatePromises()},addEventListener:function(a,b){var c=b;"function"==typeof b&&(c=function(a){a.target=this,b.call(this,a)}.bind(this),b._wrapper=c),this._animation.addEventListener(a,c)},removeEventListener:function(a,b){this._animation.removeEventListener(a,b&&b._wrapper||b)},_removeChildAnimations:function(){for(;this._childAnimations.length;)this._childAnimations.pop().cancel()},_forEachChild:function(b){var c=0;if(this.effect.children&&this._childAnimations.length<this.effect.children.length&&this._constructChildAnimations(),this._childAnimations.forEach(function(a){b.call(this,a,c),this.effect instanceof window.SequenceEffect&&(c+=a.effect.activeDuration)}.bind(this)),"pending"!=this.playState){var d=this.effect._timing,e=this.currentTime;null!==e&&(e=a.calculateTimeFraction(a.calculateActiveDuration(d),e,d)),(null==e||isNaN(e))&&this._removeChildAnimations()}}},window.Animation=b.Animation}(c,e,f),function(a,b){function c(b){this._frames=a.normalizeKeyframes(b)}function d(){for(var a=!1;h.length;){var b=h.shift();b._updateChildren(),a=!0}return a}var e=function(a){if(a._animation=void 0,a instanceof window.SequenceEffect||a instanceof window.GroupEffect)for(var b=0;b<a.children.length;b++)e(a.children[b])};b.removeMulti=function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c];d._parent?(-1==b.indexOf(d._parent)&&b.push(d._parent),d._parent.children.splice(d._parent.children.indexOf(d),1),d._parent=null,e(d)):d._animation&&d._animation.effect==d&&(d._animation.cancel(),d._animation.effect=new KeyframeEffect(null,[]),d._animation._callback&&(d._animation._callback._animation=null),d._animation._rebuildUnderlyingAnimation(),e(d))}for(c=0;c<b.length;c++)b[c]._rebuild()},b.KeyframeEffect=function(b,d,e){return this.target=b,this._parent=null,e=a.numericTimingToObject(e),this._timingInput=a.cloneTimingInput(e),this._timing=a.normalizeTimingInput(e),this.timing=a.makeTiming(e,!1,this),this.timing._effect=this,"function"==typeof d?(a.deprecated("Custom KeyframeEffect","2015-06-22","Use KeyframeEffect.onsample instead."),this._normalizedKeyframes=d):this._normalizedKeyframes=new c(d),this._keyframes=d,this.activeDuration=a.calculateActiveDuration(this._timing),this},b.KeyframeEffect.prototype={getFrames:function(){return"function"==typeof this._normalizedKeyframes?this._normalizedKeyframes:this._normalizedKeyframes._frames},set onsample(a){if("function"==typeof this.getFrames())throw new Error("Setting onsample on custom effect KeyframeEffect is not supported.");this._onsample=a,this._animation&&this._animation._rebuildUnderlyingAnimation()},get parent(){return this._parent},clone:function(){if("function"==typeof this.getFrames())throw new Error("Cloning custom effects is not supported.");var b=new KeyframeEffect(this.target,[],a.cloneTimingInput(this._timingInput));return b._normalizedKeyframes=this._normalizedKeyframes,b._keyframes=this._keyframes,b},remove:function(){b.removeMulti([this])}};var f=Element.prototype.animate;Element.prototype.animate=function(a,c){return b.timeline._play(new b.KeyframeEffect(this,a,c))};var g=document.createElementNS("http://www.w3.org/1999/xhtml","div");b.newUnderlyingAnimationForKeyframeEffect=function(a){if(a){var b=a.target||g,c=a._keyframes;"function"==typeof c&&(c=[]);var d=a._timingInput}else var b=g,c=[],d=0;return f.apply(b,[c,d])},b.bindAnimationForKeyframeEffect=function(a){a.effect&&"function"==typeof a.effect._normalizedKeyframes&&b.bindAnimationForCustomEffect(a)};var h=[];b.awaitStartTime=function(a){null===a.startTime&&a._isGroup&&(0==h.length&&requestAnimationFrame(d),h.push(a))};var i=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){window.document.timeline._updateAnimationsPromises();var a=i.apply(this,arguments);return d()&&(a=i.apply(this,arguments)),window.document.timeline._updateAnimationsPromises(),a}}),window.KeyframeEffect=b.KeyframeEffect,window.Element.prototype.getAnimations=function(){return document.timeline.getAnimations().filter(function(a){return null!==a.effect&&a.effect.target==this}.bind(this))}}(c,e,f),function(a,b){function c(a){a._registered||(a._registered=!0,f.push(a),g||(g=!0,requestAnimationFrame(d)))}function d(){var a=f;f=[],a.sort(function(a,b){return a._sequenceNumber-b._sequenceNumber}),a=a.filter(function(a){a();var b=a._animation?a._animation.playState:"idle";return"running"!=b&&"pending"!=b&&(a._registered=!1),a._registered}),f.push.apply(f,a),f.length?(g=!0,requestAnimationFrame(d)):g=!1}var e=(document.createElementNS("http://www.w3.org/1999/xhtml","div"),0);b.bindAnimationForCustomEffect=function(b){var d,f=b.effect.target,g="function"==typeof b.effect.getFrames();d=g?b.effect.getFrames():b.effect._onsample;var h=b.effect.timing,i=null;h=a.normalizeTimingInput(h);var j=function(){var c=j._animation?j._animation.currentTime:null;null!==c&&(c=a.calculateTimeFraction(a.calculateActiveDuration(h),c,h),isNaN(c)&&(c=null)),c!==i&&(g?d(c,f,b.effect):d(c,b.effect,b.effect._animation)),i=c};j._animation=b,j._registered=!1,j._sequenceNumber=e++,b._callback=j,c(j)};var f=[],g=!1;b.Animation.prototype._register=function(){this._callback&&c(this._callback)}}(c,e,f),function(a,b){function c(a){return a._timing.delay+a.activeDuration+a._timing.endDelay}function d(b,c){this._parent=null,this.children=b||[],this._reparent(this.children),c=a.numericTimingToObject(c),this._timingInput=a.cloneTimingInput(c),this._timing=a.normalizeTimingInput(c,!0),this.timing=a.makeTiming(c,!0,this),this.timing._effect=this,"auto"===this._timing.duration&&(this._timing.duration=this.activeDuration)}window.SequenceEffect=function(){d.apply(this,arguments)},window.GroupEffect=function(){d.apply(this,arguments)},d.prototype={_isAncestor:function(a){for(var b=this;null!==b;){if(b==a)return!0;b=b._parent}return!1},_rebuild:function(){for(var a=this;a;)"auto"===a.timing.duration&&(a._timing.duration=a.activeDuration),a=a._parent;this._animation&&this._animation._rebuildUnderlyingAnimation()},_reparent:function(a){b.removeMulti(a);for(var c=0;c<a.length;c++)a[c]._parent=this},_putChild:function(a,b){for(var c=b?"Cannot append an ancestor or self":"Cannot prepend an ancestor or self",d=0;d<a.length;d++)if(this._isAncestor(a[d]))throw{type:DOMException.HIERARCHY_REQUEST_ERR,name:"HierarchyRequestError",message:c};for(var d=0;d<a.length;d++)b?this.children.push(a[d]):this.children.unshift(a[d]);this._reparent(a),this._rebuild()},append:function(){this._putChild(arguments,!0)},prepend:function(){this._putChild(arguments,!1)},get parent(){return this._parent},get firstChild(){return this.children.length?this.children[0]:null},get lastChild(){return this.children.length?this.children[this.children.length-1]:null},clone:function(){for(var b=a.cloneTimingInput(this._timingInput),c=[],d=0;d<this.children.length;d++)c.push(this.children[d].clone());return this instanceof GroupEffect?new GroupEffect(c,b):new SequenceEffect(c,b)},remove:function(){b.removeMulti([this])}},window.SequenceEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.SequenceEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a+=c(b)}),Math.max(a,0)}}),window.GroupEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.GroupEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a=Math.max(a,c(b))}),a}}),b.newUnderlyingAnimationForGroup=function(c){var d,e=null,f=function(b){var c=d._wrapper;return c&&"pending"!=c.playState&&c.effect?null==b?void c._removeChildAnimations():0==b&&c.playbackRate<0&&(e||(e=a.normalizeTimingInput(c.effect.timing)),b=a.calculateTimeFraction(a.calculateActiveDuration(e),-1,e),isNaN(b)||null==b)?(c._forEachChild(function(a){a.currentTime=-1}),void c._removeChildAnimations()):void 0:void 0},g=new KeyframeEffect(null,[],c._timing);return g.onsample=f,d=b.timeline._play(g)},b.bindAnimationForGroup=function(a){a._animation._wrapper=a,a._isGroup=!0,b.awaitStartTime(a),a._constructChildAnimations(),a._setExternalAnimation(a)},b.groupChildDuration=c}(c,e,f)}({},function(){return this}());
//# sourceMappingURL=web-animations-next-lite.min.js.map
Polymer({

    is: 'opaque-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      node.style.opacity = '0';
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function(config) {
      config.node.style.opacity = '';
    }

  });
/**
   * `Polymer.NeonAnimatableBehavior` is implemented by elements containing animations for use with
   * elements implementing `Polymer.NeonAnimationRunnerBehavior`.
   * @polymerBehavior
   */
  Polymer.NeonAnimatableBehavior = {

    properties: {

      /**
       * Animation configuration. See README for more info.
       */
      animationConfig: {
        type: Object
      },

      /**
       * Convenience property for setting an 'entry' animation. Do not set `animationConfig.entry`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      entryAnimation: {
        observer: '_entryAnimationChanged',
        type: String
      },

      /**
       * Convenience property for setting an 'exit' animation. Do not set `animationConfig.exit`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      exitAnimation: {
        observer: '_exitAnimationChanged',
        type: String
      }

    },

    _entryAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      if (this.entryAnimation !== 'fade-in-animation') {
        // insert polyfill hack
        this.animationConfig['entry'] = [{
          name: 'opaque-animation',
          node: this
        }, {
          name: this.entryAnimation,
          node: this
        }];
      } else {
        this.animationConfig['entry'] = [{
          name: this.entryAnimation,
          node: this
        }];
      }
    },

    _exitAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      this.animationConfig['exit'] = [{
        name: this.exitAnimation,
        node: this
      }];
    },

    _copyProperties: function(config1, config2) {
      // shallowly copy properties from config2 to config1
      for (var property in config2) {
        config1[property] = config2[property];
      }
    },

    _cloneConfig: function(config) {
      var clone = {
        isClone: true
      };
      this._copyProperties(clone, config);
      return clone;
    },

    _getAnimationConfigRecursive: function(type, map, allConfigs) {
      if (!this.animationConfig) {
        return;
      }

      // type is optional
      var thisConfig;
      if (type) {
        thisConfig = this.animationConfig[type];
      } else {
        thisConfig = this.animationConfig;
      }

      if (!Array.isArray(thisConfig)) {
        thisConfig = [thisConfig];
      }

      // iterate animations and recurse to process configurations from child nodes
      if (thisConfig) {
        for (var config, index = 0; config = thisConfig[index]; index++) {
          if (config.animatable) {
            config.animatable._getAnimationConfigRecursive(config.type || type, map, allConfigs);
          } else {
            if (config.id) {
              var cachedConfig = map[config.id];
              if (cachedConfig) {
                // merge configurations with the same id, making a clone lazily
                if (!cachedConfig.isClone) {
                  map[config.id] = this._cloneConfig(cachedConfig)
                  cachedConfig = map[config.id];
                }
                this._copyProperties(cachedConfig, config);
              } else {
                // put any configs with an id into a map
                map[config.id] = config;
              }
            } else {
              allConfigs.push(config);
            }
          }
        }
      }
    },

    /**
     * An element implementing `Polymer.NeonAnimationRunnerBehavior` calls this method to configure
     * an animation with an optional type. Elements implementing `Polymer.NeonAnimatableBehavior`
     * should define the property `animationConfig`, which is either a configuration object
     * or a map of animation type to array of configuration objects.
     */
    getAnimationConfig: function(type) {
      var map = [];
      var allConfigs = [];
      this._getAnimationConfigRecursive(type, map, allConfigs);
      // append the configurations saved in the map to the array
      for (var key in map) {
        allConfigs.push(map[key]);
      }
      return allConfigs;
    }

  };
/**
   * `Polymer.NeonAnimationRunnerBehavior` adds a method to run animations.
   *
   * @polymerBehavior Polymer.NeonAnimationRunnerBehavior
   */
  Polymer.NeonAnimationRunnerBehaviorImpl = {

    properties: {

      _animationMeta: {
        type: Object,
        value: function() {
          return new Polymer.IronMeta({type: 'animation'});
        }
      },

      /** @type {?Object} */
      _player: {
        type: Object
      }

    },

    _configureAnimationEffects: function(allConfigs) {
      var allAnimations = [];
      if (allConfigs.length > 0) {
        for (var config, index = 0; config = allConfigs[index]; index++) {
          var animationConstructor = this._animationMeta.byKey(config.name);
          if (animationConstructor) {
            var animation = animationConstructor && new animationConstructor();
            var effect = animation.configure(config);
            if (effect) {
              allAnimations.push({
                animation: animation,
                config: config,
                effect: effect
              });
            }
          } else {
            console.warn(this.is + ':', config.name, 'not found!');
          }
        }
      }
      return allAnimations;
    },

    _runAnimationEffects: function(allEffects) {
      return document.timeline.play(new GroupEffect(allEffects));
    },

    _completeAnimations: function(allAnimations) {
      for (var animation, index = 0; animation = allAnimations[index]; index++) {
        animation.animation.complete(animation.config);
      }
    },

    /**
     * Plays an animation with an optional `type`.
     * @param {string=} type
     * @param {!Object=} cookie
     */
    playAnimation: function(type, cookie) {
      var allConfigs = this.getAnimationConfig(type);
      if (!allConfigs) {
        return;
      }
      var allAnimations = this._configureAnimationEffects(allConfigs);
      var allEffects = allAnimations.map(function(animation) {
        return animation.effect;
      });

      if (allEffects.length > 0) {
        this._player = this._runAnimationEffects(allEffects);
        this._player.onfinish = function() {
          this._completeAnimations(allAnimations);

          if (this._player) {
            this._player.cancel();
            this._player = null;
          }

          this.fire('neon-animation-finish', cookie, {bubbles: false});
        }.bind(this);

      } else {
        this.fire('neon-animation-finish', cookie, {bubbles: false});
      }
    },

    /**
     * Cancels the currently running animation.
     */
    cancelAnimation: function() {
      if (this._player) {
        this._player.cancel();
      }
    }
  };

  /** @polymerBehavior Polymer.NeonAnimationRunnerBehavior */
  Polymer.NeonAnimationRunnerBehavior = [
    Polymer.NeonAnimatableBehavior,
    Polymer.NeonAnimationRunnerBehaviorImpl
  ];
/**
Polymer.IronFitBehavior fits an element in another element using `max-height` and `max-width`, and
optionally centers it in the window or another element.

The element will only be sized and/or positioned if it has not already been sized and/or positioned
by CSS.

CSS properties               | Action
-----------------------------|-------------------------------------------
`position` set               | Element is not centered horizontally or vertically
`top` or `bottom` set        | Element is not vertically centered
`left` or `right` set        | Element is not horizontally centered
`max-height` or `height` set | Element respects `max-height` or `height`
`max-width` or `width` set   | Element respects `max-width` or `width`

@demo demo/index.html
@polymerBehavior
*/

  Polymer.IronFitBehavior = {

    properties: {

      /**
       * The element that will receive a `max-height`/`width`. By default it is the same as `this`,
       * but it can be set to a child element. This is useful, for example, for implementing a
       * scrolling region inside the element.
       * @type {!Element}
       */
      sizingTarget: {
        type: Object,
        value: function() {
          return this;
        }
      },

      /**
       * The element to fit `this` into.
       */
      fitInto: {
        type: Object,
        value: window
      },

      /**
       * Set to true to auto-fit on attach.
       */
      autoFitOnAttach: {
        type: Boolean,
        value: false
      },

      /** @type {?Object} */
      _fitInfo: {
        type: Object
      }

    },

    get _fitWidth() {
      var fitWidth;
      if (this.fitInto === window) {
        fitWidth = this.fitInto.innerWidth;
      } else {
        fitWidth = this.fitInto.getBoundingClientRect().width;
      }
      return fitWidth;
    },

    get _fitHeight() {
      var fitHeight;
      if (this.fitInto === window) {
        fitHeight = this.fitInto.innerHeight;
      } else {
        fitHeight = this.fitInto.getBoundingClientRect().height;
      }
      return fitHeight;
    },

    get _fitLeft() {
      var fitLeft;
      if (this.fitInto === window) {
        fitLeft = 0;
      } else {
        fitLeft = this.fitInto.getBoundingClientRect().left;
      }
      return fitLeft;
    },

    get _fitTop() {
      var fitTop;
      if (this.fitInto === window) {
        fitTop = 0;
      } else {
        fitTop = this.fitInto.getBoundingClientRect().top;
      }
      return fitTop;
    },

    attached: function() {
      if (this.autoFitOnAttach) {
        if (window.getComputedStyle(this).display === 'none') {
          setTimeout(function() {
            this.fit();
          }.bind(this));
        } else {
          this.fit();
        }
      }
    },

    /**
     * Fits and optionally centers the element into the window, or `fitInfo` if specified.
     */
    fit: function() {
      this._discoverInfo();
      this.constrain();
      this.center();
    },

    /**
     * Memoize information needed to position and size the target element.
     */
    _discoverInfo: function() {
      if (this._fitInfo) {
        return;
      }
      var target = window.getComputedStyle(this);
      var sizer = window.getComputedStyle(this.sizingTarget);
      this._fitInfo = {
        inlineStyle: {
          top: this.style.top || '',
          left: this.style.left || ''
        },
        positionedBy: {
          vertically: target.top !== 'auto' ? 'top' : (target.bottom !== 'auto' ?
            'bottom' : null),
          horizontally: target.left !== 'auto' ? 'left' : (target.right !== 'auto' ?
            'right' : null),
          css: target.position
        },
        sizedBy: {
          height: sizer.maxHeight !== 'none',
          width: sizer.maxWidth !== 'none'
        },
        margin: {
          top: parseInt(target.marginTop, 10) || 0,
          right: parseInt(target.marginRight, 10) || 0,
          bottom: parseInt(target.marginBottom, 10) || 0,
          left: parseInt(target.marginLeft, 10) || 0
        }
      };
    },

    /**
     * Resets the target element's position and size constraints, and clear
     * the memoized data.
     */
    resetFit: function() {
      if (!this._fitInfo || !this._fitInfo.sizedBy.height) {
        this.sizingTarget.style.maxHeight = '';
        this.style.top = this._fitInfo ? this._fitInfo.inlineStyle.top : '';
      }
      if (!this._fitInfo || !this._fitInfo.sizedBy.width) {
        this.sizingTarget.style.maxWidth = '';
        this.style.left = this._fitInfo ? this._fitInfo.inlineStyle.left : '';
      }
      if (this._fitInfo) {
        this.style.position = this._fitInfo.positionedBy.css;
      }
      this._fitInfo = null;
    },

    /**
     * Equivalent to calling `resetFit()` and `fit()`. Useful to call this after the element,
     * the window, or the `fitInfo` element has been resized.
     */
    refit: function() {
      this.resetFit();
      this.fit();
    },

    /**
     * Constrains the size of the element to the window or `fitInfo` by setting `max-height`
     * and/or `max-width`.
     */
    constrain: function() {
      var info = this._fitInfo;
      // position at (0px, 0px) if not already positioned, so we can measure the natural size.
      if (!this._fitInfo.positionedBy.vertically) {
        this.style.top = '0px';
      }
      if (!this._fitInfo.positionedBy.horizontally) {
        this.style.left = '0px';
      }
      // need border-box for margin/padding
      this.sizingTarget.style.boxSizing = 'border-box';
      // constrain the width and height if not already set
      var rect = this.getBoundingClientRect();
      if (!info.sizedBy.height) {
        this._sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
      }
      if (!info.sizedBy.width) {
        this._sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
      }
    },

    _sizeDimension: function(rect, positionedBy, start, end, extent) {
      var info = this._fitInfo;
      var max = extent === 'Width' ? this._fitWidth : this._fitHeight;
      var flip = (positionedBy === end);
      var offset = flip ? max - rect[end] : rect[start];
      var margin = info.margin[flip ? start : end];
      var offsetExtent = 'offset' + extent;
      var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
      this.sizingTarget.style['max' + extent] = (max - margin - offset - sizingOffset) + 'px';
    },

    /**
     * Centers horizontally and vertically if not already positioned. This also sets
     * `position:fixed`.
     */
    center: function() {
      if (!this._fitInfo.positionedBy.vertically || !this._fitInfo.positionedBy.horizontally) {
        // need position:fixed to center
        this.style.position = 'fixed';
      }
      if (!this._fitInfo.positionedBy.vertically) {
        var top = (this._fitHeight - this.offsetHeight) / 2 + this._fitTop;
        top -= this._fitInfo.margin.top;
        this.style.top = top + 'px';
      }
      if (!this._fitInfo.positionedBy.horizontally) {
        var left = (this._fitWidth - this.offsetWidth) / 2 + this._fitLeft;
        left -= this._fitInfo.margin.left;
        this.style.left = left + 'px';
      }
    }

  };
Polymer.IronOverlayManager = (function() {

    var overlays = [];
    var DEFAULT_Z = 10;
    var backdrops = [];

    // track overlays for z-index and focus managemant
    function addOverlay(overlay) {
      var z0 = currentOverlayZ();
      overlays.push(overlay);
      var z1 = currentOverlayZ();
      if (z1 <= z0) {
        applyOverlayZ(overlay, z0);
      }
    }

    function removeOverlay(overlay) {
      var i = overlays.indexOf(overlay);
      if (i >= 0) {
        overlays.splice(i, 1);
        setZ(overlay, '');
      }
    }

    function applyOverlayZ(overlay, aboveZ) {
      setZ(overlay, aboveZ + 2);
    }

    function setZ(element, z) {
      element.style.zIndex = z;
    }

    function currentOverlay() {
      var i = overlays.length - 1;
      while (overlays[i] && !overlays[i].opened) {
        --i;
      }
      return overlays[i];
    }

    function currentOverlayZ() {
      var z;
      var current = currentOverlay();
      if (current) {
        var z1 = window.getComputedStyle(current).zIndex;
        if (!isNaN(z1)) {
          z = Number(z1);
        }
      }
      return z || DEFAULT_Z;
    }

    function focusOverlay() {
      var current = currentOverlay();
      // We have to be careful to focus the next overlay _after_ any current
      // transitions are complete (due to the state being toggled prior to the
      // transition). Otherwise, we risk infinite recursion when a transitioning
      // (closed) overlay becomes the current overlay.
      //
      // NOTE: We make the assumption that any overlay that completes a transition
      // will call into focusOverlay to kick the process back off. Currently:
      // transitionend -> _applyFocus -> focusOverlay.
      if (current && !current.transitioning) {
        current._applyFocus();
      }
    }

    function trackBackdrop(element) {
      // backdrops contains the overlays with a backdrop that are currently
      // visible
      if (element.opened) {
        backdrops.push(element);
      } else {
        var index = backdrops.indexOf(element);
        if (index >= 0) {
          backdrops.splice(index, 1);
        }
      }
    }

    function getBackdrops() {
      return backdrops;
    }

    return {
      addOverlay: addOverlay,
      removeOverlay: removeOverlay,
      currentOverlay: currentOverlay,
      currentOverlayZ: currentOverlayZ,
      focusOverlay: focusOverlay,
      trackBackdrop: trackBackdrop,
      getBackdrops: getBackdrops
    };

  })();
/**
Use `Polymer.IronOverlayBehavior` to implement an element that can be hidden or shown, and displays
on top of other content. It includes an optional backdrop, and can be used to implement a variety
of UI controls including dialogs and drop downs. Multiple overlays may be displayed at once.

### Closing and canceling

A dialog may be hidden by closing or canceling. The difference between close and cancel is user
intent. Closing generally implies that the user acknowledged the content on the overlay. By default,
it will cancel whenever the user taps outside it or presses the escape key. This behavior is
configurable with the `no-cancel-on-esc-key` and the `no-cancel-on-outside-click` properties.
`close()` should be called explicitly by the implementer when the user interacts with a control
in the overlay element.

### Positioning

By default the element is sized and positioned to fit and centered inside the window. You can
position and size it manually using CSS. See `Polymer.IronFitBehavior`.

### Backdrop

Set the `with-backdrop` attribute to display a backdrop behind the overlay. The backdrop is
appended to `<body>` and is of type `<iron-overlay-backdrop>`. See its doc page for styling
options.

### Limitations

The element is styled to appear on top of other content by setting its `z-index` property. You
must ensure no element has a stacking context with a higher `z-index` than its parent stacking
context. You should place this element as a child of `<body>` whenever possible.

@demo demo/index.html
@polymerBehavior Polymer.IronOverlayBehavior
*/

  Polymer.IronOverlayBehaviorImpl = {

    properties: {

      /**
       * True if the overlay is currently displayed.
       */
      opened: {
        observer: '_openedChanged',
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * True if the overlay was canceled when it was last closed.
       */
      canceled: {
        observer: '_canceledChanged',
        readOnly: true,
        type: Boolean,
        value: false
      },

      /**
       * Set to true to display a backdrop behind the overlay.
       */
      withBackdrop: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable auto-focusing the overlay or child nodes with
       * the `autofocus` attribute` when the overlay is opened.
       */
      noAutoFocus: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay with the ESC key.
       */
      noCancelOnEscKey: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay by clicking outside it.
       */
      noCancelOnOutsideClick: {
        type: Boolean,
        value: false
      },

      /**
       * Returns the reason this dialog was last closed.
       */
      closingReason: {
        // was a getter before, but needs to be a property so other
        // behaviors can override this.
        type: Object
      },

      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      },

      _boundOnCaptureClick: {
        type: Function,
        value: function() {
          return this._onCaptureClick.bind(this);
        }
      },

      _boundOnCaptureKeydown: {
        type: Function,
        value: function() {
          return this._onCaptureKeydown.bind(this);
        }
      }

    },

    listeners: {
      'tap': '_onClick',
      'iron-resize': '_onIronResize'
    },

    /**
     * The backdrop element.
     * @type Node
     */
    get backdropElement() {
      return this._backdrop;
    },

    get _focusNode() {
      return Polymer.dom(this).querySelector('[autofocus]') || this;
    },

    registered: function() {
      this._backdrop = document.createElement('iron-overlay-backdrop');
    },

    ready: function() {
      this._ensureSetup();
      if (this._callOpenedWhenReady) {
        this._openedChanged();
      }
    },

    detached: function() {
      this.opened = false;
      this._completeBackdrop();
      this._manager.removeOverlay(this);
    },

    /**
     * Toggle the opened state of the overlay.
     */
    toggle: function() {
      this.opened = !this.opened;
    },

    /**
     * Open the overlay.
     */
    open: function() {
      this.opened = true;
      this.closingReason = {canceled: false};
    },

    /**
     * Close the overlay.
     */
    close: function() {
      this.opened = false;
      this._setCanceled(false);
    },

    /**
     * Cancels the overlay.
     */
    cancel: function() {
      this.opened = false;
      this._setCanceled(true);
    },

    _ensureSetup: function() {
      if (this._overlaySetup) {
        return;
      }
      this._overlaySetup = true;
      this.style.outline = 'none';
      this.style.display = 'none';
    },

    _openedChanged: function() {
      if (this.opened) {
        this.removeAttribute('aria-hidden');
      } else {
        this.setAttribute('aria-hidden', 'true');
      }

      // wait to call after ready only if we're initially open
      if (!this._overlaySetup) {
        this._callOpenedWhenReady = this.opened;
        return;
      }
      if (this._openChangedAsync) {
        this.cancelAsync(this._openChangedAsync);
      }

      this._toggleListeners();

      if (this.opened) {
        this._prepareRenderOpened();
      }

      // async here to allow overlay layer to become visible.
      this._openChangedAsync = this.async(function() {
        // overlay becomes visible here
        this.style.display = '';
        // force layout to ensure transitions will go
        /** @suppress {suspiciousCode} */ this.offsetWidth;
        if (this.opened) {
          this._renderOpened();
        } else {
          this._renderClosed();
        }
        this._openChangedAsync = null;
      });

    },

    _canceledChanged: function() {
      this.closingReason = this.closingReason || {};
      this.closingReason.canceled = this.canceled;
    },

    _toggleListener: function(enable, node, event, boundListener, capture) {
      if (enable) {
        // enable document-wide tap recognizer
        if (event === 'tap') {
          Polymer.Gestures.add(document, 'tap', null);
        }
        node.addEventListener(event, boundListener, capture);
      } else {
        // disable document-wide tap recognizer
        if (event === 'tap') {
          Polymer.Gestures.remove(document, 'tap', null);
        }
        node.removeEventListener(event, boundListener, capture);
      }
    },

    _toggleListeners: function() {
      if (this._toggleListenersAsync) {
        this.cancelAsync(this._toggleListenersAsync);
      }
      // async so we don't auto-close immediately via a click.
      this._toggleListenersAsync = this.async(function() {
        this._toggleListener(this.opened, document, 'tap', this._boundOnCaptureClick, true);
        this._toggleListener(this.opened, document, 'keydown', this._boundOnCaptureKeydown, true);
        this._toggleListenersAsync = null;
      }, 1);
    },

    // tasks which must occur before opening; e.g. making the element visible
    _prepareRenderOpened: function() {
      this._manager.addOverlay(this);

      if (this.withBackdrop) {
        this.backdropElement.prepare();
        this._manager.trackBackdrop(this);
      }

      this._preparePositioning();
      this.fit();
      this._finishPositioning();
    },

    // tasks which cause the overlay to actually open; typically play an
    // animation
    _renderOpened: function() {
      if (this.withBackdrop) {
        this.backdropElement.open();
      }
      this._finishRenderOpened();
    },

    _renderClosed: function() {
      if (this.withBackdrop) {
        this.backdropElement.close();
      }
      this._finishRenderClosed();
    },

    _onTransitionend: function(event) {
      // make sure this is our transition event.
      if (event && event.target !== this) {
        return;
      }
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    },

    _finishRenderOpened: function() {
      // focus the child node with [autofocus]
      if (!this.noAutoFocus) {
        this._focusNode.focus();
      }

      this.fire('iron-overlay-opened');

      this._squelchNextResize = true;
      this.async(this.notifyResize);
    },

    _finishRenderClosed: function() {
      // hide the overlay and remove the backdrop
      this.resetFit();
      this.style.display = 'none';
      this._completeBackdrop();
      this._manager.removeOverlay(this);

      this._focusNode.blur();
      // focus the next overlay, if there is one
      this._manager.focusOverlay();

      this.fire('iron-overlay-closed', this.closingReason);

      this._squelchNextResize = true;
      this.async(this.notifyResize);
    },

    _completeBackdrop: function() {
      if (this.withBackdrop) {
        this._manager.trackBackdrop(this);
        this.backdropElement.complete();
      }
    },

    _preparePositioning: function() {
      this.style.transition = this.style.webkitTransition = 'none';
      this.style.transform = this.style.webkitTransform = 'none';
      this.style.display = '';
    },

    _finishPositioning: function() {
      this.style.display = 'none';
      this.style.transform = this.style.webkitTransform = '';
      // force layout to avoid application of transform
      /** @suppress {suspiciousCode} */ this.offsetWidth;
      this.style.transition = this.style.webkitTransition = '';
    },

    _applyFocus: function() {
      if (this.opened) {
        if (!this.noAutoFocus) {
          this._focusNode.focus();
        }
      } else {
        this._focusNode.blur();
        this._manager.focusOverlay();
      }
    },

    _onCaptureClick: function(event) {
      // attempt to close asynchronously and prevent the close of a tap event is immediately heard
      // on target. This is because in shadow dom due to event retargetting event.target is not
      // useful.
      if (!this.noCancelOnOutsideClick && (this._manager.currentOverlay() == this)) {
        this._cancelJob = this.async(function() {
          this.cancel();
        }, 10);
      }
    },

    _onClick: function(event) {
      if (this._cancelJob) {
        this.cancelAsync(this._cancelJob);
        this._cancelJob = null;
      }
    },

    _onCaptureKeydown: function(event) {
      var ESC = 27;
      if (!this.noCancelOnEscKey && (event.keyCode === ESC)) {
        this.cancel();
        event.stopPropagation();
      }
    },

    _onIronResize: function() {
      if (this._squelchNextResize) {
        this._squelchNextResize = false;
        return;
      }
      if (this.opened) {
        this.refit();
      }
    }

/**
 * Fired after the `iron-overlay` opens.
 * @event iron-overlay-opened
 */

/**
 * Fired after the `iron-overlay` closes.
 * @event iron-overlay-closed
 * @param {{canceled: (boolean|undefined)}} set to the `closingReason` attribute
 */
  };

  /** @polymerBehavior */
  Polymer.IronOverlayBehavior = [Polymer.IronFitBehavior, Polymer.IronResizableBehavior, Polymer.IronOverlayBehaviorImpl];
/**
Use `Polymer.PaperDialogBehavior` and `paper-dialog-common.css` to implement a Material Design
dialog.

For example, if `<paper-dialog-impl>` implements this behavior:

    <paper-dialog-impl>
        <h2>Header</h2>
        <div>Dialog body</div>
        <div class="buttons">
            <paper-button dialog-dismiss>Cancel</paper-button>
            <paper-button dialog-confirm>Accept</paper-button>
        </div>
    </paper-dialog-impl>

`paper-dialog-common.css` provide styles for a header, content area, and an action area for buttons.
Use the `<h2>` tag for the header and the `buttons` class for the action area. You can use the
`paper-dialog-scrollable` element (in its own repository) if you need a scrolling content area.

Use the `dialog-dismiss` and `dialog-confirm` attributes on interactive controls to close the
dialog. If the user dismisses the dialog with `dialog-confirm`, the `closingReason` will update
to include `confirmed: true`.

### Styling

The following custom properties and mixins are available for styling.

Custom property | Description | Default
----------------|-------------|----------
`--paper-dialog-background-color` | Dialog background color                     | `--primary-background-color`
`--paper-dialog-color`            | Dialog foreground color                     | `--primary-text-color`
`--paper-dialog`                  | Mixin applied to the dialog                 | `{}`
`--paper-dialog-title`            | Mixin applied to the title (`<h2>`) element | `{}`
`--paper-dialog-button-color`     | Button area foreground color                | `--default-primary-color`

### Accessibility

This element has `role="dialog"` by default. Depending on the context, it may be more appropriate
to override this attribute with `role="alertdialog"`.

If `modal` is set, the element will set `aria-modal` and prevent the focus from exiting the element.
It will also ensure that focus remains in the dialog.

The `aria-labelledby` attribute will be set to the header element, if one exists.

@hero hero.svg
@demo demo/index.html
@polymerBehavior Polymer.PaperDialogBehavior
*/

  Polymer.PaperDialogBehaviorImpl = {

    hostAttributes: {
      'role': 'dialog',
      'tabindex': '-1'
    },

    properties: {

      /**
       * If `modal` is true, this implies `no-cancel-on-outside-click` and `with-backdrop`.
       */
      modal: {
        observer: '_modalChanged',
        type: Boolean,
        value: false
      },

      /** @type {?Node} */
      _lastFocusedElement: {
        type: Object
      },

      _boundOnFocus: {
        type: Function,
        value: function() {
          return this._onFocus.bind(this);
        }
      },

      _boundOnBackdropClick: {
        type: Function,
        value: function() {
          return this._onBackdropClick.bind(this);
        }
      }

    },

    listeners: {
      'tap': '_onDialogClick',
      'iron-overlay-opened': '_onIronOverlayOpened',
      'iron-overlay-closed': '_onIronOverlayClosed'
    },

    attached: function() {
      this._observer = this._observe(this);
      this._updateAriaLabelledBy();
    },

    detached: function() {
      if (this._observer) {
        this._observer.disconnect();
      }
    },

    _observe: function(node) {
      var observer = new MutationObserver(function() {
        this._updateAriaLabelledBy();
      }.bind(this));
      observer.observe(node, {
        childList: true,
        subtree: true
      });
      return observer;
    },

    _modalChanged: function() {
      if (this.modal) {
        this.setAttribute('aria-modal', 'true');
      } else {
        this.setAttribute('aria-modal', 'false');
      }
      // modal implies noCancelOnOutsideClick and withBackdrop if true, don't overwrite
      // those properties otherwise.
      if (this.modal) {
        this.noCancelOnOutsideClick = true;
        this.withBackdrop = true;
      }
    },

    _updateAriaLabelledBy: function() {
      var header = Polymer.dom(this).querySelector('h2');
      if (!header) {
        this.removeAttribute('aria-labelledby');
        return;
      }
      var headerId = header.getAttribute('id');
      if (headerId && this.getAttribute('aria-labelledby') === headerId) {
        return;
      }
      // set aria-describedBy to the header element
      var labelledById;
      if (headerId) {
        labelledById = headerId;
      } else {
        labelledById = 'paper-dialog-header-' + new Date().getUTCMilliseconds();
        header.setAttribute('id', labelledById);
      }
      this.setAttribute('aria-labelledby', labelledById);
    },

    _updateClosingReasonConfirmed: function(confirmed) {
      this.closingReason = this.closingReason || {};
      this.closingReason.confirmed = confirmed;
    },

    _onDialogClick: function(event) {
      var target = event.target;
      while (target && target !== this) {
        if (target.hasAttribute) {
          if (target.hasAttribute('dialog-dismiss')) {
            this._updateClosingReasonConfirmed(false);
            this.close();
            break;
          } else if (target.hasAttribute('dialog-confirm')) {
            this._updateClosingReasonConfirmed(true);
            this.close();
            break;
          }
        }
        target = target.parentNode;
      }
    },

    _onIronOverlayOpened: function() {
      if (this.modal) {
        document.body.addEventListener('focus', this._boundOnFocus, true);
        this.backdropElement.addEventListener('click', this._boundOnBackdropClick);
      }
    },

    _onIronOverlayClosed: function() {
      document.body.removeEventListener('focus', this._boundOnFocus, true);
      this.backdropElement.removeEventListener('click', this._boundOnBackdropClick);
    },

    _onFocus: function(event) {
      if (this.modal) {
        var target = event.target;
        while (target && target !== this && target !== document.body) {
          target = target.parentNode;
        }
        if (target) {
          if (target === document.body) {
            if (this._lastFocusedElement) {
              this._lastFocusedElement.focus();
            } else {
              this._focusNode.focus();
            }
          } else {
            this._lastFocusedElement = event.target;
          }
        }
      }
    },

    _onBackdropClick: function() {
      if (this.modal) {
        if (this._lastFocusedElement) {
          this._lastFocusedElement.focus();
        } else {
          this._focusNode.focus();
        }
      }
    }

  };

  /** @polymerBehavior */
  Polymer.PaperDialogBehavior = [Polymer.IronOverlayBehavior, Polymer.PaperDialogBehaviorImpl];
Polymer({

    is: 'transform-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    /**
     * @param {{
     *   node: !Element,
     *   transformOrigin: (string|undefined),
     *   transformFrom: (string|undefined),
     *   transformTo: (string|undefined),
     *   timing: (Object|undefined)
     * }} config
     */
    configure: function(config) {
      var node = config.node;
      var transformFrom = config.transformFrom || 'none';
      var transformTo = config.transformTo || 'none';

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': transformFrom},
        {'transform': transformTo}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
(function() {

  function setupDragHandler_() {
    if (this.draggable) {
      this.dragHandler_ = google.maps.event.addListener(
          this.marker, 'dragend', onDragEnd_.bind(this));
    } else {
      google.maps.event.removeListener(this.dragHandler_);
      this.dragHandler_ = null;
    }
  }

  function onDragEnd_(e, details, sender) {
    this.latitude = e.latLng.lat();
    this.longitude = e.latLng.lng();
  }

  Polymer({

    is: 'google-map-marker',

    /**
     * Fired when the marker icon was clicked. Requires the clickEvents attribute to be true.
     * @param {google.maps.MouseEvent} event The mouse event.
     * @event google-map-marker-click
     */

    /**
     * Fired when the marker icon was double clicked. Requires the clickEvents attribute to be true.
     * @param {google.maps.MouseEvent} event The mouse event.
     * @event google-map-marker-dblclick
     */

    /**
     * Fired for a mousedown on the marker. Requires the mouseEvents attribute to be true.
     * @event google-map-marker-mousedown
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the DOM `mousemove` event is fired on the marker. Requires the mouseEvents
     * attribute to be true.
     * @event google-map-marker-mousemove
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the mouse leaves the area of the marker icon. Requires the mouseEvents attribute to be
     * true.
     * @event google-map-marker-mouseout
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the mouse enters the area of the marker icon. Requires the mouseEvents attribute to be
     * true.
     * @event google-map-marker-mouseover
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired for a mouseup on the marker. Requires the mouseEvents attribute to be true.
     *
     * @event google-map-marker-mouseup
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired for a rightclick on the marker. Requires the clickEvents attribute to be true.
     * @event google-map-marker-rightclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    properties: {
      /**
       * A Google Maps marker object.
       * @type google.maps.Marker
       */
      marker: Object,

      /**
       * The Google map object.
       * @type google.maps.Map
       */
      map: {
        type: Object,
        observer: '_mapChanged'
      },

      /**
       * A Google Map Infowindow object.
       */
      info: {
        type: Object,
        value: null
      },

      /**
       * When true, marker *click events are automatically registered.
       */
      clickEvents: {
        type: Boolean,
        value: false,
        observer: '_clickEventsChanged'
      },

      /**
       * Image URL for the marker icon.
       * @type string|google.maps.Icon|google.maps.Symbol
       */
      icon: {
        type: Object,
        value: null,
        observer: '_iconChanged'
      },

      /**
       * When true, marker mouse* events are automatically registered.
       */
      mouseEvents: {
        type: Boolean,
        value: false,
        observer: '_mouseEventsChanged'
      },

      /**
       * Z-index for the marker icon.
       */
      zIndex: {
        type: Number,
        value: 0,
        observer: '_zIndexChanged'
      },

      /**
       * The marker's longitude coordinate.
       */
      longitude: {
        type: Number,
        value: null,
        reflectToAttribute: true
      },

      /**
       * The marker's latitude coordinate.
       */
      latitude: {
        type: Number,
        value: null,
        reflectToAttribute: true
      },

      /**
       * A animation for the marker. "DROP" or "BOUNCE". See
       * https://developers.google.com/maps/documentation/javascript/examples/marker-animations.
       */
      animation: {
        type: String,
        value: null,
        observer: '_animationChanged'
      }
    },

    observers: [
      '_updatePosition(latitude, longitude)'
    ],

    detached: function() {
      if (this.marker) {
        this.marker.setMap(null);
      }
      if (this._contentObserver)
        this._contentObserver.disconnect();
    },

    attached: function() {
      // If element is added back to DOM, put it back on the map.
      if (this.marker) {
        this.marker.setMap(this.map);
      }
    },

    _updatePosition: function() {
      if (this.marker && this.latitude != null && this.longitude != null) {
        this.marker.setPosition({
          lat: parseFloat(this.latitude),
          lng: parseFloat(this.longitude)
        });
      }
    },

    _clickEventsChanged: function() {
      if (this.map) {
        if (this.clickEvents) {
          this._forwardEvent('click');
          this._forwardEvent('dblclick');
          this._forwardEvent('rightclick');
        } else {
          this._clearListener('click');
          this._clearListener('dblclick');
          this._clearListener('rightclick');
        }
      }
    },

    _mouseEventsChanged: function() {
      if (this.map) {
        if (this.mouseEvents) {
          this._forwardEvent('mousedown');
          this._forwardEvent('mousemove');
          this._forwardEvent('mouseout');
          this._forwardEvent('mouseover');
          this._forwardEvent('mouseup');
        } else {
          this._clearListener('mousedown');
          this._clearListener('mousemove');
          this._clearListener('mouseout');
          this._clearListener('mouseover');
          this._clearListener('mouseup');
        }
      }
    },

    _animationChanged: function() {
      if (this.marker) {
        this.marker.setAnimation(google.maps.Animation[this.animation]);
      }
    },

    _iconChanged: function() {
      if (this.marker) {
        this.marker.setIcon(this.icon);
      }
    },

    _zIndexChanged: function() {
      if (this.marker) {
        this.marker.setZIndex(this.zIndex);
      }
    },

    _mapChanged: function() {
      // Marker will be rebuilt, so disconnect existing one from old map and listeners.
      if (this.marker) {
        this.marker.setMap(null);
        google.maps.event.clearInstanceListeners(this.marker);
      }

      if (this.map && this.map instanceof google.maps.Map) {
        this._mapReady();
      }
    },

    _contentChanged: function() {
      if (this._contentObserver)
        this._contentObserver.disconnect();
      // Watch for future updates.
      this._contentObserver = new MutationObserver( this._contentChanged.bind(this));
      this._contentObserver.observe( this, {
        childList: true,
        subtree: true
      });

      var content = this.innerHTML.trim();
      if (content) {
        if (!this.info) {
          // Create a new infowindow
          this.info = new google.maps.InfoWindow();
          this.infoHandler_ = google.maps.event.addListener(this.marker, 'click', function() {
            this.info.open(this.map, this.marker);
          }.bind(this));
        }
        this.info.setContent(content);
      } else {
        if (this.info) {
          // Destroy the existing infowindow.  It doesn't make sense to have an empty one.
          google.maps.event.removeListener(this.infoHandler_);
          this.info = null;
        }
      }
    },

    _mapReady: function() {
      this._listeners = {};
      this.marker = new google.maps.Marker({
        map: this.map,
        position: {
          lat: parseFloat(this.latitude),
          lng: parseFloat(this.longitude)
        },
        title: this.title,
        animation: google.maps.Animation[this.animation],
        draggable: this.draggable,
        visible: !this.hidden,
        icon: this.icon,
        zIndex: this.zIndex
      });
      this._contentChanged();
      this._clickEventsChanged();
      this._contentChanged();
      this._mouseEventsChanged();
      setupDragHandler_.bind(this)();
    },

    _clearListener: function(name) {
      if (this._listeners[name]) {
        google.maps.event.removeListener(this._listeners[name]);
        this._listeners[name] = null;
      }
    },

    _forwardEvent: function(name) {
      this._listeners[name] = google.maps.event.addListener(this.marker, name, function(event) {
        this.fire('google-map-marker-' + name, event);
      }.bind(this));
    },

    attributeChanged: function(attrName, oldVal, newVal) {
      if (!this.marker) {
        return;
      }

      // Cannot use *Changed watchers for native properties.
      switch (attrName) {
        case 'hidden':
          this.marker.setVisible(!this.hidden);
          break;
        case 'draggable':
          this.marker.setDraggable(this.draggable);
          setupDragHandler_.bind(this)();
          break;
        case 'title':
          this.marker.setTitle(this.title);
          break;
      }
    }
  });

})();
Polymer({

    is: 'google-map',


    /**
     * Fired when the Maps API has fully loaded.
     * @event google-map-ready
     */
    /**
     * Fired when the when the user clicks on the map (but not when they click on a marker, infowindow, or
     * other object). Requires the clickEvents attribute to be true.
     * @event google-map-click
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user double-clicks on the map. Note that the google-map-click event will also fire,
     * right before this one. Requires the clickEvents attribute to be true.
     * @event google-map-dblclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired repeatedly while the user drags the map. Requires the dragEvents attribute to be true.
     * @event google-map-drag
     */
    /**
     * Fired when the user stops dragging the map. Requires the dragEvents attribute to be true.
     * @event google-map-dragend
     */
    /**
     * Fired when the user starts dragging the map. Requires the dragEvents attribute to be true.
     * @event google-map-dragstart
     */
    /**
     * Fired whenever the user's mouse moves over the map container. Requires the mouseEvents attribute to
     * be true.
     * @event google-map-mousemove
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user's mouse exits the map container. Requires the mouseEvents attribute to be true.
     * @event google-map-mouseout
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user's mouse enters the map container. Requires the mouseEvents attribute to be true.
     * @event google-map-mouseover
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the DOM `contextmenu` event is fired on the map container. Requires the clickEvents
     * attribute to be true.
     * @event google-map-rightclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    properties: {
      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: String,

      /**
       * A Maps API for Business Client ID. To obtain a Maps API for Business Client ID, see developers.google.com/maps/documentation/business/.
       * If set, a Client ID will take precedence over an API Key.
       */
      clientId: String,

      /**
       * A latitude to center the map on.
       */
      latitude: {
        type: Number,
        value: 37.77493,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * A Maps API object.
       */
      map: {
        type: Object,
        notify: true,
        value: null
      },

      /**
       * A comma separated list (e.g. "places,geometry") of libraries to load
       * with this map. Defaults to "". For more information see
       * https://developers.google.com/maps/documentation/javascript/libraries.
       */
      libraries: {
        type: String,
        value: ''
      },

      /**
       * A longitude to center the map on.
       */
      longitude: {
        type: Number,
        value: -122.41942,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * A kml file to load.
       */
      kml: {
        type: String,
        value: null,
        observer: '_loadKml'
      },

      /**
       * A zoom level to set the map to.
       */
      zoom: {
        type: Number,
        value: 10,
        observer: '_zoomChanged',
        notify: true
      },

      /**
       * When set, prevents the map from tilting (when the zoom level and viewport supports it).
       */
      noAutoTilt: {
        type: Boolean,
        value: false
      },

      /**
       * Map type to display. One of 'roadmap', 'satellite', 'hybrid', 'terrain'.
       */
      mapType: {
        type: String,
        value: 'roadmap', // roadmap, satellite, hybrid, terrain,
        observer: '_mapTypeChanged',
        notify: true
      },

      /**
       * Version of the Google Maps API to use.
       */
      version: {
        type: String,
        value: '3.exp'
      },

      /**
       * If set, removes the map's default UI controls.
       */
      disableDefaultUi: {
        type: Boolean,
        value: false,
        observer: '_disableDefaultUiChanged'
      },

      /**
       * If set, the zoom level is set such that all markers (google-map-marker children) are brought into view.
       */
      fitToMarkers: {
        type: Boolean,
        value: false,
        observer: '_fitToMarkersChanged'
      },

      /**
       * If true, prevent the user from zooming the map interactively.
       */
      disableZoom: {
        type: Boolean,
        value: false,
        observer: '_disableZoomChanged'
      },

      /**
       * If set, custom styles can be applied to the map.
       * For style documentation see developers.google.com/maps/documentation/javascript/reference#MapTypeStyle
       */
      styles: {
        type: Object,
        value: function() { return {}; }
      },

      /**
       * A maximum zoom level which will be displayed on the map.
       */
      maxZoom: {
        type: Number,
        observer: '_maxZoomChanged'
      },

      /**
       * A minimum zoom level which will be displayed on the map.
       */
      minZoom: {
        type: Number,
        observer: '_minZoomChanged'
      },

      /**
       * If true, sign-in is enabled.
       * See https://developers.google.com/maps/documentation/javascript/signedin#enable_sign_in
       */
      signedIn: {
        type: Boolean,
        value: false
      },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String
      },

      /**
       * When true, map *click events are automatically registered.
       */
      clickEvents: {
        type: Boolean,
        value: false,
        observer: '_clickEventsChanged'
      },

      /**
       * When true, map drag* events are automatically registered.
       */
      dragEvents: {
        type: Boolean,
        value: false,
        observer: '_dragEventsChanged'
      },

      /**
       * When true, map mouse* events are automatically registered.
       */
      mouseEvents: {
        type: Boolean,
        value: false,
        observer: '_mouseEventsChanged'
      },

      /**
       * Additional map options for google.maps.Map constructor.
       * Use to specify additional options we do not expose as
       * properties.
       * Ex: `<google-map additional-map-options='{"mapTypeId":"satellite"}'>`
       */
      additionalMapOptions: {
        type: Object,
        value: function() { return {}; }
      },

      /**
       * The markers on the map.
       */
      markers: {
        type: Array,
        value: function() { return []; },
        readOnly: true
      }

    },

    behaviors: [
      Polymer.IronResizableBehavior
    ],

    listeners: {
      'iron-resize': 'resize'
    },

    observers: [
      '_debounceUpdateCenter(latitude, longitude)'
    ],

    attached: function() {
      this._initGMap();
    },

    detached: function() {
      if (this._mutationObserver) {
        this._mutationObserver.disconnect();
        this._mutationObserver = null;
      }
    },

    _initGMap: function() {
      if (this.map) {
        return; // already initialized
      }
      if (this.$.api.libraryLoaded !== true) {
        return; // api not loaded
      }
      if (!this.isAttached) {
        return; // not attached
      }

      this.map = new google.maps.Map(this.$.map, this._getMapOptions());
      this._listeners = {};
      this._updateCenter();
      this._loadKml();
      this._updateMarkers();
      this._addMapListeners();
      this.fire('google-map-ready');
    },

    _mapApiLoaded: function() {
      this._initGMap();
    },

    _getMapOptions: function() {
      var mapOptions = {
        zoom: this.zoom,
        tilt: this.noAutoTilt ? 0 : 45,
        mapTypeId: this.mapType,
        disableDefaultUI: this.disableDefaultUi,
        disableDoubleClickZoom: this.disableZoom,
        scrollwheel: !this.disableZoom,
        styles: this.styles,
        maxZoom: Number(this.maxZoom),
        minZoom: Number(this.minZoom)
      };

      // Only override the default if set.
      // We use getAttribute here because the default value of this.draggable = false even when not set.
      if (this.getAttribute('draggable') != null) {
        mapOptions.draggable = this.draggable
      }
      for (var p in this.additionalMapOptions)
        mapOptions[p] = this.additionalMapOptions[p];

      return mapOptions;
    },

    // watch for future updates
    _observeMarkers: function() {
      // Watch for future updates.
      if (this._mutationObserver) {
        return;
      }
      this._mutationObserver = new MutationObserver( this._updateMarkers.bind(this));
      this._mutationObserver.observe(this, {
        childList: true
      });
    },

    _updateMarkers: function() {
      var newMarkers = Array.prototype.slice.call(
          Polymer.dom(this.$.markers).getDistributedNodes());

      // do not recompute if markers have not been added or removed
      if (newMarkers.length === this.markers.length) {
        var added = newMarkers.filter(function(m) {
          return this.markers && this.markers.indexOf(m) === -1;
        }.bind(this));
        if (added.length === 0) {
          // set up observer first time around
          if (!this._mutationObserver) {
            this._observeMarkers();
          }
          return;
        }
      }

      this._observeMarkers();

      this.markers = this._setMarkers(newMarkers);

      // Set the map on each marker and zoom viewport to ensure they're in view.
      if (this.markers.length && this.map) {
        for (var i = 0, m; m = this.markers[i]; ++i) {
          m.map = this.map;
        }
      }
      if (this.fitToMarkers) {
        this._fitToMarkersChanged();
      }
    },

    /**
     * Clears all markers from the map.
     *
     * @method clear
     */
    clear: function() {
      for (var i = 0, m; m = this.markers[i]; ++i) {
        m.marker.setMap(null);
      }
    },

    /**
     * Explicitly resizes the map, updating its center. This is useful if the
     * map does not show after you have unhidden it.
     *
     * @method resize
     */
    resize: function() {
      if (this.map) {

        // saves and restores latitude/longitude because resize can move the center
        var oldLatitude = this.latitude;
        var oldLongitude = this.longitude;
        google.maps.event.trigger(this.map, 'resize');
        this.latitude = oldLatitude;  // restore because resize can move our center
        this.longitude = oldLongitude;

        if (this.fitToMarkers) { // we might not have a center if we are doing fit-to-markers
          this._fitToMarkersChanged();
        }
      }
    },

    _loadKml: function() {
      if (this.kml) {
        var kmlfile = new google.maps.KmlLayer({
          url: this.kml,
          map: this.map
        });
      }
    },

    _debounceUpdateCenter: function() {
      this.debounce('updateCenter', this._updateCenter);
    },

    _updateCenter: function() {
      this.cancelDebouncer('updateCenter');

      if (this.map && this.latitude !== undefined && this.longitude !== undefined) {
        // allow for latitude and longitude to be String-typed, but still Number valued
        var lati = Number(this.latitude);
        if (isNaN(lati)) {
          throw new TypeError('latitude must be a number');
        }
        var longi = Number(this.longitude);
        if (isNaN(longi)) {
          throw new TypeError('longitude must be a number');
        }

        var newCenter = new google.maps.LatLng(lati, longi);
        var oldCenter = this.map.getCenter();

        if (!oldCenter) {
          // If the map does not have a center, set it right away.
          this.map.setCenter(newCenter);
        } else {
          // Using google.maps.LatLng returns corrected lat/lngs.
          oldCenter = new google.maps.LatLng(oldCenter.lat(), oldCenter.lng());

          // If the map currently has a center, slowly pan to the new one.
          if (!oldCenter.equals(newCenter)) {
            this.map.panTo(newCenter);
          }
        }
      }
    },

    _zoomChanged: function() {
      if (this.map) {
        this.map.setZoom(Number(this.zoom));
      }
    },

    _clickEventsChanged: function() {
      if (this.map) {
        if (this.clickEvents) {
          this._forwardEvent('click');
          this._forwardEvent('dblclick');
          this._forwardEvent('rightclick');
        } else {
          this._clearListener('click');
          this._clearListener('dblclick');
          this._clearListener('rightclick');
        }
      }
    },

    _dragEventsChanged: function() {
      if (this.map) {
        if (this.dragEvents) {
          this._forwardEvent('drag');
          this._forwardEvent('dragend');
          this._forwardEvent('dragstart');
        } else {
          this._clearListener('drag');
          this._clearListener('dragend');
          this._clearListener('dragstart');
        }
      }
    },

    _mouseEventsChanged: function() {
      if (this.map) {
        if (this.mouseEvents) {
          this._forwardEvent('mousemove');
          this._forwardEvent('mouseout');
          this._forwardEvent('mouseover');
        } else {
          this._clearListener('mousemove');
          this._clearListener('mouseout');
          this._clearListener('mouseover');
        }
      }
    },

    _maxZoomChanged: function() {
      if (this.map) {
        this.map.setOptions({maxZoom: Number(this.maxZoom)});
      }
    },

    _minZoomChanged: function() {
      if (this.map) {
        this.map.setOptions({minZoom: Number(this.minZoom)});
      }
    },

    _mapTypeChanged: function() {
      if (this.map) {
        this.map.setMapTypeId(this.mapType);
      }
    },

    _disableDefaultUiChanged: function() {
      if (!this.map) {
        return;
      }
      this.map.setOptions({disableDefaultUI: this.disableDefaultUi});
    },

    _disableZoomChanged: function() {
      if (!this.map) {
        return;
      }
      this.map.setOptions({
        disableDoubleClickZoom: this.disableZoom,
        scrollwheel: !this.disableZoom
      });
    },

    attributeChanged: function(attrName, oldVal, newVal) {
      if (!this.map) {
        return;
      }
      // Cannot use *Changed watchers for native properties.
      switch (attrName) {
        case 'draggable':
          this.map.setOptions({draggable: this.draggable});
          break;
      }
    },

    _fitToMarkersChanged: function() {
      // TODO(ericbidelman): respect user's zoom level.

      if (this.map && this.fitToMarkers) {
        var latLngBounds = new google.maps.LatLngBounds();
        for (var i = 0, m; m = this.markers[i]; ++i) {
          latLngBounds.extend(
              new google.maps.LatLng(m.latitude, m.longitude));
        }

        // For one marker, don't alter zoom, just center it.
        if (this.markers.length > 1) {
          this.map.fitBounds(latLngBounds);
        }

        this.map.setCenter(latLngBounds.getCenter());
      }
    },

    _addMapListeners: function() {
      google.maps.event.addListener(this.map, 'center_changed', function() {
        var center = this.map.getCenter();
        this.latitude = center.lat();
        this.longitude = center.lng();
      }.bind(this));

      google.maps.event.addListener(this.map, 'zoom_changed', function() {
        this.zoom = this.map.getZoom();
      }.bind(this));
      
      google.maps.event.addListener(this.map, 'maptypeid_changed', function() {
        this.mapType = this.map.getMapTypeId();
      }.bind(this));

      this._clickEventsChanged();
      this._dragEventsChanged();
      this._mouseEventsChanged();
    },

    _clearListener: function(name) {
      if (this._listeners[name]) {
        google.maps.event.removeListener(this._listeners[name]);
        this._listeners[name] = null;
      }
    },

    _forwardEvent: function(name) {
      this._listeners[name] = google.maps.event.addListener(this.map, name, function(event) {
        this.fire('google-map-' + name, event);
      }.bind(this));
    }

  });
Polymer({

    is: 'google-map-directions',

/**
Fired whenever the directions service returns a result.

@event google-map-response
@param {Object} detail
@param {object} detail.response The directions service response.
*/
    properties: {
      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: String,

      /**
       * The Google map object.
       *
       * @type google.maps.Map
       */
      map: {
        type: Object,
        observer: '_mapChanged'
      },
      /**
       * Start address or latlng to get directions from.
       *
       * @type string|google.maps.LatLng
       */
      startAddress: {
        type: String,
        value: null
      },

      /**
       * End address or latlng for directions to end.
       *
       * @type string|google.maps.LatLng
       */
      endAddress: {
        type: String,
        value: null
      },

      /**
       * Travel mode to use.  One of 'DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'.
       */
      travelMode: {
        type: String,
        value: 'DRIVING'
      },

      /**
       * Array of intermediate waypoints. Directions will be calculated
       * from the origin to the destination by way of each waypoint in this array.
       * The maximum allowed waypoints is 8, plus the origin, and destination.
       * Maps API for Business customers are allowed 23 waypoints,
       * plus the origin, and destination.
       * Waypoints are not supported for transit directions. Optional.
       *
       * @type google.maps.DirectionsWaypoint
       */
       waypoints: {
         type: Array,
         value: function() { return []; }
       },

      /**
       * A comma separated list (e.g. "places,geometry") of libraries to load
       * with this map. Defaults to "places". For more information see
       * https://developers.google.com/maps/documentation/javascript/libraries.
       *
       * Note, this needs to be set to the same value as the one used on <google-map>.
       * If you're overriding that element's `libraries` property, this one also
       * needs to be set to the Maps API loads the library code.
       */
      libraries: {
        type: String,
        value: 'places'
      },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String,
        value: null
      },

      /**
       * The response from the directions service.
       *
       */
      response: {
        type: Object,
        observer: '_responseChanged',
        notify: true
      }
    },

    observers: [
      '_route(startAddress, endAddress, travelMode, waypoints)'
    ],

    _mapApiLoaded: function() {
      this._route();
    },

    _responseChanged: function() {
      if (this.directionsRenderer && this.response) {
        this.directionsRenderer.setDirections(this.response);
      }
    },

    _mapChanged: function() {
      if (this.map && this.map instanceof google.maps.Map) {
        if (!this.directionsRenderer) {
          this.directionsRenderer = new google.maps.DirectionsRenderer();
        }
        this.directionsRenderer.setMap(this.map);
        this._responseChanged();
      } else {
        // If there is no more map, remove the directionsRenderer from the map and delete it.
        if (this.directionsRenderer) {
          this.directionsRenderer.setMap(null);
          this.directionsRenderer = null;
        }
      }
    },

    _route: function() {
      // Abort attempts to _route if the API is not available yet or the
      // required attributes are blank.
      if (typeof google == 'undefined' || typeof google.maps == 'undefined' ||
          !this.startAddress || !this.endAddress) {
        return;
      }

      // Construct a directionsService if necessary.
      // Wait until here where the maps api has loaded and directions are actually needed.
      if (!this.directionsService) {
        this.directionsService = new google.maps.DirectionsService();
      }

      var request = {
        origin: this.startAddress,
        destination: this.endAddress,
        travelMode: this.travelMode,
        waypoints: this.waypoints
      };
      this.directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          this.response = response;
          this.fire('google-map-response', {response: response});
        }
      }.bind(this));
    }
  });
(function() {
    var id_ = null;

    Polymer({

      is: 'geo-location',

      hostAttributes: {
        hidden: true
      },

      properties: {
        /**
         * The latitude of the current position.
         */
        latitude: {
          type: Number,
          notify: true,
          reflectToAttribute: true,
          readOnly: true
        },

        /**
         * The longitude of the current position.
         */
        longitude: {
          type: Number,
          notify: true,
          reflectToAttribute: true,
          readOnly: true
        },

        /**
         * If true, the latitude/longitude update as the device changes position.
         * If not set, the latitude/longitude are provided once.
         */
        watchPos: {
          type: Boolean,
          value: false,
          observer: '_watchPosChanged'
        },

        /**
         * If true, enables high accuracy GPS.
         */
        highAccuracy: {
          type: Boolean,
          value: false
        },

        /**
         * The maximumAge option in the Gelocation API.
         */
        maximumAge: {
          type: Number,
          value: 0
        },

        /**
         * The timeout option in the Gelocation API.
         */
        timeout: {
          type: Number,
          value: 5000
        },

        /**
         * Geolocation API position object
         */
        position: {
          type: Object,
          notify: true,
          readOnly: true
        }

      },
     /**
       * Fired when the Geolocation API returns an error.
       *
       * @event geo-error
       * @param {Object} detail
       * @param {boolean} detail.error The error message.
       */

      /**
       * Fired when the Geolocation API returns a position result.
       *
       * @event geo-response
       * @param {Object} detail
       *   @param {Position} position The raw position object returned by the Geolocation API.
       *   @param {Number} detail.latitude Latitude of the current position.
       *   @param {Number} detail.longitude Longitude of the current position.
       */

      ready: function() {
        var options = {
          enableHighAccuracy: this.highAccuracy,
          timeout: this.timeout,
          maximumAge: this.maximumAge
        };

        if (!this.watchPos) {
          navigator.geolocation.getCurrentPosition(
            this._onPosition.bind(this), this._onError.bind(this), options);
        }
      },

      _watchPosChanged: function() {
        if (id_) {
          navigator.geolocation.clearWatch(id_);
          id_ = null;
        }

        if (this.watchPos) {
          var options = {
            enableHighAccuracy: this.highAccuracy,
            timeout: this.timeout,
            maximumAge: this.maximumAge
          };
          id_ = navigator.geolocation.watchPosition(
            this._onPosition.bind(this), this._onError.bind(this), options);
        }
      },

      /**
       * Success callback when the Geolocation API returns results.
       *
       * @param {Position} pos A position object from the Geolocation API.
       */
      _onPosition: function(pos) {
        this._setPosition(pos);
        this._setLatitude(pos.coords.latitude);
        this._setLongitude(pos.coords.longitude);
        this.fire('geo-response', {
          latitude: this.latitude,
          longitude: this.longitude,
          position: pos
        });
      },

      /**
       * Error callback when the Geolocation API returns an error.
       *
       * @param {Position} err The error that was returned.
       */
      _onError: function(err) {
        this.fire('geo-error', {error: err.code + ': ' + err.message});
      }
    });
  })();
Polymer({

      is: 'iron-icon',

      properties: {

        /**
         * The name of the icon to use. The name should be of the form:
         * `iconset_name:icon_name`.
         */
        icon: {
          type: String,
          observer: '_iconChanged'
        },

        /**
         * The name of the theme to used, if one is specified by the
         * iconset.
         */
        theme: {
          type: String,
          observer: '_updateIcon'
        },

        /**
         * If using iron-icon without an iconset, you can set the src to be
         * the URL of an individual icon image file. Note that this will take
         * precedence over a given icon attribute.
         */
        src: {
          type: String,
          observer: '_srcChanged'
        },
        
        _meta: {
          value: Polymer.Base.create('iron-meta', {type: 'iconset'})
        }
        
      },

      _DEFAULT_ICONSET: 'icons',

      _iconChanged: function(icon) {
        var parts = (icon || '').split(':');
        this._iconName = parts.pop();
        this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
        this._updateIcon();
      },

      _srcChanged: function(src) {
        this._updateIcon();
      },

      _usesIconset: function() {
        return this.icon || !this.src;
      },

      /** @suppress {visibility} */
      _updateIcon: function() {
        if (this._usesIconset()) {
          if (this._iconsetName) {
            this._iconset = this._meta.byKey(this._iconsetName);
            if (this._iconset) {
              this._iconset.applyIcon(this, this._iconName, this.theme);
            } else {
              this._warn(this._logf('_updateIcon', 'could not find iconset `'
                + this._iconsetName + '`, did you import the iconset?'));
            }
          }
        } else {
          if (!this._img) {
            this._img = document.createElement('img');
            this._img.style.width = '100%';
            this._img.style.height = '100%';
            this._img.draggable = false;
          }
          this._img.src = this.src;
          Polymer.dom(this.root).appendChild(this._img);
        }
      }

    });
(function() {
    var Utility = {
      distance: function(x1, y1, x2, y2) {
        var xDelta = (x1 - x2);
        var yDelta = (y1 - y2);

        return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
      },

      now: window.performance && window.performance.now ?
          window.performance.now.bind(window.performance) : Date.now
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function ElementMetrics(element) {
      this.element = element;
      this.width = this.boundingRect.width;
      this.height = this.boundingRect.height;

      this.size = Math.max(this.width, this.height);
    }

    ElementMetrics.prototype = {
      get boundingRect () {
        return this.element.getBoundingClientRect();
      },

      furthestCornerDistanceFrom: function(x, y) {
        var topLeft = Utility.distance(x, y, 0, 0);
        var topRight = Utility.distance(x, y, this.width, 0);
        var bottomLeft = Utility.distance(x, y, 0, this.height);
        var bottomRight = Utility.distance(x, y, this.width, this.height);

        return Math.max(topLeft, topRight, bottomLeft, bottomRight);
      }
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function Ripple(element) {
      this.element = element;
      this.color = window.getComputedStyle(element).color;

      this.wave = document.createElement('div');
      this.waveContainer = document.createElement('div');
      this.wave.style.backgroundColor = this.color;
      this.wave.classList.add('wave');
      this.waveContainer.classList.add('wave-container');
      Polymer.dom(this.waveContainer).appendChild(this.wave);

      this.resetInteractionState();
    }

    Ripple.MAX_RADIUS = 300;

    Ripple.prototype = {
      get recenters() {
        return this.element.recenters;
      },

      get center() {
        return this.element.center;
      },

      get mouseDownElapsed() {
        var elapsed;

        if (!this.mouseDownStart) {
          return 0;
        }

        elapsed = Utility.now() - this.mouseDownStart;

        if (this.mouseUpStart) {
          elapsed -= this.mouseUpElapsed;
        }

        return elapsed;
      },

      get mouseUpElapsed() {
        return this.mouseUpStart ?
          Utility.now () - this.mouseUpStart : 0;
      },

      get mouseDownElapsedSeconds() {
        return this.mouseDownElapsed / 1000;
      },

      get mouseUpElapsedSeconds() {
        return this.mouseUpElapsed / 1000;
      },

      get mouseInteractionSeconds() {
        return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
      },

      get initialOpacity() {
        return this.element.initialOpacity;
      },

      get opacityDecayVelocity() {
        return this.element.opacityDecayVelocity;
      },

      get radius() {
        var width2 = this.containerMetrics.width * this.containerMetrics.width;
        var height2 = this.containerMetrics.height * this.containerMetrics.height;
        var waveRadius = Math.min(
          Math.sqrt(width2 + height2),
          Ripple.MAX_RADIUS
        ) * 1.1 + 5;

        var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
        var timeNow = this.mouseInteractionSeconds / duration;
        var size = waveRadius * (1 - Math.pow(80, -timeNow));

        return Math.abs(size);
      },

      get opacity() {
        if (!this.mouseUpStart) {
          return this.initialOpacity;
        }

        return Math.max(
          0,
          this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity
        );
      },

      get outerOpacity() {
        // Linear increase in background opacity, capped at the opacity
        // of the wavefront (waveOpacity).
        var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
        var waveOpacity = this.opacity;

        return Math.max(
          0,
          Math.min(outerOpacity, waveOpacity)
        );
      },

      get isOpacityFullyDecayed() {
        return this.opacity < 0.01 &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isRestingAtMaxRadius() {
        return this.opacity >= this.initialOpacity &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isAnimationComplete() {
        return this.mouseUpStart ?
          this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
      },

      get translationFraction() {
        return Math.min(
          1,
          this.radius / this.containerMetrics.size * 2 / Math.sqrt(2)
        );
      },

      get xNow() {
        if (this.xEnd) {
          return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
        }

        return this.xStart;
      },

      get yNow() {
        if (this.yEnd) {
          return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
        }

        return this.yStart;
      },

      get isMouseDown() {
        return this.mouseDownStart && !this.mouseUpStart;
      },

      resetInteractionState: function() {
        this.maxRadius = 0;
        this.mouseDownStart = 0;
        this.mouseUpStart = 0;

        this.xStart = 0;
        this.yStart = 0;
        this.xEnd = 0;
        this.yEnd = 0;
        this.slideDistance = 0;

        this.containerMetrics = new ElementMetrics(this.element);
      },

      draw: function() {
        var scale;
        var translateString;
        var dx;
        var dy;

        this.wave.style.opacity = this.opacity;

        scale = this.radius / (this.containerMetrics.size / 2);
        dx = this.xNow - (this.containerMetrics.width / 2);
        dy = this.yNow - (this.containerMetrics.height / 2);


        // 2d transform for safari because of border-radius and overflow:hidden clipping bug.
        // https://bugs.webkit.org/show_bug.cgi?id=98538
        this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
        this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
        this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
        this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
      },

      /** @param {Event=} event */
      downAction: function(event) {
        var xCenter = this.containerMetrics.width / 2;
        var yCenter = this.containerMetrics.height / 2;

        this.resetInteractionState();
        this.mouseDownStart = Utility.now();

        if (this.center) {
          this.xStart = xCenter;
          this.yStart = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        } else {
          this.xStart = event ?
              event.detail.x - this.containerMetrics.boundingRect.left :
              this.containerMetrics.width / 2;
          this.yStart = event ?
              event.detail.y - this.containerMetrics.boundingRect.top :
              this.containerMetrics.height / 2;
        }

        if (this.recenters) {
          this.xEnd = xCenter;
          this.yEnd = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        }

        this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(
          this.xStart,
          this.yStart
        );

        this.waveContainer.style.top =
          (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
        this.waveContainer.style.left =
          (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';

        this.waveContainer.style.width = this.containerMetrics.size + 'px';
        this.waveContainer.style.height = this.containerMetrics.size + 'px';
      },

      /** @param {Event=} event */
      upAction: function(event) {
        if (!this.isMouseDown) {
          return;
        }

        this.mouseUpStart = Utility.now();
      },

      remove: function() {
        Polymer.dom(this.waveContainer.parentNode).removeChild(
          this.waveContainer
        );
      }
    };

    Polymer({
      is: 'paper-ripple',

      behaviors: [
        Polymer.IronA11yKeysBehavior
      ],

      properties: {
        /**
         * The initial opacity set on the wave.
         *
         * @attribute initialOpacity
         * @type number
         * @default 0.25
         */
        initialOpacity: {
          type: Number,
          value: 0.25
        },

        /**
         * How fast (opacity per second) the wave fades out.
         *
         * @attribute opacityDecayVelocity
         * @type number
         * @default 0.8
         */
        opacityDecayVelocity: {
          type: Number,
          value: 0.8
        },

        /**
         * If true, ripples will exhibit a gravitational pull towards
         * the center of their container as they fade away.
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        recenters: {
          type: Boolean,
          value: false
        },

        /**
         * If true, ripples will center inside its container
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        center: {
          type: Boolean,
          value: false
        },

        /**
         * A list of the visual ripples.
         *
         * @attribute ripples
         * @type Array
         * @default []
         */
        ripples: {
          type: Array,
          value: function() {
            return [];
          }
        },

        /**
         * True when there are visible ripples animating within the
         * element.
         */
        animating: {
          type: Boolean,
          readOnly: true,
          reflectToAttribute: true,
          value: false
        },

        /**
         * If true, the ripple will remain in the "down" state until `holdDown`
         * is set to false again.
         */
        holdDown: {
          type: Boolean,
          value: false,
          observer: '_holdDownChanged'
        },

        _animating: {
          type: Boolean
        },

        _boundAnimate: {
          type: Function,
          value: function() {
            return this.animate.bind(this);
          }
        }
      },

      get target () {
        var ownerRoot = Polymer.dom(this).getOwnerRoot();
        var target;

        if (this.parentNode.nodeType == 11) { // DOCUMENT_FRAGMENT_NODE
          target = ownerRoot.host;
        } else {
          target = this.parentNode;
        }

        return target;
      },

      keyBindings: {
        'enter:keydown': '_onEnterKeydown',
        'space:keydown': '_onSpaceKeydown',
        'space:keyup': '_onSpaceKeyup'
      },

      attached: function() {
        this.listen(this.target, 'up', 'upAction');
        this.listen(this.target, 'down', 'downAction');

        if (!this.target.hasAttribute('noink')) {
          this.keyEventTarget = this.target;
        }
      },

      get shouldKeepAnimating () {
        for (var index = 0; index < this.ripples.length; ++index) {
          if (!this.ripples[index].isAnimationComplete) {
            return true;
          }
        }

        return false;
      },

      simulatedRipple: function() {
        this.downAction(null);

        // Please see polymer/polymer#1305
        this.async(function() {
          this.upAction();
        }, 1);
      },

      /** @param {Event=} event */
      downAction: function(event) {
        if (this.holdDown && this.ripples.length > 0) {
          return;
        }

        var ripple = this.addRipple();

        ripple.downAction(event);

        if (!this._animating) {
          this.animate();
        }
      },

      /** @param {Event=} event */
      upAction: function(event) {
        if (this.holdDown) {
          return;
        }

        this.ripples.forEach(function(ripple) {
          ripple.upAction(event);
        });

        this.animate();
      },

      onAnimationComplete: function() {
        this._animating = false;
        this.$.background.style.backgroundColor = null;
        this.fire('transitionend');
      },

      addRipple: function() {
        var ripple = new Ripple(this);

        Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
        this.$.background.style.backgroundColor = ripple.color;
        this.ripples.push(ripple);

        this._setAnimating(true);

        return ripple;
      },

      removeRipple: function(ripple) {
        var rippleIndex = this.ripples.indexOf(ripple);

        if (rippleIndex < 0) {
          return;
        }

        this.ripples.splice(rippleIndex, 1);

        ripple.remove();

        if (!this.ripples.length) {
          this._setAnimating(false);
        }
      },

      animate: function() {
        var index;
        var ripple;

        this._animating = true;

        for (index = 0; index < this.ripples.length; ++index) {
          ripple = this.ripples[index];

          ripple.draw();

          this.$.background.style.opacity = ripple.outerOpacity;

          if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
            this.removeRipple(ripple);
          }
        }

        if (!this.shouldKeepAnimating && this.ripples.length === 0) {
          this.onAnimationComplete();
        } else {
          window.requestAnimationFrame(this._boundAnimate);
        }
      },

      _onEnterKeydown: function() {
        this.downAction();
        this.async(this.upAction, 1);
      },

      _onSpaceKeydown: function() {
        this.downAction();
      },

      _onSpaceKeyup: function() {
        this.upAction();
      },

      _holdDownChanged: function(holdDown) {
        if (holdDown) {
          this.downAction();
        } else {
          this.upAction();
        }
      }
    });
  })();
Polymer({
    is: 'paper-icon-button',

    hostAttributes: {
      role: 'button',
      tabindex: '0'
    },

    behaviors: [
      Polymer.PaperInkyFocusBehavior
    ],

    properties: {
      /**
       * The URL of an image for the icon. If the src property is specified,
       * the icon property should not be.
       */
      src: {
        type: String
      },

      /**
       * Specifies the icon name or index in the set of icons available in
       * the icon's icon set. If the icon property is specified,
       * the src property should not be.
       */
      icon: {
        type: String
      },

      /**
       * Specifies the alternate text for the button, for accessibility.
       */
      alt: {
        type: String,
        observer: "_altChanged"
      }
    },

    _altChanged: function(newValue, oldValue) {
      var label = this.getAttribute('aria-label');

      // Don't stomp over a user-set aria-label.
      if (!label || oldValue == label) {
        this.setAttribute('aria-label', newValue);
      }
    }
  });
Polymer({
    is: 'paper-material',

    properties: {

      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        value: 1
      },

      /**
       * Set this to true to animate the shadow when setting a new
       * `elevation` value.
       *
       * @attribute animated
       * @type boolean
       * @default false
       */
      animated: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      }
    }
  });
Polymer({

    is: 'paper-card',

    properties: {

      /**
       * The title of the card.
       */
      heading: {
        type: String,
        value: '',
        observer: '_headingChanged'
      },

      /**
       * The url of the title image of the card.
       */
      image: {
        type: String,
        value: ''
      },

      /**
       * The z-depth of the card, from 0-5.
       */
      elevation: {
        type: Number,
        value: 1
      },

      /**
       * Set this to true to animate the card shadow when setting a new
       * `z` value.
       */
      animatedShadow: {
        type: Boolean,
        value: false
      }
    },

    _headingChanged: function(heading) {
      var label = this.getAttribute('aria-label');
      this.setAttribute('aria-label', heading);
    },

    _computeHeadingClass: function(image) {
      var cls = 'title-text';
      if (image)
        cls += ' over-image';
      return cls;
    }
  });
Polymer({

    is: 'paper-progress',

    behaviors: [
      Polymer.IronRangeBehavior
    ],

    properties: {

      /**
       * The number that represents the current secondary progress.
       */
      secondaryProgress: {
        type: Number,
        value: 0
      },

      /**
       * The secondary ratio
       */
      secondaryRatio: {
        type: Number,
        value: 0,
        readOnly: true
      },

      /**
       * Use an indeterminate progress indicator.
       */
      indeterminate: {
        type: Boolean,
        value: false,
        observer: '_toggleIndeterminate'
      },

      /**
       * True if the progress is disabled.
       */
      disabled: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        observer: '_disabledChanged'
      }
    },

    observers: [
      '_progressChanged(secondaryProgress, value, min, max)'
    ],

    hostAttributes: {
      role: 'progressbar'
    },

    _toggleIndeterminate: function(indeterminate) {
      // If we use attribute/class binding, the animation sometimes doesn't translate properly
      // on Safari 7.1. So instead, we toggle the class here in the update method.
      this.toggleClass('indeterminate', indeterminate, this.$.primaryProgress);
    },

    _transformProgress: function(progress, ratio) {
      var transform = 'scaleX(' + (ratio / 100) + ')';
      progress.style.transform = progress.style.webkitTransform = transform;
    },

    _mainRatioChanged: function(ratio) {
      this._transformProgress(this.$.primaryProgress, ratio);
    },

    _progressChanged: function(secondaryProgress, value, min, max) {
      secondaryProgress = this._clampValue(secondaryProgress);
      value = this._clampValue(value);

      var secondaryRatio = this._calcRatio(secondaryProgress) * 100;
      var mainRatio = this._calcRatio(value) * 100;

      this._setSecondaryRatio(secondaryRatio);
      this._transformProgress(this.$.secondaryProgress, secondaryRatio);
      this._transformProgress(this.$.primaryProgress, mainRatio);

      this.secondaryProgress = secondaryProgress;

      this.setAttribute('aria-valuenow', value);
      this.setAttribute('aria-valuemin', min);
      this.setAttribute('aria-valuemax', max);
    },

    _disabledChanged: function(disabled) {
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    },

    _hideSecondaryProgress: function(secondaryRatio) {
      return secondaryRatio === 0;
    }

  });
Polymer({
    is: 'positional-search',
    properties: {
      active: {
        type: Boolean,
        value: false,
        notify: true
      },
      query: {
        type: String,
        value: null,
        notify: true,
      },
      loading: {
        type: Boolean,
        value: false
      },
    },
    _computeGPSIcon: function(active) {
      return active ? 'device:gps-fixed' : 'device:gps-not-fixed';
    },
    _onInputChange: function(e, detail) {
      this.query = e.target.value;
      this.fire('search');
    },
    _clearInput: function(e, detail) {
      this.$.input.value = null;
    },
    ready: function() {
      this.waitForPosition();
    },
    getPosition: function() {
      this.active = true;
    },
    waitForPosition: function(e, detail) {
      navigator.permissions.query({name: 'geolocation'}).then(function(status) {
        this.active = status.state === 'granted';
        status.onchange = function(e) {
          this.active = status.state === 'granted';
        }.bind(this);
      }.bind(this));
    }
  });
Polymer({
      is: 'paper-icon-item',

      hostAttributes: {
        'role': 'listitem',
        'tabindex': '0'
      },

      behaviors: [
        Polymer.IronControlState,
        Polymer.IronButtonState
      ]
    });
(function() {

  Polymer({

    is: 'iron-overlay-backdrop',

    properties: {

      /**
       * Returns true if the backdrop is opened.
       */
      opened: {
        readOnly: true,
        reflectToAttribute: true,
        type: Boolean,
        value: false
      },

      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      }

    },

    /**
     * Appends the backdrop to document body and sets its `z-index` to be below the latest overlay.
     */
    prepare: function() {
      if (!this.parentNode) {
        Polymer.dom(document.body).appendChild(this);
        this.style.zIndex = this._manager.currentOverlayZ() - 1;
      }
    },

    /**
     * Shows the backdrop if needed.
     */
    open: function() {
      // only need to make the backdrop visible if this is called by the first overlay with a backdrop
      if (this._manager.getBackdrops().length < 2) {
        this._setOpened(true);
      }
    },

    /**
     * Hides the backdrop if needed.
     */
    close: function() {
      // only need to make the backdrop invisible if this is called by the last overlay with a backdrop
      if (this._manager.getBackdrops().length < 2) {
        this._setOpened(false);
      }
    },

    /**
     * Removes the backdrop from document body if needed.
     */
    complete: function() {
      // only remove the backdrop if there are no more overlays with backdrops
      if (this._manager.getBackdrops().length === 0 && this.parentNode) {
        Polymer.dom(this.parentNode).removeChild(this);
      }
    }

  });

})();
(function() {

  Polymer({

    is: 'paper-dialog',

    behaviors: [
      Polymer.PaperDialogBehavior,
      Polymer.NeonAnimationRunnerBehavior
    ],

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _renderOpened: function() {
      if (this.withBackdrop) {
        this.backdropElement.open();
      }
      this.playAnimation('entry');
    },

    _renderClosed: function() {
      if (this.withBackdrop) {
        this.backdropElement.close();
      }
      this.playAnimation('exit');
    },

    _onNeonAnimationFinish: function() {
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    }

  });

})();
Polymer({
    is: 'paper-fab',

    behaviors: [
      Polymer.PaperButtonBehavior
    ],

    properties: {
      /**
       * The URL of an image for the icon. If the src property is specified,
       * the icon property should not be.
       *
       * @attribute src
       * @type string
       * @default ''
       */
      src: {
        type: String,
        value: ''
      },

      /**
       * Specifies the icon name or index in the set of icons available in
       * the icon's icon set. If the icon property is specified,
       * the src property should not be.
       *
       * @attribute icon
       * @type string
       * @default ''
       */
      icon: {
        type: String,
        value: ''
      },

      /**
       * Set this to true to style this is a "mini" FAB.
       *
       * @attribute mini
       * @type boolean
       * @default false
       */
      mini: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      }
    },

    _computeContentClass: function(receivedFocusFromKeyboard) {
      var className = 'content';
      if (receivedFocusFromKeyboard) {
        className += ' keyboard-focus';
      }
      return className;
    }

  });
Polymer({
    is: 'star-rating',
    properties: {
      count: {
        type: Number,
        value: 5
      },
      total: {
        type: Number,
        value: 0
      },
      rating: {
        type: Number,
        value: 0
      },
      stars: {
        type: Array,
        readOnly: true,
        computed: '_computeStars(rating, count)'
      }
    },
    _computeStars: function(rating, count) {
      var stars = [];
      for (var i = 1; i <= count; ++i) {
        stars.push({active: rating >= i});
      }
      return stars;
    },
    _computeIcon: function(active) {
      return active ? 'icons:star' : 'icons:star-border';
    }
  });
Polymer({
    is: 'info-card',
    properties: {
      marker: {
        type: Object,
        value: function() { return {}; }
        //notify: true
      },
      dismissOnOutsideClick: {
        type: Boolean,
        value: true,
        observer: '_onDismissOnClickOutsideChanged'
      }
    },
    open: function() {
      this.$.dialog.animationConfig = {
        entry: {
          name: 'transform-animation',
          node: this.$.dialog,
          transformFrom: 'translateY(calc(100% + 56px/2))',
          transformTo: 'translateY(0)'
        },
        exit: {
          name: 'transform-animation',
          node: this.$.dialog,
          transformFrom: 'translateY(0)',
          transformTo: 'translateY(calc(100% + 56px/2))'
        }
      };

      this.$.dialog.open();
    },
    close: function() {
      this.$.dialog.close();
    },
    _showDirections: function() {
      this.fire('show-directions');
    },
    _computeDurationStr: function(duration) {
      return duration ? duration + ' away' : 'Unknown distance from you';
    },
    _onDismissOnClickOutsideChanged: function() {
      this.$.dialog.noCancelOnOutsideClick = this.dismissOnOutsideClick;
    },
    _eatClick: function(e, detail) {
      e.stopPropagation();
    }
  });